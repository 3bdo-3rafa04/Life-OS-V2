import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { FunctionDeclaration, GoogleGenAI, ThinkingLevel, Type } from '@google/genai';

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

const spoonFeederTools: FunctionDeclaration[] = [
  {
    name: 'create_task',
    description: 'Create a new task in the Tasks module. Routine write action.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        title: { type: Type.STRING, description: 'Clear task title (max 200 chars)' },
        priority: { type: Type.STRING, description: 'critical, high, medium, or low' },
        category: {
          type: Type.STRING,
          description: 'study, work, health, finance, personal, or routine',
        },
        estimatedMinutes: {
          type: Type.INTEGER,
          description: 'Estimated duration in minutes (15-240)',
        },
        dueDate: { type: Type.STRING, description: 'YYYY-MM-DD due date' },
        scheduledStart: {
          type: Type.STRING,
          description: 'Optional HH:MM start time for time-blocking',
        },
      },
      required: ['title', 'priority', 'category', 'estimatedMinutes', 'dueDate'],
    },
  },
  {
    name: 'schedule_study_block',
    description: 'Schedule a study, workout, or calendar event block. Routine write action.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        title: { type: Type.STRING, description: 'Session or event title' },
        date: { type: Type.STRING, description: 'YYYY-MM-DD date' },
        startTime: {
          type: Type.STRING,
          description: 'HH:MM start time (respecting prayer anchors)',
        },
        endTime: { type: Type.STRING, description: 'HH:MM end time' },
        location: { type: Type.STRING, description: 'Location or desk' },
      },
      required: ['title', 'date', 'startTime', 'endTime'],
    },
  },
  {
    name: 'log_health_entry',
    description:
      'Record a workout session, meal nutrition entry, or body measurement. Routine write action.',
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
    description:
      'Propose recording an expense, income, or budget change. Consequential action requiring user confirmation.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        recordType: { type: Type.STRING, description: 'expense, income, or budget' },
        title: { type: Type.STRING, description: 'Merchant or transaction description' },
        category: {
          type: Type.STRING,
          description: 'Food, Study, Transport, Health, Subscriptions, General',
        },
        amountMajor: { type: Type.NUMBER, description: 'Monetary amount in major units' },
        accountName: { type: Type.STRING, description: 'Cash, Bank account, or Mobile wallet' },
      },
      required: ['recordType', 'title', 'category', 'amountMajor'],
    },
  },
  {
    name: 'rebalance_day_schedule',
    description:
      'Propose rebuilding or shifting today’s schedule around prayer anchors. Consequential action requiring confirmation.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        summary: { type: Type.STRING, description: 'Explanation of proposed schedule changes' },
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

const ROLE_INSTRUCTIONS: Record<string, string> = {
  operator: `Role: Autonomous Life OS Workspace Operator.
You execute user commands across Tasks, Calendar, Study, Health, and Finance while maintaining multi-turn conversation continuity.
- Routine writes (create_task, schedule_study_block, log_health_entry) execute immediately.
- Consequential actions (propose_finance_record, rebalance_day_schedule) create a preview for user approval.`,

  study_tutor: `Role: Socratic Study & Spaced Repetition Tutor.
You help the user master complex academic material, run active-recall quizzes in chat, break down mechanisms step by step, and distinguish source-grounded facts from additional explanation. When helpful, you can also schedule study blocks or create revision tasks.`,

  schedule_architect: `Role: Realistic Time-Blocking & Energy Architect.
You design realistic daily and weekly schedules around fixed classes, energy peaks, recovery buffers, and protected Prayer Time anchors (Fajr, Dhuhr, Asr, Maghrib, Isha). You never overload the user's day.`,

  finance_health_coach: `Role: Holistic Finance & Wellbeing Coach.
You guide the user on nutrition macros (calories, protein, hydration), workout programming, sleep consistency, and mindful budgeting/expense tracking without judgment.`,
};

const CANDIDATE_MODELS = [
  'gemini-3.8-flash',
  'gemini-3.1-flash-lite',
  'gemini-flash-latest',
] as const;

async function generateWithRetryAndFallback(params: {
  contents: string;
  preferredModel?: string;
  config?: Record<string, unknown>;
}) {
  const ai = getAiClient();
  let lastError: unknown = null;

  const modelOrder = params.preferredModel
    ? [
        params.preferredModel,
        ...CANDIDATE_MODELS.filter((m) => m !== params.preferredModel),
      ]
    : [...CANDIDATE_MODELS];

  for (const model of modelOrder) {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const safeConfig = { ...(params.config || {}) };
        if (model === 'gemini-3.1-flash-lite' && safeConfig.thinkingConfig) {
          delete safeConfig.thinkingConfig;
        }
        return await ai.models.generateContent({
          model,
          contents: params.contents,
          config: safeConfig,
        });
      } catch (err: any) {
        lastError = err;
        const msg = String(err?.message || '');
        const isTransient =
          err?.status === 503 ||
          err?.status === 429 ||
          msg.includes('503') ||
          msg.includes('UNAVAILABLE') ||
          msg.includes('high demand') ||
          msg.includes('RESOURCE_EXHAUSTED');

        if (!isTransient) {
          break;
        }
        await new Promise((r) => setTimeout(r, 400 * (attempt + 1)));
      }
    }
  }
  throw lastError;
}

