import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { FunctionDeclaration, GoogleGenAI, ThinkingLevel, Type } from '@google/genai';
import {
  getNowInTimezone,
  generateContextAwareSchedule,
  runAdaptiveReschedule,
  extractMemoryCorrectionFromText,
  createDefaultPersistentMemory,
  parseTimeToMinutes,
  formatMinutesToTime,
  roundUpToNext5Minutes,
  addDaysToDateStr,
  ScheduleGenerationInput,
  EnergyLevel,
} from './src/services/schedulingEngine';

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
  // 1. TASKS
  {
    name: 'create_task',
    description: 'Create a new task in the Tasks module.',
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
        notes: { type: Type.STRING, description: 'Optional sub-steps or notes' },
      },
      required: ['title', 'priority', 'category', 'estimatedMinutes', 'dueDate'],
    },
  },
  {
    name: 'update_task',
    description:
      'Edit or update an existing task (match by taskId or titleMatch). Can change status (todo, in_progress, completed, blocked, deferred), priority, dueDate, title, notes, or estimatedMinutes.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        taskId: { type: Type.STRING, description: 'Exact ID of the task if known' },
        titleMatch: {
          type: Type.STRING,
          description: 'Title or partial title of the task to match if taskId is omitted',
        },
        newTitle: { type: Type.STRING, description: 'Updated title if renaming' },
        status: {
          type: Type.STRING,
          description: 'todo, in_progress, completed, blocked, deferred, or dropped',
        },
        priority: { type: Type.STRING, description: 'critical, high, medium, or low' },
        category: {
          type: Type.STRING,
          description: 'study, work, health, finance, personal, or routine',
        },
        dueDate: { type: Type.STRING, description: 'Updated YYYY-MM-DD due date' },
        estimatedMinutes: { type: Type.INTEGER, description: 'Updated estimated minutes' },
        notes: { type: Type.STRING, description: 'Updated notes' },
        statusReason: { type: Type.STRING, description: 'Reason if blocked or deferred' },
      },
    },
  },
  {
    name: 'delete_task',
    description: 'Delete a task by taskId or titleMatch.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        taskId: { type: Type.STRING },
        titleMatch: { type: Type.STRING },
      },
    },
  },

  // 2. CALENDAR
  {
    name: 'schedule_study_block',
    description: 'Schedule a study block, lecture, workout, prayer, or fixed event on the Calendar.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        title: { type: Type.STRING, description: 'Session or event title' },
        eventType: {
          type: Type.STRING,
          description: 'study_block, lecture, workout, fixed, routine, exam, or prayer',
        },
        date: { type: Type.STRING, description: 'YYYY-MM-DD date' },
        startTime: { type: Type.STRING, description: 'HH:MM start time' },
        endTime: { type: Type.STRING, description: 'HH:MM end time' },
        location: { type: Type.STRING, description: 'Location or desk' },
      },
      required: ['title', 'date', 'startTime', 'endTime'],
    },
  },
  {
    name: 'update_calendar_event',
    description: 'Edit or reschedule an existing calendar event by eventId or titleMatch.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        eventId: { type: Type.STRING },
        titleMatch: { type: Type.STRING },
        newTitle: { type: Type.STRING },
        date: { type: Type.STRING, description: 'New YYYY-MM-DD date' },
        startTime: { type: Type.STRING, description: 'New HH:MM start time' },
        endTime: { type: Type.STRING, description: 'New HH:MM end time' },
        location: { type: Type.STRING },
      },
    },
  },
  {
    name: 'delete_calendar_event',
    description: 'Delete a calendar event by eventId or titleMatch.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        eventId: { type: Type.STRING },
        titleMatch: { type: Type.STRING },
      },
    },
  },

  // 3. STUDY MODULES, LECTURE PDF SYNTHESIS & FLASHCARDS
  {
    name: 'create_study_module',
    description: 'Create a new academic course / study module (e.g., Cardiology, CS301).',
    parameters: {
      type: Type.OBJECT,
      properties: {
        code: { type: Type.STRING, description: 'Course code e.g. MED204' },
        title: { type: Type.STRING, description: 'Full module title' },
        term: { type: Type.STRING, description: 'Academic term' },
        examDate: { type: Type.STRING, description: 'YYYY-MM-DD exam date' },
        totalLectures: { type: Type.INTEGER, description: 'Total planned lectures' },
      },
      required: ['code', 'title'],
    },
  },
  {
    name: 'synthesize_lecture_and_flashcards',
    description:
      'Create a comprehensive lecture summary AND generate active-recall flashcards in the Study module (and optionally a Library note) from an attached PDF, lecture text, or topic.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        moduleCode: {
          type: Type.STRING,
          description: 'Module code (e.g., MED101 or existing module code)',
        },
        lectureTitle: { type: Type.STRING, description: 'Title of the lecture or PDF topic' },
        summaryNotes: {
          type: Type.STRING,
          description:
            'Detailed, structured summary of the lecture with key concepts, mechanisms, and high-yield takeaways',
        },
        estimatedMinutes: {
          type: Type.INTEGER,
          description: 'Recommended study time in minutes',
        },
        saveToLibraryNotes: {
          type: Type.BOOLEAN,
          description: 'If true, also saves the structured lecture summary into Library & Notes',
        },
        flashcards: {
          type: Type.ARRAY,
          description: 'Generated active-recall flashcards from the lecture',
          items: {
            type: Type.OBJECT,
            properties: {
              frontPrompt: {
                type: Type.STRING,
                description: 'Active recall question or clinical/conceptual prompt',
              },
              backAnswer: {
                type: Type.STRING,
                description: 'Concise, accurate answer grounded in the lecture material',
              },
            },
            required: ['frontPrompt', 'backAnswer'],
          },
        },
      },
      required: ['lectureTitle', 'summaryNotes', 'flashcards'],
    },
  },
  {
    name: 'update_study_item',
    description:
      'Edit an existing lecture or flashcard in Study (update notes, title, status, confidenceRating, frontPrompt, or backAnswer).',
    parameters: {
      type: Type.OBJECT,
      properties: {
        itemId: { type: Type.STRING },
        titleMatch: { type: Type.STRING },
        newTitle: { type: Type.STRING },
        status: { type: Type.STRING, description: 'unstudied, studied, review_due, or mastered' },
        confidenceRating: { type: Type.INTEGER, description: '1 to 5 confidence rating' },
        notes: { type: Type.STRING, description: 'Updated lecture summary or notes' },
        frontPrompt: { type: Type.STRING },
        backAnswer: { type: Type.STRING },
      },
    },
  },

  // 4. LIBRARY & NOTES
  {
    name: 'create_knowledge_item',
    description: 'Create a book, course, podcast, article, or study note in Library & Notes.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        itemType: { type: Type.STRING, description: 'book, course, podcast, article, or note' },
        title: { type: Type.STRING },
        authorOrSource: { type: Type.STRING },
        status: {
          type: Type.STRING,
          description: 'wishlist, planned, in_progress, paused, or completed',
        },
        progressCurrent: { type: Type.INTEGER },
        progressTotal: { type: Type.INTEGER },
        progressUnit: { type: Type.STRING, description: 'pages, lessons, episodes, or notes' },
        takeaways: { type: Type.STRING, description: 'Full note body, summary, or key takeaways' },
        tags: { type: Type.STRING },
      },
      required: ['itemType', 'title'],
    },
  },
  {
    name: 'update_knowledge_item',
    description: 'Edit a book, course, podcast, or note in Library & Notes.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        itemId: { type: Type.STRING },
        titleMatch: { type: Type.STRING },
        newTitle: { type: Type.STRING },
        status: {
          type: Type.STRING,
          description: 'wishlist, planned, in_progress, paused, or completed',
        },
        progressCurrent: { type: Type.INTEGER },
        takeaways: { type: Type.STRING },
      },
    },
  },

  // 5. HEALTH & HYDRATION
  {
    name: 'log_health_entry',
    description: 'Record a workout session, meal nutrition entry, or body measurement in Health.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        logType: { type: Type.STRING, description: 'workout, meal, or measurement' },
        title: { type: Type.STRING, description: 'Description of workout, meal, or measurement' },
        calories: { type: Type.INTEGER, description: 'Estimated calories if meal' },
        proteinGrams: { type: Type.INTEGER, description: 'Estimated protein in grams if meal' },
        carbsGrams: { type: Type.INTEGER },
        fatGrams: { type: Type.INTEGER },
        durationMinutes: { type: Type.INTEGER, description: 'Duration in minutes if workout' },
        volumeKg: { type: Type.INTEGER, description: 'Total volume in kg if workout' },
        weightKg: { type: Type.NUMBER, description: 'Body weight in kg if measurement' },
        notes: { type: Type.STRING },
      },
      required: ['logType', 'title'],
    },
  },
  {
    name: 'update_health_entry',
    description: 'Edit an existing health log entry by logId or titleMatch.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        logId: { type: Type.STRING },
        titleMatch: { type: Type.STRING },
        newTitle: { type: Type.STRING },
        calories: { type: Type.INTEGER },
        proteinGrams: { type: Type.INTEGER },
        durationMinutes: { type: Type.INTEGER },
        weightKg: { type: Type.NUMBER },
      },
    },
  },
  {
    name: 'log_water_intake',
    description: 'Add or set daily water intake in milliliters (ml) on the user profile.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        addMl: { type: Type.INTEGER, description: 'Amount of water in ml to add (e.g. 250, 500)' },
      },
      required: ['addMl'],
    },
  },

  // 6. FINANCE
  {
    name: 'propose_finance_record',
    description:
      'Propose or record an expense, income, budget, subscription, or savings goal in Finance.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        recordType: {
          type: Type.STRING,
          description: 'expense, income, budget, subscription, or savings_goal',
        },
        title: { type: Type.STRING, description: 'Merchant or transaction description' },
        category: {
          type: Type.STRING,
          description: 'Food, Study, Transport, Health, Subscriptions, General',
        },
        amountMajor: { type: Type.NUMBER, description: 'Monetary amount in major units' },
        accountName: { type: Type.STRING, description: 'Cash, Bank account, or Mobile wallet' },
        autoApply: {
          type: Type.BOOLEAN,
          description: 'Set true if the user explicitly asked to save/edit immediately',
        },
      },
      required: ['recordType', 'title', 'category', 'amountMajor'],
    },
  },
  {
    name: 'update_finance_record',
    description: 'Edit an existing finance transaction, budget, or savings goal.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        recordId: { type: Type.STRING },
        titleMatch: { type: Type.STRING },
        newTitle: { type: Type.STRING },
        amountMajor: { type: Type.NUMBER },
        category: { type: Type.STRING },
      },
    },
  },

  // 7. GOALS, HABITS, QUESTS & REWARDS
  {
    name: 'create_goal_or_habit',
    description: 'Create a goal, habit, daily quest, or custom reward in Goals & Rank.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        recordType: { type: Type.STRING, description: 'goal, habit, quest, or reward' },
        title: { type: Type.STRING },
        whyReason: { type: Type.STRING, description: 'Category or motivation' },
        frequency: { type: Type.STRING, description: 'daily, weekly, or once' },
        progressPercent: { type: Type.INTEGER, description: '0 to 100' },
        xpReward: { type: Type.INTEGER, description: 'XP reward on completion (e.g. 50)' },
        coinCostOrReward: {
          type: Type.INTEGER,
          description: 'Coin reward or cost if reward shop item',
        },
      },
      required: ['recordType', 'title'],
    },
  },
  {
    name: 'update_goal_or_habit',
    description:
      'Update progress, title, or completion state of an existing goal, habit, or quest.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        recordId: { type: Type.STRING },
        titleMatch: { type: Type.STRING },
        progressPercent: { type: Type.INTEGER, description: '0 to 100' },
        markCompletedToday: { type: Type.BOOLEAN },
        status: { type: Type.STRING, description: 'active, completed, paused, or stalled' },
      },
    },
  },

  // 8. DAILY REVIEW, SETTINGS & NAVIGATION
  {
    name: 'save_daily_review',
    description: 'Log an end-of-day reflection in Analytics -> Daily Review.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        energyLevel: { type: Type.STRING, description: 'high, moderate, low, or recovering' },
        wellbeingScore: { type: Type.INTEGER, description: '0 to 100' },
        wins: { type: Type.STRING },
        obstacles: { type: Type.STRING },
        tomorrowAdjustment: { type: Type.STRING },
      },
      required: ['wins'],
    },
  },
  {
    name: 'update_user_settings',
    description:
      'Update user profile settings (currency, city, prayerMethod, calorieTarget, proteinTargetGrams, waterTargetMl, displayName).',
    parameters: {
      type: Type.OBJECT,
      properties: {
        displayName: { type: Type.STRING },
        currency: { type: Type.STRING },
        city: { type: Type.STRING },
        prayerMethod: {
          type: Type.STRING,
          description: 'Egypt, MWL, Makkah, ISNA, Karachi, or Tehran',
        },
        calorieTarget: { type: Type.INTEGER },
        proteinTargetGrams: { type: Type.INTEGER },
        waterTargetMl: { type: Type.INTEGER },
      },
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
  {
    name: 'navigate_to_section',
    description:
      'Navigate the user interface to a specific section of the website (dashboard, calendar, tasks, study, library, health, finance, goals, analytics, settings).',
    parameters: {
      type: Type.OBJECT,
      properties: {
        destination: {
          type: Type.STRING,
          description:
            'dashboard, calendar, tasks, study, library, health, finance, goals, analytics, or settings',
        },
      },
      required: ['destination'],
    },
  },
  {
    name: 'generate_context_aware_schedule',
    description:
      'Run the 10-step deterministic Context-Aware Scheduling Engine (respecting current server time in Africa/Cairo, university classes, prayer times, sleep windows, energy profile, exam proximity, and strict lecture numbering sequence) and stage the proposed schedule for user review.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        targetDays: {
          type: Type.INTEGER,
          description: '1 for daily schedule, 3 for 3-day horizon, or 7 for weekly schedule',
        },
        maxStudyHoursToday: {
          type: Type.NUMBER,
          description: 'Optional cap on study hours today if user specified limited availability',
        },
        todayEnergyOverride: {
          type: Type.STRING,
          description: 'Optional override for today energy level: high, medium, or low',
        },
      },
    },
  },
  {
    name: 'adapt_existing_schedule',
    description:
      'Adaptively reschedule when reality changes (e.g. missed morning session, moving a specific lecture to tomorrow, feeling exhausted today, exam date moved, or limited hours available today).',
    parameters: {
      type: Type.OBJECT,
      properties: {
        reasonOrRequest: {
          type: Type.STRING,
          description: 'The user statement describing what changed (e.g. "Missed morning session", "Move cardiology lecture 3 to tomorrow", "I have only 2 hours today")',
        },
        targetDays: {
          type: Type.INTEGER,
          description: 'Number of days to rebalance across (default 3)',
        },
      },
      required: ['reasonOrRequest'],
    },
  },
  {
    name: 'save_learned_memory_preference',
    description:
      'Save a learned scheduling constraint, university lecture window, or energy preference into Persistent Intelligent Memory when the user corrects the AI or states a preference.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        ruleText: {
          type: Type.STRING,
          description: 'Clear description of the learned preference or blocked window',
        },
        ruleType: {
          type: Type.STRING,
          description: 'university_schedule, blocked_window, energy_override, or study_preference',
        },
        startTime: { type: Type.STRING, description: 'Optional HH:MM start of blocked window' },
        endTime: { type: Type.STRING, description: 'Optional HH:MM end of blocked window' },
        periodOfDay: { type: Type.STRING, description: 'Optional morning, afternoon, or evening' },
        energyLevel: { type: Type.STRING, description: 'Optional high, medium, or low' },
        isTemporaryOrUncertain: {
          type: Type.BOOLEAN,
          description: 'True if uncertain or temporary so the user is asked to confirm before making permanent',
        },
      },
      required: ['ruleText', 'ruleType'],
    },
  },
];

