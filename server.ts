import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { FunctionDeclaration, GoogleGenAI, Type } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const getAiClient = () => {
  return new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
};

// Typed tools for Spoon Feeder AI autonomous operator
const spoonFeederTools: FunctionDeclaration[] = [
  {
    name: 'create_task',
    description: 'Create a new task in the Calendar & Tasks module. Routine write action.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        title: { type: Type.STRING, description: 'Clear task title (max 200 chars)' },
        priority: { type: Type.STRING, description: 'critical, high, medium, or low' },
        category: { type: Type.STRING, description: 'study, work, health, finance, personal, or routine' },
        estimatedMinutes: { type: Type.INTEGER, description: 'Estimated duration in minutes (15-240)' },
        dueDate: { type: Type.STRING, description: 'YYYY-MM-DD due date' },
        scheduledStart: { type: Type.STRING, description: 'Optional HH:MM start time for time-blocking' },
      },
      required: ['title', 'priority', 'category', 'estimatedMinutes', 'dueDate'],
    },
  },
  {
    name: 'schedule_study_block',
    description: 'Schedule a spaced-repetition study or revision block in the calendar. Routine write action.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        title: { type: Type.STRING, description: 'Lecture or revision session title' },
        date: { type: Type.STRING, description: 'YYYY-MM-DD date' },
        startTime: { type: Type.STRING, description: 'HH:MM start time (respecting prayer anchors)' },
        endTime: { type: Type.STRING, description: 'HH:MM end time' },
        location: { type: Type.STRING, description: 'Study desk, library, or online' },
      },
      required: ['title', 'date', 'startTime', 'endTime'],
    },
  },
  {
    name: 'log_health_entry',
    description: 'Record a workout session, meal nutrition entry, or body measurement. Routine write action.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        logType: { type: Type.STRING, description: 'workout, meal, or measurement' },
        title: { type: Type.STRING, description: 'Description of workout, meal, or measurement' },
        calories: { type: Type.INTEGER, description: 'Estimated calories if meal' },
        proteinGrams: { type: Type.INTEGER, description: 'Estimated protein in grams if meal' },
        durationMinutes: { type: Type.INTEGER, description: 'Duration in minutes if workout' },
        volumeKg: { type: Type.INTEGER, description: 'Total volume in kg if workout' },
        weightKg: { type: Type.NUMBER, description: 'Body weight in kg if measurement' },
      },
      required: ['logType', 'title'],
    },
  },
  {
    name: 'propose_finance_record',
    description: 'Propose recording an expense, income, or budget change. Consequential action requiring explicit user confirmation before altering financial records.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        recordType: { type: Type.STRING, description: 'expense, income, or budget' },
        title: { type: Type.STRING, description: 'Merchant or transaction description' },
        category: { type: Type.STRING, description: 'Groceries, Dining, Education, Housing, Transport, Tech, Health' },
        amountMajor: { type: Type.NUMBER, description: 'Monetary amount in major units (e.g. 24.50)' },
        accountName: { type: Type.STRING, description: 'Main Checking, Cash Wallet, or Savings' },
      },
      required: ['recordType', 'title', 'category', 'amountMajor'],
    },
  },
  {
    name: 'rebalance_day_schedule',
    description: 'Propose moving deadlines or rebuilding today’s time-blocked schedule around prayer anchors and fixed lectures. Consequential action requiring confirmation.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        summary: { type: Type.STRING, description: 'Explanation of proposed schedule changes and trade-offs' },
        blocks: {
          type: Type.ARRAY,
          description: 'Proposed time blocks',
          items: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              startTime: { type: Type.STRING },
              endTime: { type: Type.STRING },
              eventType: { type: Type.STRING },
            },
          },
        },
      },
      required: ['summary', 'blocks'],
    },
  },
];

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '2mb' }));

  // 1. Spoon Feeder AI Chat & Tool-Calling Operator
  app.post('/api/ai/spoon-feeder', async (req, res) => {
    try {
      const { prompt, contextSnapshot } = req.body;
      if (!prompt || typeof prompt !== 'string') {
        return res.status(400).json({ error: 'Prompt is required' });
      }

      const ai = getAiClient();
      const systemInstruction = `You are Spoon Feeder AI, the autonomous personal operating system assistant for Life OS.
Core Principles:
1. Integration First: Connect tasks, calendar events, study lectures/revisions, health logs, finances, library notes, and habits.
2. Realistic Planning: Respect fixed commitments, energy levels, buffers, and protected Prayer Time anchors (Fajr, Dhuhr, Asr, Maghrib, Isha). Never schedule work overlapping prayer buffers.
3. Autonomy with Safeguards:
   - Routine writes (create_task, schedule_study_block, log_health_entry) can be proposed/executed with audit logging.
   - Consequential actions (propose_finance_record, rebalance_day_schedule) ALWAYS require preview/confirmation. Never silently alter financial records or major deadlines.
4. Useful Feedback: Be constructive, concise, and never judge or punish the user for illness, emergencies, or blocked tasks.
5. Source Grounding: When summarizing study material or notes, distinguish source-grounded points from additional explanation.

Current User Workspace Context:
${JSON.stringify(contextSnapshot || {}, null, 2)}`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
        config: {
          systemInstruction,
          tools: [{ functionDeclarations: spoonFeederTools }],
        },
      });

      const text = response.text || '';
      const functionCalls = response.functionCalls || [];

      res.json({
        reply: text,
        toolCalls: functionCalls.map((fc) => ({
          name: fc.name,
          args: fc.args,
          permissionLevel:
            fc.name === 'propose_finance_record' || fc.name === 'rebalance_day_schedule'
              ? 'consequential'
              : 'routine_write',
        })),
      });
    } catch (error: any) {
      console.error('Spoon Feeder AI Error:', error);
      res.status(500).json({
        error: error?.message || 'Spoon Feeder AI encountered an error processing your request.',
      });
    }
  });

  // 2. Study Material Extraction & Flashcard / Quiz Generator
  app.post('/api/ai/study-synthesis', async (req, res) => {
    try {
      const { moduleCode, lectureTitle, rawContent } = req.body;
      if (!rawContent) {
        return res.status(400).json({ error: 'Study material content is required' });
      }

      const ai = getAiClient();
      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: `Analyze the following study material for module "${moduleCode || 'General'} - ${lectureTitle || 'Lecture'}":\n\n${rawContent}`,
        config: {
          systemInstruction:
            'Extract source-grounded key takeaways, generate 3 active-recall flashcards (front question, back concise answer), and recommend an initial study duration in minutes.',
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              sourceSummary: {
                type: Type.STRING,
                description: 'Concise source-grounded summary of the material.',
              },
              additionalExplanation: {
                type: Type.STRING,
                description: 'Clarifying intuition or analogy clearly separated from source text.',
              },
              estimatedMinutes: {
                type: Type.INTEGER,
                description: 'Recommended study session duration in minutes.',
              },
              flashcards: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    frontPrompt: { type: Type.STRING },
                    backAnswer: { type: Type.STRING },
                  },
                  required: ['frontPrompt', 'backAnswer'],
                },
              },
            },
            required: ['sourceSummary', 'additionalExplanation', 'estimatedMinutes', 'flashcards'],
          },
        },
      });

      const parsed = JSON.parse((response.text ?? '{}').trim());
      res.json(parsed);
    } catch (error: any) {
      console.error('Study Synthesis Error:', error);
      res.status(500).json({ error: error?.message || 'Failed to synthesize study material.' });
    }
  });

  // 3. Daily Briefing Generator
  app.post('/api/ai/daily-briefing', async (req, res) => {
    try {
      const { contextSnapshot } = req.body;
      const ai = getAiClient();
      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: `Generate a concise, grounded Today Briefing for this Life OS state:\n${JSON.stringify(contextSnapshot || {})}`,
        config: {
          systemInstruction:
            'Provide a 2-3 sentence executive briefing highlighting top priority tasks, upcoming exam or revision deadlines, prayer anchor reminders, and one practical focus suggestion. Plain text, no markdown headers.',
        },
      });
      res.json({ briefing: response.text || 'Focus on your highest-leverage study session and honor your scheduled recovery blocks today.' });
    } catch (error: any) {
      console.error('Daily Briefing Error:', error);
      res.status(500).json({ error: error?.message || 'Failed to generate daily briefing.' });
    }
  });

  // Vite middleware for development or static serving for production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*all', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Life OS Server running on http://localhost:${PORT}`);
  });
}

startServer();
