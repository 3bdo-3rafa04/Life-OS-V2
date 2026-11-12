import React, { useState, useRef, useEffect } from 'react';
import { useLifeOS } from '../context/LifeOSContext';
import {
  AiActionLogRecord,
  TaskItem,
  CalendarEventItem,
  StudyItemRecord,
  KnowledgeItemRecord,
  FinanceRecordItem,
  GoalHabitRecord,
  DailyReviewRecord,
  UserProfile,
} from '../types';
import {
  Sparkles,
  Send,
  Check,
  X,
  RotateCcw,
  Trash2,
  Bot,
  User,
  SlidersHorizontal,
  MessageSquarePlus,
  Cpu,
  Paperclip,
  FileText,
  BookOpen,
  Layers,
  Compass,
} from 'lucide-react';
import { SmartSchedulerPanel } from './SmartSchedulerPanel';
import { ScheduleGenerationResult, EnergyLevel } from '../services/schedulingEngine';
import { executeLocalSpoonFeederFallback } from '../services/localFreeAiFallback';

type RolePersonaId = 'operator' | 'study_tutor' | 'schedule_architect' | 'finance_health_coach';
type ModelTierId = 'general' | 'fast' | 'interactive' | 'deep';

interface RolePersonaOption {
  id: RolePersonaId;
  label: string;
  tagline: string;
  defaultInstruction: string;
  quickPrompts: string[];
}

const ROLE_PERSONAS: RolePersonaOption[] = [
  {
    id: 'operator',
    label: 'Omniscient Workspace Operator',
    tagline: 'Reads, creates, edits & deletes across Tasks, Calendar, Study, Notes, Health, Finance & Goals',
    defaultInstruction:
      'Act as the omniscient Life OS Workspace Operator. You have full read, create, edit, and delete access across every module on this website. Execute requested creates/edits/deletes immediately with your tools, synthesize attached lecture PDFs into summaries and flashcards, and confirm every action clearly.',
    quickPrompts: [
      'Audit my entire workspace and tell me my top 3 priorities today',
      'Create a high-priority task and schedule a 45m study block at 16:00',
      'Log 500ml water intake and a 45m workout session',
    ],
  },
  {
    id: 'study_tutor',
    label: 'Lecture PDF & Flashcard Synthesizer',
    tagline: 'Extracts structured summaries & active-recall flashcards from attached lecture PDFs',
    defaultInstruction:
      'Act as an Academic Lecture Synthesizer & Socratic Tutor. When a PDF or lecture text is attached, call synthesize_lecture_and_flashcards to save a comprehensive summary and 5-8 high-yield active-recall flashcards directly into the Study & Library workspace.',
    quickPrompts: [
      'Summarize the attached lecture PDF and create active-recall flashcards',
      'Quiz me on my active study modules with 3 progressive questions',
      'Create a new study module and generate 5 flashcards for it',
    ],
  },
  {
    id: 'schedule_architect',
    label: 'Schedule & Task Architect',
    tagline: 'Context-aware scheduling engine (Africa/Cairo), lecture sequences, exam readiness & adaptive rescheduling',
    defaultInstruction:
      'Act as an intelligent, context-aware Schedule & Task Architect in the user\'s timezone (Africa/Cairo). Never schedule in the past or overlap existing commitments. Respect lecture sequences (Lecture 1 before Lecture 2), exam countdowns, and energy windows. Use generate_context_aware_schedule for daily/weekly schedules, adapt_existing_schedule for missed sessions or low energy, and save_learned_memory_preference when the user teaches you a scheduling constraint.',
    quickPrompts: [
      'Generate a realistic context-aware schedule for today and tomorrow',
      'I missed my morning study session — adapt my schedule without overloading tomorrow',
      'I cannot study at 10 AM on Mondays because I have university lectures',
    ],
  },
  {
    id: 'finance_health_coach',
    label: 'Finance, Health & Goals Coach',
    tagline: 'Manages macros, hydration, workouts, transactions, budgets & habits',
    defaultInstruction:
      'Act as a supportive Finance, Health & Goals Coach. Log or edit meals, workouts, hydration, transactions, and habits/goals across the workspace.',
    quickPrompts: [
      'Log a high-protein meal (650 kcal, 45g protein) and 500ml water',
      'Create a daily habit for 60m Deep Study and mark it complete today',
      'Record a $35 expense for study textbooks',
    ],
  },
];

const MODEL_TIERS: { id: ModelTierId; label: string; badge: string; desc: string }[] = [
  {
    id: 'general',
    label: 'General (gemini-3.8-flash)',
    badge: 'gemini-3.8-flash',
    desc: 'Balanced speed, multimodal PDF reading & 20-tool execution',
  },
  {
    id: 'fast',
    label: 'Fast (gemini-3.1-flash-lite)',
    badge: 'gemini-3.1-flash-lite',
    desc: 'Ultra-low latency for quick workspace edits',
  },
  {
    id: 'interactive',
    label: 'Interactive (Thinking Med)',
    badge: 'gemini-3.8-flash · Med',
    desc: 'Enhanced multi-step workspace orchestration & PDF synthesis',
  },
  {
    id: 'deep',
    label: 'Deep Reasoning (Thinking High)',
    badge: 'gemini-3.8-flash · High',
    desc: 'Maximum reasoning depth for dense lecture PDFs & schedule architecture',
  },
];

interface AttachedDocument {
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  base64Data?: string;
  textContent?: string;
}

interface SynthesizedBundle {
  lectureTitle: string;
  moduleCode: string;
  summary: string;
  flashcards: { frontPrompt: string; backAnswer: string }[];
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  timestamp: string;
  personaLabel?: string;
  modelBadge?: string;
  attachmentName?: string;
  actionsExecuted?: string[];
  synthesizedBundle?: SynthesizedBundle;
}

interface SpoonFeederPanelProps {
  onNavigate?: (tab: string) => void;
  compact?: boolean;
}