function buildScheduleInputFromSnapshot(
  contextSnapshot: any,
  options?: {
    targetDays?: number;
    maxStudyHoursToday?: number;
    todayEnergyOverride?: EnergyLevel;
  }
): ScheduleGenerationInput {
  const timezone = contextSnapshot?.profile?.timezone || contextSnapshot?.timezone || 'Africa/Cairo';
  const nowInfo = getNowInTimezone(timezone);
  const memory = contextSnapshot?.persistentMemory || createDefaultPersistentMemory(timezone);

  const dailyMaxHoursOverride: Record<string, number> = {};
  if (options?.maxStudyHoursToday !== undefined && options.maxStudyHoursToday > 0) {
    dailyMaxHoursOverride[nowInfo.dateStr] = options.maxStudyHoursToday;
  }

  const energyOverrideByDate: Record<string, EnergyLevel> = {};
  if (options?.todayEnergyOverride) {
    energyOverrideByDate[nowInfo.dateStr] = options.todayEnergyOverride;
  }

  return {
    nowIso: nowInfo.utcIso,
    timezone,
    targetDays: options?.targetDays || 1,
    dailyMaxHoursOverride: Object.keys(dailyMaxHoursOverride).length > 0 ? dailyMaxHoursOverride : undefined,
    energyOverrideByDate: Object.keys(energyOverrideByDate).length > 0 ? energyOverrideByDate : undefined,
    existingEvents: (contextSnapshot?.events || []).map((e: any) => ({
      id: String(e.id || ''),
      title: String(e.title || 'Event'),
      dateStr: String(e.date || nowInfo.dateStr),
      startTime: String(e.startTime || '09:00'),
      endTime: String(e.endTime || '10:00'),
      category: String(e.eventType || 'fixed'),
    })),
    prayers: contextSnapshot?.prayers || [
      { name: 'Fajr', time: '04:45', bufferMinutes: 20 },
      { name: 'Dhuhr', time: '12:05', bufferMinutes: 20 },
      { name: 'Asr', time: '15:30', bufferMinutes: 20 },
      { name: 'Maghrib', time: '18:15', bufferMinutes: 20 },
      { name: 'Isha', time: '19:40', bufferMinutes: 20 },
    ],
    tasks: (contextSnapshot?.tasks || []).map((t: any) => ({
      id: String(t.id || ''),
      title: String(t.title || 'Task'),
      category: String(t.category || 'study'),
      priority: (['high', 'medium', 'low'].includes(String(t.priority))
        ? t.priority
        : t.priority === 'critical'
          ? 'high'
          : 'medium') as 'high' | 'medium' | 'low',
      estimatedMinutes: Number(t.estimatedMinutes) || 45,
      completed: t.status === 'completed',
      dueDate: t.dueDate ? String(t.dueDate) : undefined,
    })),
    studyModules: (contextSnapshot?.studyModules || []).map((m: any) => ({
      id: String(m.id || ''),
      name: String(m.title || m.code || 'Module'),
      examDate: String(m.examDate || nowInfo.dateStr),
    })),
    studyItems: (contextSnapshot?.studyItems || [])
      .filter((s: any) => !s.itemType || s.itemType === 'lecture')
      .map((s: any) => ({
        id: String(s.id || ''),
        moduleId: String(s.moduleId || ''),
        title: String(s.title || 'Lecture'),
        type: String(s.itemType || 'lecture'),
        status: String(s.status || 'unstudied'),
        estimatedMinutes: Number(s.estimatedMinutes) || 60,
        sourceRef: s.sourceRef ? String(s.sourceRef) : undefined,
      })),
    memory,
  };
}