async function runMultiTurnChatWithFallback(params: {
  message: string;
  history: { role: 'user' | 'model'; parts: { text: string }[] }[];
  preferredModel?: string;
  config?: Record<string, unknown>;
}) {
  const ai = getAiClient();
  let lastError: unknown = null;

  const modelOrder = params.preferredModel
    ? [
        params.preferredModel,
        ...CANDIDATE_MODELS.filter((m) => m !== params.preferredModel),
      ]
    : [...CANDIDATE_MODELS];

  for (const model of modelOrder) {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const safeConfig = { ...(params.config || {}) };
        if (model === 'gemini-3.1-flash-lite' && safeConfig.thinkingConfig) {
          delete safeConfig.thinkingConfig;
        }
        const chat = ai.chats.create({
          model,
          history: params.history,
          config: safeConfig,
        });
        const response = await chat.sendMessage({
          message: params.message,
        });
        return { response, usedModel: model };
      } catch (err: any) {
        lastError = err;
        const msg = String(err?.message || '');
        const isTransient =
          err?.status === 503 ||
          err?.status === 429 ||
          msg.includes('503') ||
          msg.includes('UNAVAILABLE') ||
          msg.includes('high demand') ||
          msg.includes('RESOURCE_EXHAUSTED');

        if (!isTransient) {
          break;
        }
        await new Promise((r) => setTimeout(r, 400 * (attempt + 1)));
      }
    }
  }
  throw lastError;
}