export const SpoonFeederPanel: React.FC<SpoonFeederPanelProps> = ({
  onNavigate,
  compact = false,
}) => {
  const {
    profile,
    tasks,
    events,
    studyModules,
    studyItems,
    healthLogs,
    financeRecords,
    knowledgeItems,
    goalsHabits,
    dailyReviews,
    aiLogs,
    todayDate,
    currentTimeStr,
    timezone,
    persistentMemory,
    setScheduleProposal,
    addOrUpdateLearnedRule,
    generateSmartSchedule,
    adaptSmartSchedule,
    createTask,
    updateTask,
    deleteTask,
    createCalendarEvent,
    updateCalendarEvent,
    deleteCalendarEvent,
    createStudyModule,
    createStudyItem,
    updateStudyItem,
    deleteStudyItem,
    createHealthLog,
    updateHealthLog,
    deleteHealthLog,
    createFinanceRecord,
    updateFinanceRecord,
    deleteFinanceRecord,
    createKnowledgeItem,
    updateKnowledgeItem,
    deleteKnowledgeItem,
    createGoalHabit,
    updateGoalHabit,
    deleteGoalHabit,
    saveDailyReview,
    updateProfileSettings,
    logAiAction,
    resolveAiProposal,
    deleteAiLog,
  } = useLifeOS();

  const [rolePersona, setRolePersona] = useState<RolePersonaId>('operator');
  const [modelTier, setModelTier] = useState<ModelTierId>('general');
  const [showSystemConfig, setShowSystemConfig] = useState(false);
  const [customSystemInstruction, setCustomSystemInstruction] = useState('');

  const activePersona =
    ROLE_PERSONAS.find((p) => p.id === rolePersona) || ROLE_PERSONAS[0];
  const activeModel = MODEL_TIERS.find((m) => m.id === modelTier) || MODEL_TIERS[0];

  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [attachment, setAttachment] = useState<AttachedDocument | null>(null);
  const [attachmentError, setAttachmentError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome-msg',
      role: 'assistant',
      text: 'Spoon Feeder AI is connected to your entire Life OS workspace. I can read, create, edit, and delete across Tasks, Calendar, Study Modules, Flashcards, Library Notes, Health, Finance, Goals, and Settings—or attach a Lecture PDF below to automatically generate a structured summary and active-recall flashcards.',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      personaLabel: ROLE_PERSONAS[0].label,
      modelBadge: MODEL_TIERS[0].badge,
    },
  ]);

  const threadEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    threadEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const normalizeCategory = (raw: unknown): TaskItem['category'] => {
    const val = String(raw || 'study').toLowerCase();
    if (
      val === 'study' ||
      val === 'work' ||
      val === 'health' ||
      val === 'finance' ||
      val === 'personal' ||
      val === 'routine'
    ) {
      return val;
    }
    return 'study';
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    setAttachmentError(null);
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 18 * 1024 * 1024) {
      setAttachmentError('File is too large (max 18 MB). Please attach a smaller PDF or document.');
      e.target.value = '';
      return;
    }

    const isText =
      file.type === 'text/plain' ||
      file.type === 'text/markdown' ||
      file.name.endsWith('.txt') ||
      file.name.endsWith('.md');

    if (isText) {
      const reader = new FileReader();
      reader.onload = () => {
        setAttachment({
          fileName: file.name,
          mimeType: file.type || 'text/plain',
          sizeBytes: file.size,
          textContent: String(reader.result || ''),
        });
      };
      reader.readAsText(file);
    } else {
      const reader = new FileReader();
      reader.onload = () => {
        const resultStr = String(reader.result || '');
        const commaIdx = resultStr.indexOf(',');
        const base64Data = commaIdx >= 0 ? resultStr.slice(commaIdx + 1) : resultStr;
        setAttachment({
          fileName: file.name,
          mimeType: file.type || 'application/pdf',
          sizeBytes: file.size,
          base64Data,
        });
      };
      reader.readAsDataURL(file);
    }
    e.target.value = '';
  };

  const handleClearThread = () => {
    setMessages([
      {
        id: `welcome-${Date.now()}`,
        role: 'assistant',
        text: `Started a fresh multi-turn conversation as ${activePersona.label} (${activeModel.badge}). Attach a lecture PDF or tell me what to read, create, or edit across your workspace.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        personaLabel: activePersona.label,
        modelBadge: activeModel.badge,
      },
    ]);
  };

  // Match helpers by ID or fuzzy title
  const findTask = (id?: unknown, titleMatch?: unknown) => {
    if (id) {
      const byId = tasks.find((t) => t.id === String(id));
      if (byId) return byId;
    }
    if (titleMatch) {
      const q = String(titleMatch).toLowerCase().trim();
      return (
        tasks.find((t) => t.title.toLowerCase() === q) ||
        tasks.find((t) => t.title.toLowerCase().includes(q))
      );
    }
    return undefined;
  };

  const findEvent = (id?: unknown, titleMatch?: unknown) => {
    if (id) {
      const byId = events.find((ev) => ev.id === String(id));
      if (byId) return byId;
    }
    if (titleMatch) {
      const q = String(titleMatch).toLowerCase().trim();
      return (
        events.find((ev) => ev.title.toLowerCase() === q) ||
        events.find((ev) => ev.title.toLowerCase().includes(q))
      );
    }
    return undefined;
  };

  const findStudyItem = (id?: unknown, titleMatch?: unknown) => {
    if (id) {
      const byId = studyItems.find((s) => s.id === String(id));
      if (byId) return byId;
    }
    if (titleMatch) {
      const q = String(titleMatch).toLowerCase().trim();
      return (
        studyItems.find((s) => s.title.toLowerCase() === q) ||
        studyItems.find((s) => s.title.toLowerCase().includes(q)) ||
        studyItems.find((s) => (s.frontPrompt || '').toLowerCase().includes(q))
      );
    }
    return undefined;
  };

  const findKnowledgeItem = (id?: unknown, titleMatch?: unknown) => {
    if (id) {
      const byId = knowledgeItems.find((k) => k.id === String(id));
      if (byId) return byId;
    }
    if (titleMatch) {
      const q = String(titleMatch).toLowerCase().trim();
      return (
        knowledgeItems.find((k) => k.title.toLowerCase() === q) ||
        knowledgeItems.find((k) => k.title.toLowerCase().includes(q))
      );
    }
    return undefined;
  };

  const findHealthLog = (id?: unknown, titleMatch?: unknown) => {
    if (id) {
      const byId = healthLogs.find((h) => h.id === String(id));
      if (byId) return byId;
    }
    if (titleMatch) {
      const q = String(titleMatch).toLowerCase().trim();
      return (
        healthLogs.find((h) => h.title.toLowerCase() === q) ||
        healthLogs.find((h) => h.title.toLowerCase().includes(q))
      );
    }
    return undefined;
  };

  const findFinanceRecord = (id?: unknown, titleMatch?: unknown) => {
    if (id) {
      const byId = financeRecords.find((f) => f.id === String(id));
      if (byId) return byId;
    }
    if (titleMatch) {
      const q = String(titleMatch).toLowerCase().trim();
      return (
        financeRecords.find((f) => f.title.toLowerCase() === q) ||
        financeRecords.find((f) => f.title.toLowerCase().includes(q))
      );
    }
    return undefined;
  };

  const findGoalHabit = (id?: unknown, titleMatch?: unknown) => {
    if (id) {
      const byId = goalsHabits.find((g) => g.id === String(id));
      if (byId) return byId;
    }
    if (titleMatch) {
      const q = String(titleMatch).toLowerCase().trim();
      return (
        goalsHabits.find((g) => g.title.toLowerCase() === q) ||
        goalsHabits.find((g) => g.title.toLowerCase().includes(q))
      );
    }
    return undefined;
  };

  const handleSend = async (customPrompt?: string) => {
    const defaultPdfPrompt = attachment
      ? `Please read the attached document "${attachment.fileName}", synthesize a structured lecture summary, and generate active-recall flashcards saved to my Study & Library workspace.`
      : '';
    const textToSend = (customPrompt ?? (input.trim() || defaultPdfPrompt)).trim();
    if (!textToSend || loading) return;

    const currentAttachment = attachment;
    const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      text: textToSend,
      timestamp: nowTime,
      attachmentName: currentAttachment?.fileName,
    };

    const historyPayload = messages
      .filter((m) => m.id !== 'welcome-msg' && !m.id.startsWith('welcome-'))
      .map((m) => ({
        role: m.role === 'user' ? 'user' : 'model',
        text: m.text,
      }));

    setMessages((prev) => [...prev, userMsg]);
    if (!customPrompt) setInput('');
    setAttachment(null);
    setLoading(true);

    try {
      // Full omniscient workspace state snapshot so Gemini can read & reference every entity
      const contextSnapshot = {
        todayDate,
        currentTimeStr,
        timezone,
        persistentMemory,
        profile: profile
          ? {
              displayName: profile.displayName,
              city: profile.city,
              currency: profile.currency,
              calorieTarget: profile.calorieTarget,
              proteinTargetGrams: profile.proteinTargetGrams,
              waterTargetMl: profile.waterTargetMl,
              waterLoggedTodayMl: profile.waterLoggedTodayMl,
              xp: profile.xp,
              level: profile.level,
              coins: profile.coins,
              streakDays: profile.streakDays,
            }
          : null,
        tasks: tasks.slice(0, 40).map((t) => ({
          id: t.id,
          title: t.title,
          category: t.category,
          priority: t.priority,
          status: t.status,
          dueDate: t.dueDate,
          estimatedMinutes: t.estimatedMinutes,
          notes: t.notes?.slice(0, 120),
        })),
        events: events.slice(0, 35).map((e) => ({
          id: e.id,
          title: e.title,
          eventType: e.eventType,
          date: e.date,
          startTime: e.startTime,
          endTime: e.endTime,
          isProtectedAnchor: e.isProtectedAnchor,
        })),
        studyModules: studyModules.map((m) => ({
          id: m.id,
          code: m.code,
          title: m.title,
          term: m.term,
          examDate: m.examDate,
          completedLectures: m.completedLectures,
          totalLectures: m.totalLectures,
        })),
        studyItems: studyItems.slice(0, 45).map((s) => ({
          id: s.id,
          moduleId: s.moduleId,
          moduleCode: s.moduleCode,
          title: s.title,
          itemType: s.itemType,
          status: s.status,
          confidenceRating: s.confidenceRating,
          nextReviewDate: s.nextReviewDate,
        })),
        knowledgeItems: knowledgeItems.slice(0, 30).map((k) => ({
          id: k.id,
          title: k.title,
          itemType: k.itemType,
          status: k.status,
          tags: k.tags,
        })),
        healthLogs: healthLogs.slice(0, 25).map((h) => ({
          id: h.id,
          logType: h.logType,
          date: h.date,
          title: h.title,
          calories: h.calories,
          proteinGrams: h.proteinGrams,
          durationMinutes: h.durationMinutes,
          weightKg: h.weightKg,
        })),
        financeRecords: financeRecords.slice(0, 25).map((f) => ({
          id: f.id,
          recordType: f.recordType,
          title: f.title,
          amountMajor: Math.round((f.amountMinor || 0) / 100),
          category: f.category,
          date: f.date,
        })),
        goalsHabits: goalsHabits.slice(0, 25).map((g) => ({
          id: g.id,
          recordType: g.recordType,
          title: g.title,
          status: g.status,
          progressPercent: g.progressPercent,
          streakCount: g.streakCount,
          completedToday: g.completedToday,
        })),
        dailyReviews: dailyReviews.slice(0, 5).map((r) => ({
          date: r.date,
          energyLevel: r.energyLevel,
          completionScore: r.completionScore,
          wins: r.wins,
        })),
      };

      let data: any;
      try {
        const res = await fetch('/api/ai/spoon-feeder', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt: textToSend,
            message: textToSend,
            history: historyPayload,
            rolePersona,
            modelTier,
            customSystemInstruction:
              customSystemInstruction.trim() || activePersona.defaultInstruction,
            contextSnapshot,
            attachment: currentAttachment
              ? {
                  fileName: currentAttachment.fileName,
                  mimeType: currentAttachment.mimeType,
                  base64Data: currentAttachment.base64Data,
                  textContent: currentAttachment.textContent,
                }
              : undefined,
          }),
        });

        if (!res.ok) {
          throw new Error('Fallback to local free AI engine');
        }
        data = await res.json();
      } catch {
        data = executeLocalSpoonFeederFallback(
          textToSend,
          contextSnapshot,
          currentAttachment
            ? {
                fileName: currentAttachment.fileName,
                mimeType: currentAttachment.mimeType,
                base64Data: currentAttachment.base64Data,
                textContent: currentAttachment.textContent,
              }
            : undefined
        );
      }

      const calls: { name: string; args: Record<string, unknown> }[] =
        data.toolCalls || data.functionCalls || [];

      const executedSummaries: string[] = [];
      let latestSynthesizedBundle: SynthesizedBundle | undefined;

      for (const call of calls) {
        const name = call.name;
        const args = call.args || {};

        // 1. CREATE TASK
        if (name === 'create_task' || name === 'createTask') {
          const title = String(args.title || 'New Task');
          const category = normalizeCategory(args.category);
          const priority = (['low', 'medium', 'high', 'critical'].includes(String(args.priority))
            ? String(args.priority)
            : 'medium') as TaskItem['priority'];
          const estimatedMinutes = Number(args.estimatedMinutes) || 30;
          const dueDate = String(args.dueDate || todayDate);
          const notes = args.notes
            ? String(args.notes)
            : `Created by Spoon Feeder AI (${activePersona.label})`;

          await createTask({
            title,
            notes,
            category,
            priority,
            status: 'todo',
            dueDate,
            estimatedMinutes,
          });

          await logAiAction({
            actionTitle: `Created task: ${title}`,
            toolName: 'create_task',
            permissionLevel: 'routine_write',
            status: 'executed',
            targetModule: 'tasks',
            summary: `Created task "${title}" (${estimatedMinutes}m, ${priority})`,
            payloadJson: JSON.stringify(args),
          });
          executedSummaries.push(`Created Task: ${title}`);
        }

        // 2. UPDATE TASK
        else if (name === 'update_task') {
          const target = findTask(args.taskId, args.titleMatch);
          if (target) {
            const partial: Partial<TaskItem> = {};
            if (args.newTitle) partial.title = String(args.newTitle);
            if (
              args.status &&
              ['todo', 'in_progress', 'completed', 'deferred'].includes(String(args.status))
            ) {
              partial.status = String(args.status) as TaskItem['status'];
            }
            if (
              args.priority &&
              ['low', 'medium', 'high', 'critical'].includes(String(args.priority))
            ) {
              partial.priority = String(args.priority) as TaskItem['priority'];
            }
            if (args.category) partial.category = normalizeCategory(args.category);
            if (args.dueDate) partial.dueDate = String(args.dueDate);
            if (args.estimatedMinutes !== undefined) {
              partial.estimatedMinutes = Number(args.estimatedMinutes);
            }
            if (args.notes !== undefined) partial.notes = String(args.notes);

            await updateTask(target, partial);
            await logAiAction({
              actionTitle: `Updated task: ${target.title}`,
              toolName: 'update_task',
              permissionLevel: 'routine_write',
              status: 'executed',
              targetModule: 'tasks',
              summary: `Updated task "${target.title}"`,
              payloadJson: JSON.stringify(args),
            });
            executedSummaries.push(`Updated Task: ${partial.title || target.title}`);
          }
        }

        // 3. DELETE TASK
        else if (name === 'delete_task') {
          const target = findTask(args.taskId, args.titleMatch);
          if (target) {
            await deleteTask(target.id);
            await logAiAction({
              actionTitle: `Deleted task: ${target.title}`,
              toolName: 'delete_task',
              permissionLevel: 'routine_write',
              status: 'executed',
              targetModule: 'tasks',
              summary: `Deleted task "${target.title}"`,
              payloadJson: JSON.stringify(args),
            });
            executedSummaries.push(`Deleted Task: ${target.title}`);
          }
        }

        // 4. SCHEDULE STUDY BLOCK / CALENDAR EVENT
        else if (name === 'schedule_study_block' || name === 'scheduleStudyBlock') {
          const title = String(args.title || 'Focused Study Session');
          const date = String(args.date || todayDate);
          const startTime = String(args.startTime || '16:00');
          const endTime = String(args.endTime || '17:00');
          const rawEventType = String(args.eventType || 'study_block');
          const eventType: CalendarEventItem['eventType'] = [
            'fixed',
            'lecture',
            'study_block',
            'workout',
            'prayer',
            'routine',
            'exam',
          ].includes(rawEventType)
            ? (rawEventType as CalendarEventItem['eventType'])
            : 'study_block';

          await createCalendarEvent({
            title,
            eventType,
            date,
            startTime,
            endTime,
            location: args.location ? String(args.location) : 'Study Desk',
            isProtectedAnchor: eventType === 'prayer' || eventType === 'fixed',
          });

          await logAiAction({
            actionTitle: `Scheduled: ${title}`,
            toolName: 'schedule_study_block',
            permissionLevel: 'routine_write',
            status: 'executed',
            targetModule: 'calendar',
            summary: `Scheduled "${title}" on ${date} (${startTime}–${endTime})`,
            payloadJson: JSON.stringify(args),
          });
          executedSummaries.push(`Scheduled: ${title} (${startTime})`);
        }

        // 5. UPDATE CALENDAR EVENT
        else if (name === 'update_calendar_event') {
          const target = findEvent(args.eventId, args.titleMatch);
          if (target) {
            const partial: Partial<CalendarEventItem> = {};
            if (args.newTitle) partial.title = String(args.newTitle);
            if (args.date) partial.date = String(args.date);
            if (args.startTime) partial.startTime = String(args.startTime);
            if (args.endTime) partial.endTime = String(args.endTime);
            if (args.location) partial.location = String(args.location);
            await updateCalendarEvent(target.id, partial);
            executedSummaries.push(`Updated Event: ${partial.title || target.title}`);
          }
        }

        // 6. DELETE CALENDAR EVENT
        else if (name === 'delete_calendar_event') {
          const target = findEvent(args.eventId, args.titleMatch);
          if (target) {
            await deleteCalendarEvent(target.id);
            executedSummaries.push(`Deleted Event: ${target.title}`);
          }
        }

        // 7. CREATE STUDY MODULE
        else if (name === 'create_study_module') {
          const code = String(args.code || 'MOD101').toUpperCase();
          const title = String(args.title || 'New Study Module');
          const term = String(args.term || 'Current Term');
          const examDate = String(args.examDate || todayDate);
          const totalLectures = Number(args.totalLectures) || 12;

          await createStudyModule({
            code,
            title,
            term,
            examDate,
            totalLectures,
            completedLectures: 0,
          });
          executedSummaries.push(`Created Study Module: ${code}`);
        }

        // 8. SYNTHESIZE LECTURE & FLASHCARDS (FROM PDF OR TOPIC)
        else if (name === 'synthesize_lecture_and_flashcards') {
          const moduleCode = String(args.moduleCode || studyModules[0]?.code || 'STUDY').toUpperCase();
          const lectureTitle = String(
            args.lectureTitle ||
              (currentAttachment ? currentAttachment.fileName.replace(/\.pdf$/i, '') : 'Synthesized Lecture')
          );
          const summaryNotes = String(args.summaryNotes || 'Structured lecture synthesis.');
          const rawCards = Array.isArray(args.flashcards) ? args.flashcards : [];
          const targetMod =
            studyModules.find((m) => m.code.toLowerCase() === moduleCode.toLowerCase()) ||
            studyModules[0];

          // Create the synthesized Lecture item
          await createStudyItem({
            moduleId: targetMod?.id || '',
            moduleCode: targetMod?.code || moduleCode,
            title: lectureTitle,
            itemType: 'lecture',
            status: 'studied',
            importance: 'high',
            estimatedMinutes: Number(args.estimatedMinutes) || 45,
            confidenceRating: 4,
            repetitionCount: 0,
            nextReviewDate: todayDate,
            notes: summaryNotes,
          });

          const savedCards: { frontPrompt: string; backAnswer: string }[] = [];
          for (const rawCard of rawCards) {
            const cObj = rawCard as Record<string, unknown>;
            const frontPrompt = String(cObj.frontPrompt || '').trim();
            const backAnswer = String(cObj.backAnswer || '').trim();
            if (!frontPrompt || !backAnswer) continue;
            savedCards.push({ frontPrompt, backAnswer });
            await createStudyItem({
              moduleId: targetMod?.id || '',
              moduleCode: targetMod?.code || moduleCode,
              title: frontPrompt.slice(0, 120),
              itemType: 'flashcard',
              status: 'review_due',
              importance: 'high',
              estimatedMinutes: 5,
              confidenceRating: 3,
              repetitionCount: 0,
              nextReviewDate: todayDate,
              frontPrompt,
              backAnswer,
            });
          }

          // Also save to Library & Notes so the summary is accessible in Knowledge Base
          if (args.saveToLibraryNotes !== false) {
            await createKnowledgeItem({
              title: `Lecture Summary: ${lectureTitle}`,
              itemType: 'note',
              authorOrSource: currentAttachment?.fileName || moduleCode,
              status: 'completed',
              progressCurrent: 1,
              progressTotal: 1,
              progressUnit: 'summary',
              tags: moduleCode,
              takeaways: summaryNotes,
            });
          }

          latestSynthesizedBundle = {
            lectureTitle,
            moduleCode: targetMod?.code || moduleCode,
            summary: summaryNotes,
            flashcards: savedCards,
          };

          await logAiAction({
            actionTitle: `Synthesized lecture & ${savedCards.length} flashcards: ${lectureTitle}`,
            toolName: 'synthesize_lecture_and_flashcards',
            permissionLevel: 'routine_write',
            status: 'executed',
            targetModule: 'study',
            summary: `Created lecture summary "${lectureTitle}" + ${savedCards.length} flashcards in ${
              targetMod?.code || moduleCode
            }`,
            payloadJson: JSON.stringify({
              lectureTitle,
              moduleCode,
              flashcardCount: savedCards.length,
            }),
          });

          executedSummaries.push(
            `Synthesized "${lectureTitle}" + ${savedCards.length} Flashcards`
          );
        }

        // 9. UPDATE OR DELETE STUDY ITEM
        else if (name === 'update_study_item') {
          const target = findStudyItem(args.itemId, args.titleMatch);
          if (target) {
            if (args.deleteItem === true) {
              await deleteStudyItem(target.id);
              executedSummaries.push(`Deleted Study Item: ${target.title}`);
            } else {
              const partial: Partial<StudyItemRecord> = {};
              if (args.newTitle) partial.title = String(args.newTitle);
              if (
                args.status &&
                ['unstudied', 'studied', 'review_due', 'mastered'].includes(String(args.status))
              ) {
                partial.status = String(args.status) as StudyItemRecord['status'];
              }
              if (args.confidenceRating !== undefined) {
                partial.confidenceRating = Math.min(5, Math.max(1, Number(args.confidenceRating)));
              }
              if (args.notes !== undefined) partial.notes = String(args.notes);
              if (args.frontPrompt !== undefined) partial.frontPrompt = String(args.frontPrompt);
              if (args.backAnswer !== undefined) partial.backAnswer = String(args.backAnswer);

              await updateStudyItem(target.id, partial);
              executedSummaries.push(`Updated Study Item: ${partial.title || target.title}`);
            }
          }
        }

        // 10. CREATE KNOWLEDGE / LIBRARY ITEM
        else if (name === 'create_knowledge_item') {
          const title = String(args.title || 'New Note');
          const rawType = String(args.itemType || 'note');
          const itemType: KnowledgeItemRecord['itemType'] = [
            'note',
            'book',
            'article',
            'podcast',
            'course',
          ].includes(rawType)
            ? (rawType as KnowledgeItemRecord['itemType'])
            : 'note';
          const rawStatus = String(args.status || 'in_progress');
          const status: KnowledgeItemRecord['status'] = [
            'wishlist',
            'planned',
            'in_progress',
            'paused',
            'completed',
          ].includes(rawStatus)
            ? (rawStatus as KnowledgeItemRecord['status'])
            : 'in_progress';

          await createKnowledgeItem({
            title,
            itemType,
            authorOrSource: String(args.creatorOrSource || 'Spoon Feeder AI'),
            status,
            progressCurrent: status === 'completed' ? 1 : 0,
            progressTotal: 1,
            progressUnit: itemType === 'book' ? 'pages' : 'items',
            tags: String(args.categoryTag || 'General'),
            takeaways: String(args.takeaways || ''),
          });
          executedSummaries.push(`Saved to Library: ${title}`);
        }

        // 11. UPDATE OR DELETE KNOWLEDGE / LIBRARY ITEM
        else if (name === 'update_knowledge_item') {
          const target = findKnowledgeItem(args.itemId, args.titleMatch);
          if (target) {
            if (args.deleteItem === true) {
              await deleteKnowledgeItem(target.id);
              executedSummaries.push(`Deleted Library Item: ${target.title}`);
            } else {
              const partial: Partial<KnowledgeItemRecord> = {};
              if (args.newTitle) partial.title = String(args.newTitle);
              if (
                args.status &&
                ['wishlist', 'planned', 'in_progress', 'paused', 'completed'].includes(
                  String(args.status)
                )
              ) {
                partial.status = String(args.status) as KnowledgeItemRecord['status'];
              }
              if (args.categoryTag) partial.tags = String(args.categoryTag);
              if (args.takeaways !== undefined) partial.takeaways = String(args.takeaways);
              await updateKnowledgeItem(target.id, partial);
              executedSummaries.push(`Updated Library Note: ${partial.title || target.title}`);
            }
          }
        }

        // 12. LOG HEALTH ENTRY
        else if (name === 'log_health_entry' || name === 'logHealthEntry') {
          const rawType = String(args.logType || 'workout');
          const logType: 'measurement' | 'workout' | 'meal' =
            rawType === 'meal'
              ? 'meal'
              : rawType === 'measurement' || rawType === 'weight'
              ? 'measurement'
              : 'workout';
          const title = String(args.title || args.label || 'Health entry');

          await createHealthLog({
            logType,
            date: todayDate,
            title,
            calories: Number(args.calories) || 0,
            proteinGrams: Number(args.proteinGrams) || 0,
            durationMinutes: Number(args.durationMinutes) || 0,
            weightKg: Number(args.weightKg) || undefined,
          });

          await logAiAction({
            actionTitle: `Logged ${logType}: ${title}`,
            toolName: 'log_health_entry',
            permissionLevel: 'routine_write',
            status: 'executed',
            targetModule: 'health',
            summary: `Logged ${logType}: "${title}"`,
            payloadJson: JSON.stringify(args),
          });
          executedSummaries.push(`Health: ${title}`);
        }

        // 13. UPDATE OR DELETE HEALTH ENTRY
        else if (name === 'update_health_entry') {
          const target = findHealthLog(args.logId, args.titleMatch);
          if (target) {
            if (args.deleteEntry === true) {
              await deleteHealthLog(target.id);
              executedSummaries.push(`Deleted Health Log: ${target.title}`);
            } else {
              await updateHealthLog(target.id, {
                title: args.newTitle ? String(args.newTitle) : undefined,
                calories: args.calories !== undefined ? Number(args.calories) : undefined,
                proteinGrams:
                  args.proteinGrams !== undefined ? Number(args.proteinGrams) : undefined,
                durationMinutes:
                  args.durationMinutes !== undefined ? Number(args.durationMinutes) : undefined,
                weightKg: args.weightKg !== undefined ? Number(args.weightKg) : undefined,
              });
              executedSummaries.push(`Updated Health Log: ${target.title}`);
            }
          }
        }

        // 14. LOG WATER INTAKE
        else if (name === 'log_water_intake') {
          const amountMl = Number(args.amountMl) || 250;
          await updateProfileSettings({
            waterLoggedTodayMl: Math.min(20000, (profile?.waterLoggedTodayMl || 0) + amountMl),
          });
          executedSummaries.push(`Logged +${amountMl}ml Water`);
        }

        // 15. FINANCE RECORD (CREATE OR STAGE)
        else if (name === 'propose_finance_record' || name === 'proposeFinanceRecord') {
          const title = String(args.title || 'Transaction');
          const amountMajor = Number(args.amountMajor ?? args.amount ?? 0);
          const rawType = String(args.recordType || args.transactionType || 'expense');
          const recordType: FinanceRecordItem['recordType'] = [
            'expense',
            'income',
            'budget',
            'savings_goal',
            'subscription',
          ].includes(rawType)
            ? (rawType as FinanceRecordItem['recordType'])
            : 'expense';
          const category = String(args.category || 'General');

          if (args.autoApply === true) {
            await createFinanceRecord({
              recordType,
              title,
              amountMinor: Math.round(amountMajor * 100),
              accountName: 'Main Account',
              category,
              date: todayDate,
            });
            await logAiAction({
              actionTitle: `Recorded ${recordType}: ${title}`,
              toolName: 'propose_finance_record',
              permissionLevel: 'routine_write',
              status: 'executed',
              targetModule: 'finance',
              summary: `Recorded ${recordType}: "${title}" (${profile?.currency || 'USD'} ${amountMajor})`,
              payloadJson: JSON.stringify(args),
            });
            executedSummaries.push(`Finance: ${title} (${amountMajor})`);
          } else {
            await logAiAction({
              actionTitle: `Propose ${recordType}: ${title}`,
              toolName: 'propose_finance_record',
              permissionLevel: 'consequential',
              status: 'pending_approval',
              targetModule: 'finance',
              summary: `Proposed ${recordType}: "${title}" (${profile?.currency || 'USD'} ${amountMajor})`,
              payloadJson: JSON.stringify({
                ...args,
                title,
                amountMajor,
                recordType,
                category,
                date: args.date || todayDate,
              }),
            });
            executedSummaries.push(`Preview staged: ${title}`);
          }
        }

        // 16. UPDATE OR DELETE FINANCE RECORD
        else if (name === 'update_finance_record') {
          const target = findFinanceRecord(args.recordId, args.titleMatch);
          if (target) {
            if (args.deleteRecord === true) {
              await deleteFinanceRecord(target.id);
              executedSummaries.push(`Deleted Finance Record: ${target.title}`);
            } else {
              await updateFinanceRecord(target.id, {
                title: args.newTitle ? String(args.newTitle) : undefined,
                amountMinor:
                  args.amountMajor !== undefined
                    ? Math.round(Number(args.amountMajor) * 100)
                    : undefined,
                category: args.category ? String(args.category) : undefined,
              });
              executedSummaries.push(`Updated Finance Record: ${target.title}`);
            }
          }
        }

        // 17. CREATE GOAL OR HABIT
        else if (name === 'create_goal_or_habit') {
          const recordType: GoalHabitRecord['recordType'] =
            String(args.recordType) === 'habit' ? 'habit' : 'goal';
          const title = String(args.title || 'New Goal');

          await createGoalHabit({
            recordType,
            title,
            whyReason: String(args.domain || 'Personal growth'),
            status: 'active',
            frequency: recordType === 'habit' ? 'daily' : 'once',
            progressPercent: 0,
            streakCount: 0,
            completedToday: false,
            targetDate: args.targetDate ? String(args.targetDate) : todayDate,
            xpReward: 50,
            coinCostOrReward: 15,
          });
          executedSummaries.push(`Created ${recordType}: ${title}`);
        }

        // 18. UPDATE OR DELETE GOAL OR HABIT
        else if (name === 'update_goal_or_habit') {
          const target = findGoalHabit(args.recordId, args.titleMatch);
          if (target) {
            if (args.deleteRecord === true) {
              await deleteGoalHabit(target.id);
              executedSummaries.push(`Deleted ${target.recordType}: ${target.title}`);
            } else {
              const partial: Partial<GoalHabitRecord> = {};
              if (args.newTitle) partial.title = String(args.newTitle);
              if (args.currentProgress !== undefined) {
                partial.progressPercent = Math.min(100, Math.max(0, Number(args.currentProgress)));
              }
              if (args.completedToday !== undefined) {
                partial.completedToday = Boolean(args.completedToday);
              }
              await updateGoalHabit(target.id, partial);
              executedSummaries.push(`Updated ${target.recordType}: ${target.title}`);
            }
          }
        }

        // 19. SAVE DAILY REVIEW
        else if (name === 'save_daily_review') {
          const energyRating = Math.min(5, Math.max(1, Number(args.energyRating) || 4));
          const focusRating = Math.min(5, Math.max(1, Number(args.focusRating) || 4));
          const energyLevel: DailyReviewRecord['energyLevel'] =
            energyRating >= 4 ? 'high' : energyRating === 3 ? 'moderate' : 'low';

          await saveDailyReview({
            date: todayDate,
            energyLevel,
            commitmentScore: focusRating * 20,
            completionScore: focusRating * 20,
            consistencyScore: energyRating * 20,
            planningAccuracyScore: 85,
            wellbeingScore: energyRating * 20,
            wins: String(args.winsSummary || ''),
            obstacles: String(args.blockersSummary || ''),
            tomorrowAdjustment: String(args.tomorrowPriority || ''),
          });
          executedSummaries.push('Saved Daily Review (+30 XP)');
        }

        // 20. UPDATE USER SETTINGS
        else if (name === 'update_user_settings') {
          const partial: Partial<UserProfile> = {};
          if (args.displayName) partial.displayName = String(args.displayName);
          if (args.city) partial.city = String(args.city);
          if (args.currency) partial.currency = String(args.currency);
          if (args.dailyCalorieTarget !== undefined) {
            partial.calorieTarget = Number(args.dailyCalorieTarget);
          }
          if (args.dailyProteinTargetGrams !== undefined) {
            partial.proteinTargetGrams = Number(args.dailyProteinTargetGrams);
          }
          if (args.dailyWaterTargetMl !== undefined) {
            partial.waterTargetMl = Number(args.dailyWaterTargetMl);
          }
          await updateProfileSettings(partial);
          executedSummaries.push('Updated Workspace Settings');
        }

        // 21. REBALANCE DAY SCHEDULE
        else if (name === 'rebalance_day_schedule' || name === 'rebalanceDaySchedule') {
          const reason = String(args.reason || 'Schedule optimization');
          const proposedChangesSummary = String(
            args.summary ||
              args.proposedChangesSummary ||
              'Shift flexible study blocks after fixed commitments'
          );

          await logAiAction({
            actionTitle: 'Rebalance day schedule',
            toolName: 'rebalance_day_schedule',
            permissionLevel: 'consequential',
            status: 'pending_approval',
            targetModule: 'calendar',
            summary: `Rebalance proposal: ${proposedChangesSummary}`,
            payloadJson: JSON.stringify({
              reason,
              proposedChangesSummary,
              newBlockTitle: 'Rebalanced Deep Focus Block',
              date: todayDate,
              startTime: '19:30',
              endTime: '20:30',
            }),
          });
          executedSummaries.push('Preview staged: Schedule Rebalance');
        }

        // 22. NAVIGATE TO SECTION
        else if (name === 'navigate_to_section') {
          const dest = String(args.destination || 'dashboard');
          if (onNavigate) {
            onNavigate(dest);
            executedSummaries.push(`Navigated to ${dest}`);
          }
        }

        // 23. GENERATE CONTEXT-AWARE SCHEDULE
        else if (name === 'generate_context_aware_schedule') {
          const serverProposal = (args.scheduleProposal || data.scheduleProposal) as
            | ScheduleGenerationResult
            | undefined;
          if (serverProposal && Array.isArray(serverProposal.proposedBlocks)) {
            setScheduleProposal(serverProposal);
            executedSummaries.push(
              `Staged Context-Aware Schedule (${serverProposal.proposedBlocks.length} blocks · ${serverProposal.timezone})`
            );
          } else {
            const rawEnergy = String(args.energyOverride || '').toLowerCase();
            const energyOverrideByDate: Record<string, EnergyLevel> | undefined =
              rawEnergy === 'high' || rawEnergy === 'medium' || rawEnergy === 'low'
                ? { [todayDate]: rawEnergy as EnergyLevel }
                : undefined;
            const dailyMaxHoursOverride: Record<string, number> | undefined = args.maxAvailableMinutesToday
              ? { [todayDate]: Math.max(0.5, Number(args.maxAvailableMinutesToday) / 60) }
              : undefined;
            const generated = await generateSmartSchedule({
              targetDays: Number(args.targetDays) || 1,
              energyOverrideByDate,
              dailyMaxHoursOverride,
            });
            executedSummaries.push(
              `Staged Context-Aware Schedule (${generated.proposedBlocks.length} blocks · ${generated.timezone})`
            );
          }
        }

        // 24. ADAPT EXISTING SCHEDULE
        else if (name === 'adapt_existing_schedule') {
          const serverProposal = (args.scheduleProposal || data.scheduleProposal) as
            | ScheduleGenerationResult
            | undefined;
          if (serverProposal && Array.isArray(serverProposal.proposedBlocks)) {
            setScheduleProposal(serverProposal);
            executedSummaries.push(
              `Adapted Schedule (${serverProposal.proposedBlocks.length} blocks · ${serverProposal.timezone})`
            );
          } else {
            const adapted = await adaptSmartSchedule(String(args.reason || textToSend));
            executedSummaries.push(
              `Adapted Schedule (${adapted.scheduleResult.proposedBlocks.length} blocks · ${adapted.scheduleResult.timezone})`
            );
          }
        }

        // 25. SAVE LEARNED MEMORY PREFERENCE
        else if (name === 'save_learned_memory_preference') {
          const ruleText = String(args.ruleText || textToSend);
          const rawCategory = String(args.category || 'study_preference');
          const ruleType:
            | 'blocked_window'
            | 'energy_override'
            | 'duration_multiplier'
            | 'study_preference'
            | 'university_schedule' =
            rawCategory === 'blocked_window'
              ? 'blocked_window'
              : rawCategory === 'duration_adjustment'
              ? 'duration_multiplier'
              : 'study_preference';
          await addOrUpdateLearnedRule({
            id: `rule_${Date.now()}`,
            ruleText,
            ruleType,
            daysOfWeek: args.dayOfWeek !== undefined ? [Number(args.dayOfWeek)] : undefined,
            startTime: args.blockedStart ? String(args.blockedStart) : undefined,
            endTime: args.blockedEnd ? String(args.blockedEnd) : undefined,
            confirmed: args.isPermanent !== false,
            isTemporary: args.isPermanent === false,
            createdAt: new Date().toISOString(),
          });
          executedSummaries.push(`Saved Memory Rule: "${ruleText}"`);
        }
      }

      if (data.scheduleProposal && !calls.some((c) => c.name === 'generate_context_aware_schedule' || c.name === 'adapt_existing_schedule')) {
        setScheduleProposal(data.scheduleProposal as ScheduleGenerationResult);
      }

      const replyText =
        data.reply ||
        (executedSummaries.length > 0
          ? `Executed across Life OS: ${executedSummaries.join(' · ')}.`
          : 'I processed your request.');

      setMessages((prev) => [
        ...prev,
        {
          id: `ai-${Date.now()}`,
          role: 'assistant',
          text: replyText,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          personaLabel: activePersona.label,
          modelBadge: data.usedModel || activeModel.badge,
          actionsExecuted: executedSummaries.length > 0 ? executedSummaries : undefined,
          synthesizedBundle: latestSynthesizedBundle,
        },
      ]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          role: 'assistant',
          text:
            err instanceof Error
              ? `Error: ${err.message}`
              : 'Unable to process AI command right now.',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          personaLabel: activePersona.label,
          modelBadge: activeModel.badge,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const pendingProposals: AiActionLogRecord[] = aiLogs.filter(
    (l) => l.status === 'pending_approval'
  );
  const turnCount = Math.floor(messages.filter((m) => m.role === 'user').length);

  return (
    <div className={compact ? 'space-y-4' : 'space-y-6 pb-10'}>
      {/* Hidden File Input for PDF / Lecture Upload */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,application/pdf,.txt,.md,image/*"
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* Header (Full Page Mode) */}
      {!compact && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-widest text-[var(--text-muted)]">
              SPOON FEEDER AI · FULL WORKSPACE READ/WRITE ENGINE · LECTURE PDF SYNTHESIZER
            </p>
            <h1 className="text-2xl font-bold tracking-tight mt-0.5">
              Omniscient workspace copilot &amp; study synthesizer
            </h1>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="px-3.5 py-2 rounded-xl bg-[#9BB9A2] text-[#0F1613] text-xs font-semibold hover:opacity-90 flex items-center gap-1.5"
            >
              <Paperclip className="w-3.5 h-3.5" />
              Attach Lecture PDF / Doc
            </button>
            <span className="px-3 py-2 rounded-xl bg-[var(--bg-card)] border border-[var(--border-subtle)] text-xs text-[var(--text-secondary)]">
              Memory: <strong className="text-[#9BB9A2]">{turnCount} turns</strong> ·{' '}
              <strong className="text-[#6EBF8B]">20 Workspace Tools Active</strong>
            </span>
          </div>
        </div>
      )}

      {/* Role Persona Bar */}
      <div className="bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-2xl p-4 space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Role Selector Pills */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)] mr-1">
              Mode:
            </span>
            {ROLE_PERSONAS.map((persona) => {
              const isSelected = persona.id === rolePersona;
              return (
                <button
                  key={persona.id}
                  type="button"
                  onClick={() => setRolePersona(persona.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-all ${
                    isSelected
                      ? 'bg-[#9BB9A2]/20 border-[#9BB9A2] text-[var(--text-primary)] font-semibold'
                      : 'bg-[var(--bg-secondary)]/50 border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  {persona.label}
                </button>
              );
            })}
          </div>

          {/* Model Tier Selector & System Instruction Toggle */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5 bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded-xl px-2.5 py-1.5">
              <Cpu className="w-3.5 h-3.5 text-[#9BB9A2]" />
              <select
                value={modelTier}
                onChange={(e) => setModelTier(e.target.value as ModelTierId)}
                className="bg-transparent text-xs font-medium text-[var(--text-primary)] focus:outline-none"
                title="Select Gemini reasoning model tier"
              >
                {MODEL_TIERS.map((m) => (
                  <option key={m.id} value={m.id} className="bg-[#222C27] text-[#F0F4F1]">
                    {m.label}
                  </option>
                ))}
              </select>
            </div>

            {!compact && (
              <button
                type="button"
                onClick={() => setShowSystemConfig((prev) => !prev)}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium border flex items-center gap-1.5 transition-colors ${
                  showSystemConfig
                    ? 'bg-[#9BB9A2]/20 border-[#9BB9A2] text-[#9BB9A2]'
                    : 'bg-[var(--bg-secondary)] border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                Directive
              </button>
            )}

            <button
              type="button"
              onClick={handleClearThread}
              className="px-3 py-1.5 rounded-xl text-xs font-medium bg-[var(--bg-secondary)] border border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] flex items-center gap-1.5"
              title="Start new multi-turn conversation"
            >
              <MessageSquarePlus className="w-3.5 h-3.5" />
              Reset
            </button>
          </div>
        </div>

        {/* Collapsible System Instruction Drawer */}
        {showSystemConfig && !compact && (
          <div className="pt-3 border-t border-[var(--border-subtle)] space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-[#9BB9A2]">
                Active Role Directive ({activePersona.label})
              </span>
              <span className="text-[11px] text-[var(--text-muted)]">{activeModel.desc}</span>
            </div>
            <textarea
              rows={2}
              value={customSystemInstruction}
              onChange={(e) => setCustomSystemInstruction(e.target.value)}
              placeholder={activePersona.defaultInstruction}
              className="w-full px-3.5 py-2 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-subtle)] text-xs text-[var(--text-primary)] focus:outline-none focus:border-[#9BB9A2]"
            />
          </div>
        )}
      </div>

      <div className={compact ? 'space-y-4' : 'grid grid-cols-1 lg:grid-cols-12 gap-6'}>
        {/* Multi-Turn Chat Column */}
        <div
          className={`${
            compact ? 'h-[540px]' : 'lg:col-span-8 h-[680px]'
          } bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-2xl flex flex-col`}
        >
          {/* Chat Header */}
          <div className="p-4 border-b border-[var(--border-subtle)] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-[#9BB9A2]/20 text-[#9BB9A2] flex items-center justify-center">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-bold">{activePersona.label}</h2>
                  <span className="px-2 py-0.5 rounded-md bg-[var(--bg-secondary)] text-[10px] font-mono text-[#9BB9A2]">
                    {activeModel.badge}
                  </span>
                </div>
                <p className="text-[11px] text-[var(--text-muted)]">{activePersona.tagline}</p>
              </div>
            </div>

            {/* Persona Quick Starter Prompts */}
            <div className="flex flex-wrap items-center gap-1.5">
              {activePersona.quickPrompts.slice(0, compact ? 2 : 3).map((qp, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSend(qp)}
                  disabled={loading}
                  className="px-2.5 py-1 rounded-lg bg-[var(--bg-secondary)] hover:bg-[var(--bg-hover)] text-[11px] text-[var(--text-secondary)] truncate max-w-[190px]"
                  title={qp}
                >
                  {qp}
                </button>
              ))}
            </div>
          </div>

          {/* Scrollable Messages Thread */}
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            {messages.map((m) => (
              <div
                key={m.id}
                className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'}`}
              >
                <div className="flex items-center gap-1.5 mb-1 px-1">
                  {m.role === 'assistant' ? (
                    <>
                      <Bot className="w-3.5 h-3.5 text-[#9BB9A2]" />
                      <span className="text-[10px] font-semibold text-[var(--text-secondary)]">
                        {m.personaLabel || 'Spoon Feeder AI'}
                      </span>
                      {m.modelBadge && (
                        <span className="text-[10px] font-mono text-[var(--text-muted)]">
                          · {m.modelBadge}
                        </span>
                      )}
                    </>
                  ) : (
                    <>
                      <span className="text-[10px] font-semibold text-[var(--text-secondary)]">
                        You
                      </span>
                      <User className="w-3 h-3 text-[#9BB9A2]" />
                    </>
                  )}
                  <span className="text-[10px] text-[var(--text-muted)]">· {m.timestamp}</span>
                </div>

                <div
                  className={`max-w-[90%] rounded-2xl px-4 py-3 text-xs leading-relaxed ${
                    m.role === 'user'
                      ? 'bg-[#9BB9A2] text-[#0F1613] font-medium'
                      : 'bg-[var(--bg-secondary)] text-[var(--text-primary)] border border-[var(--border-subtle)]'
                  }`}
                >
                  {m.attachmentName && (
                    <div className="mb-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-black/15 text-[11px] font-semibold">
                      <FileText className="w-3.5 h-3.5" />
                      Attached: {m.attachmentName}
                    </div>
                  )}

                  <p className="whitespace-pre-wrap">{m.text}</p>

                  {/* Synthesized Lecture Summary & Flashcards Interactive Preview */}
                  {m.synthesizedBundle && (
                    <div className="mt-3 pt-3 border-t border-[var(--border-subtle)] space-y-3">
                      <div className="p-3 rounded-xl bg-[var(--bg-card)] border border-[#9BB9A2]/30 space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-[#9BB9A2] flex items-center gap-1">
                            <BookOpen className="w-3 h-3" />
                            Saved Lecture Summary · {m.synthesizedBundle.moduleCode}
                          </span>
                          {onNavigate && (
                            <button
                              type="button"
                              onClick={() => onNavigate('study')}
                              className="text-[10px] text-[#9BB9A2] underline"
                            >
                              Open in Study →
                            </button>
                          )}
                        </div>
                        <p className="text-xs font-semibold">
                          {m.synthesizedBundle.lectureTitle}
                        </p>
                        <p className="text-[11px] text-[var(--text-secondary)] whitespace-pre-wrap">
                          {m.synthesizedBundle.summary}
                        </p>
                      </div>

                      {m.synthesizedBundle.flashcards.length > 0 && (
                        <div className="space-y-1.5">
                          <div className="text-[10px] font-bold uppercase tracking-wider text-[#9BB9A2] flex items-center gap-1">
                            <Layers className="w-3 h-3" />
                            Generated Active-Recall Flashcards (
                            {m.synthesizedBundle.flashcards.length} saved to Study Deck)
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {m.synthesizedBundle.flashcards.map((fc, idx) => (
                              <div
                                key={idx}
                                className="p-2.5 rounded-xl bg-[var(--bg-card)] border border-[var(--border-subtle)] space-y-1"
                              >
                                <p className="text-[11px] font-semibold text-[#9BB9A2]">
                                  Q{idx + 1}: {fc.frontPrompt}
                                </p>
                                <p className="text-[11px] text-[var(--text-secondary)]">
                                  A: {fc.backAnswer}
                                </p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {m.actionsExecuted && m.actionsExecuted.length > 0 && (
                    <div className="mt-2.5 pt-2 border-t border-[var(--border-subtle)] flex flex-wrap gap-1.5">
                      {m.actionsExecuted.map((act, i) => (
                        <span
                          key={i}
                          className="px-2 py-0.5 rounded-md bg-[#6EBF8B]/15 text-[#6EBF8B] text-[10px] font-semibold"
                        >
                          ✓ {act}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex items-center gap-2 text-xs text-[var(--text-muted)] pl-1">
                <div className="w-2 h-2 rounded-full bg-[#9BB9A2] animate-ping" />
                {activePersona.label} ({activeModel.badge}) is analyzing workspace &amp; executing tools...
              </div>
            )}
            <div ref={threadEndRef} />
          </div>

          {/* Attached Lecture PDF Banner */}
          {(attachment || attachmentError) && (
            <div className="px-4 py-2.5 bg-[var(--bg-secondary)] border-t border-[var(--border-subtle)] flex flex-wrap items-center justify-between gap-2">
              {attachmentError ? (
                <span className="text-xs text-[#D97777]">{attachmentError}</span>
              ) : attachment ? (
                <>
                  <div className="flex items-center gap-2 min-w-0">
                    <FileText className="w-4 h-4 text-[#9BB9A2] shrink-0" />
                    <span className="text-xs font-semibold truncate">{attachment.fileName}</span>
                    <span className="text-[10px] text-[var(--text-muted)]">
                      ({Math.round(attachment.sizeBytes / 1024)} KB)
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={loading}
                      onClick={() =>
                        handleSend(
                          `Read the attached lecture "${attachment.fileName}", create a comprehensive lecture summary, and generate 6 high-yield active-recall flashcards saved directly to my Study & Library workspace.`
                        )
                      }
                      className="px-3 py-1 rounded-lg bg-[#9BB9A2] text-[#0F1613] text-[11px] font-semibold hover:opacity-90"
                    >
                      ✨ Summarize &amp; Create Flashcards Now
                    </button>
                    <button
                      type="button"
                      onClick={() => setAttachment(null)}
                      className="p-1 text-[var(--text-muted)] hover:text-[#D97777]"
                      title="Remove attachment"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </>
              ) : null}
            </div>
          )}

          {/* Input Bar */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="p-3.5 border-t border-[var(--border-subtle)] flex items-center gap-2"
          >
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="p-2.5 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[#9BB9A2] hover:border-[#9BB9A2]/50 transition-colors"
              title="Attach Lecture PDF, Markdown, or Image for AI Summary & Flashcards"
            >
              <Paperclip className="w-4 h-4" />
            </button>
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={
                attachment
                  ? `Ask about ${attachment.fileName} or press Send to synthesize summary & flashcards...`
                  : `Ask Spoon Feeder AI to read, create, edit, or delete anything across Life OS...`
              }
              className="flex-1 px-4 py-2.5 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-subtle)] text-xs focus:outline-none focus:border-[var(--accent)]"
            />
            <button
              type="submit"
              disabled={loading || (!input.trim() && !attachment)}
              className="px-4 py-2.5 rounded-xl bg-[var(--accent)] text-[#0F1613] font-semibold text-xs hover:opacity-90 disabled:opacity-50 flex items-center gap-1.5"
            >
              <Send className="w-3.5 h-3.5" />
              Send
            </button>
          </form>
        </div>

        {/* Right Column: Live Workspace Reach, Pending Approvals & Reversible Action Log */}
        {!compact && (
          <div className="lg:col-span-4 space-y-5">
            {/* Live Workspace Reach Card */}
            <div className="bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#9BB9A2] flex items-center gap-1.5">
                  <Compass className="w-3.5 h-3.5" />
                  Omniscient Workspace Reach
                </h3>
                <span className="text-[10px] text-[#6EBF8B] font-semibold">Live Sync</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-2.5 rounded-xl bg-[var(--bg-secondary)]/60 border border-[var(--border-subtle)]">
                  <div className="text-[10px] text-[var(--text-muted)]">Tasks</div>
                  <div className="font-bold mt-0.5">
                    {tasks.filter((t) => t.status !== 'completed').length} open / {tasks.length}
                  </div>
                </div>
                <div className="p-2.5 rounded-xl bg-[var(--bg-secondary)]/60 border border-[var(--border-subtle)]">
                  <div className="text-[10px] text-[var(--text-muted)]">Study &amp; Cards</div>
                  <div className="font-bold mt-0.5">
                    {studyModules.length} mods · {studyItems.length} items
                  </div>
                </div>
                <div className="p-2.5 rounded-xl bg-[var(--bg-secondary)]/60 border border-[var(--border-subtle)]">
                  <div className="text-[10px] text-[var(--text-muted)]">Library &amp; Notes</div>
                  <div className="font-bold mt-0.5">{knowledgeItems.length} saved items</div>
                </div>
                <div className="p-2.5 rounded-xl bg-[var(--bg-secondary)]/60 border border-[var(--border-subtle)]">
                  <div className="text-[10px] text-[var(--text-muted)]">Health &amp; Finance</div>
                  <div className="font-bold mt-0.5">
                    {healthLogs.length} logs · {financeRecords.length} txns
                  </div>
                </div>
              </div>
            </div>

            {/* Pending Approvals Card */}
            {pendingProposals.length > 0 && (
              <div className="bg-[var(--bg-card)] border border-[#E5B567]/40 rounded-2xl p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-[#E5B567]">
                    PREVIEW — awaiting confirmation ({pendingProposals.length})
                  </h3>
                </div>
                {pendingProposals.map((log) => (
                  <div
                    key={log.id}
                    className="p-3.5 rounded-xl bg-[var(--bg-secondary)]/60 border border-[var(--border-subtle)] space-y-2.5"
                  >
                    <div className="flex items-center justify-between text-[10px] text-[var(--text-muted)]">
                      <span className="font-semibold text-[#E5B567] uppercase">{log.toolName}</span>
                      <span>{log.targetModule}</span>
                    </div>
                    <p className="text-xs font-semibold">{log.summary}</p>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => resolveAiProposal(log, 'approved')}
                        className="px-3 py-1.5 rounded-lg bg-[#6EBF8B] text-[#0F1613] text-[11px] font-semibold flex items-center gap-1"
                      >
                        <Check className="w-3.5 h-3.5" /> Approve &amp; apply
                      </button>
                      <button
                        onClick={() => resolveAiProposal(log, 'rejected')}
                        className="px-3 py-1.5 rounded-lg bg-[var(--bg-card)] text-[11px] text-[var(--text-muted)] hover:text-[#D97777] flex items-center gap-1"
                      >
                        <X className="w-3.5 h-3.5" /> Reject
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Action Log Card */}
            <div className="bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-2xl p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-bold">Action log · reversible</h3>
                  <p className="text-[11px] text-[var(--text-muted)]">
                    Every AI write is audited in Firestore ({aiLogs.length} total)
                  </p>
                </div>
              </div>

              {aiLogs.length === 0 ? (
                <div className="py-10 text-center text-xs text-[var(--text-muted)] border border-dashed border-[var(--border-subtle)] rounded-xl">
                  No AI actions recorded yet. Send a command or upload a lecture PDF to see live
                  audit logs.
                </div>
              ) : (
                <div className="space-y-2.5 max-h-[400px] overflow-y-auto pr-1">
                  {aiLogs.map((log) => (
                    <div
                      key={log.id}
                      className="p-3 rounded-xl bg-[var(--bg-secondary)]/40 border border-[var(--border-subtle)] flex items-start justify-between gap-3"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                              log.status === 'executed' || log.status === 'approved'
                                ? 'bg-[#6EBF8B]/15 text-[#6EBF8B]'
                                : log.status === 'pending_approval'
                                ? 'bg-[#E5B567]/15 text-[#E5B567]'
                                : 'bg-[var(--bg-card)] text-[var(--text-muted)]'
                            }`}
                          >
                            {log.status.replace('_', ' ')}
                          </span>
                          <span className="text-[10px] text-[var(--text-muted)] truncate">
                            {log.toolName} · {log.targetModule}
                          </span>
                        </div>
                        <p className="text-xs font-medium">{log.summary}</p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        {(log.status === 'executed' || log.status === 'approved') && (
                          <button
                            onClick={() => resolveAiProposal(log, 'undone')}
                            className="p-1.5 rounded-lg bg-[var(--bg-card)] hover:bg-[var(--bg-hover)] text-[var(--text-secondary)] text-[11px]"
                            title="Mark undone"
                          >
                            <RotateCcw className="w-3 h-3" />
                          </button>
                        )}
                        <button
                          onClick={() => deleteAiLog(log.id)}
                          className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[#D97777]"
                          title="Delete log"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Embedded Context-Aware Scheduling Engine & Persistent Memory Inspector */}
      {!compact && (
        <div className="pt-2">
          <SmartSchedulerPanel />
        </div>
      )}
    </div>
  );
};