function sanitizeDirectScheduleCall(
  args: Record<string, any>,
  contextSnapshot: any
): Record<string, any> {
  const timezone = contextSnapshot?.profile?.timezone || contextSnapshot?.timezone || 'Africa/Cairo';
  const nowInfo = getNowInTimezone(timezone);
  let targetDate = String(args.date || nowInfo.dateStr).slice(0, 10);
  if (targetDate < nowInfo.dateStr) {
    targetDate = nowInfo.dateStr;
  }

  let startMin = parseTimeToMinutes(String(args.startTime || '16:00'));
  const rawEndMin = parseTimeToMinutes(String(args.endTime || '17:00'));
  const duration = Math.max(25, Math.min(120, rawEndMin > startMin ? rawEndMin - startMin : 45));

  // Enforce Part 1.A: Never schedule in the past on today's date
  if (targetDate === nowInfo.dateStr && startMin < nowInfo.minutesFromMidnight + 5) {
    startMin = roundUpToNext5Minutes(nowInfo.minutesFromMidnight + 10);
  }

  // Enforce Part 1.B: Never overlap existing events on targetDate
  const dayEvents = (contextSnapshot?.events || []).filter(
    (e: any) => String(e.date || nowInfo.dateStr).slice(0, 10) === targetDate
  );
  const sortedBusy = dayEvents
    .map((e: any) => ({
      s: parseTimeToMinutes(String(e.startTime || '09:00')),
      e: parseTimeToMinutes(String(e.endTime || '10:00')) + 5,
    }))
    .sort((a: any, b: any) => a.s - b.s);

  for (const b of sortedBusy) {
    if (startMin < b.e && startMin + duration > b.s) {
      startMin = roundUpToNext5Minutes(b.e);
    }
  }

  // If pushed past sleep boundary (23:00), roll to tomorrow morning at 08:30
  if (startMin + duration > 23 * 60) {
    const [y, m, d] = targetDate.split('-').map(Number);
    const nextDt = new Date(Date.UTC(y, (m || 1) - 1, (d || 1) + 1, 12, 0, 0));
    targetDate = nextDt.toISOString().slice(0, 10);
    startMin = 8 * 60 + 30;
  }

  return {
    ...args,
    date: targetDate,
    startTime: formatMinutesToTime(startMin),
    endTime: formatMinutesToTime(startMin + duration),
  };
}

