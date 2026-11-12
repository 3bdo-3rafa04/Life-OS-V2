import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { onAuthStateChanged, signInWithPopup, signOut, User } from 'firebase/auth';
import {
  auth,
  db,
  googleProvider,
  doc,
  collection,
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDoc,
  query,
  where,
  onSnapshot,
  serverTimestamp,
  handleFirestoreError,
  OperationType,
} from '../firebase.ts';
import {
  UserProfile,
  TaskItem,
  CalendarEventItem,
  StudyModuleItem,
  StudyItemRecord,
  HealthLogRecord,
  FinanceRecordItem,
  KnowledgeItemRecord,
  GoalHabitRecord,
  AiActionLogRecord,
  DailyReviewRecord,
  PomodoroMode,
  PomodoroCategory,
  PomodoroSessionRecord,
  PomodoroTimerState,
} from '../types.ts';
import {
  PersistentMemoryStore,
  ScheduleGenerationResult,
  AdaptiveRescheduleResponse,
  EnergyProfileConfig,
  LearnedPreferenceRule,
  SessionFeedbackEntry,
  EnergyLevel,
  createDefaultPersistentMemory,
  getNowInTimezone,
  generateContextAwareSchedule,
  runAdaptiveReschedule,
  applySessionFeedbackToMemory,
  parseTimeToMinutes,
  formatMinutesToTime,
  addDaysToDateStr,
} from '../services/schedulingEngine.ts';

interface LifeOSContextValue {
  user: User | null;
  authReady: boolean;
  profile: UserProfile | null;
  tasks: TaskItem[];
  events: CalendarEventItem[];
  studyModules: StudyModuleItem[];
  studyItems: StudyItemRecord[];
  healthLogs: HealthLogRecord[];
  financeRecords: FinanceRecordItem[];
  knowledgeItems: KnowledgeItemRecord[];
  goalsHabits: GoalHabitRecord[];
  aiLogs: AiActionLogRecord[];
  dailyReviews: DailyReviewRecord[];
  pomodoroState: PomodoroTimerState;
  pomodoroSessions: PomodoroSessionRecord[];
  todayDate: string;
  currentTimeStr: string;
  timezone: string;
  persistentMemory: PersistentMemoryStore;
  activeScheduleProposal: ScheduleGenerationResult | null;
  signIn: () => Promise<void>;
  logOut: () => Promise<void>;
  updateProfileSettings: (partial: Partial<UserProfile>) => Promise<void>;
  awardXpAndCoins: (xpDelta: number, coinsDelta: number) => Promise<void>;
  // Cross-module CRUD actions
  createTask: (data: Omit<TaskItem, 'id' | 'ownerId'>) => Promise<void>;
  updateTask: (
    task: TaskItem,
    partial: Partial<Omit<TaskItem, 'id' | 'ownerId'>>
  ) => Promise<void>;
  updateTaskStatus: (
    task: TaskItem,
    status: TaskItem['status'],
    statusReason?: string
  ) => Promise<void>;
  deleteTask: (taskId: string) => Promise<void>;
  createCalendarEvent: (data: Omit<CalendarEventItem, 'id' | 'ownerId'>) => Promise<void>;
  updateCalendarEvent: (
    eventId: string,
    partial: Partial<Omit<CalendarEventItem, 'id' | 'ownerId'>>
  ) => Promise<void>;
  deleteCalendarEvent: (eventId: string) => Promise<void>;
  createStudyModule: (data: Omit<StudyModuleItem, 'id' | 'ownerId'>) => Promise<string>;
  updateStudyModule: (
    moduleId: string,
    partial: Partial<Omit<StudyModuleItem, 'id' | 'ownerId'>>
  ) => Promise<void>;
  deleteStudyModule: (moduleId: string) => Promise<void>;
  createStudyItem: (data: Omit<StudyItemRecord, 'id' | 'ownerId'>) => Promise<void>;
  updateStudyItem: (
    itemId: string,
    partial: Partial<Omit<StudyItemRecord, 'id' | 'ownerId' | 'moduleId'>>
  ) => Promise<void>;
  deleteStudyItem: (itemId: string) => Promise<void>;
  recordStudyFeedback: (
    item: StudyItemRecord,
    confidenceRating: number,
    durationMinutes: number
  ) => Promise<void>;
  createHealthLog: (
    data: Omit<HealthLogRecord, 'id' | 'ownerId'>,
    scheduleOnCalendar?: boolean
  ) => Promise<void>;
  updateHealthLog: (
    logId: string,
    partial: Partial<Omit<HealthLogRecord, 'id' | 'ownerId'>>
  ) => Promise<void>;
  deleteHealthLog: (logId: string) => Promise<void>;
  createFinanceRecord: (data: Omit<FinanceRecordItem, 'id' | 'ownerId'>) => Promise<void>;
  updateFinanceRecord: (
    recordId: string,
    partial: Partial<Omit<FinanceRecordItem, 'id' | 'ownerId'>>
  ) => Promise<void>;
  deleteFinanceRecord: (recordId: string) => Promise<void>;
  createKnowledgeItem: (data: Omit<KnowledgeItemRecord, 'id' | 'ownerId'>) => Promise<void>;
  updateKnowledgeItem: (
    itemId: string,
    partial: Partial<Omit<KnowledgeItemRecord, 'id' | 'ownerId'>>
  ) => Promise<void>;
  updateKnowledgeProgress: (
    item: KnowledgeItemRecord,
    newCurrent: number,
    takeaways?: string
  ) => Promise<void>;
  deleteKnowledgeItem: (itemId: string) => Promise<void>;
  createGoalHabit: (data: Omit<GoalHabitRecord, 'id' | 'ownerId'>) => Promise<void>;
  updateGoalHabit: (
    recordId: string,
    partial: Partial<Omit<GoalHabitRecord, 'id' | 'ownerId'>>
  ) => Promise<void>;
  toggleHabitOrGoalCompletion: (record: GoalHabitRecord) => Promise<void>;
  deleteGoalHabit: (recordId: string) => Promise<void>;
  redeemReward: (reward: GoalHabitRecord) => Promise<void>;
  logAiAction: (data: Omit<AiActionLogRecord, 'id' | 'ownerId'>) => Promise<void>;
  resolveAiProposal: (
    log: AiActionLogRecord,
    decision: 'approved' | 'rejected' | 'undone'
  ) => Promise<void>;
  deleteAiLog: (logId: string) => Promise<void>;
  saveDailyReview: (data: Omit<DailyReviewRecord, 'id' | 'ownerId'>) => Promise<void>;
  clearAllWorkspaceData: () => Promise<void>;
  // Background Pomodoro & Study Time Engine
  startPomodoro: () => void;
  pausePomodoro: () => void;
  togglePomodoro: () => void;
  resetPomodoro: () => void;
  switchPomodoroMode: (mode: PomodoroMode) => void;
  updatePomodoroConfig: (partial: Partial<PomodoroTimerState>) => void;
  completePomodoroSession: (customMinutes?: number, notes?: string) => Promise<void>;
  deletePomodoroSession: (sessionId: string, firestoreLogId?: string) => Promise<void>;
  requestPomodoroNotificationPermission: () => Promise<boolean>;
  dismissPomodoroAlert: () => void;
  // Context-Aware Scheduling Engine & Persistent Intelligent Memory
  generateSmartSchedule: (options?: {
    targetDays?: number;
    startDateStr?: string;
    dailyMaxHoursOverride?: Record<string, number>;
    energyOverrideByDate?: Record<string, EnergyLevel>;
  }) => Promise<ScheduleGenerationResult>;
  adaptSmartSchedule: (utterance: string) => Promise<AdaptiveRescheduleResponse>;
  setScheduleProposal: (proposal: ScheduleGenerationResult | null) => void;
  approveProposedScheduleBlock: (blockId: string) => Promise<void>;
  approveAllProposedScheduleBlocks: () => Promise<void>;
  modifyProposedScheduleBlock: (
    blockId: string,
    changes: {
      startTime?: string;
      durationMinutes?: number;
      dateStr?: string;
      status?: 'proposed' | 'approved' | 'completed' | 'skipped';
    }
  ) => void;
  recordActivityFeedback: (
    feedback: Omit<SessionFeedbackEntry, 'id' | 'recordedAt'> & {
      blockId?: string;
      sourceType?: string;
      sourceId?: string;
    }
  ) => Promise<void>;
  updateEnergyProfile: (partial: Partial<EnergyProfileConfig>) => Promise<void>;
  addOrUpdateLearnedRule: (rule: LearnedPreferenceRule) => Promise<void>;
  confirmLearnedRule: (ruleId: string) => Promise<void>;
  deleteLearnedRule: (ruleId: string) => Promise<void>;
  resetPersistentMemory: () => Promise<void>;
}

const LifeOSContext = createContext<LifeOSContextValue | undefined>(undefined);

const sanitizeString = (val: string | undefined, maxLen: number, fallback = ''): string => {
  const s = (val ?? fallback).trim();
  return s.slice(0, maxLen);
};

// Titles of previously seeded sample records to automatically purge if present
const LEGACY_SAMPLE_TITLES = new Set([
  'Distributed Systems & Consensus',
  'Lecture 4: Raft Leader Election & Log Replication',
  'Lecture 5: Byzantine Fault Tolerance & PBFT',
  'Fajr Prayer & Morning Reflection',
  'CS304 Distributed Systems Lecture',
  'Dhuhr Prayer Anchor',
  'Asr Prayer Anchor',
  'Upper Body Strength Hypertrophy',
  'Complete active recall revision for CS304 Raft Consensus',
  'Reconcile monthly grocery & study material budget',
  'Lab server SSH key rotation (Waiting on DevOps team)',
  'Morning Baseline Check-in',
  'Upper Body Push / Pull Session',
  'Post-Lecture Salmon, Quinoa & Avocado Bowl',
  'Research Assistantship Stipend',
  'Whole Foods Weekly Groceries',
  'Monthly Groceries & Nutrition Cap',
  'Emergency & Post-Grad Relocation Fund',
  'Designing Data-Intensive Applications',
  'Huberman Lab: Optimizing Deep Work & Ultradian Cycles',
  'Achieve First-Class Honours in Computer Science Term',
  '90-Minute Morning Deep Study Block Before Checking Messages',
  'Weekly Consistency Quest: 4 Study Revisions + 3 Strength Workouts',
  'Guilt-Free Specialty Coffee & Sci-Fi Reading Evening',
  'Propose Rebalancing Afternoon Study Block Around Asr Prayer',
  'Cornea & external eye',
  'Revision: Glaucoma pharmacology',
  'Lens & cataract — revision + recall',
]);