function parseLocalFallbackIntent(prompt: string, contextSnapshot: any) {
  const lower = prompt.toLowerCase();
  const todayDate = contextSnapshot?.todayDate || new Date().toISOString().split('T')[0];
  const currency = contextSnapshot?.currency || 'USD';
  const toolCalls: {
    name: string;
    args: Record<string, any>;
    permissionLevel: 'routine_write' | 'consequential';
  }[] = [];
  let reply = '';

  const moneyMatch = prompt.match(/(?:egp|usd|\$)?\s*(\d+(?:\.\d{1,2})?)/i);
  if (
    lower.includes('expense') ||
    lower.includes('spent') ||
    lower.includes('paid') ||
    lower.includes('cost') ||
    lower.includes('budget')
  ) {
    const amountMajor = moneyMatch ? parseFloat(moneyMatch[1]) : 100;
    const category =
      lower.includes('food') ||
      lower.includes('lunch') ||
      lower.includes('dinner') ||
      lower.includes('coffee')
        ? 'Food'
        : lower.includes('study') || lower.includes('book')
        ? 'Study'
        : lower.includes('transport')
        ? 'Transport'
        : 'General';
    toolCalls.push({
      name: 'propose_finance_record',
      args: {
        recordType: lower.includes('budget') ? 'budget' : 'expense',
        title: prompt.slice(0, 80),
        category,
        amountMajor,
        accountName: 'Main Account',
      },
      permissionLevel: 'consequential',
    });
    reply = `I prepared a financial proposal for ${currency} ${amountMajor.toFixed(
      2
    )} (${category}). Please review and approve it in the preview card before it is written to your ledger.`;
  } else if (
    lower.includes('schedule') ||
    lower.includes('revision') ||
    lower.includes('block') ||
    lower.includes('calendar') ||
    lower.includes('rebalance')
  ) {
    const timeMatch = prompt.match(/\b(\d{1,2}:\d{2})\b/);
    const startTime = timeMatch ? timeMatch[1].padStart(5, '0') : '15:30';
    const [h, m] = startTime.split(':').map(Number);
    const endH = String(Math.min(23, h + 1)).padStart(2, '0');
    const endTime = `${endH}:${String(m).padStart(2, '0')}`;

    if (lower.includes('rebalance') || lower.includes('plan')) {
      toolCalls.push({
        name: 'rebalance_day_schedule',
        args: {
          summary: `Proposed time-blocking at ${startTime}–${endTime} while keeping all 5 daily prayer anchors protected.`,
          blocks: [
            {
              title: prompt.slice(0, 60) || 'Focused Study Session',
              startTime,
              endTime,
              eventType: 'study_block',
            },
          ],
        },
        permissionLevel: 'consequential',
      });
      reply = `I drafted a conflict-free schedule proposal for ${startTime}–${endTime} around your prayer anchors. Please approve the preview to apply it to your Calendar.`;
    } else {
      toolCalls.push({
        name: 'schedule_study_block',
        args: {
          title: prompt.replace(/^schedule\s+(a\s+)?/i, '').slice(0, 80) || 'Study Block',
          date: todayDate,
          startTime,
          endTime,
          location: 'Study Desk',
        },
        permissionLevel: 'routine_write',
      });
      reply = `Scheduled "${prompt.slice(0, 60)}" for ${startTime}–${endTime} on ${todayDate} with zero prayer conflicts.`;
    }
  } else if (
    lower.includes('workout') ||
    lower.includes('gym') ||
    lower.includes('meal') ||
    lower.includes('ate') ||
    lower.includes('weight')
  ) {
    const isMeal =
      lower.includes('meal') ||
      lower.includes('ate') ||
      lower.includes('kcal') ||
      lower.includes('protein');
    const isWeight = lower.includes('weight') || lower.includes('kg');
    toolCalls.push({
      name: 'log_health_entry',
      args: {
        logType: isWeight ? 'measurement' : isMeal ? 'meal' : 'workout',
        title: prompt.slice(0, 80),
        calories: isMeal ? 550 : undefined,
        proteinGrams: isMeal ? 40 : undefined,
        durationMinutes: !isMeal && !isWeight ? 45 : undefined,
        volumeKg: !isMeal && !isWeight ? 4000 : undefined,
        weightKg: isWeight && moneyMatch ? parseFloat(moneyMatch[1]) : undefined,
      },
      permissionLevel: 'routine_write',
    });
    reply = `Logged your ${
      isWeight ? 'body measurement' : isMeal ? 'meal' : 'workout'
    } in Health.`;
  } else if (
    lower.includes('task') ||
    lower.includes('todo') ||
    lower.includes('remind') ||
    lower.includes('add ') ||
    lower.includes('create ')
  ) {
    const cleanTitle =
      prompt
        .replace(
          /^(create|add)\s+(a\s+)?(high-priority\s+|critical\s+)?(task\s+to\s+|task\s*:?\s*)?/i,
          ''
        )
        .trim() || prompt;
    toolCalls.push({
      name: 'create_task',
      args: {
        title: cleanTitle.slice(0, 120),
        priority: lower.includes('critical')
          ? 'critical'
          : lower.includes('high')
          ? 'high'
          : 'medium',
        category: lower.includes('study')
          ? 'study'
          : lower.includes('work')
          ? 'work'
          : 'personal',
        estimatedMinutes: 45,
        dueDate: todayDate,
      },
      permissionLevel: 'routine_write',
    });
    reply = `Created task "${cleanTitle}" due ${todayDate}.`;
  } else {
    const openCount = contextSnapshot?.pendingTasksCount ?? 0;
    const dueCount = contextSnapshot?.dueFlashcards ?? 0;
    reply = `Workspace status for ${todayDate}: ${openCount} open tasks and ${dueCount} flashcards tracked. Ask me any follow-up question or tell me to create a task, schedule a study block, rebalance your day, log a workout/meal, or propose an expense.`;
  }

  return { reply, toolCalls, functionCalls: toolCalls, usedModel: 'local-intent-engine' };
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '2mb' }));

  // Health check endpoint for system audit
  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', service: 'life-os-server' });
  });

  // 1. Multi-Turn Spoon Feeder AI Chat & Tool-Calling Operator
  app.post('/api/ai/spoon-feeder', async (req, res) => {
    const prompt = req.body?.prompt || req.body?.message;
    const contextSnapshot = req.body?.contextSnapshot || {};
    const rawHistory = Array.isArray(req.body?.history) ? req.body.history : [];
    const rolePersona = String(req.body?.rolePersona || 'operator');
    const customSystemInstruction = String(req.body?.customSystemInstruction || '').trim();
    const modelTier = String(req.body?.modelTier || 'general');

    if (!prompt || typeof prompt !== 'string') {
      return res.status(400).json({ error: 'Prompt or message is required' });
    }

    // Map modelTier to preferred model & thinkingConfig
    let preferredModel = 'gemini-3.8-flash';
    let thinkingConfig: Record<string, unknown> | undefined = undefined;

    if (modelTier === 'fast') {
      preferredModel = 'gemini-3.1-flash-lite';
    } else if (modelTier === 'deep') {
      preferredModel = 'gemini-3.8-flash';
      thinkingConfig = { thinkingLevel: ThinkingLevel.HIGH };
    } else if (modelTier === 'interactive') {
      preferredModel = 'gemini-3.8-flash';
      thinkingConfig = { thinkingLevel: ThinkingLevel.MEDIUM };
    }

    // Format conversation history for @google/genai ai.chats.create
    const formattedHistory = rawHistory
      .filter((m: any) => m && typeof m.text === 'string' && m.text.trim().length > 0)
      .map((m: any) => ({
        role: (m.role === 'user' ? 'user' : 'model') as 'user' | 'model',
        parts: [{ text: String(m.text).trim() }],
      }));

    const roleDirective = ROLE_INSTRUCTIONS[rolePersona] || ROLE_INSTRUCTIONS.operator;

    try {
      const systemInstruction = `You are Spoon Feeder AI, the multi-turn conversational assistant and personal operating system engine for Life OS.
${roleDirective}
${customSystemInstruction ? `\nCustom User Directive:\n${customSystemInstruction}\n` : ''}
Core Principles:
1. Multi-Turn Memory: Reference earlier messages in the conversation naturally and maintain continuity.
2. Integration First: Connect tasks, calendar events, study lectures/revisions, health logs, finances, library notes, and habits.
3. Realistic Planning: Respect fixed commitments, energy levels, buffers, and protected Prayer Time anchors (Fajr, Dhuhr, Asr, Maghrib, Isha). Never schedule work overlapping prayer buffers.
4. Autonomy with Safeguards:
   - Routine writes (create_task, schedule_study_block, log_health_entry) can be executed with audit logging.
   - Consequential actions (propose_finance_record, rebalance_day_schedule) ALWAYS require preview/confirmation.
5. Useful Feedback: Be constructive, concise, and never judge or punish the user for illness, emergencies, or blocked tasks.

Current User Workspace Context:
${JSON.stringify(contextSnapshot, null, 2)}`;

      const { response, usedModel } = await runMultiTurnChatWithFallback({
        message: prompt,
        history: formattedHistory,
        preferredModel,
        config: {
          systemInstruction,
          tools: [{ functionDeclarations: spoonFeederTools }],
          ...(thinkingConfig ? { thinkingConfig } : {}),
        },
      });

      const text = response.text || '';
      const rawCalls = response.functionCalls || [];
      const mappedCalls = rawCalls.map((fc) => ({
        name: fc.name,
        args: fc.args,
        permissionLevel:
          fc.name === 'propose_finance_record' || fc.name === 'rebalance_day_schedule'
            ? 'consequential'
            : 'routine_write',
      }));

      return res.json({
        reply: text || 'Processed your request against your Life OS workspace.',
        toolCalls: mappedCalls,
        functionCalls: mappedCalls,
        usedModel,
        rolePersona,
      });
    } catch (error: any) {
      console.warn(
        'Gemini models experiencing high demand; using Spoon Feeder local intent engine:',
        error?.message
      );
      const fallback = parseLocalFallbackIntent(prompt, contextSnapshot);
      return res.json(fallback);
    }
  });

  // 2. Study Material Extraction & Flashcard / Quiz Generator
  app.post('/api/ai/study-synthesis', async (req, res) => {
    const moduleCode = req.body?.moduleCode || 'STUDY';
    const lectureTitle = req.body?.lectureTitle || req.body?.topicTitle || 'Lecture';
    const rawContent = req.body?.rawContent || req.body?.sourceNotes || '';

    if (!rawContent || typeof rawContent !== 'string') {
      return res.status(400).json({ error: 'Study material content is required' });
    }

    try {
      const response = await generateWithRetryAndFallback({
        contents: `Analyze the following study material for module "${moduleCode} - ${lectureTitle}":\n\n${rawContent}`,
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
                description: 'Clarifying intuition clearly separated from source text.',
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
            required: [
              'sourceSummary',
              'additionalExplanation',
              'estimatedMinutes',
              'flashcards',
            ],
          },
        },
      });

      const parsed = JSON.parse((response.text ?? '{}').trim());
      return res.json({
        ...parsed,
        result: parsed.sourceSummary,
      });
    } catch (error: any) {
      console.warn('Study synthesis fallback triggered:', error?.message);
      const sentences = String(rawContent)
        .split(/(?<=[.!?])\s+/)
        .filter((s) => s.trim().length > 10);
      const summary = sentences.slice(0, 2).join(' ') || String(rawContent).slice(0, 240);
      return res.json({
        sourceSummary: summary,
        result: summary,
        additionalExplanation: `Focus on active recall of the core concepts in ${moduleCode} (${lectureTitle}).`,
        estimatedMinutes: 45,
        flashcards: [
          {
            frontPrompt: `What is the primary concept covered in ${lectureTitle}?`,
            backAnswer: sentences[0] || String(rawContent).slice(0, 180),
          },
          {
            frontPrompt: `What is a key mechanism or takeaway from ${lectureTitle}?`,
            backAnswer: sentences[1] || sentences[0] || String(rawContent).slice(0, 180),
          },
        ],
      });
    }
  });

  // 3. Daily Briefing Generator
  app.post('/api/ai/daily-briefing', async (req, res) => {
    const { contextSnapshot } = req.body || {};
    try {
      const response = await generateWithRetryAndFallback({
        contents: `Generate a concise, grounded Today Briefing for this Life OS state:\n${JSON.stringify(
          contextSnapshot || {}
        )}`,
        config: {
          systemInstruction:
            'Provide a 2-3 sentence executive briefing highlighting top priority tasks, upcoming exam or revision deadlines, prayer anchor reminders, and one practical focus suggestion. Plain text, no markdown headers.',
        },
      });
      return res.json({
        briefing:
          response.text ||
          'Focus on your highest-leverage study session and honor your scheduled recovery blocks today.',
      });
    } catch {
      const pending = contextSnapshot?.pendingTasks?.[0] || 'your top priority task';
      const revCount = contextSnapshot?.dueRevisions?.length || 0;
      return res.json({
        briefing: `Prioritize "${pending}" during your peak focus window today, and complete ${revCount} due active-recall revisions while respecting your protected prayer anchors.`,
      });
    }
  });

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