const ROLE_INSTRUCTIONS: Record<string, string> = {
  operator: `Role: Omniscient Life OS Workspace Operator & Context-Aware Scheduling Architect.
You have complete read, create, edit, and delete access across every section of Life OS: Dashboard, Calendar, Tasks, Study (Modules, Lectures, Flashcards, PDF Synthesis), Library & Notes, Health, Finance, Goals & Rank, Analytics, and Settings.
- Whenever the user asks to plan their day/week, generate a schedule, or organize their study time, ALWAYS call 'generate_context_aware_schedule' so the deterministic engine computes conflict-free slots after the current server time.
- Whenever the user reports a change in reality ("I missed my morning study session", "Move cardiology lecture 3 to tomorrow", "I am exhausted today", "My exam has been moved to next week", "Today I have only two hours available"), ALWAYS call 'adapt_existing_schedule'.
- Whenever the user corrects your scheduling ("I cannot study at 10 AM because I have university lectures"), ALWAYS call 'save_learned_memory_preference' so it is remembered permanently.
- When the user attaches a Lecture PDF or study text, call 'synthesize_lecture_and_flashcards' to save a thorough structured summary AND a rich set of active-recall flashcards directly into their Study workspace.`,

  study_tutor: `Role: Socratic Study & Lecture PDF Synthesis Tutor.
You specialize in analyzing attached Lecture PDFs and study notes, extracting structured summaries, generating high-yield active-recall flashcards via 'synthesize_lecture_and_flashcards', quizzing the user step by step, and scheduling spaced repetition study blocks in strict lecture number sequence.`,

  schedule_architect: `Role: Realistic Time-Blocking, Exam-Aware & Energy Architect.
You design and adapt daily/weekly schedules around fixed university lectures, energy peaks, recovery buffers, exam proximity, lecture prerequisite sequences, and protected Prayer Time anchors. Always use 'generate_context_aware_schedule' or 'adapt_existing_schedule' for schedule planning and never schedule anything in the past.`,

  finance_health_coach: `Role: Holistic Finance & Wellbeing Coach.
You guide the user on nutrition macros, water intake, workouts, sleep consistency, and mindful budgeting/expense tracking, and you can log or edit Health and Finance entries directly.`,
};

const CANDIDATE_MODELS = [
  'gemini-3.8-flash',
  'gemini-3.1-flash-lite',
  'gemini-flash-latest',
] as const;