export const LifeOSProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [events, setEvents] = useState<CalendarEventItem[]>([]);
  const [studyModules, setStudyModules] = useState<StudyModuleItem[]>([]);
  const [studyItems, setStudyItems] = useState<StudyItemRecord[]>([]);
  const [healthLogs, setHealthLogs] = useState<HealthLogRecord[]>([]);
  const [financeRecords, setFinanceRecords] = useState<FinanceRecordItem[]>([]);
  const [knowledgeItems, setKnowledgeItems] = useState<KnowledgeItemRecord[]>([]);
  const [goalsHabits, setGoalsHabits] = useState<GoalHabitRecord[]>([]);
  const [aiLogs, setAiLogs] = useState<AiActionLogRecord[]>([]);
  const [dailyReviews, setDailyReviews] = useState<DailyReviewRecord[]>([]);
  const [localPomodoroSessions, setLocalPomodoroSessions] = useState<PomodoroSessionRecord[]>(() => {
    try {
      const raw = localStorage.getItem('lifeos_pomodoro_sessions_v1');
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  const [pomodoroState, setPomodoroState] = useState<PomodoroTimerState>(() => {
    const defaultState: PomodoroTimerState = {
      running: false,
      mode: 'focus',
      category: 'Deep Study',
      totalDurationSeconds: 25 * 60,
      remainingSeconds: 25 * 60,
      elapsedFocusSeconds: 0,
      sessionNumber: 1,
      focusMinutesPreset: 25,
      shortBreakMinutesPreset: 5,
      longBreakMinutesPreset: 15,
      autoStartBreaks: false,
      autoStartFocus: false,
      soundEnabled: true,
      browserNotificationsEnabled:
        typeof window !== 'undefined' &&
        'Notification' in window &&
        Notification.permission === 'granted',
      linkedModuleId: '',
      linkedStudyItemId: '',
      linkedTaskId: '',
      customLabel: '',
      liveAlert: null,
    };
    try {
      const saved = localStorage.getItem('lifeos_pomodoro_timer_v1');
      if (!saved) return defaultState;
      const parsed = JSON.parse(saved);
      return {
        ...defaultState,
        ...parsed,
        running: false, // Pause on fresh boot so user is in control, or resume if targetEndMs valid
        liveAlert: null,
      };
    } catch {
      return defaultState;
    }
  });

  const lastTickMsRef = useRef<number | null>(null);
  const purgedRef = useRef(false);

  const [serverTimeState, setServerTimeState] = useState(() => getNowInTimezone('Africa/Cairo'));
  const timezone = profile?.timezone || 'Africa/Cairo';
  const todayDate = serverTimeState.dateStr;
  const currentTimeStr = serverTimeState.timeStr;

  const [persistentMemory, setPersistentMemory] = useState<PersistentMemoryStore>(() => {
    try {
      const saved = localStorage.getItem('lifeos_persistent_memory_v1');
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          ...createDefaultPersistentMemory('Africa/Cairo'),
          ...parsed,
          userProfile: {
            ...createDefaultPersistentMemory('Africa/Cairo').userProfile,
            ...(parsed.userProfile || {}),
          },
        };
      }
    } catch {
      // ignore
    }
    return createDefaultPersistentMemory('Africa/Cairo');
  });

  const [activeScheduleProposal, setActiveScheduleProposal] =
    useState<ScheduleGenerationResult | null>(() => {
      try {
        const saved = localStorage.getItem('lifeos_active_schedule_proposal_v1');
        return saved ? JSON.parse(saved) : null;
      } catch {
        return null;
      }
    });

  // Poll authoritative server time every 30s in the user's configured timezone (default Africa/Cairo)
  useEffect(() => {
    let active = true;
    const syncTime = async () => {
      const tz = profile?.timezone || 'Africa/Cairo';
      try {
        const res = await fetch(`/api/time?timezone=${encodeURIComponent(tz)}`);
        if (res.ok) {
          const data = await res.json();
          if (active && data?.dateStr) {
            setServerTimeState(data);
            return;
          }
        }
      } catch {
        // Fallback to local Intl calculation for Africa/Cairo
      }
      if (active) {
        setServerTimeState(getNowInTimezone(tz));
      }
    };
    syncTime();
    const id = setInterval(syncTime, 30000);
    return () => {
      active = false;
      clearInterval(id);
    };
  }, [profile?.timezone]);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (currUser) => {
      setUser(currUser);
      setAuthReady(true);
      if (currUser) {
        const userRef = doc(db, 'users', currUser.uid);
        try {
          const snap = await getDoc(userRef);
          if (!snap.exists()) {
            const initialProfile = {
              uid: currUser.uid,
              displayName: sanitizeString(currUser.displayName || 'Life OS User', 100, 'User'),
              currency: 'EGP',
              timezone: 'Africa/Cairo',
              city: 'Cairo',
              prayerMethod: 'Egypt' as const,
              prayerBufferMinutes: 15,
              xp: 0,
              level: 1,
              coins: 0,
              streakDays: 0,
              calorieTarget: 2350,
              proteinTargetGrams: 165,
              waterTargetMl: 3000,
              waterLoggedTodayMl: 0,
              aiRoutineAutoApprove: true,
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            };
            await setDoc(userRef, initialProfile);
          }
        } catch (err) {
          handleFirestoreError(err, OperationType.GET, `users/${currUser.uid}`);
        }
      } else {
        setProfile(null);
        setTasks([]);
        setEvents([]);
        setStudyModules([]);
        setStudyItems([]);
        setHealthLogs([]);
        setFinanceRecords([]);
        setKnowledgeItems([]);
        setGoalsHabits([]);
        setAiLogs([]);
        setDailyReviews([]);
      }
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!authReady || !user) return;
    const uid = user.uid;

    const unsubProfile = onSnapshot(
      doc(db, 'users', uid),
      (snap) => {
        if (snap.exists()) {
          setProfile(snap.data() as UserProfile);
        }
      },
      (err) => handleFirestoreError(err, OperationType.GET, `users/${uid}`)
    );

    const bindCollection = <T extends { id: string }>(
      colName: string,
      setter: React.Dispatch<React.SetStateAction<T[]>>
    ) => {
      const q = query(collection(db, colName), where('ownerId', '==', uid));
      return onSnapshot(
        q,
        (snap) => {
          const list: T[] = [];
          snap.forEach((d) => list.push({ id: d.id, ...d.data() } as unknown as T));
          setter(list);
        },
        (err) => handleFirestoreError(err, OperationType.LIST, colName)
      );
    };

    const unsubs = [
      unsubProfile,
      bindCollection<TaskItem>('tasks', setTasks),
      bindCollection<CalendarEventItem>('calendar_events', setEvents),
      bindCollection<StudyModuleItem>('study_modules', setStudyModules),
      bindCollection<StudyItemRecord>('study_items', setStudyItems),
      bindCollection<HealthLogRecord>('health_logs', setHealthLogs),
      bindCollection<FinanceRecordItem>('finance_records', setFinanceRecords),
      bindCollection<KnowledgeItemRecord>('knowledge_items', setKnowledgeItems),
      bindCollection<GoalHabitRecord>('goals_habits', setGoalsHabits),
      bindCollection<AiActionLogRecord>('ai_action_logs', setAiLogs),
      bindCollection<DailyReviewRecord>('daily_reviews', setDailyReviews),
    ];

    return () => unsubs.forEach((u) => u());
  }, [authReady, user]);

  // Automatically remove any legacy seeded sample records from Firestore once loaded
  useEffect(() => {
    if (!user || purgedRef.current) return;
    const hasSample =
      tasks.some((t) => LEGACY_SAMPLE_TITLES.has(t.title)) ||
      events.some((e) => LEGACY_SAMPLE_TITLES.has(e.title)) ||
      studyModules.some((m) => LEGACY_SAMPLE_TITLES.has(m.title) || m.code === 'CS304') ||
      studyItems.some((s) => LEGACY_SAMPLE_TITLES.has(s.title) || s.moduleCode === 'CS304') ||
      healthLogs.some((h) => LEGACY_SAMPLE_TITLES.has(h.title)) ||
      financeRecords.some((f) => LEGACY_SAMPLE_TITLES.has(f.title)) ||
      knowledgeItems.some((k) => LEGACY_SAMPLE_TITLES.has(k.title)) ||
      goalsHabits.some((g) => LEGACY_SAMPLE_TITLES.has(g.title)) ||
      aiLogs.some((a) => LEGACY_SAMPLE_TITLES.has(a.actionTitle));

    if (!hasSample) return;
    purgedRef.current = true;

    const purge = async () => {
      for (const s of studyItems) {
        if (LEGACY_SAMPLE_TITLES.has(s.title) || s.moduleCode === 'CS304') {
          await deleteDoc(doc(db, 'study_items', s.id)).catch(() => {});
        }
      }
      for (const m of studyModules) {
        if (LEGACY_SAMPLE_TITLES.has(m.title) || m.code === 'CS304') {
          await deleteDoc(doc(db, 'study_modules', m.id)).catch(() => {});
        }
      }
      for (const t of tasks) {
        if (LEGACY_SAMPLE_TITLES.has(t.title)) {
          await deleteDoc(doc(db, 'tasks', t.id)).catch(() => {});
        }
      }
      for (const e of events) {
        if (LEGACY_SAMPLE_TITLES.has(e.title) || e.title.includes('CS304')) {
          await deleteDoc(doc(db, 'calendar_events', e.id)).catch(() => {});
        }
      }
      for (const h of healthLogs) {
        if (LEGACY_SAMPLE_TITLES.has(h.title)) {
          await deleteDoc(doc(db, 'health_logs', h.id)).catch(() => {});
        }
      }
      for (const f of financeRecords) {
        if (LEGACY_SAMPLE_TITLES.has(f.title)) {
          await deleteDoc(doc(db, 'finance_records', f.id)).catch(() => {});
        }
      }
      for (const k of knowledgeItems) {
        if (LEGACY_SAMPLE_TITLES.has(k.title)) {
          await deleteDoc(doc(db, 'knowledge_items', k.id)).catch(() => {});
        }
      }
      for (const g of goalsHabits) {
        if (LEGACY_SAMPLE_TITLES.has(g.title)) {
          await deleteDoc(doc(db, 'goals_habits', g.id)).catch(() => {});
        }
      }
      for (const a of aiLogs) {
        if (LEGACY_SAMPLE_TITLES.has(a.actionTitle)) {
          await deleteDoc(doc(db, 'ai_action_logs', a.id)).catch(() => {});
        }
      }
    };
    purge();
  }, [
    user,
    tasks,
    events,
    studyModules,
    studyItems,
    healthLogs,
    financeRecords,
    knowledgeItems,
    goalsHabits,
    aiLogs,
  ]);

  const signIn = async () => {
    await signInWithPopup(auth, googleProvider);
  };

  const logOut = async () => {
    await signOut(auth);
  };

  const updateProfileSettings = async (partial: Partial<UserProfile>) => {
    if (!user || !profile) return;
    const path = `users/${user.uid}`;
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        ...partial,
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, path);
    }
  };

  const awardXpAndCoins = async (xpDelta: number, coinsDelta: number) => {
    if (!user || !profile) return;
    const nextXp = Math.max(0, (profile.xp || 0) + xpDelta);
    const nextLevel = Math.max(1, Math.floor(nextXp / 250) + 1);
    const nextCoins = Math.max(0, (profile.coins || 0) + coinsDelta);
    await updateProfileSettings({
      xp: nextXp,
      level: nextLevel,
      coins: nextCoins,
    });
  };

  const createTask = async (data: Omit<TaskItem, 'id' | 'ownerId'>) => {
    if (!user) return;
    try {
      const payload: Record<string, unknown> = {
        ownerId: user.uid,
        title: sanitizeString(data.title, 200, 'Untitled Task'),
        priority: data.priority,
        status: data.status || 'todo',
        category: data.category || 'personal',
        estimatedMinutes: Math.max(1, Math.min(1440, Math.round(data.estimatedMinutes || 30))),
        dueDate: sanitizeString(data.dueDate, 32, todayDate),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };
      if (data.notes) payload.notes = sanitizeString(data.notes, 2000);
      if (data.statusReason) payload.statusReason = sanitizeString(data.statusReason, 300);
      if (data.scheduledStart) payload.scheduledStart = sanitizeString(data.scheduledStart, 32);
      if (data.linkedGoalId) payload.linkedGoalId = sanitizeString(data.linkedGoalId, 128);
      if (data.linkedModuleId) payload.linkedModuleId = sanitizeString(data.linkedModuleId, 128);
      if (typeof data.isRecurring === 'boolean') payload.isRecurring = data.isRecurring;
      if (data.recurrenceRule) payload.recurrenceRule = sanitizeString(data.recurrenceRule, 64);

      await addDoc(collection(db, 'tasks'), payload);
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'tasks');
    }
  };

  const updateTask = async (
    task: TaskItem,
    partial: Partial<Omit<TaskItem, 'id' | 'ownerId'>>
  ) => {
    if (!user) return;
    try {
      const updatePayload: Record<string, unknown> = {
        updatedAt: serverTimestamp(),
      };
      if (partial.title !== undefined) {
        updatePayload.title = sanitizeString(partial.title, 200, task.title);
      }
      if (partial.notes !== undefined) {
        updatePayload.notes = sanitizeString(partial.notes, 2000);
      }
      if (partial.priority !== undefined) {
        updatePayload.priority = partial.priority;
      }
      if (partial.status !== undefined) {
        updatePayload.status = partial.status;
      }
      if (partial.statusReason !== undefined) {
        updatePayload.statusReason = sanitizeString(partial.statusReason, 300);
      }
      if (partial.category !== undefined) {
        updatePayload.category = partial.category;
      }
      if (partial.estimatedMinutes !== undefined) {
        updatePayload.estimatedMinutes = Math.max(
          1,
          Math.min(1440, Math.round(partial.estimatedMinutes))
        );
      }
      if (partial.actualMinutes !== undefined) {
        updatePayload.actualMinutes = Math.max(
          0,
          Math.min(1440, Math.round(partial.actualMinutes))
        );
      }
      if (partial.dueDate !== undefined) {
        updatePayload.dueDate = sanitizeString(partial.dueDate, 32, todayDate);
      }
      if (partial.scheduledStart !== undefined) {
        updatePayload.scheduledStart = sanitizeString(partial.scheduledStart, 32);
      }
      if (partial.linkedGoalId !== undefined) {
        updatePayload.linkedGoalId = sanitizeString(partial.linkedGoalId, 128);
      }
      if (partial.linkedModuleId !== undefined) {
        updatePayload.linkedModuleId = sanitizeString(partial.linkedModuleId, 128);
      }

      await updateDoc(doc(db, 'tasks', task.id), updatePayload);

      if (partial.status === 'completed' && task.status !== 'completed') {
        const xpGain = task.priority === 'critical' ? 40 : task.priority === 'high' ? 30 : 20;
        await awardXpAndCoins(xpGain, 10);
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `tasks/${task.id}`);
    }
  };

  const updateTaskStatus = async (
    task: TaskItem,
    status: TaskItem['status'],
    statusReason?: string
  ) => {
    await updateTask(task, { status, ...(statusReason !== undefined ? { statusReason } : {}) });
  };

  const deleteTask = async (taskId: string) => {
    if (!user) return;
    try {
      await deleteDoc(doc(db, 'tasks', taskId));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `tasks/${taskId}`);
    }
  };

  const createCalendarEvent = async (data: Omit<CalendarEventItem, 'id' | 'ownerId'>) => {
    if (!user) return;
    try {
      const payload: Record<string, unknown> = {
        ownerId: user.uid,
        title: sanitizeString(data.title, 200, 'Scheduled Event'),
        eventType: data.eventType,
        date: sanitizeString(data.date, 16, todayDate),
        startTime: sanitizeString(data.startTime, 10, '09:00'),
        endTime: sanitizeString(data.endTime, 10, '10:00'),
        isProtectedAnchor: Boolean(data.isProtectedAnchor),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };
      if (data.location) payload.location = sanitizeString(data.location, 200);
      if (data.linkedRecordId) payload.linkedRecordId = sanitizeString(data.linkedRecordId, 128);
      await addDoc(collection(db, 'calendar_events'), payload);
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'calendar_events');
    }
  };

  const deleteCalendarEvent = async (eventId: string) => {
    if (!user) return;
    try {
      await deleteDoc(doc(db, 'calendar_events', eventId));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `calendar_events/${eventId}`);
    }
  };

  const createStudyModule = async (
    data: Omit<StudyModuleItem, 'id' | 'ownerId'>
  ): Promise<string> => {
    if (!user) return '';
    try {
      const payload: Record<string, unknown> = {
        ownerId: user.uid,
        code: sanitizeString(data.code, 32, 'MOD101'),
        title: sanitizeString(data.title, 200, 'Academic Module'),
        term: sanitizeString(data.term, 64, 'Current Term'),
        examDate: sanitizeString(data.examDate, 32, todayDate),
        totalLectures: Math.max(0, Math.min(500, Math.round(data.totalLectures || 12))),
        completedLectures: Math.max(0, Math.min(500, Math.round(data.completedLectures || 0))),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };
      if (data.targetGrade) payload.targetGrade = sanitizeString(data.targetGrade, 16);
      const ref = await addDoc(collection(db, 'study_modules'), payload);

      await createCalendarEvent({
        title: `Exam: ${data.code} — ${data.title}`,
        eventType: 'exam',
        date: data.examDate || todayDate,
        startTime: '09:00',
        endTime: '12:00',
        location: 'Exam Hall',
        isProtectedAnchor: true,
        linkedRecordId: ref.id,
      });

      return ref.id;
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'study_modules');
      return '';
    }
  };

  const deleteStudyModule = async (moduleId: string) => {
    if (!user) return;
    try {
      await deleteDoc(doc(db, 'study_modules', moduleId));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `study_modules/${moduleId}`);
    }
  };

  const createStudyItem = async (data: Omit<StudyItemRecord, 'id' | 'ownerId'>) => {
    if (!user) return;
    try {
      // Ensure parent moduleId exists in study_modules to satisfy Firestore relational rule
      let validModuleId = data.moduleId;
      let validModuleCode = data.moduleCode || 'MOD';

      const existsInState = studyModules.some((m) => m.id === validModuleId);
      if (!existsInState) {
        if (studyModules.length > 0) {
          validModuleId = studyModules[0].id;
          validModuleCode = studyModules[0].code;
        } else {
          const createdId = await createStudyModule({
            code: sanitizeString(data.moduleCode, 32, 'GEN101'),
            title: sanitizeString(data.moduleCode || 'General Study Module', 200),
            term: 'Current Term',
            examDate: todayDate,
            totalLectures: 10,
            completedLectures: 0,
          });
          validModuleId = createdId;
        }
      }

      const payload: Record<string, unknown> = {
        ownerId: user.uid,
        moduleId: sanitizeString(validModuleId, 128),
        moduleCode: sanitizeString(validModuleCode, 32, 'MOD'),
        title: sanitizeString(data.title, 200, 'Lecture Topic'),
        itemType: data.itemType,
        status: data.status || 'unstudied',
        importance: data.importance || 'high',
        estimatedMinutes: Math.max(1, Math.min(600, Math.round(data.estimatedMinutes || 45))),
        confidenceRating: Math.max(1, Math.min(5, Math.round(data.confidenceRating || 3))),
        repetitionCount: Math.max(0, Math.round(data.repetitionCount || 0)),
        nextReviewDate: sanitizeString(data.nextReviewDate, 32, todayDate),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };
      if (data.stabilityDays !== undefined) payload.stabilityDays = data.stabilityDays;
      if (data.difficultyScore !== undefined) payload.difficultyScore = data.difficultyScore;
      if (data.lastStudiedDate) {
        payload.lastStudiedDate = sanitizeString(data.lastStudiedDate, 32);
      }
      if (data.notes) payload.notes = sanitizeString(data.notes, 4000);
      if (data.frontPrompt) payload.frontPrompt = sanitizeString(data.frontPrompt, 500);
      if (data.backAnswer) payload.backAnswer = sanitizeString(data.backAnswer, 2000);
      if (data.sourceRef) payload.sourceRef = sanitizeString(data.sourceRef, 200);

      await addDoc(collection(db, 'study_items'), payload);
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'study_items');
    }
  };

  const deleteStudyItem = async (itemId: string) => {
    if (!user) return;
    try {
      await deleteDoc(doc(db, 'study_items', itemId));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `study_items/${itemId}`);
    }
  };

  const recordStudyFeedback = async (
    item: StudyItemRecord,
    confidenceRating: number,
    _durationMinutes: number
  ) => {
    if (!user) return;
    const rating = Math.max(1, Math.min(5, Math.round(confidenceRating)));
    const prevReps = item.repetitionCount || 0;
    const prevStability = item.stabilityDays || 1;
    const multiplier =
      rating === 1 ? 0.5 : rating === 2 ? 1.2 : rating === 3 ? 2.2 : rating === 4 ? 3.2 : 4.5;
    const nextStabilityDays = Math.max(1, Math.round(prevStability * multiplier * 10) / 10);
    const intervalDays = Math.max(1, Math.round(nextStabilityDays));

    const nextDateObj = new Date();
    nextDateObj.setDate(nextDateObj.getDate() + intervalDays);
    const nextReviewDate = nextDateObj.toISOString().split('T')[0];

    const newStatus: StudyItemRecord['status'] =
      rating >= 4 && prevReps >= 2 ? 'mastered' : 'studied';

    try {
      await updateDoc(doc(db, 'study_items', item.id), {
        status: newStatus,
        confidenceRating: rating,
        stabilityDays: nextStabilityDays,
        repetitionCount: prevReps + 1,
        lastStudiedDate: todayDate,
        nextReviewDate,
        updatedAt: serverTimestamp(),
      });

      if (item.itemType === 'lecture' && item.status === 'unstudied') {
        const parentMod = studyModules.find((m) => m.id === item.moduleId);
        if (parentMod) {
          await updateDoc(doc(db, 'study_modules', parentMod.id), {
            completedLectures: Math.min(parentMod.totalLectures, parentMod.completedLectures + 1),
            updatedAt: serverTimestamp(),
          });
        }
      }

      await awardXpAndCoins(35, 15);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `study_items/${item.id}`);
    }
  };

  const createHealthLog = async (
    data: Omit<HealthLogRecord, 'id' | 'ownerId'>,
    scheduleOnCalendar = false
  ) => {
    if (!user) return;
    try {
      const payload: Record<string, unknown> = {
        ownerId: user.uid,
        logType: data.logType,
        date: sanitizeString(data.date, 16, todayDate),
        title: sanitizeString(data.title, 200, 'Health Entry'),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };
      if (data.weightKg !== undefined) payload.weightKg = Number(data.weightKg);
      if (data.waistCm !== undefined) payload.waistCm = Number(data.waistCm);
      if (data.chestCm !== undefined) payload.chestCm = Number(data.chestCm);
      if (data.armsCm !== undefined) payload.armsCm = Number(data.armsCm);
      if (data.durationMinutes !== undefined) {
        payload.durationMinutes = Math.round(data.durationMinutes);
      }
      if (data.volumeKg !== undefined) payload.volumeKg = Math.round(data.volumeKg);
      if (data.rpe !== undefined) payload.rpe = Math.max(1, Math.min(10, Math.round(data.rpe)));
      if (data.exercisesSummary) {
        payload.exercisesSummary = sanitizeString(data.exercisesSummary, 1500);
      }
      if (data.calories !== undefined) payload.calories = Math.round(data.calories);
      if (data.proteinGrams !== undefined) payload.proteinGrams = Math.round(data.proteinGrams);
      if (data.carbsGrams !== undefined) payload.carbsGrams = Math.round(data.carbsGrams);
      if (data.fatGrams !== undefined) payload.fatGrams = Math.round(data.fatGrams);
      if (data.notes) payload.notes = sanitizeString(data.notes, 1000);

      const ref = await addDoc(collection(db, 'health_logs'), payload);

      if (data.logType === 'workout') {
        await awardXpAndCoins(40, 15);
        if (scheduleOnCalendar) {
          await createCalendarEvent({
            title: `Workout: ${data.title}`,
            eventType: 'workout',
            date: data.date || todayDate,
            startTime: '17:30',
            endTime: '18:30',
            location: 'Gym',
            isProtectedAnchor: false,
            linkedRecordId: ref.id,
          });
        }
      } else {
        await awardXpAndCoins(10, 5);
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'health_logs');
    }
  };

  const deleteHealthLog = async (logId: string) => {
    if (!user) return;
    try {
      await deleteDoc(doc(db, 'health_logs', logId));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `health_logs/${logId}`);
    }
  };

  const createFinanceRecord = async (data: Omit<FinanceRecordItem, 'id' | 'ownerId'>) => {
    if (!user) return;
    try {
      const payload: Record<string, unknown> = {
        ownerId: user.uid,
        recordType: data.recordType,
        title: sanitizeString(data.title, 200, 'Transaction'),
        category: sanitizeString(data.category, 64, 'General'),
        accountName: sanitizeString(data.accountName, 64, 'Cash'),
        amountMinor: Math.max(0, Math.round(data.amountMinor)),
        date: sanitizeString(data.date, 16, todayDate),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };
      if (data.targetAmountMinor !== undefined) {
        payload.targetAmountMinor = Math.max(0, Math.round(data.targetAmountMinor));
      }
      if (typeof data.isRecurring === 'boolean') payload.isRecurring = data.isRecurring;
      if (data.notes) payload.notes = sanitizeString(data.notes, 1000);

      await addDoc(collection(db, 'finance_records'), payload);
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'finance_records');
    }
  };

  const deleteFinanceRecord = async (recordId: string) => {
    if (!user) return;
    try {
      await deleteDoc(doc(db, 'finance_records', recordId));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `finance_records/${recordId}`);
    }
  };

  const createKnowledgeItem = async (data: Omit<KnowledgeItemRecord, 'id' | 'ownerId'>) => {
    if (!user) return;
    try {
      const payload: Record<string, unknown> = {
        ownerId: user.uid,
        itemType: data.itemType,
        title: sanitizeString(data.title, 200, 'Resource'),
        status: data.status || 'in_progress',
        progressCurrent: Math.max(0, Math.round(data.progressCurrent || 0)),
        progressTotal: Math.max(1, Math.round(data.progressTotal || 100)),
        progressUnit: sanitizeString(data.progressUnit, 32, 'pages'),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };
      if (data.authorOrSource) payload.authorOrSource = sanitizeString(data.authorOrSource, 150);
      if (data.rating !== undefined) {
        payload.rating = Math.max(1, Math.min(5, Math.round(data.rating)));
      }
      if (data.tags) payload.tags = sanitizeString(data.tags, 200);
      if (data.takeaways) payload.takeaways = sanitizeString(data.takeaways, 4000);
      if (data.linkedEntityId) payload.linkedEntityId = sanitizeString(data.linkedEntityId, 128);

      await addDoc(collection(db, 'knowledge_items'), payload);
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'knowledge_items');
    }
  };

  const updateKnowledgeProgress = async (
    item: KnowledgeItemRecord,
    newCurrent: number,
    takeaways?: string
  ) => {
    if (!user) return;
    const clamped = Math.max(0, Math.min(item.progressTotal, Math.round(newCurrent)));
    const nextStatus: KnowledgeItemRecord['status'] =
      clamped >= item.progressTotal ? 'completed' : 'in_progress';
    try {
      const payload: Record<string, unknown> = {
        progressCurrent: clamped,
        status: nextStatus,
        updatedAt: serverTimestamp(),
      };
      if (takeaways !== undefined) payload.takeaways = sanitizeString(takeaways, 4000);
      await updateDoc(doc(db, 'knowledge_items', item.id), payload);
      if (nextStatus === 'completed' && item.status !== 'completed') {
        await awardXpAndCoins(50, 25);
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `knowledge_items/${item.id}`);
    }
  };

  const deleteKnowledgeItem = async (itemId: string) => {
    if (!user) return;
    try {
      await deleteDoc(doc(db, 'knowledge_items', itemId));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `knowledge_items/${itemId}`);
    }
  };

  const createGoalHabit = async (data: Omit<GoalHabitRecord, 'id' | 'ownerId'>) => {
    if (!user) return;
    try {
      const payload: Record<string, unknown> = {
        ownerId: user.uid,
        recordType: data.recordType,
        title: sanitizeString(data.title, 200, 'Goal / Habit'),
        status: data.status || 'active',
        frequency: data.frequency || 'daily',
        progressPercent: Math.max(0, Math.min(100, Math.round(data.progressPercent || 0))),
        streakCount: Math.max(0, Math.round(data.streakCount || 0)),
        completedToday: Boolean(data.completedToday),
        xpReward: Math.max(0, Math.min(10000, Math.round(data.xpReward || 25))),
        coinCostOrReward: Math.max(0, Math.min(100000, Math.round(data.coinCostOrReward || 15))),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };
      if (data.whyReason) payload.whyReason = sanitizeString(data.whyReason, 500);
      if (data.lastCompletedDate) {
        payload.lastCompletedDate = sanitizeString(data.lastCompletedDate, 16);
      }
      if (data.targetDate) payload.targetDate = sanitizeString(data.targetDate, 16);
      if (data.nextSmallAction) {
        payload.nextSmallAction = sanitizeString(data.nextSmallAction, 300);
      }

      await addDoc(collection(db, 'goals_habits'), payload);
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'goals_habits');
    }
  };

  const toggleHabitOrGoalCompletion = async (record: GoalHabitRecord) => {
    if (!user) return;
    const nextDone = !record.completedToday;
    const nextStreak = nextDone ? record.streakCount + 1 : Math.max(0, record.streakCount - 1);
    const nextProgress =
      record.recordType === 'goal'
        ? Math.min(100, record.progressPercent + (nextDone ? 20 : -20))
        : nextDone
        ? 100
        : 0;
    try {
      await updateDoc(doc(db, 'goals_habits', record.id), {
        completedToday: nextDone,
        streakCount: nextStreak,
        progressPercent: Math.max(0, nextProgress),
        lastCompletedDate: todayDate,
        status: nextProgress >= 100 && record.recordType !== 'habit' ? 'completed' : 'active',
        updatedAt: serverTimestamp(),
      });
      if (nextDone) {
        await awardXpAndCoins(record.xpReward || 25, record.coinCostOrReward || 10);
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `goals_habits/${record.id}`);
    }
  };

  const deleteGoalHabit = async (recordId: string) => {
    if (!user) return;
    try {
      await deleteDoc(doc(db, 'goals_habits', recordId));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `goals_habits/${recordId}`);
    }
  };

  const redeemReward = async (reward: GoalHabitRecord) => {
    if (!user || !profile) return;
    if (profile.coins < reward.coinCostOrReward) return;
    await awardXpAndCoins(0, -reward.coinCostOrReward);
    await logAiAction({
      actionTitle: `Redeemed Reward: ${reward.title}`,
      toolName: 'redeem_reward',
      permissionLevel: 'routine_write',
      status: 'executed',
      targetModule: 'Rank & Rewards',
      summary: `Spent ${reward.coinCostOrReward} coins on "${reward.title}".`,
    });
  };

  const logAiAction = async (data: Omit<AiActionLogRecord, 'id' | 'ownerId'>) => {
    if (!user) return;
    try {
      const payload: Record<string, unknown> = {
        ownerId: user.uid,
        actionTitle: sanitizeString(data.actionTitle, 200, 'AI Action'),
        toolName: sanitizeString(data.toolName, 100, 'assistant_tool'),
        permissionLevel: data.permissionLevel,
        status: data.status,
        targetModule: sanitizeString(data.targetModule, 64, 'System'),
        summary: sanitizeString(data.summary, 1500, 'Executed action'),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };
      if (data.payloadJson) payload.payloadJson = sanitizeString(data.payloadJson, 4000);
      await addDoc(collection(db, 'ai_action_logs'), payload);
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'ai_action_logs');
    }
  };

  const resolveAiProposal = async (
    log: AiActionLogRecord,
    decision: 'approved' | 'rejected' | 'undone'
  ) => {
    if (!user) return;
    try {
      if (decision === 'approved' && log.payloadJson) {
        const parsed = JSON.parse(log.payloadJson);
        if (log.toolName === 'propose_finance_record') {
          const amountMinor = Math.round((Number(parsed.amountMajor) || 0) * 100);
          await createFinanceRecord({
            recordType: parsed.recordType || 'expense',
            title: parsed.title || 'Approved AI Entry',
            category: parsed.category || 'General',
            accountName: parsed.accountName || 'Cash',
            amountMinor,
            date: todayDate,
          });
        } else if (log.toolName === 'rebalance_day_schedule' && Array.isArray(parsed.blocks)) {
          for (const b of parsed.blocks) {
            await createCalendarEvent({
              title: b.title || 'Scheduled Block',
              eventType: b.eventType || 'study_block',
              date: todayDate,
              startTime: b.startTime || '14:00',
              endTime: b.endTime || '15:00',
              location: 'Study Desk',
              isProtectedAnchor: false,
            });
          }
        }
      }
      await updateDoc(doc(db, 'ai_action_logs', log.id), {
        status: decision,
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `ai_action_logs/${log.id}`);
    }
  };

  const deleteAiLog = async (logId: string) => {
    if (!user) return;
    try {
      await deleteDoc(doc(db, 'ai_action_logs', logId));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `ai_action_logs/${logId}`);
    }
  };

  const saveDailyReview = async (data: Omit<DailyReviewRecord, 'id' | 'ownerId'>) => {
    if (!user) return;
    try {
      const payload: Record<string, unknown> = {
        ownerId: user.uid,
        date: sanitizeString(data.date, 16, todayDate),
        energyLevel: data.energyLevel,
        commitmentScore: Math.max(0, Math.min(100, Math.round(data.commitmentScore))),
        completionScore: Math.max(0, Math.min(100, Math.round(data.completionScore))),
        consistencyScore: Math.max(0, Math.min(100, Math.round(data.consistencyScore))),
        planningAccuracyScore: Math.max(0, Math.min(100, Math.round(data.planningAccuracyScore))),
        wellbeingScore: Math.max(0, Math.min(100, Math.round(data.wellbeingScore))),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };
      if (data.wins) payload.wins = sanitizeString(data.wins, 1000);
      if (data.obstacles) payload.obstacles = sanitizeString(data.obstacles, 1000);
      if (data.tomorrowAdjustment) {
        payload.tomorrowAdjustment = sanitizeString(data.tomorrowAdjustment, 1000);
      }

      await addDoc(collection(db, 'daily_reviews'), payload);
      await awardXpAndCoins(30, 15);
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'daily_reviews');
    }
  };

  const updateCalendarEvent = async (
    eventId: string,
    partial: Partial<Omit<CalendarEventItem, 'id' | 'ownerId'>>
  ) => {
    if (!user) return;
    try {
      const payload: Record<string, unknown> = { updatedAt: serverTimestamp() };
      if (partial.title !== undefined) payload.title = sanitizeString(partial.title, 200);
      if (partial.eventType !== undefined) payload.eventType = partial.eventType;
      if (partial.date !== undefined) payload.date = sanitizeString(partial.date, 16);
      if (partial.startTime !== undefined) payload.startTime = sanitizeString(partial.startTime, 10);
      if (partial.endTime !== undefined) payload.endTime = sanitizeString(partial.endTime, 10);
      if (partial.location !== undefined) payload.location = sanitizeString(partial.location, 200);
      if (partial.isProtectedAnchor !== undefined) {
        payload.isProtectedAnchor = Boolean(partial.isProtectedAnchor);
      }
      await updateDoc(doc(db, 'calendar_events', eventId), payload);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `calendar_events/${eventId}`);
    }
  };

  const updateStudyModule = async (
    moduleId: string,
    partial: Partial<Omit<StudyModuleItem, 'id' | 'ownerId'>>
  ) => {
    if (!user) return;
    try {
      const payload: Record<string, unknown> = { updatedAt: serverTimestamp() };
      if (partial.code !== undefined) payload.code = sanitizeString(partial.code, 32);
      if (partial.title !== undefined) payload.title = sanitizeString(partial.title, 200);
      if (partial.term !== undefined) payload.term = sanitizeString(partial.term, 64);
      if (partial.examDate !== undefined) payload.examDate = sanitizeString(partial.examDate, 32);
      if (partial.targetGrade !== undefined) {
        payload.targetGrade = sanitizeString(partial.targetGrade, 16);
      }
      if (partial.totalLectures !== undefined) {
        payload.totalLectures = Math.max(0, Math.min(500, Math.round(partial.totalLectures)));
      }
      if (partial.completedLectures !== undefined) {
        payload.completedLectures = Math.max(
          0,
          Math.min(500, Math.round(partial.completedLectures))
        );
      }
      await updateDoc(doc(db, 'study_modules', moduleId), payload);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `study_modules/${moduleId}`);
    }
  };

  const updateStudyItem = async (
    itemId: string,
    partial: Partial<Omit<StudyItemRecord, 'id' | 'ownerId' | 'moduleId'>>
  ) => {
    if (!user) return;
    try {
      const payload: Record<string, unknown> = { updatedAt: serverTimestamp() };
      if (partial.title !== undefined) payload.title = sanitizeString(partial.title, 200);
      if (partial.status !== undefined) payload.status = partial.status;
      if (partial.importance !== undefined) payload.importance = partial.importance;
      if (partial.estimatedMinutes !== undefined) {
        payload.estimatedMinutes = Math.max(1, Math.min(600, Math.round(partial.estimatedMinutes)));
      }
      if (partial.confidenceRating !== undefined) {
        payload.confidenceRating = Math.max(1, Math.min(5, Math.round(partial.confidenceRating)));
      }
      if (partial.nextReviewDate !== undefined) {
        payload.nextReviewDate = sanitizeString(partial.nextReviewDate, 32);
      }
      if (partial.notes !== undefined) payload.notes = sanitizeString(partial.notes, 4000);
      if (partial.frontPrompt !== undefined) {
        payload.frontPrompt = sanitizeString(partial.frontPrompt, 500);
      }
      if (partial.backAnswer !== undefined) {
        payload.backAnswer = sanitizeString(partial.backAnswer, 2000);
      }
      await updateDoc(doc(db, 'study_items', itemId), payload);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `study_items/${itemId}`);
    }
  };

  const updateHealthLog = async (
    logId: string,
    partial: Partial<Omit<HealthLogRecord, 'id' | 'ownerId'>>
  ) => {
    if (!user) return;
    try {
      const payload: Record<string, unknown> = { updatedAt: serverTimestamp() };
      if (partial.title !== undefined) payload.title = sanitizeString(partial.title, 200);
      if (partial.date !== undefined) payload.date = sanitizeString(partial.date, 16);
      if (partial.weightKg !== undefined) payload.weightKg = Number(partial.weightKg);
      if (partial.durationMinutes !== undefined) {
        payload.durationMinutes = Math.round(partial.durationMinutes);
      }
      if (partial.calories !== undefined) payload.calories = Math.round(partial.calories);
      if (partial.proteinGrams !== undefined) {
        payload.proteinGrams = Math.round(partial.proteinGrams);
      }
      if (partial.notes !== undefined) payload.notes = sanitizeString(partial.notes, 1000);
      await updateDoc(doc(db, 'health_logs', logId), payload);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `health_logs/${logId}`);
    }
  };

  const updateFinanceRecord = async (
    recordId: string,
    partial: Partial<Omit<FinanceRecordItem, 'id' | 'ownerId'>>
  ) => {
    if (!user) return;
    try {
      const payload: Record<string, unknown> = { updatedAt: serverTimestamp() };
      if (partial.title !== undefined) payload.title = sanitizeString(partial.title, 200);
      if (partial.category !== undefined) payload.category = sanitizeString(partial.category, 64);
      if (partial.accountName !== undefined) {
        payload.accountName = sanitizeString(partial.accountName, 64);
      }
      if (partial.amountMinor !== undefined) {
        payload.amountMinor = Math.max(0, Math.round(partial.amountMinor));
      }
      if (partial.date !== undefined) payload.date = sanitizeString(partial.date, 16);
      if (partial.notes !== undefined) payload.notes = sanitizeString(partial.notes, 1000);
      await updateDoc(doc(db, 'finance_records', recordId), payload);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `finance_records/${recordId}`);
    }
  };

  const updateKnowledgeItem = async (
    itemId: string,
    partial: Partial<Omit<KnowledgeItemRecord, 'id' | 'ownerId'>>
  ) => {
    if (!user) return;
    try {
      const payload: Record<string, unknown> = { updatedAt: serverTimestamp() };
      if (partial.title !== undefined) payload.title = sanitizeString(partial.title, 200);
      if (partial.authorOrSource !== undefined) {
        payload.authorOrSource = sanitizeString(partial.authorOrSource, 150);
      }
      if (partial.status !== undefined) payload.status = partial.status;
      if (partial.progressCurrent !== undefined) {
        payload.progressCurrent = Math.max(0, Math.round(partial.progressCurrent));
      }
      if (partial.progressTotal !== undefined) {
        payload.progressTotal = Math.max(1, Math.round(partial.progressTotal));
      }
      if (partial.takeaways !== undefined) {
        payload.takeaways = sanitizeString(partial.takeaways, 4000);
      }
      if (partial.tags !== undefined) payload.tags = sanitizeString(partial.tags, 200);
      await updateDoc(doc(db, 'knowledge_items', itemId), payload);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `knowledge_items/${itemId}`);
    }
  };

  const updateGoalHabit = async (
    recordId: string,
    partial: Partial<Omit<GoalHabitRecord, 'id' | 'ownerId'>>
  ) => {
    if (!user) return;
    try {
      const payload: Record<string, unknown> = { updatedAt: serverTimestamp() };
      if (partial.title !== undefined) payload.title = sanitizeString(partial.title, 200);
      if (partial.whyReason !== undefined) {
        payload.whyReason = sanitizeString(partial.whyReason, 500);
      }
      if (partial.status !== undefined) payload.status = partial.status;
      if (partial.progressPercent !== undefined) {
        payload.progressPercent = Math.max(0, Math.min(100, Math.round(partial.progressPercent)));
      }
      if (partial.completedToday !== undefined) {
        payload.completedToday = Boolean(partial.completedToday);
      }
      await updateDoc(doc(db, 'goals_habits', recordId), payload);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `goals_habits/${recordId}`);
    }
  };

  const clearAllWorkspaceData = async () => {
    if (!user) return;
    for (const s of studyItems) {
      await deleteDoc(doc(db, 'study_items', s.id)).catch(() => {});
    }
    for (const m of studyModules) {
      await deleteDoc(doc(db, 'study_modules', m.id)).catch(() => {});
    }
    for (const t of tasks) {
      await deleteDoc(doc(db, 'tasks', t.id)).catch(() => {});
    }
    for (const e of events) {
      await deleteDoc(doc(db, 'calendar_events', e.id)).catch(() => {});
    }
    for (const h of healthLogs) {
      await deleteDoc(doc(db, 'health_logs', h.id)).catch(() => {});
    }
    for (const f of financeRecords) {
      await deleteDoc(doc(db, 'finance_records', f.id)).catch(() => {});
    }
    for (const k of knowledgeItems) {
      await deleteDoc(doc(db, 'knowledge_items', k.id)).catch(() => {});
    }
    for (const g of goalsHabits) {
      await deleteDoc(doc(db, 'goals_habits', g.id)).catch(() => {});
    }
    for (const a of aiLogs) {
      await deleteDoc(doc(db, 'ai_action_logs', a.id)).catch(() => {});
    }
    for (const r of dailyReviews) {
      await deleteDoc(doc(db, 'daily_reviews', r.id)).catch(() => {});
    }
    setLocalPomodoroSessions([]);
    try {
      localStorage.removeItem('lifeos_pomodoro_sessions_v1');
    } catch {
      // ignore
    }
  };

  // Combine Firestore-persisted pomodoro sessions (stored in ai_action_logs with toolName === 'pomodoro_session')
  // with local sessions so study time is 100% persistent across devices and refreshes.
  const pomodoroSessions: PomodoroSessionRecord[] = React.useMemo(() => {
    const byId = new Map<string, PomodoroSessionRecord>();
    for (const s of localPomodoroSessions) {
      byId.set(s.id, s);
    }
    for (const log of aiLogs) {
      if (log.toolName === 'pomodoro_session' && log.payloadJson) {
        try {
          const parsed = JSON.parse(log.payloadJson) as PomodoroSessionRecord;
          if (parsed && parsed.id) {
            byId.set(parsed.id, { ...parsed, firestoreLogId: log.id });
          }
        } catch {
          // ignore malformed payload
        }
      }
    }
    return Array.from(byId.values()).sort((a, b) =>
      b.completedAt.localeCompare(a.completedAt)
    );
  }, [localPomodoroSessions, aiLogs]);

  // Filter out internal pomodoro_session and persistent_memory records from visible AI Action Logs
  const visibleAiLogs = React.useMemo(
    () =>
      aiLogs.filter(
        (l) => l.toolName !== 'pomodoro_session' && l.toolName !== 'persistent_memory'
      ),
    [aiLogs]
  );

  // Hydrate persistentMemory from Firestore ai_action_logs if a newer remote memory snapshot exists
  useEffect(() => {
    const memLogs = aiLogs.filter(
      (l) => l.toolName === 'persistent_memory' && Boolean(l.payloadJson)
    );
    if (memLogs.length === 0) return;
    for (const log of memLogs) {
      if (!log.payloadJson) continue;
      try {
        const parsed = JSON.parse(log.payloadJson) as PersistentMemoryStore;
        if (parsed && parsed.updatedAt) {
          setPersistentMemory((prev) => {
            if (!prev.updatedAt || parsed.updatedAt > prev.updatedAt) {
              try {
                localStorage.setItem('lifeos_persistent_memory_v1', JSON.stringify(parsed));
              } catch {
                // ignore
              }
              return parsed;
            }
            return prev;
          });
        }
      } catch {
        // ignore malformed json
      }
    }
  }, [aiLogs]);

  const persistMemoryStore = async (nextMem: PersistentMemoryStore, summaryNote: string) => {
    const stamped = { ...nextMem, updatedAt: new Date().toISOString() };
    setPersistentMemory(stamped);
    try {
      localStorage.setItem('lifeos_persistent_memory_v1', JSON.stringify(stamped));
    } catch {
      // ignore
    }
    if (user) {
      const existingMemLog = aiLogs.find((l) => l.toolName === 'persistent_memory');
      const compactJson = JSON.stringify(stamped).slice(0, 3950);
      if (existingMemLog) {
        try {
          await updateDoc(doc(db, 'ai_action_logs', existingMemLog.id), {
            summary: sanitizeString(summaryNote, 1500, 'Updated Persistent Memory'),
            payloadJson: compactJson,
            updatedAt: serverTimestamp(),
          });
        } catch {
          // ignore
        }
      } else {
        await logAiAction({
          actionTitle: 'Persistent Intelligent Memory Store',
          toolName: 'persistent_memory',
          permissionLevel: 'routine_write',
          status: 'executed',
          targetModule: 'memory',
          summary: sanitizeString(summaryNote, 1500, 'Initialized Persistent Memory'),
          payloadJson: compactJson,
        });
      }
    }
  };

  const setScheduleProposal = (proposal: ScheduleGenerationResult | null) => {
    setActiveScheduleProposal(proposal);
    try {
      if (proposal) {
        localStorage.setItem('lifeos_active_schedule_proposal_v1', JSON.stringify(proposal));
      } else {
        localStorage.removeItem('lifeos_active_schedule_proposal_v1');
      }
    } catch {
      // ignore
    }
  };

  const buildScheduleInput = (options?: {
    targetDays?: number;
    startDateStr?: string;
    dailyMaxHoursOverride?: Record<string, number>;
    energyOverrideByDate?: Record<string, EnergyLevel>;
  }) => {
    const tz = profile?.timezone || persistentMemory.userProfile.timezone || 'Africa/Cairo';
    const nowInfo = getNowInTimezone(tz);
    return {
      nowIso: nowInfo.utcIso,
      timezone: tz,
      targetDays: options?.targetDays || 1,
      startDateStr: options?.startDateStr || nowInfo.dateStr,
      dailyMaxHoursOverride: options?.dailyMaxHoursOverride,
      energyOverrideByDate: options?.energyOverrideByDate,
      existingEvents: events.map((e) => ({
        id: e.id,
        title: e.title,
        dateStr: e.date,
        startTime: e.startTime,
        endTime: e.endTime,
        category: e.eventType,
      })),
      prayers: [
        { name: 'Fajr', time: '04:45', bufferMinutes: profile?.prayerBufferMinutes ?? 20 },
        { name: 'Dhuhr', time: '12:05', bufferMinutes: profile?.prayerBufferMinutes ?? 20 },
        { name: 'Asr', time: '15:30', bufferMinutes: profile?.prayerBufferMinutes ?? 20 },
        { name: 'Maghrib', time: '18:15', bufferMinutes: profile?.prayerBufferMinutes ?? 20 },
        { name: 'Isha', time: '19:40', bufferMinutes: profile?.prayerBufferMinutes ?? 20 },
      ],
      tasks: tasks.map((t) => ({
        id: t.id,
        title: t.title,
        category: t.category,
        priority: (t.priority === 'critical' ? 'high' : t.priority) as 'high' | 'medium' | 'low',
        estimatedMinutes: t.estimatedMinutes || 45,
        completed: t.status === 'completed',
        dueDate: t.dueDate,
        moduleId: t.linkedModuleId,
      })),
      studyModules: studyModules.map((m) => ({
        id: m.id,
        name: `${m.code} — ${m.title}`,
        examDate: m.examDate,
      })),
      studyItems: studyItems
        .filter((s) => s.itemType === 'lecture')
        .map((s) => ({
          id: s.id,
          moduleId: s.moduleId,
          title: s.title,
          type: s.itemType,
          status: s.status,
          estimatedMinutes: s.estimatedMinutes || 60,
          sourceRef: s.sourceRef,
        })),
      memory: persistentMemory,
    };
  };

  const generateSmartSchedule = async (options?: {
    targetDays?: number;
    startDateStr?: string;
    dailyMaxHoursOverride?: Record<string, number>;
    energyOverrideByDate?: Record<string, EnergyLevel>;
  }): Promise<ScheduleGenerationResult> => {
    const payload = buildScheduleInput(options);
    try {
      const res = await fetch('/api/ai/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        const result = (await res.json()) as ScheduleGenerationResult;
        setScheduleProposal(result);
        return result;
      }
    } catch {
      // Fallback to deterministic local execution
    }
    const localResult = generateContextAwareSchedule(payload);
    setScheduleProposal(localResult);
    return localResult;
  };

  const adaptSmartSchedule = async (utterance: string): Promise<AdaptiveRescheduleResponse> => {
    const baseInput = buildScheduleInput({ targetDays: 3 });
    try {
      const res = await fetch('/api/ai/schedule/adapt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ utterance, baseInput }),
      });
      if (res.ok) {
        const adapted = (await res.json()) as AdaptiveRescheduleResponse;
        setScheduleProposal(adapted.scheduleResult);
        if (adapted.adaptationType === 'exam_moved' && adapted.updatedStudyModules) {
          for (const uMod of adapted.updatedStudyModules) {
            const orig = studyModules.find((m) => m.id === uMod.id);
            if (orig && orig.examDate !== uMod.examDate) {
              await updateStudyModule(orig.id, { examDate: uMod.examDate });
            }
          }
        }
        return adapted;
      }
    } catch {
      // Fallback to deterministic local execution
    }
    const localAdapted = runAdaptiveReschedule({ utterance, baseInput });
    setScheduleProposal(localAdapted.scheduleResult);
    return localAdapted;
  };

  const approveProposedScheduleBlock = async (blockId: string) => {
    if (!activeScheduleProposal) return;
    const targetBlock = activeScheduleProposal.proposedBlocks.find((b) => b.id === blockId);
    if (!targetBlock || targetBlock.status === 'approved') return;

    await createCalendarEvent({
      title: `${targetBlock.title}${targetBlock.lectureNumber ? ` (Lec #${targetBlock.lectureNumber})` : ''}`,
      eventType: targetBlock.sourceType === 'lecture' ? 'study_block' : 'study_block',
      date: targetBlock.dateStr,
      startTime: targetBlock.startTime,
      endTime: targetBlock.endTime,
      location: `${targetBlock.subject} · ${targetBlock.energyRequirement.toUpperCase()} Energy`,
      isProtectedAnchor: false,
      linkedRecordId: targetBlock.sourceId,
    });

    const nextBlocks = activeScheduleProposal.proposedBlocks.map((b) =>
      b.id === blockId ? { ...b, status: 'approved' as const } : b
    );
    setScheduleProposal({
      ...activeScheduleProposal,
      proposedBlocks: nextBlocks,
    });
  };

  const approveAllProposedScheduleBlocks = async () => {
    if (!activeScheduleProposal) return;
    const unapproved = activeScheduleProposal.proposedBlocks.filter((b) => b.status === 'proposed');
    for (const blk of unapproved) {
      await createCalendarEvent({
        title: `${blk.title}${blk.lectureNumber ? ` (Lec #${blk.lectureNumber})` : ''}`,
        eventType: 'study_block',
        date: blk.dateStr,
        startTime: blk.startTime,
        endTime: blk.endTime,
        location: `${blk.subject} · ${blk.energyRequirement.toUpperCase()} Energy`,
        isProtectedAnchor: false,
        linkedRecordId: blk.sourceId,
      });
    }
    const nextBlocks = activeScheduleProposal.proposedBlocks.map((b) =>
      b.status === 'proposed' ? { ...b, status: 'approved' as const } : b
    );
    setScheduleProposal({
      ...activeScheduleProposal,
      proposedBlocks: nextBlocks,
    });
    await logAiAction({
      actionTitle: `Approved Smart Schedule (${unapproved.length} blocks)`,
      toolName: 'generate_context_aware_schedule',
      permissionLevel: 'consequential',
      status: 'approved',
      targetModule: 'calendar',
      summary: `Committed ${unapproved.length} context-aware study blocks to Calendar.`,
    });
  };

  const modifyProposedScheduleBlock = (
    blockId: string,
    changes: {
      startTime?: string;
      durationMinutes?: number;
      dateStr?: string;
      status?: 'proposed' | 'approved' | 'completed' | 'skipped';
    }
  ) => {
    if (!activeScheduleProposal) return;
    const nextBlocks = activeScheduleProposal.proposedBlocks.map((b) => {
      if (b.id !== blockId) return b;
      const newDate = changes.dateStr ?? b.dateStr;
      const newStart = changes.startTime ?? b.startTime;
      const newDur =
        changes.durationMinutes !== undefined
          ? Math.max(15, Math.min(180, changes.durationMinutes))
          : b.durationMinutes;
      const startMin = parseTimeToMinutes(newStart);
      const newEnd = formatMinutesToTime(startMin + newDur);
      return {
        ...b,
        dateStr: newDate,
        startTime: newStart,
        endTime: newEnd,
        durationMinutes: newDur,
        status: changes.status ?? b.status,
      };
    });
    setScheduleProposal({
      ...activeScheduleProposal,
      proposedBlocks: nextBlocks,
    });
  };

  const recordActivityFeedback = async (
    feedback: Omit<SessionFeedbackEntry, 'id' | 'recordedAt'> & {
      blockId?: string;
      sourceType?: string;
      sourceId?: string;
    }
  ) => {
    const nextMem = applySessionFeedbackToMemory(persistentMemory, feedback);
    await persistMemoryStore(
      nextMem,
      `Recorded session feedback for "${feedback.title}" (Completed: ${feedback.completed}, Actual: ${feedback.actualMinutes}m vs Est: ${feedback.estimatedMinutes}m)`
    );

    if (feedback.blockId && activeScheduleProposal) {
      modifyProposedScheduleBlock(feedback.blockId, {
        status: feedback.completed ? 'completed' : 'skipped',
      });
    }

    if (feedback.completed) {
      // Update underlying Task or StudyItem only when the user confirms completion in feedback!
      if (feedback.sourceType === 'task' && feedback.sourceId) {
        const targetTask = tasks.find((t) => t.id === feedback.sourceId);
        if (targetTask) {
          await updateTask(targetTask, {
            status: 'completed',
            actualMinutes: feedback.actualMinutes,
          });
        }
      } else if (feedback.sourceId) {
        const targetItem = studyItems.find((s) => s.id === feedback.sourceId);
        if (targetItem) {
          const rating =
            feedback.difficultyAccuracy === 'too_easy'
              ? 5
              : feedback.difficultyAccuracy === 'accurate'
                ? 4
                : 3;
          await recordStudyFeedback(targetItem, rating, feedback.actualMinutes);
        }
      }
    }
  };

  const updateEnergyProfile = async (partial: Partial<EnergyProfileConfig>) => {
    const nextMem: PersistentMemoryStore = {
      ...persistentMemory,
      userProfile: {
        ...persistentMemory.userProfile,
        ...partial,
      },
      updatedAt: new Date().toISOString(),
    };
    if (partial.timezone && profile && partial.timezone !== profile.timezone) {
      await updateProfileSettings({ timezone: partial.timezone });
    }
    await persistMemoryStore(nextMem, 'Updated Personal Energy & Availability Profile');
  };

  const addOrUpdateLearnedRule = async (rule: LearnedPreferenceRule) => {
    const existingIdx = persistentMemory.behavioralMemory.learnedRules.findIndex(
      (r) => r.id === rule.id || r.ruleText.toLowerCase() === rule.ruleText.toLowerCase()
    );
    const nextRules = [...persistentMemory.behavioralMemory.learnedRules];
    if (existingIdx >= 0) {
      nextRules[existingIdx] = rule;
    } else {
      nextRules.unshift(rule);
    }
    const nextMem: PersistentMemoryStore = {
      ...persistentMemory,
      behavioralMemory: {
        ...persistentMemory.behavioralMemory,
        learnedRules: nextRules,
      },
      updatedAt: new Date().toISOString(),
    };
    await persistMemoryStore(nextMem, `Saved learned rule: ${rule.ruleText}`);
  };

  const confirmLearnedRule = async (ruleId: string) => {
    const nextRules = persistentMemory.behavioralMemory.learnedRules.map((r) =>
      r.id === ruleId ? { ...r, confirmed: true, isTemporary: false } : r
    );
    const nextMem: PersistentMemoryStore = {
      ...persistentMemory,
      behavioralMemory: {
        ...persistentMemory.behavioralMemory,
        learnedRules: nextRules,
      },
      updatedAt: new Date().toISOString(),
    };
    await persistMemoryStore(nextMem, `Confirmed permanent scheduling rule (${ruleId})`);
  };

  const deleteLearnedRule = async (ruleId: string) => {
    const nextRules = persistentMemory.behavioralMemory.learnedRules.filter((r) => r.id !== ruleId);
    const nextMem: PersistentMemoryStore = {
      ...persistentMemory,
      behavioralMemory: {
        ...persistentMemory.behavioralMemory,
        learnedRules: nextRules,
      },
      updatedAt: new Date().toISOString(),
    };
    await persistMemoryStore(nextMem, `Deleted scheduling rule (${ruleId})`);
  };

  const resetPersistentMemory = async () => {
    const fresh = createDefaultPersistentMemory(timezone);
    await persistMemoryStore(fresh, 'Reset Persistent Memory to defaults');
  };

  // Persist Pomodoro timer configuration to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('lifeos_pomodoro_timer_v1', JSON.stringify(pomodoroState));
    } catch {
      // ignore storage errors
    }
  }, [pomodoroState]);

  // Play pleasant Web Audio harmonic chime when Pomodoro completes
  const playPomodoroChime = (isBreak: boolean) => {
    try {
      const AudioCtx =
        window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const notes = isBreak ? [523.25, 659.25, 783.99] : [587.33, 739.99, 880, 1174.66];
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.14);
        gain.gain.setValueAtTime(0.001, ctx.currentTime + idx * 0.14);
        gain.gain.exponentialRampToValueAtTime(0.18, ctx.currentTime + idx * 0.14 + 0.04);
        gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + idx * 0.14 + 0.55);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + idx * 0.14);
        osc.stop(ctx.currentTime + idx * 0.14 + 0.6);
      });
    } catch {
      // AudioContext blocked or unsupported
    }
  };

  const triggerLiveNotification = (title: string, message: string, mode: PomodoroMode) => {
    const nowLabel = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setPomodoroState((prev) => ({
      ...prev,
      liveAlert: {
        id: `alert-${Date.now()}`,
        title,
        message,
        timestamp: nowLabel,
        mode,
      },
    }));

    if (
      typeof window !== 'undefined' &&
      'Notification' in window &&
      Notification.permission === 'granted'
    ) {
      try {
        new Notification(title, {
          body: message,
          tag: 'lifeos-pomodoro-live',
        });
      } catch {
        // Ignore notification errors in restricted frames
      }
    }
  };

  const requestPomodoroNotificationPermission = async (): Promise<boolean> => {
    if (typeof window === 'undefined' || !('Notification' in window)) return false;
    if (Notification.permission === 'granted') {
      setPomodoroState((prev) => ({ ...prev, browserNotificationsEnabled: true }));
      return true;
    }
    try {
      const perm = await Notification.requestPermission();
      const granted = perm === 'granted';
      setPomodoroState((prev) => ({ ...prev, browserNotificationsEnabled: granted }));
      return granted;
    } catch {
      return false;
    }
  };

  const dismissPomodoroAlert = () => {
    setPomodoroState((prev) => ({ ...prev, liveAlert: null }));
  };

  const saveCompletedPomodoroRecord = async (
    durationMinutes: number,
    snapState: PomodoroTimerState,
    notes?: string
  ) => {
    const cleanMins = Math.max(1, Math.min(300, Math.round(durationMinutes)));
    const linkedMod = studyModules.find((m) => m.id === snapState.linkedModuleId);
    const linkedItem = studyItems.find((s) => s.id === snapState.linkedStudyItemId);
    const linkedTask = tasks.find((t) => t.id === snapState.linkedTaskId);

    const newSession: PomodoroSessionRecord = {
      id: `pomo_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      date: todayDate,
      durationMinutes: cleanMins,
      mode: 'focus',
      category: snapState.category,
      moduleId: linkedMod?.id || linkedItem?.moduleId || undefined,
      moduleCode: linkedMod?.code || linkedItem?.moduleCode || undefined,
      taskId: linkedTask?.id || undefined,
      taskTitle: linkedTask?.title || snapState.customLabel || undefined,
      studyItemId: linkedItem?.id || undefined,
      studyItemTitle: linkedItem?.title || undefined,
      notes: notes?.trim() || undefined,
      completedAt: new Date().toISOString(),
    };

    setLocalPomodoroSessions((prev) => {
      const next = [newSession, ...prev];
      try {
        localStorage.setItem('lifeos_pomodoro_sessions_v1', JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });

    if (user) {
      await logAiAction({
        actionTitle: `Pomodoro (${snapState.category}): ${cleanMins}m`,
        toolName: 'pomodoro_session',
        permissionLevel: 'routine_write',
        status: 'executed',
        targetModule: 'pomodoro',
        summary: `Completed ${cleanMins}m ${snapState.category} Pomodoro${
          linkedMod ? ` · ${linkedMod.code}` : ''
        }${linkedTask ? ` · ${linkedTask.title}` : ''}`,
        payloadJson: JSON.stringify(newSession),
      });

      // Credit XP and Coins
      await awardXpAndCoins(cleanMins, Math.max(5, Math.round(cleanMins / 2)));

      // Update linked Task actualMinutes if present
      if (linkedTask) {
        await updateTask(linkedTask, {
          actualMinutes: (linkedTask.actualMinutes || 0) + cleanMins,
        });
      }

      // Update linked StudyItem lastStudiedDate if present
      if (linkedItem) {
        await updateStudyItem(linkedItem.id, {
          lastStudiedDate: todayDate,
          status: linkedItem.status === 'unstudied' ? 'studied' : linkedItem.status,
        });
      }
    }
  };

  // Update browser tab title dynamically when Pomodoro is running in the background
  useEffect(() => {
    if (!pomodoroState.running) {
      document.title = 'Life OS — Personal Operating System';
      return;
    }
    const mins = Math.floor(pomodoroState.remainingSeconds / 60);
    const secs = pomodoroState.remainingSeconds % 60;
    const formatted = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    const modeLabel =
      pomodoroState.mode === 'focus'
        ? pomodoroState.category
        : pomodoroState.mode === 'short_break'
        ? 'Short Break'
        : 'Long Break';
    document.title = `(${formatted}) ${modeLabel} · Life OS`;
  }, [
    pomodoroState.running,
    pomodoroState.remainingSeconds,
    pomodoroState.mode,
    pomodoroState.category,
  ]);

  // Background wall-clock Pomodoro ticker (immune to tab throttling)
  useEffect(() => {
    if (!pomodoroState.running) {
      lastTickMsRef.current = null;
      return;
    }

    lastTickMsRef.current = Date.now();

    const tick = () => {
      const now = Date.now();
      const last = lastTickMsRef.current ?? now;
      const deltaSeconds = Math.floor((now - last) / 1000);
      if (deltaSeconds < 1) return;
      lastTickMsRef.current = last + deltaSeconds * 1000;

      setPomodoroState((prev) => {
        if (!prev.running) return prev;
        const nextRemaining = Math.max(0, prev.remainingSeconds - deltaSeconds);
        const nextElapsedFocus =
          prev.mode === 'focus' ? prev.elapsedFocusSeconds + deltaSeconds : prev.elapsedFocusSeconds;

        if (nextRemaining > 0) {
          return {
            ...prev,
            remainingSeconds: nextRemaining,
            elapsedFocusSeconds: nextElapsedFocus,
          };
        }

        // Timer reached 00:00!
        if (prev.soundEnabled) {
          playPomodoroChime(prev.mode !== 'focus');
        }

        if (prev.mode === 'focus') {
          const completedMins = Math.max(1, Math.round(prev.totalDurationSeconds / 60));
          // Fire async persistence without blocking state transition
          setTimeout(() => {
            saveCompletedPomodoroRecord(completedMins, prev);
          }, 0);

          const isLongBreakNext = prev.sessionNumber % 4 === 0;
          const nextMode: PomodoroMode = isLongBreakNext ? 'long_break' : 'short_break';
          const nextBreakMins = isLongBreakNext
            ? prev.longBreakMinutesPreset
            : prev.shortBreakMinutesPreset;

          const alertTitle = `Pomodoro #${prev.sessionNumber} Complete! (+${completedMins}m logged)`;
          const alertMsg = `${completedMins} min of ${prev.category} added to your Study Time. ${
            isLongBreakNext ? 'Time for a Long Break!' : 'Time for a Short Break!'
          }`;

          setTimeout(() => {
            triggerLiveNotification(alertTitle, alertMsg, 'focus');
          }, 10);

          return {
            ...prev,
            running: prev.autoStartBreaks,
            mode: nextMode,
            totalDurationSeconds: nextBreakMins * 60,
            remainingSeconds: nextBreakMins * 60,
            elapsedFocusSeconds: 0,
            sessionNumber: prev.sessionNumber + 1,
          };
        } else {
          // Break finished -> transition to Focus
          const focusMins = prev.focusMinutesPreset;
          setTimeout(() => {
            triggerLiveNotification(
              'Break Finished — Ready to Focus',
              `Next ${focusMins}m ${prev.category} Pomodoro is ready.`,
              prev.mode
            );
          }, 10);

          return {
            ...prev,
            running: prev.autoStartFocus,
            mode: 'focus',
            totalDurationSeconds: focusMins * 60,
            remainingSeconds: focusMins * 60,
            elapsedFocusSeconds: 0,
          };
        }
      });
    };

    const intervalId = setInterval(tick, 300);
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        tick();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      clearInterval(intervalId);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [pomodoroState.running]);

  const startPomodoro = () => {
    lastTickMsRef.current = Date.now();
    setPomodoroState((prev) => ({ ...prev, running: true }));
  };

  const pausePomodoro = () => {
    lastTickMsRef.current = null;
    setPomodoroState((prev) => ({ ...prev, running: false }));
  };

  const togglePomodoro = () => {
    setPomodoroState((prev) => {
      const nextRunning = !prev.running;
      lastTickMsRef.current = nextRunning ? Date.now() : null;
      return { ...prev, running: nextRunning };
    });
  };

  const resetPomodoro = () => {
    lastTickMsRef.current = null;
    setPomodoroState((prev) => {
      const mins =
        prev.mode === 'focus'
          ? prev.focusMinutesPreset
          : prev.mode === 'short_break'
          ? prev.shortBreakMinutesPreset
          : prev.longBreakMinutesPreset;
      return {
        ...prev,
        running: false,
        totalDurationSeconds: mins * 60,
        remainingSeconds: mins * 60,
        elapsedFocusSeconds: 0,
      };
    });
  };

  const switchPomodoroMode = (mode: PomodoroMode) => {
    lastTickMsRef.current = null;
    setPomodoroState((prev) => {
      const mins =
        mode === 'focus'
          ? prev.focusMinutesPreset
          : mode === 'short_break'
          ? prev.shortBreakMinutesPreset
          : prev.longBreakMinutesPreset;
      return {
        ...prev,
        running: false,
        mode,
        totalDurationSeconds: mins * 60,
        remainingSeconds: mins * 60,
        elapsedFocusSeconds: 0,
      };
    });
  };

  const updatePomodoroConfig = (partial: Partial<PomodoroTimerState>) => {
    setPomodoroState((prev) => {
      const updated = { ...prev, ...partial };
      if (!prev.running) {
        if (partial.focusMinutesPreset !== undefined && updated.mode === 'focus') {
          updated.totalDurationSeconds = partial.focusMinutesPreset * 60;
          updated.remainingSeconds = partial.focusMinutesPreset * 60;
          updated.elapsedFocusSeconds = 0;
        } else if (
          partial.shortBreakMinutesPreset !== undefined &&
          updated.mode === 'short_break'
        ) {
          updated.totalDurationSeconds = partial.shortBreakMinutesPreset * 60;
          updated.remainingSeconds = partial.shortBreakMinutesPreset * 60;
        } else if (
          partial.longBreakMinutesPreset !== undefined &&
          updated.mode === 'long_break'
        ) {
          updated.totalDurationSeconds = partial.longBreakMinutesPreset * 60;
          updated.remainingSeconds = partial.longBreakMinutesPreset * 60;
        }
      }
      return updated;
    });
  };

  const completePomodoroSession = async (customMinutes?: number, notes?: string) => {
    const snap = pomodoroState;
    const elapsedMins =
      customMinutes ??
      (snap.elapsedFocusSeconds >= 60
        ? Math.round(snap.elapsedFocusSeconds / 60)
        : Math.round(snap.totalDurationSeconds / 60));

    lastTickMsRef.current = null;
    if (snap.soundEnabled) {
      playPomodoroChime(false);
    }

    await saveCompletedPomodoroRecord(elapsedMins, snap, notes);

    triggerLiveNotification(
      `Logged ${elapsedMins}m ${snap.category} Session`,
      `Added ${elapsedMins} minutes to your Study Time (+${elapsedMins} XP).`,
      'focus'
    );

    setPomodoroState((prev) => ({
      ...prev,
      running: false,
      mode: 'focus',
      totalDurationSeconds: prev.focusMinutesPreset * 60,
      remainingSeconds: prev.focusMinutesPreset * 60,
      elapsedFocusSeconds: 0,
      sessionNumber: prev.sessionNumber + 1,
    }));
  };

  const deletePomodoroSession = async (sessionId: string, firestoreLogId?: string) => {
    setLocalPomodoroSessions((prev) => {
      const next = prev.filter((s) => s.id !== sessionId);
      try {
        localStorage.setItem('lifeos_pomodoro_sessions_v1', JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
    if (firestoreLogId && user) {
      await deleteAiLog(firestoreLogId);
    }
  };

  return (
    <LifeOSContext.Provider
      value={{
        user,
        authReady,
        profile,
        tasks,
        events,
        studyModules,
        studyItems,
        healthLogs,
        financeRecords,
        knowledgeItems,
        goalsHabits,
        aiLogs: visibleAiLogs,
        dailyReviews,
        pomodoroState,
        pomodoroSessions,
        todayDate,
        currentTimeStr,
        timezone,
        persistentMemory,
        activeScheduleProposal,
        signIn,
        logOut,
        updateProfileSettings,
        awardXpAndCoins,
        createTask,
        updateTask,
        updateTaskStatus,
        deleteTask,
        createCalendarEvent,
        updateCalendarEvent,
        deleteCalendarEvent,
        createStudyModule,
        updateStudyModule,
        deleteStudyModule,
        createStudyItem,
        updateStudyItem,
        deleteStudyItem,
        recordStudyFeedback,
        createHealthLog,
        updateHealthLog,
        deleteHealthLog,
        createFinanceRecord,
        updateFinanceRecord,
        deleteFinanceRecord,
        createKnowledgeItem,
        updateKnowledgeItem,
        updateKnowledgeProgress,
        deleteKnowledgeItem,
        createGoalHabit,
        updateGoalHabit,
        toggleHabitOrGoalCompletion,
        deleteGoalHabit,
        redeemReward,
        logAiAction,
        resolveAiProposal,
        deleteAiLog,
        saveDailyReview,
        clearAllWorkspaceData,
        startPomodoro,
        pausePomodoro,
        togglePomodoro,
        resetPomodoro,
        switchPomodoroMode,
        updatePomodoroConfig,
        completePomodoroSession,
        deletePomodoroSession,
        requestPomodoroNotificationPermission,
        dismissPomodoroAlert,
        generateSmartSchedule,
        adaptSmartSchedule,
        setScheduleProposal,
        approveProposedScheduleBlock,
        approveAllProposedScheduleBlocks,
        modifyProposedScheduleBlock,
        recordActivityFeedback,
        updateEnergyProfile,
        addOrUpdateLearnedRule,
        confirmLearnedRule,
        deleteLearnedRule,
        resetPersistentMemory,
      }}
    >
      {children}
    </LifeOSContext.Provider>
  );
};

export const useLifeOS = () => {
  const ctx = useContext(LifeOSContext);
  if (!ctx) throw new Error('useLifeOS must be used within LifeOSProvider');
  return ctx;
};