async function generateWithRetryAndFallback(params: {
  contents: any;
  preferredModel?: string;
  config?: Record<string, unknown>;
}) {
  const ai = getAiClient();
  let lastError: unknown = null;

  const modelOrder = params.preferredModel
    ? [params.preferredModel, ...CANDIDATE_MODELS.filter((m) => m !== params.preferredModel)]
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
  messageParts: any;
  history: { role: 'user' | 'model'; parts: { text: string }[] }[];
  preferredModel?: string;
  config?: Record<string, unknown>;
}) {
  const ai = getAiClient();
  let lastError: unknown = null;

  const modelOrder = params.preferredModel
    ? [params.preferredModel, ...CANDIDATE_MODELS.filter((m) => m !== params.preferredModel)]
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
          message: params.messageParts,
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

function parseLocalFallbackIntent(prompt: string, contextSnapshot: any, attachment?: any) {
  const lower = prompt.toLowerCase();
  const timezone = contextSnapshot?.profile?.timezone || contextSnapshot?.timezone || 'Africa/Cairo';
  const nowInfo = getNowInTimezone(timezone);
  const todayDate = nowInfo.dateStr;
  const currency = contextSnapshot?.currency || 'USD';
  const toolCalls: {
    name: string;
    args: Record<string, any>;
    permissionLevel: 'routine_write' | 'consequential';
  }[] = [];
  let reply = '';

  // Check if user is correcting memory (e.g., "I cannot study at 10 AM because I have university lectures")
  const memCorrection = extractMemoryCorrectionFromText(prompt, todayDate);
  if (memCorrection.detected && memCorrection.learnedRule) {
    toolCalls.push({
      name: 'save_learned_memory_preference',
      args: {
        ruleText: memCorrection.learnedRule.ruleText,
        ruleType: memCorrection.learnedRule.ruleType,
        startTime: memCorrection.learnedRule.startTime,
        endTime: memCorrection.learnedRule.endTime,
        periodOfDay: memCorrection.learnedRule.periodOfDay,
        energyLevel: memCorrection.learnedRule.energyLevel,
        isTemporaryOrUncertain: memCorrection.requiresUserConfirmation,
      },
      permissionLevel: 'routine_write',
    });
  }

  // Check if user is requesting adaptive rescheduling
  if (
    /\b(missed|exhausted|tired|only\s+have|have\s+only|move\s+.+?\s+to\s+tomorrow|exam.+?moved)\b/i.test(
      lower
    )
  ) {
    toolCalls.push({
      name: 'adapt_existing_schedule',
      args: {
        reasonOrRequest: prompt,
        targetDays: 3,
      },
      permissionLevel: 'consequential',
    });
    const adapted = runAdaptiveReschedule({
      utterance: prompt,
      baseInput: buildScheduleInputFromSnapshot(contextSnapshot, { targetDays: 3 }),
    });
    reply = `${adapted.changesExplained.join(' ')} Proposed ${adapted.scheduleResult.proposedBlocks.length} conflict-free study block(s) starting after ${nowInfo.timeStr} (${timezone}). Review and approve them in the schedule planner.`;
    return {
      reply,
      toolCalls,
      functionCalls: toolCalls,
      scheduleProposal: adapted.scheduleResult,
      usedModel: 'deterministic-scheduling-engine',
    };
  }

  if (
    attachment ||
    lower.includes('flashcard') ||
    lower.includes('summarize') ||
    lower.includes('summary') ||
    lower.includes('pdf')
  ) {
    const cleanTopic =
      attachment?.fileName?.replace(/\.[^.]+$/, '') ||
      prompt
        .replace(/create|generate|summary|summarize|flashcards|from|lecture|pdf|attached/gi, '')
        .trim() ||
      'Uploaded Lecture Material';

    toolCalls.push({
      name: 'synthesize_lecture_and_flashcards',
      args: {
        moduleCode: contextSnapshot?.studyModules?.[0]?.code || 'STUDY101',
        lectureTitle: cleanTopic.slice(0, 120),
        summaryNotes: `Structured synthesis for ${cleanTopic}: Core concepts, definitions, and active-recall checkpoints extracted and linked to your Study workspace.`,
        estimatedMinutes: 45,
        saveToLibraryNotes: true,
        flashcards: [
          {
            frontPrompt: `What is the primary mechanism and core objective of ${cleanTopic}?`,
            backAnswer: `Key mechanism and foundational principles of ${cleanTopic} as outlined in the lecture material.`,
          },
          {
            frontPrompt: `What are the high-yield clinical or exam takeaways from ${cleanTopic}?`,
            backAnswer: `Critical distinctions, diagnostic/analytical criteria, and application steps for ${cleanTopic}.`,
          },
          {
            frontPrompt: `How does ${cleanTopic} integrate with previous module concepts?`,
            backAnswer: `Synthesizes foundational definitions with applied problem-solving for spaced repetition mastery.`,
          },
        ],
      },
      permissionLevel: 'routine_write',
    });
    reply = `Synthesized lecture "${cleanTopic}" into a structured summary and created 3 active-recall flashcards in your Study & Library modules.`;
    return { reply, toolCalls, functionCalls: toolCalls, usedModel: 'local-intent-engine' };
  }

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
    )} (${category}). Please review and approve it in the preview card.`;
  } else if (
    lower.includes('plan my day') ||
    lower.includes('plan my week') ||
    lower.includes('generate schedule') ||
    lower.includes('daily schedule') ||
    lower.includes('weekly schedule') ||
    lower.includes('rebalance')
  ) {
    const targetDays = lower.includes('week') ? 7 : 1;
    toolCalls.push({
      name: 'generate_context_aware_schedule',
      args: { targetDays },
      permissionLevel: 'consequential',
    });
    const plan = generateContextAwareSchedule(
      buildScheduleInputFromSnapshot(contextSnapshot, { targetDays })
    );
    reply = `Generated a context-aware ${targetDays === 7 ? 'weekly' : 'daily'} schedule starting after ${nowInfo.timeStr} (${timezone}): ${plan.proposedBlocks.length} study blocks allocated (${plan.energyDistribution.totalScheduledStudyMinutes}m active study + ${plan.energyDistribution.breakMinutes}m breaks). Review and approve the proposed schedule.`;
    return {
      reply,
      toolCalls,
      functionCalls: toolCalls,
      scheduleProposal: plan,
      usedModel: 'deterministic-scheduling-engine',
    };
  } else if (
    lower.includes('schedule') ||
    lower.includes('block') ||
    lower.includes('calendar')
  ) {
    const timeMatch = prompt.match(/\b(\d{1,2}:\d{2})\b/);
    const rawStart = timeMatch ? timeMatch[1].padStart(5, '0') : formatMinutesToTime(roundUpToNext5Minutes(nowInfo.minutesFromMidnight + 15));
    const [h, m] = rawStart.split(':').map(Number);
    const endH = String(Math.min(23, h + 1)).padStart(2, '0');
    const rawEnd = `${endH}:${String(m).padStart(2, '0')}`;
    const safeArgs = sanitizeDirectScheduleCall(
      {
        title: prompt.replace(/^schedule\s+(a\s+)?/i, '').slice(0, 80) || 'Study Block',
        eventType: 'study_block',
        date: todayDate,
        startTime: rawStart,
        endTime: rawEnd,
        location: 'Study Desk',
      },
      contextSnapshot
    );

    toolCalls.push({
      name: 'schedule_study_block',
      args: safeArgs,
      permissionLevel: 'routine_write',
    });
    reply = `Scheduled "${safeArgs.title}" for ${safeArgs.startTime}–${safeArgs.endTime} on ${safeArgs.date} (verified against current time ${nowInfo.timeStr} ${timezone} and existing commitments).`;
  } else if (
    lower.includes('workout') ||
    lower.includes('gym') ||
    lower.includes('meal') ||
    lower.includes('ate') ||
    lower.includes('weight') ||
    lower.includes('water')
  ) {
    if (lower.includes('water')) {
      const ml = moneyMatch ? parseInt(moneyMatch[1], 10) : 500;
      toolCalls.push({
        name: 'log_water_intake',
        args: { addMl: ml },
        permissionLevel: 'routine_write',
      });
      reply = `Added ${ml} ml to your daily hydration log.`;
    } else {
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
          weightKg: isWeight && moneyMatch ? parseFloat(moneyMatch[1]) : undefined,
        },
        permissionLevel: 'routine_write',
      });
      reply = `Logged your ${
        isWeight ? 'body measurement' : isMeal ? 'meal' : 'workout'
      } in Health.`;
    }
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
    reply = `Workspace status for ${todayDate} (${nowInfo.timeStr} ${timezone}): ${openCount} open tasks and ${dueCount} flashcards tracked. Ask me to generate your context-aware daily/weekly schedule, adapt your plan, or attach a Lecture PDF to synthesize summaries & flashcards.`;
  }

  return { reply, toolCalls, functionCalls: toolCalls, usedModel: 'local-intent-engine' };
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Allow up to 25MB JSON payloads for Lecture PDF and image attachments
  app.use(express.json({ limit: '25mb' }));

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', service: 'life-os-server' });
  });

  // Authoritative Server Time Endpoint (Part 1.A — Africa/Cairo default + DST safe)
  app.get('/api/time', (req, res) => {
    const tz = String(req.query?.timezone || 'Africa/Cairo');
    const nowInfo = getNowInTimezone(tz);
    res.json(nowInfo);
  });

  // Deterministic 10-Step Context-Aware Schedule Generation Endpoint (Parts 1-4)
  app.post('/api/ai/schedule', (req, res) => {
    try {
      const input = req.body as ScheduleGenerationInput;
      const tz = input?.timezone || input?.memory?.userProfile?.timezone || 'Africa/Cairo';
      const nowInfo = getNowInTimezone(tz, input?.nowIso);
      const result = generateContextAwareSchedule({
        ...input,
        nowIso: input?.nowIso || nowInfo.utcIso,
        timezone: tz,
      });
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'Failed to generate schedule' });
    }
  });

  // Adaptive Rescheduling Endpoint (Part 5)
  app.post('/api/ai/schedule/adapt', (req, res) => {
    try {
      const utterance = String(req.body?.utterance || '');
      const baseInput = (req.body?.baseInput || {}) as ScheduleGenerationInput;
      const tz = baseInput?.timezone || baseInput?.memory?.userProfile?.timezone || 'Africa/Cairo';
      const nowInfo = getNowInTimezone(tz, baseInput?.nowIso);
      const result = runAdaptiveReschedule({
        utterance,
        baseInput: {
          ...baseInput,
          nowIso: baseInput?.nowIso || nowInfo.utcIso,
          timezone: tz,
        },
      });
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'Failed to adapt schedule' });
    }
  });

  // 1. Omniscient Multi-Turn Spoon Feeder AI Chat + PDF Attachment + Full-Site Tool Engine
  app.post('/api/ai/spoon-feeder', async (req, res) => {
    const prompt = req.body?.prompt || req.body?.message || '';
    const contextSnapshot = req.body?.contextSnapshot || {};
    const rawHistory = Array.isArray(req.body?.history) ? req.body.history : [];
    const rolePersona = String(req.body?.rolePersona || 'operator');
    const customSystemInstruction = String(req.body?.customSystemInstruction || '').trim();
    const modelTier = String(req.body?.modelTier || 'general');
    const attachment = req.body?.attachment as
      | { fileName: string; mimeType: string; base64Data?: string; textContent?: string }
      | undefined;

    if (!prompt && !attachment) {
      return res.status(400).json({ error: 'Prompt or attachment is required' });
    }

    const timezone = contextSnapshot?.profile?.timezone || contextSnapshot?.timezone || 'Africa/Cairo';
    const nowInfo = getNowInTimezone(timezone);

    // Pre-check if user message contains a memory correction (Part 3: Learning from corrections)
    const autoLearnedCorrection = extractMemoryCorrectionFromText(prompt, nowInfo.dateStr);

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

    const formattedHistory = rawHistory
      .filter((m: any) => m && typeof m.text === 'string' && m.text.trim().length > 0)
      .map((m: any) => ({
        role: (m.role === 'user' ? 'user' : 'model') as 'user' | 'model',
        parts: [{ text: String(m.text).trim() }],
      }));

    const roleDirective = ROLE_INSTRUCTIONS[rolePersona] || ROLE_INSTRUCTIONS.operator;

    // Build multimodal message parts if a PDF / image / text file is attached
    const userPromptText =
      prompt.trim() ||
      `Analyze the attached lecture document "${attachment?.fileName || 'Lecture.pdf'}", generate a comprehensive structured summary, and create active-recall flashcards in my Study workspace using synthesize_lecture_and_flashcards.`;

    let messageParts: any = userPromptText;
    if (attachment) {
      const parts: any[] = [];
      if (attachment.base64Data && attachment.mimeType) {
        parts.push({
          inlineData: {
            mimeType: attachment.mimeType,
            data: attachment.base64Data,
          },
        });
      } else if (attachment.textContent) {
        parts.push({
          text: `Attached Document (${attachment.fileName}):\n${attachment.textContent}`,
        });
      }
      parts.push({ text: userPromptText });
      messageParts = parts;
    }

    try {
      const systemInstruction = `You are Spoon Feeder AI, the omniscient multi-turn intelligence powering the entire Life OS website.
${roleDirective}
${customSystemInstruction ? `\nCustom User Directive:\n${customSystemInstruction}\n` : ''}
AUTHORITATIVE SERVER TIME & TIMEZONE (CRITICAL — DO NOT GUESS TIME):
- Current Date in ${timezone}: ${nowInfo.dateStr}
- Current Local Time in ${timezone}: ${nowInfo.timeStr} (UTC: ${nowInfo.utcIso})
- STRICT RULE: NEVER schedule any activity before ${nowInfo.timeStr} on ${nowInfo.dateStr}. If it is ${nowInfo.timeStr}, any activity on ${nowInfo.dateStr} MUST start after ${nowInfo.timeStr}.

Core Capabilities:
1. Context-Aware Scheduling & Adaptive Rescheduling:
   - When asked for a daily or weekly plan, call 'generate_context_aware_schedule'.
   - When the user says they missed a session, want to move a lecture to tomorrow, feel exhausted today, have an exam moved, or only have X hours today, call 'adapt_existing_schedule'.
   - When the user states a scheduling rule or correction (e.g. "I cannot study at 10 AM because I have university lectures"), call 'save_learned_memory_preference'.
2. Full Read/Write/Edit Access: You can inspect every item in the user's workspace and create, edit, or delete any item using your tools.
3. Lecture PDF & Study Synthesis: Whenever a user attaches a PDF/document or pastes lecture material, ALWAYS invoke 'synthesize_lecture_and_flashcards'.
4. Safeguards: Schedule generation stages a proposed schedule for user review before committing to the calendar.

Current User Workspace Context & Persistent Memory (Live Database State):
${JSON.stringify(contextSnapshot, null, 2)}`;

      const { response, usedModel } = await runMultiTurnChatWithFallback({
        messageParts,
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
      let generatedProposal: any = undefined;

      const mappedCalls = rawCalls.map((fc) => {
        let safeArgs = (fc.args || {}) as Record<string, any>;
        if (fc.name === 'schedule_study_block') {
          safeArgs = sanitizeDirectScheduleCall(safeArgs, contextSnapshot);
        } else if (fc.name === 'generate_context_aware_schedule') {
          const targetDays = Number(safeArgs.targetDays) || 1;
          const maxStudyHoursToday =
            safeArgs.maxStudyHoursToday !== undefined ? Number(safeArgs.maxStudyHoursToday) : undefined;
          const todayEnergyOverride = ['high', 'medium', 'low'].includes(String(safeArgs.todayEnergyOverride))
            ? (String(safeArgs.todayEnergyOverride) as EnergyLevel)
            : undefined;
          generatedProposal = generateContextAwareSchedule(
            buildScheduleInputFromSnapshot(contextSnapshot, {
              targetDays,
              maxStudyHoursToday,
              todayEnergyOverride,
            })
          );
          safeArgs = { ...safeArgs, scheduleProposal: generatedProposal };
        } else if (fc.name === 'adapt_existing_schedule') {
          const adapted = runAdaptiveReschedule({
            utterance: String(safeArgs.reasonOrRequest || prompt),
            baseInput: buildScheduleInputFromSnapshot(contextSnapshot, {
              targetDays: Number(safeArgs.targetDays) || 3,
            }),
          });
          generatedProposal = adapted.scheduleResult;
          safeArgs = {
            ...safeArgs,
            adaptationType: adapted.adaptationType,
            changesExplained: adapted.changesExplained,
            scheduleProposal: adapted.scheduleResult,
          };
        }

        return {
          name: fc.name,
          args: safeArgs,
          permissionLevel:
            (fc.name === 'propose_finance_record' && !safeArgs?.autoApply) ||
            fc.name === 'rebalance_day_schedule' ||
            fc.name === 'generate_context_aware_schedule' ||
            fc.name === 'adapt_existing_schedule'
              ? 'consequential'
              : 'routine_write',
        };
      });

      // Ensure auto-detected memory correction is included if LLM didn't explicitly emit save_learned_memory_preference
      if (
        autoLearnedCorrection.detected &&
        autoLearnedCorrection.learnedRule &&
        !mappedCalls.some((c) => c.name === 'save_learned_memory_preference')
      ) {
        mappedCalls.push({
          name: 'save_learned_memory_preference',
          args: {
            ruleText: autoLearnedCorrection.learnedRule.ruleText,
            ruleType: autoLearnedCorrection.learnedRule.ruleType,
            startTime: autoLearnedCorrection.learnedRule.startTime,
            endTime: autoLearnedCorrection.learnedRule.endTime,
            periodOfDay: autoLearnedCorrection.learnedRule.periodOfDay,
            energyLevel: autoLearnedCorrection.learnedRule.energyLevel,
            isTemporaryOrUncertain: autoLearnedCorrection.requiresUserConfirmation,
          },
          permissionLevel: 'routine_write',
        });
      }

      return res.json({
        reply:
          text ||
          (mappedCalls.length > 0
            ? 'Executed your request across your Life OS workspace.'
            : 'Processed your request against your Life OS workspace.'),
        toolCalls: mappedCalls,
        functionCalls: mappedCalls,
        scheduleProposal: generatedProposal,
        serverTime: nowInfo,
        usedModel,
        rolePersona,
      });
    } catch (error: any) {
      console.warn(
        'Gemini models experiencing high demand; using Spoon Feeder local intent engine:',
        error?.message
      );
      const fallback = parseLocalFallbackIntent(userPromptText, contextSnapshot, attachment);
      return res.json(fallback);
    }
  });

  // 2. Study Material & PDF Extraction -> Summary + Flashcard Generator
  app.post('/api/ai/study-synthesis', async (req, res) => {
    const moduleCode = req.body?.moduleCode || 'STUDY';
    const lectureTitle = req.body?.lectureTitle || req.body?.topicTitle || 'Lecture';
    const rawContent = req.body?.rawContent || req.body?.sourceNotes || '';
    const attachment = req.body?.attachment as
      | { fileName: string; mimeType: string; base64Data?: string }
      | undefined;

    if (!rawContent && !attachment?.base64Data) {
      return res.status(400).json({ error: 'Study material content or PDF is required' });
    }

    try {
      const parts: any[] = [];
      if (attachment?.base64Data && attachment?.mimeType) {
        parts.push({
          inlineData: {
            mimeType: attachment.mimeType,
            data: attachment.base64Data,
          },
        });
      }
      parts.push({
        text: `Analyze the study material for module "${moduleCode} - ${lectureTitle}". ${
          rawContent ? `\n\nNotes/Content:\n${rawContent}` : ''
        }`,
      });

      const response = await generateWithRetryAndFallback({
        contents: { parts },
        config: {
          systemInstruction:
            'Extract a comprehensive, source-grounded lecture summary, provide clarifying intuition separated from source text, recommend a study duration in minutes, and generate 5 high-yield active-recall flashcards (front question, back concise answer).',
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              sourceSummary: {
                type: Type.STRING,
                description: 'Detailed source-grounded summary of the lecture.',
              },
              additionalExplanation: {
                type: Type.STRING,
                description: 'Clarifying intuition and exam tips separated from source text.',
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
      const sentences = String(rawContent || lectureTitle)
        .split(/(?<=[.!?])\s+/)
        .filter((s) => s.trim().length > 10);
      const summary =
        sentences.slice(0, 3).join(' ') ||
        `Structured summary for ${moduleCode}: ${lectureTitle}.`;
      return res.json({
        sourceSummary: summary,
        result: summary,
        additionalExplanation: `Focus on active recall of the core mechanisms in ${moduleCode} (${lectureTitle}).`,
        estimatedMinutes: 45,
        flashcards: [
          {
            frontPrompt: `What is the primary concept covered in ${lectureTitle}?`,
            backAnswer: sentences[0] || String(rawContent || lectureTitle).slice(0, 180),
          },
          {
            frontPrompt: `What is a key mechanism or takeaway from ${lectureTitle}?`,
            backAnswer:
              sentences[1] || sentences[0] || String(rawContent || lectureTitle).slice(0, 180),
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

  // 4. PDF Schedule / Syllabus / Timetable Importer -> Structured Lectures & Calendar Events
  app.post('/api/ai/parse-schedule-pdf', async (req, res) => {
    const attachment = req.body?.attachment as
      | { fileName: string; mimeType: string; base64Data?: string; textContent?: string }
      | undefined;
    const rawText = String(req.body?.rawText || '').trim();
    const moduleCode = String(req.body?.moduleCode || 'STUDY').toUpperCase();
    const timezone = String(req.body?.timezone || 'Africa/Cairo');
    const nowInfo = getNowInTimezone(timezone);
    const todayDate = String(req.body?.todayDate || nowInfo.dateStr);

    if (!attachment?.base64Data && !attachment?.textContent && !rawText) {
      return res.status(400).json({ error: 'PDF attachment or schedule text is required' });
    }

    const extractFallbackFromText = (sourceText: string, fileNameHint: string) => {
      const cleanName = fileNameHint.replace(/\.(pdf|txt|md|csv|ics)$/i, '').replace(/[_-]+/g, ' ').trim();
      const lines = sourceText
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter((l) => l.length >= 3 && !/^%[A-Za-z0-9-]/.test(l) && !/^(obj|endobj|stream|endstream|xref|trailer)$/i.test(l));

      const lectures: {
        lectureNumber: number;
        title: string;
        estimatedMinutes: number;
        difficulty: 'HIGH' | 'MEDIUM' | 'LOW';
        date?: string;
        startTime?: string;
        endTime?: string;
      }[] = [];

      const calendarEvents: {
        title: string;
        eventType: 'lecture' | 'exam' | 'study_block' | 'fixed';
        date: string;
        startTime: string;
        endTime: string;
        location?: string;
      }[] = [];

      let seq = 1;
      for (const line of lines.slice(0, 60)) {
        const dateMatch = line.match(/\b(\d{4}-\d{2}-\d{2})\b/);
        const timeRangeMatch = line.match(/\b(\d{1,2}:\d{2})\s*(?:-|–|to)\s*(\d{1,2}:\d{2})\b/i);
        const singleTimeMatch = line.match(/\b(\d{1,2}:\d{2})\b/);
        const lecNumMatch = line.match(/(?:lecture|lec|week|module|session|topic)\s*#?\s*(\d+)/i);
        const num = lecNumMatch ? parseInt(lecNumMatch[1], 10) : seq;

        const eventDate = dateMatch ? dateMatch[1] : addDaysToDateStr(todayDate, (seq - 1) % 7);
        const startTime = timeRangeMatch
          ? timeRangeMatch[1].padStart(5, '0')
          : singleTimeMatch
          ? singleTimeMatch[1].padStart(5, '0')
          : undefined;
        let endTime = timeRangeMatch ? timeRangeMatch[2].padStart(5, '0') : undefined;
        if (startTime && !endTime) {
          const startMin = parseTimeToMinutes(startTime);
          endTime = formatMinutesToTime(Math.min(23 * 60, startMin + 60));
        }

        const isExam = /\b(exam|midterm|final|quiz|assessment)\b/i.test(line);
        const cleanTitle = line
          .replace(/\b(\d{4}-\d{2}-\d{2})\b/g, '')
          .replace(/\b(\d{1,2}:\d{2})\s*(?:-|–|to)\s*(\d{1,2}:\d{2})\b/gi, '')
          .replace(/^[-•*\s|]+|[-•*\s|]+$/g, '')
          .trim();

        if (!cleanTitle || cleanTitle.length < 3) continue;

        const formattedLectureTitle = /^lecture\s*\d+/i.test(cleanTitle)
          ? cleanTitle
          : `Lecture ${String(num).padStart(2, '0')}: ${cleanTitle}`;

        if (!isExam) {
          lectures.push({
            lectureNumber: num,
            title: formattedLectureTitle.slice(0, 160),
            estimatedMinutes: 45,
            difficulty: /pathology|pharmacology|physiology|surgery|neuro|cardio|mechanism/i.test(cleanTitle)
              ? 'HIGH'
              : 'MEDIUM',
            date: dateMatch ? dateMatch[1] : undefined,
            startTime,
            endTime,
          });
          seq++;
        }

        if (startTime && endTime) {
          calendarEvents.push({
            title: isExam ? cleanTitle.slice(0, 140) : formattedLectureTitle.slice(0, 140),
            eventType: isExam ? 'exam' : 'lecture',
            date: eventDate,
            startTime,
            endTime,
            location: 'University Hall / Study Desk',
          });
        }
      }

      if (lectures.length === 0) {
        for (let i = 1; i <= 4; i++) {
          lectures.push({
            lectureNumber: i,
            title: `Lecture 0${i}: ${cleanName || moduleCode} — Part ${i}`,
            estimatedMinutes: 45,
            difficulty: i >= 3 ? 'HIGH' : 'MEDIUM',
          });
        }
      }

      return {
        detectedModuleCode: moduleCode,
        detectedModuleTitle: cleanName || 'Imported Schedule Module',
        summary: `Extracted ${lectures.length} lectures${
          calendarEvents.length > 0 ? ` and ${calendarEvents.length} scheduled calendar slots` : ''
        } from "${fileNameHint}".`,
        lectures,
        calendarEvents,
      };
    };

    try {
      const parts: any[] = [];
      if (attachment?.base64Data && attachment?.mimeType) {
        parts.push({
          inlineData: {
            mimeType: attachment.mimeType || 'application/pdf',
            data: attachment.base64Data,
          },
        });
      }
      if (attachment?.textContent) {
        parts.push({
          text: `Attached Schedule File (${attachment.fileName}):\n${attachment.textContent}`,
        });
      }
      if (rawText) {
        parts.push({
          text: `Additional Schedule Text:\n${rawText}`,
        });
      }

      parts.push({
        text: `Extract the academic schedule, syllabus lectures, and any dated/timed timetable events from this document ("${
          attachment?.fileName || 'Schedule.pdf'
        }").
Current Date in ${timezone}: ${todayDate}.
If the document lists lectures or topics in sequence, number them sequentially (Lecture 01, Lecture 02, etc.) and preserve their exact order.
If the document includes class times, lab sessions, or exam dates/times, include them in calendarEvents using YYYY-MM-DD dates (relative to ${todayDate} if only day-of-week is given) and 24-hour HH:mm startTime/endTime.`,
      });

      const response = await generateWithRetryAndFallback({
        contents: { parts },
        config: {
          systemInstruction:
            'You are a precision academic schedule and syllabus PDF parser. Extract all lectures in chronological/prerequisite sequence AND any timed timetable/calendar events (lectures, labs, exams, study blocks) into structured JSON.',
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              detectedModuleCode: {
                type: Type.STRING,
                description: 'Short course or module code if found (e.g. CARD301, MED204).',
              },
              detectedModuleTitle: {
                type: Type.STRING,
                description: 'Course or subject title extracted from the schedule PDF.',
              },
              detectedExamDate: {
                type: Type.STRING,
                description: 'Exam date in YYYY-MM-DD format if mentioned in the PDF.',
              },
              summary: {
                type: Type.STRING,
                description: '1-sentence summary of the extracted schedule.',
              },
              lectures: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    lectureNumber: { type: Type.INTEGER },
                    title: {
                      type: Type.STRING,
                      description: 'Formatted as "Lecture XX: Title"',
                    },
                    estimatedMinutes: { type: Type.INTEGER },
                    difficulty: {
                      type: Type.STRING,
                      description: 'HIGH, MEDIUM, or LOW',
                    },
                    date: {
                      type: Type.STRING,
                      description: 'Optional YYYY-MM-DD date if specified',
                    },
                    startTime: {
                      type: Type.STRING,
                      description: 'Optional 24h HH:mm start time',
                    },
                    endTime: {
                      type: Type.STRING,
                      description: 'Optional 24h HH:mm end time',
                    },
                  },
                  required: ['lectureNumber', 'title', 'estimatedMinutes', 'difficulty'],
                },
              },
              calendarEvents: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    title: { type: Type.STRING },
                    eventType: {
                      type: Type.STRING,
                      description: 'lecture, exam, study_block, or fixed',
                    },
                    date: {
                      type: Type.STRING,
                      description: 'YYYY-MM-DD date',
                    },
                    startTime: {
                      type: Type.STRING,
                      description: '24h HH:mm start time',
                    },
                    endTime: {
                      type: Type.STRING,
                      description: '24h HH:mm end time',
                    },
                    location: { type: Type.STRING },
                  },
                  required: ['title', 'eventType', 'date', 'startTime', 'endTime'],
                },
              },
            },
            required: ['detectedModuleTitle', 'summary', 'lectures', 'calendarEvents'],
          },
        },
      });

      const parsed = JSON.parse((response.text ?? '{}').trim());
      const lectures = Array.isArray(parsed.lectures) ? parsed.lectures : [];
      const calendarEvents = Array.isArray(parsed.calendarEvents) ? parsed.calendarEvents : [];

      if (lectures.length === 0 && calendarEvents.length === 0) {
        throw new Error('Empty extraction result');
      }

      return res.json({
        detectedModuleCode: parsed.detectedModuleCode || moduleCode,
        detectedModuleTitle:
          parsed.detectedModuleTitle ||
          (attachment?.fileName
            ? attachment.fileName.replace(/\.pdf$/i, '')
            : 'Imported Schedule'),
        detectedExamDate: parsed.detectedExamDate || undefined,
        summary:
          parsed.summary ||
          `Extracted ${lectures.length} lectures and ${calendarEvents.length} calendar events from ${
            attachment?.fileName || 'schedule'
          }.`,
        lectures,
        calendarEvents,
      });
    } catch (error: any) {
      console.warn('Schedule PDF parser fallback triggered:', error?.message);
      let decodedPdfText = rawText || attachment?.textContent || '';
      if (!decodedPdfText && attachment?.base64Data) {
        try {
          const buf = Buffer.from(attachment.base64Data, 'base64').toString('latin1');
          const matches = buf.match(/\(([^()]{4,120})\)/g) || [];
          decodedPdfText = matches
            .map((m) => m.slice(1, -1).replace(/\\[nrt]/g, ' '))
            .filter((s) => /[A-Za-z]{3,}/.test(s) && !/Font|Type|Page|Catalog|Filter|FlateDecode/i.test(s))
            .join('\n');
        } catch {
          decodedPdfText = '';
        }
      }
      const fallbackResult = extractFallbackFromText(
        decodedPdfText,
        attachment?.fileName || 'Schedule.pdf'
      );
      return res.json(fallbackResult);
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
