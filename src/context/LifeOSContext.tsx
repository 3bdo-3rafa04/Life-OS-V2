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
  PersonalRecord,
  TrainingLoadLog,
  RecoveryLog,
  WorkoutSchedule,
  WeeklyFitnessReport,
  WorkoutExerciseEntry,
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
import {
  parseExercisesFromWorkoutInput,
  evaluateAndUpdatePersonalRecords,
  buildTrainingLoadLog,
  generateWeeklyFitnessCoachReport,
} from '../services/fitnessIntelligenceEngine.ts';
import {
  RpgGamificationState,
  RpgMission,
  RpgAchievement,
  RankEvaluation,
  RpgRoomSlot,
  RpgAvatarConfig,
  RpgCoinTransaction,
  StudyEnvironmentMode,
  AmbientSoundType,
  DEFAULT_RPG_STATE,
  STARTER_ITEM_IDS,
  RPG_SHOP_ITEMS,
  calculateLevelProgress,
  evaluateUserRank,
  computeLiveMissions,
  computeLiveAchievements,
} from '../services/rpgGamificationEngine.ts';

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
  importWorkspaceBackup: (backup: Record<string, unknown>) => Promise<void>;
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
  // Section 14: Advanced Fitness Intelligence Ecosystem
  personalRecords: PersonalRecord[];
  trainingLoadLogs: TrainingLoadLog[];
  recoveryLogs: RecoveryLog[];
  workoutSchedules: WorkoutSchedule[];
  weeklyFitnessReports: WeeklyFitnessReport[];
  targetWeightKg: number;
  prCelebrationBanner: string[] | null;
  dismissPrCelebrationBanner: () => void;
  setTargetWeightKg: (kg: number) => Promise<void>;
  logWorkoutWithExercises: (data: {
    title: string;
    date: string;
    durationMinutes: number;
    rpe: number;
    exercises: WorkoutExerciseEntry[];
    notes?: string;
    scheduleIdToComplete?: string;
  }) => Promise<{ newlyBrokenPRs: PersonalRecord[]; celebrationMessages: string[] }>;
  logRecoveryCheckIn: (
    data: Omit<RecoveryLog, 'id' | 'ownerId' | 'createdAt'>
  ) => Promise<void>;
  deleteRecoveryLog: (id: string) => Promise<void>;
  scheduleWorkoutSession: (
    data: Omit<WorkoutSchedule, 'id' | 'ownerId' | 'updatedAt'>,
    syncToLifeOSCalendar?: boolean
  ) => Promise<void>;
  updateWorkoutScheduleStatus: (
    scheduleId: string,
    status: WorkoutSchedule['status'],
    rescheduleTo?: { date: string; startTime: string; endTime: string }
  ) => Promise<void>;
  deleteWorkoutSchedule: (scheduleId: string) => Promise<void>;
  generateAndSaveWeeklyFitnessReport: () => Promise<WeeklyFitnessReport>;
  deletePersonalRecord: (prId: string) => Promise<void>;
  // Pixel-Art RPG Gamification Ecosystem
  rpgState: RpgGamificationState;
  rpgMissions: RpgMission[];
  rpgAchievements: RpgAchievement[];
  rpgRankEval: RankEvaluation;
  rpgLevelInfo: ReturnType<typeof calculateLevelProgress>;
  isRpgWorldOpen: boolean;
  rpgWorldInitialTab: 'study_room' | 'missions' | 'shop' | 'inventory' | 'achievements';
  openRpgWorld: (
    tab?: 'study_room' | 'missions' | 'shop' | 'inventory' | 'achievements'
  ) => void;
  closeRpgWorld: () => void;
  levelUpBanner: { newLevel: number; bonusCoins: number; rankTitle: string } | null;
  dismissLevelUpBanner: () => void;
  claimRpgMissionReward: (missionId: string) => Promise<boolean>;
  claimRpgAchievementReward: (achievementId: string) => Promise<boolean>;
  purchaseRpgShopItem: (itemId: string) => Promise<{ ok: boolean; message: string }>;
  equipRpgItem: (itemId: string) => Promise<void>;
  unequipRpgSlot: (slot: RpgRoomSlot) => Promise<void>;
  moveRpgPlacedItem: (slot: RpgRoomSlot, dx: number, dy: number) => Promise<void>;
  resetRpgPlacedItemPosition: (slot: RpgRoomSlot) => Promise<void>;
  setRpgEnvironment: (env: StudyEnvironmentMode) => Promise<void>;
  setRpgAmbientSound: (sound: AmbientSoundType, volume?: number) => Promise<void>;
  updateRpgAvatar: (partial: Partial<RpgAvatarConfig>) => Promise<void>;
  saveRpgRoomPreset: (name: string) => Promise<void>;
  loadRpgRoomPreset: (presetId: string) => Promise<void>;
  deleteRpgRoomPreset: (presetId: string) => Promise<void>;
  generateAiPersonalizedMissions: () => Promise<RpgMission[]>;
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

const PERSONAL_OWNER_ID = 'personal_owner';

const LS_DATA_KEYS = {
  profile: 'lifeos_data_v1_profile',
  tasks: 'lifeos_data_v1_tasks',
  events: 'lifeos_data_v1_events',
  studyModules: 'lifeos_data_v1_study_modules',
  studyItems: 'lifeos_data_v1_study_items',
  healthLogs: 'lifeos_data_v1_health_logs',
  financeRecords: 'lifeos_data_v1_finance_records',
  knowledgeItems: 'lifeos_data_v1_knowledge_items',
  goalsHabits: 'lifeos_data_v1_goals_habits',
  aiLogs: 'lifeos_data_v1_ai_logs',
  dailyReviews: 'lifeos_data_v1_daily_reviews',
} as const;

const createDefaultPersonalProfile = (): UserProfile => ({
  uid: PERSONAL_OWNER_ID,
  displayName: 'Personal Workspace',
  currency: 'EGP',
  timezone: 'Africa/Cairo',
  city: 'Cairo',
  prayerMethod: 'Egypt',
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
});

function loadLocalStore<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function saveLocalStore<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore storage errors
  }
}

function makeLocalId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

export const LifeOSProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(true);
  const [profile, setProfile] = useState<UserProfile | null>(() =>
    loadLocalStore<UserProfile>(LS_DATA_KEYS.profile, createDefaultPersonalProfile())
  );
  const [tasks, setTasks] = useState<TaskItem[]>(() =>
    loadLocalStore<TaskItem[]>(LS_DATA_KEYS.tasks, [])
  );
  const [events, setEvents] = useState<CalendarEventItem[]>(() =>
    loadLocalStore<CalendarEventItem[]>(LS_DATA_KEYS.events, [])
  );
  const [studyModules, setStudyModules] = useState<StudyModuleItem[]>(() =>
    loadLocalStore<StudyModuleItem[]>(LS_DATA_KEYS.studyModules, [])
  );
  const [studyItems, setStudyItems] = useState<StudyItemRecord[]>(() =>
    loadLocalStore<StudyItemRecord[]>(LS_DATA_KEYS.studyItems, [])
  );
  const [healthLogs, setHealthLogs] = useState<HealthLogRecord[]>(() =>
    loadLocalStore<HealthLogRecord[]>(LS_DATA_KEYS.healthLogs, [])
  );
  const [financeRecords, setFinanceRecords] = useState<FinanceRecordItem[]>(() =>
    loadLocalStore<FinanceRecordItem[]>(LS_DATA_KEYS.financeRecords, [])
  );
  const [knowledgeItems, setKnowledgeItems] = useState<KnowledgeItemRecord[]>(() =>
    loadLocalStore<KnowledgeItemRecord[]>(LS_DATA_KEYS.knowledgeItems, [])
  );
  const [goalsHabits, setGoalsHabits] = useState<GoalHabitRecord[]>(() =>
    loadLocalStore<GoalHabitRecord[]>(LS_DATA_KEYS.goalsHabits, [])
  );
  const [aiLogs, setAiLogs] = useState<AiActionLogRecord[]>(() =>
    loadLocalStore<AiActionLogRecord[]>(LS_DATA_KEYS.aiLogs, [])
  );
  const [dailyReviews, setDailyReviews] = useState<DailyReviewRecord[]>(() =>
    loadLocalStore<DailyReviewRecord[]>(LS_DATA_KEYS.dailyReviews, [])
  );
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

  // Section 14: Advanced Fitness Intelligence State (persisted per authenticated user)
  const [personalRecords, setPersonalRecords] = useState<PersonalRecord[]>(() => {
    try {
      const s = localStorage.getItem('lifeos_fitness_prs_v1');
      return s ? JSON.parse(s) : [];
    } catch {
      return [];
    }
  });
  const [trainingLoadLogs, setTrainingLoadLogs] = useState<TrainingLoadLog[]>(() => {
    try {
      const s = localStorage.getItem('lifeos_fitness_tload_v1');
      return s ? JSON.parse(s) : [];
    } catch {
      return [];
    }
  });
  const [recoveryLogs, setRecoveryLogs] = useState<RecoveryLog[]>(() => {
    try {
      const s = localStorage.getItem('lifeos_fitness_recovery_v1');
      return s ? JSON.parse(s) : [];
    } catch {
      return [];
    }
  });
  const [workoutSchedules, setWorkoutSchedules] = useState<WorkoutSchedule[]>(() => {
    try {
      const s = localStorage.getItem('lifeos_fitness_schedules_v1');
      return s ? JSON.parse(s) : [];
    } catch {
      return [];
    }
  });
  const [weeklyFitnessReports, setWeeklyFitnessReports] = useState<WeeklyFitnessReport[]>(() => {
    try {
      const s = localStorage.getItem('lifeos_fitness_reports_v1');
      return s ? JSON.parse(s) : [];
    } catch {
      return [];
    }
  });
  const [targetWeightKg, setTargetWeightKgState] = useState<number>(() => {
    try {
      const s = localStorage.getItem('lifeos_fitness_target_weight_v1');
      return s ? Number(s) || 72 : 72;
    } catch {
      return 72;
    }
  });
  const [prCelebrationBanner, setPrCelebrationBanner] = useState<string[] | null>(null);

  // Pixel-Art RPG Gamification State (persisted to localStorage + Firestore ai_action_logs)
  const [rpgState, setRpgState] = useState<RpgGamificationState>(() => {
    try {
      const s = localStorage.getItem('lifeos_rpg_world_v1');
      if (s) {
        const parsed = JSON.parse(s);
        return {
          ...DEFAULT_RPG_STATE,
          ...parsed,
          ownedItemIds: Array.from(
            new Set([...STARTER_ITEM_IDS, ...(parsed.ownedItemIds || [])])
          ),
        };
      }
    } catch {
      // ignore
    }
    return DEFAULT_RPG_STATE;
  });
  const [isRpgWorldOpen, setIsRpgWorldOpen] = useState(false);
  const [rpgWorldInitialTab, setRpgWorldInitialTab] = useState<
    'study_room' | 'missions' | 'shop' | 'inventory' | 'achievements'
  >('study_room');
  const [levelUpBanner, setLevelUpBanner] = useState<{
    newLevel: number;
    bonusCoins: number;
    rankTitle: string;
  } | null>(null);

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

  // Automatically persist all personal workspace collections to localStorage
  useEffect(() => {
    if (profile) saveLocalStore(LS_DATA_KEYS.profile, profile);
  }, [profile]);
  useEffect(() => saveLocalStore(LS_DATA_KEYS.tasks, tasks), [tasks]);
  useEffect(() => saveLocalStore(LS_DATA_KEYS.events, events), [events]);
  useEffect(() => saveLocalStore(LS_DATA_KEYS.studyModules, studyModules), [studyModules]);
  useEffect(() => saveLocalStore(LS_DATA_KEYS.studyItems, studyItems), [studyItems]);
  useEffect(() => saveLocalStore(LS_DATA_KEYS.healthLogs, healthLogs), [healthLogs]);
  useEffect(() => saveLocalStore(LS_DATA_KEYS.financeRecords, financeRecords), [financeRecords]);
  useEffect(() => saveLocalStore(LS_DATA_KEYS.knowledgeItems, knowledgeItems), [knowledgeItems]);
  useEffect(() => saveLocalStore(LS_DATA_KEYS.goalsHabits, goalsHabits), [goalsHabits]);
  useEffect(() => saveLocalStore(LS_DATA_KEYS.aiLogs, aiLogs), [aiLogs]);
  useEffect(() => saveLocalStore(LS_DATA_KEYS.dailyReviews, dailyReviews), [dailyReviews]);

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
        setProfile((prev) =>
          prev || loadLocalStore<UserProfile>(LS_DATA_KEYS.profile, createDefaultPersonalProfile())
        );
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
    const current = profile || createDefaultPersonalProfile();
    const updated: UserProfile = { ...current, ...partial };
    setProfile(updated);
    saveLocalStore(LS_DATA_KEYS.profile, updated);

    if (!user) return;
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

  const persistRpgState = async (
    nextState: RpgGamificationState,
    summaryNote = 'Updated Pixel RPG World'
  ) => {
    const stamped: RpgGamificationState = {
      ...nextState,
      ownedItemIds: Array.from(new Set([...STARTER_ITEM_IDS, ...nextState.ownedItemIds])),
      updatedAt: new Date().toISOString(),
    };
    setRpgState(stamped);
    try {
      localStorage.setItem('lifeos_rpg_world_v1', JSON.stringify(stamped));
    } catch {
      // ignore
    }

    if (user) {
      const compactPayload = JSON.stringify({
        ownedItemIds: stamped.ownedItemIds,
        placedItems: stamped.placedItems,
        savedRoomPresets: stamped.savedRoomPresets.slice(0, 6),
        activeEnvironment: stamped.activeEnvironment,
        activeAmbientSound: stamped.activeAmbientSound,
        ambientVolume: stamped.ambientVolume,
        avatar: stamped.avatar,
        customMissions: stamped.customMissions.slice(0, 8),
        claimedMissionKeys: stamped.claimedMissionKeys.slice(-50),
        claimedAchievementIds: stamped.claimedAchievementIds,
        rewardedActivityIds: stamped.rewardedActivityIds.slice(-120),
        transactions: stamped.transactions.slice(0, 25),
        updatedAt: stamped.updatedAt,
      }).slice(0, 3950);

      const existingRpgLog = aiLogs.find((l) => l.toolName === 'gamification_rpg_store');
      if (existingRpgLog) {
        try {
          await updateDoc(doc(db, 'ai_action_logs', existingRpgLog.id), {
            summary: sanitizeString(summaryNote, 1500, 'Updated Pixel RPG World'),
            payloadJson: compactPayload,
            updatedAt: serverTimestamp(),
          });
        } catch {
          // ignore
        }
      } else {
        await logAiAction({
          actionTitle: 'Pixel RPG World Store',
          toolName: 'gamification_rpg_store',
          permissionLevel: 'routine_write',
          status: 'executed',
          targetModule: 'rank',
          summary: sanitizeString(summaryNote, 1500, 'Initialized Pixel RPG World'),
          payloadJson: compactPayload,
        });
      }
    }
  };

  const awardXpAndCoins = async (
    xpDelta: number,
    coinsDelta: number,
    meta?: {
      activityKey?: string;
      reason?: string;
      sourceModule?: RpgCoinTransaction['sourceModule'];
    }
  ) => {
    // Duplicate-reward prevention: never award XP or coins twice for the same completed activityKey
    if (meta?.activityKey && rpgState.rewardedActivityIds.includes(meta.activityKey)) {
      return;
    }

    const currentXp = profile?.xp ?? 0;
    const currentCoins = profile?.coins ?? 0;
    const prevLevelInfo = calculateLevelProgress(currentXp);

    const nextXp = Math.max(0, currentXp + xpDelta);
    const nextLevelInfo = calculateLevelProgress(nextXp);
    const leveledUp = nextLevelInfo.level > prevLevelInfo.level && xpDelta > 0;
    const levelBonusCoins = leveledUp ? nextLevelInfo.level * 15 : 0;
    const nextCoins = Math.max(0, currentCoins + coinsDelta + levelBonusCoins);

    if (profile) {
      setProfile({
        ...profile,
        xp: nextXp,
        level: nextLevelInfo.level,
        coins: nextCoins,
      });
    }

    if (user && profile) {
      await updateProfileSettings({
        xp: nextXp,
        level: nextLevelInfo.level,
        coins: nextCoins,
      });
    }

    if (leveledUp) {
      setLevelUpBanner({
        newLevel: nextLevelInfo.level,
        bonusCoins: levelBonusCoins,
        rankTitle: `Level ${nextLevelInfo.level} Unlocked!`,
      });
    }

    const newTx: RpgCoinTransaction = {
      id: `tx_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      timestamp: new Date().toISOString(),
      type: coinsDelta + levelBonusCoins >= 0 ? 'earn' : 'spend',
      amount: coinsDelta + levelBonusCoins,
      xpDelta,
      reason:
        meta?.reason ||
        (xpDelta > 0
          ? `Earned +${xpDelta} XP & +${coinsDelta} Life Coins`
          : `Spent ${Math.abs(coinsDelta)} Life Coins`),
      sourceModule: meta?.sourceModule || 'task',
      activityKey: meta?.activityKey,
    };

    const nextRpg: RpgGamificationState = {
      ...rpgState,
      rewardedActivityIds: meta?.activityKey
        ? [...rpgState.rewardedActivityIds, meta.activityKey]
        : rpgState.rewardedActivityIds,
      transactions: [newTx, ...rpgState.transactions].slice(0, 60),
    };
    await persistRpgState(nextRpg, newTx.reason);
  };

  const createTask = async (data: Omit<TaskItem, 'id' | 'ownerId'>) => {
    const cleanTitle = sanitizeString(data.title, 200, 'Untitled Task');
    const cleanDue = sanitizeString(data.dueDate, 32, todayDate);
    const cleanEst = Math.max(1, Math.min(1440, Math.round(data.estimatedMinutes || 30)));
    if (!user) {
      const item: TaskItem = {
        id: makeLocalId('task'),
        ownerId: PERSONAL_OWNER_ID,
        title: cleanTitle,
        priority: data.priority,
        status: data.status || 'todo',
        category: data.category || 'personal',
        estimatedMinutes: cleanEst,
        dueDate: cleanDue,
        ...(data.notes ? { notes: sanitizeString(data.notes, 2000) } : {}),
        ...(data.statusReason ? { statusReason: sanitizeString(data.statusReason, 300) } : {}),
        ...(data.scheduledStart ? { scheduledStart: sanitizeString(data.scheduledStart, 32) } : {}),
        ...(data.linkedGoalId ? { linkedGoalId: sanitizeString(data.linkedGoalId, 128) } : {}),
        ...(data.linkedModuleId ? { linkedModuleId: sanitizeString(data.linkedModuleId, 128) } : {}),
        ...(typeof data.isRecurring === 'boolean' ? { isRecurring: data.isRecurring } : {}),
        ...(data.recurrenceRule ? { recurrenceRule: sanitizeString(data.recurrenceRule, 64) } : {}),
      };
      setTasks((prev) => [item, ...prev]);
      return;
    }
    try {
      const payload: Record<string, unknown> = {
        ownerId: user.uid,
        title: cleanTitle,
        priority: data.priority,
        status: data.status || 'todo',
        category: data.category || 'personal',
        estimatedMinutes: cleanEst,
        dueDate: cleanDue,
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
    const cleanPartial: Partial<TaskItem> = {};
    if (partial.title !== undefined) cleanPartial.title = sanitizeString(partial.title, 200, task.title);
    if (partial.notes !== undefined) cleanPartial.notes = sanitizeString(partial.notes, 2000);
    if (partial.priority !== undefined) cleanPartial.priority = partial.priority;
    if (partial.status !== undefined) cleanPartial.status = partial.status;
    if (partial.statusReason !== undefined) {
      cleanPartial.statusReason = sanitizeString(partial.statusReason, 300);
    }
    if (partial.category !== undefined) cleanPartial.category = partial.category;
    if (partial.estimatedMinutes !== undefined) {
      cleanPartial.estimatedMinutes = Math.max(1, Math.min(1440, Math.round(partial.estimatedMinutes)));
    }
    if (partial.actualMinutes !== undefined) {
      cleanPartial.actualMinutes = Math.max(0, Math.min(1440, Math.round(partial.actualMinutes)));
    }
    if (partial.dueDate !== undefined) cleanPartial.dueDate = sanitizeString(partial.dueDate, 32, todayDate);
    if (partial.scheduledStart !== undefined) {
      cleanPartial.scheduledStart = sanitizeString(partial.scheduledStart, 32);
    }
    if (partial.linkedGoalId !== undefined) {
      cleanPartial.linkedGoalId = sanitizeString(partial.linkedGoalId, 128);
    }
    if (partial.linkedModuleId !== undefined) {
      cleanPartial.linkedModuleId = sanitizeString(partial.linkedModuleId, 128);
    }

    if (!user) {
      setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, ...cleanPartial } : t)));
      if (partial.status === 'completed' && task.status !== 'completed') {
        const xpGain = task.priority === 'critical' ? 40 : task.priority === 'high' ? 30 : 20;
        await awardXpAndCoins(xpGain, 10, {
          activityKey: `task_complete_${task.id}`,
          reason: `Completed Task: ${task.title}`,
          sourceModule: 'task',
        });
      }
      return;
    }

    try {
      await updateDoc(doc(db, 'tasks', task.id), {
        ...cleanPartial,
        updatedAt: serverTimestamp(),
      });

      if (partial.status === 'completed' && task.status !== 'completed') {
        const xpGain = task.priority === 'critical' ? 40 : task.priority === 'high' ? 30 : 20;
        await awardXpAndCoins(xpGain, 10, {
          activityKey: `task_complete_${task.id}`,
          reason: `Completed Task: ${task.title}`,
          sourceModule: 'task',
        });
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
    if (!user) {
      setTasks((prev) => prev.filter((t) => t.id !== taskId));
      return;
    }
    try {
      await deleteDoc(doc(db, 'tasks', taskId));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `tasks/${taskId}`);
    }
  };

  const createCalendarEvent = async (data: Omit<CalendarEventItem, 'id' | 'ownerId'>) => {
    const cleanTitle = sanitizeString(data.title, 200, 'Scheduled Event');
    const cleanDate = sanitizeString(data.date, 16, todayDate);
    const cleanStart = sanitizeString(data.startTime, 10, '09:00');
    const cleanEnd = sanitizeString(data.endTime, 10, '10:00');
    if (!user) {
      const ev: CalendarEventItem = {
        id: makeLocalId('ev'),
        ownerId: PERSONAL_OWNER_ID,
        title: cleanTitle,
        eventType: data.eventType,
        date: cleanDate,
        startTime: cleanStart,
        endTime: cleanEnd,
        isProtectedAnchor: Boolean(data.isProtectedAnchor),
        ...(data.location ? { location: sanitizeString(data.location, 200) } : {}),
        ...(data.linkedRecordId ? { linkedRecordId: sanitizeString(data.linkedRecordId, 128) } : {}),
      };
      setEvents((prev) => [...prev, ev]);
      return;
    }
    try {
      const payload: Record<string, unknown> = {
        ownerId: user.uid,
        title: cleanTitle,
        eventType: data.eventType,
        date: cleanDate,
        startTime: cleanStart,
        endTime: cleanEnd,
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
    if (!user) {
      setEvents((prev) => prev.filter((e) => e.id !== eventId));
      return;
    }
    try {
      await deleteDoc(doc(db, 'calendar_events', eventId));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `calendar_events/${eventId}`);
    }
  };

  const createStudyModule = async (
    data: Omit<StudyModuleItem, 'id' | 'ownerId'>
  ): Promise<string> => {
    const cleanCode = sanitizeString(data.code, 32, 'MOD101');
    const cleanTitle = sanitizeString(data.title, 200, 'Academic Module');
    const cleanTerm = sanitizeString(data.term, 64, 'Current Term');
    const cleanExamDate = sanitizeString(data.examDate, 32, todayDate);
    const cleanTotal = Math.max(0, Math.min(500, Math.round(data.totalLectures || 12)));
    const cleanCompleted = Math.max(0, Math.min(500, Math.round(data.completedLectures || 0)));

    if (!user) {
      const newId = makeLocalId('mod');
      const mod: StudyModuleItem = {
        id: newId,
        ownerId: PERSONAL_OWNER_ID,
        code: cleanCode,
        title: cleanTitle,
        term: cleanTerm,
        examDate: cleanExamDate,
        totalLectures: cleanTotal,
        completedLectures: cleanCompleted,
        ...(data.targetGrade ? { targetGrade: sanitizeString(data.targetGrade, 16) } : {}),
      };
      setStudyModules((prev) => [...prev, mod]);
      await createCalendarEvent({
        title: `Exam: ${cleanCode} — ${cleanTitle}`,
        eventType: 'exam',
        date: cleanExamDate,
        startTime: '09:00',
        endTime: '12:00',
        location: 'Exam Hall',
        isProtectedAnchor: true,
        linkedRecordId: newId,
      });
      return newId;
    }

    try {
      const payload: Record<string, unknown> = {
        ownerId: user.uid,
        code: cleanCode,
        title: cleanTitle,
        term: cleanTerm,
        examDate: cleanExamDate,
        totalLectures: cleanTotal,
        completedLectures: cleanCompleted,
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
    if (!user) {
      setStudyModules((prev) => prev.filter((m) => m.id !== moduleId));
      return;
    }
    try {
      await deleteDoc(doc(db, 'study_modules', moduleId));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `study_modules/${moduleId}`);
    }
  };

  const createStudyItem = async (data: Omit<StudyItemRecord, 'id' | 'ownerId'>) => {
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

    if (!user) {
      const item: StudyItemRecord = {
        id: makeLocalId('study'),
        ownerId: PERSONAL_OWNER_ID,
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
        ...(data.stabilityDays !== undefined ? { stabilityDays: data.stabilityDays } : {}),
        ...(data.difficultyScore !== undefined ? { difficultyScore: data.difficultyScore } : {}),
        ...(data.lastStudiedDate ? { lastStudiedDate: sanitizeString(data.lastStudiedDate, 32) } : {}),
        ...(data.notes ? { notes: sanitizeString(data.notes, 4000) } : {}),
        ...(data.frontPrompt ? { frontPrompt: sanitizeString(data.frontPrompt, 500) } : {}),
        ...(data.backAnswer ? { backAnswer: sanitizeString(data.backAnswer, 2000) } : {}),
        ...(data.sourceRef ? { sourceRef: sanitizeString(data.sourceRef, 200) } : {}),
      };
      setStudyItems((prev) => [...prev, item]);
      return;
    }

    try {
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
    if (!user) {
      setStudyItems((prev) => prev.filter((s) => s.id !== itemId));
      return;
    }
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

    if (!user) {
      setStudyItems((prev) =>
        prev.map((s) =>
          s.id === item.id
            ? {
                ...s,
                status: newStatus,
                confidenceRating: rating,
                stabilityDays: nextStabilityDays,
                repetitionCount: prevReps + 1,
                lastStudiedDate: todayDate,
                nextReviewDate,
              }
            : s
        )
      );
      if (item.itemType === 'lecture' && item.status === 'unstudied') {
        setStudyModules((prev) =>
          prev.map((m) =>
            m.id === item.moduleId
              ? {
                  ...m,
                  completedLectures: Math.min(m.totalLectures, m.completedLectures + 1),
                }
              : m
          )
        );
      }
      await awardXpAndCoins(35, 15, {
        activityKey: `study_rev_${item.id}_${todayDate}_${prevReps + 1}`,
        reason: `Studied ${item.itemType}: ${item.title}`,
        sourceModule: 'study',
      });
      return;
    }

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

      await awardXpAndCoins(35, 15, {
        activityKey: `study_rev_${item.id}_${todayDate}_${prevReps + 1}`,
        reason: `Studied ${item.itemType}: ${item.title}`,
        sourceModule: 'study',
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `study_items/${item.id}`);
    }
  };

  const createHealthLog = async (
    data: Omit<HealthLogRecord, 'id' | 'ownerId'>,
    scheduleOnCalendar = false
  ) => {
    const ownerId = user?.uid || PERSONAL_OWNER_ID;
    let createdLogId = makeLocalId('hl');

    if (!user) {
      const localRecord: HealthLogRecord = {
        id: createdLogId,
        ownerId,
        logType: data.logType,
        date: sanitizeString(data.date, 16, todayDate),
        title: sanitizeString(data.title, 200, 'Health Entry'),
        ...(data.weightKg !== undefined ? { weightKg: Number(data.weightKg) } : {}),
        ...(data.waistCm !== undefined ? { waistCm: Number(data.waistCm) } : {}),
        ...(data.chestCm !== undefined ? { chestCm: Number(data.chestCm) } : {}),
        ...(data.armsCm !== undefined ? { armsCm: Number(data.armsCm) } : {}),
        ...(data.durationMinutes !== undefined
          ? { durationMinutes: Math.round(data.durationMinutes) }
          : {}),
        ...(data.volumeKg !== undefined ? { volumeKg: Math.round(data.volumeKg) } : {}),
        ...(data.rpe !== undefined ? { rpe: Math.max(1, Math.min(10, Math.round(data.rpe))) } : {}),
        ...(data.exercisesSummary
          ? { exercisesSummary: sanitizeString(data.exercisesSummary, 1500) }
          : {}),
        ...(data.calories !== undefined ? { calories: Math.round(data.calories) } : {}),
        ...(data.proteinGrams !== undefined
          ? { proteinGrams: Math.round(data.proteinGrams) }
          : {}),
        ...(data.carbsGrams !== undefined ? { carbsGrams: Math.round(data.carbsGrams) } : {}),
        ...(data.fatGrams !== undefined ? { fatGrams: Math.round(data.fatGrams) } : {}),
        ...(data.notes ? { notes: sanitizeString(data.notes, 1000) } : {}),
      };
      setHealthLogs((prev) => [localRecord, ...prev]);
    } else {
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
        createdLogId = ref.id;
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, 'health_logs');
        return;
      }
    }

    if (data.logType === 'workout') {
      await awardXpAndCoins(40, 15, {
        activityKey: `workout_${createdLogId}`,
        reason: `Logged Workout: ${data.title}`,
        sourceModule: 'workout',
      });
      const parsedExercises = parseExercisesFromWorkoutInput(
        data.exercisesSummary,
        data.title,
        data.volumeKg || 0,
        data.rpe || 8
      );
      const loadEntry = buildTrainingLoadLog({
        workoutId: createdLogId,
        workoutTitle: data.title,
        date: data.date || todayDate,
        durationMinutes: data.durationMinutes || 45,
        rpe: data.rpe || 8,
        exercises: parsedExercises,
        fallbackVolumeKg: data.volumeKg,
        ownerId,
      });
      const prResult = evaluateAndUpdatePersonalRecords({
        existingPRs: personalRecords,
        workoutId: createdLogId,
        workoutDate: data.date || todayDate,
        exercises: parsedExercises,
        ownerId,
      });
      const nextLoadLogs = [
        loadEntry,
        ...trainingLoadLogs.filter((l) => l.workoutId !== createdLogId),
      ];
      setTrainingLoadLogs(nextLoadLogs);
      setPersonalRecords(prResult.updatedPRs);
      if (prResult.celebrationMessages.length > 0) {
        setPrCelebrationBanner(prResult.celebrationMessages);
      }
      await persistFitnessIntelStore({
        prs: prResult.updatedPRs,
        tloads: nextLoadLogs,
        recoveries: recoveryLogs,
        schedules: workoutSchedules,
        reports: weeklyFitnessReports,
        targetW: targetWeightKg,
        summaryNote: `Logged workout "${data.title}" (${loadEntry.rawVolumeKg}kg volume, ${prResult.newlyBrokenPRs.length} new PRs)`,
      });

      if (scheduleOnCalendar) {
        await createCalendarEvent({
          title: `Workout: ${data.title}`,
          eventType: 'workout',
          date: data.date || todayDate,
          startTime: '17:30',
          endTime: '18:30',
          location: 'Gym',
          isProtectedAnchor: false,
          linkedRecordId: createdLogId,
        });
      }
    } else {
      await awardXpAndCoins(10, 5, {
        activityKey: `health_${createdLogId}`,
        reason: `Logged ${data.logType}: ${data.title}`,
        sourceModule: 'workout',
      });
    }
  };

  const deleteHealthLog = async (logId: string) => {
    if (!user) {
      setHealthLogs((prev) => prev.filter((h) => h.id !== logId));
      return;
    }
    try {
      await deleteDoc(doc(db, 'health_logs', logId));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `health_logs/${logId}`);
    }
  };

  const createFinanceRecord = async (data: Omit<FinanceRecordItem, 'id' | 'ownerId'>) => {
    const cleanTitle = sanitizeString(data.title, 200, 'Transaction');
    const cleanCategory = sanitizeString(data.category, 64, 'General');
    const cleanAccount = sanitizeString(data.accountName, 64, 'Cash');
    const cleanAmount = Math.max(0, Math.round(data.amountMinor));
    const cleanDate = sanitizeString(data.date, 16, todayDate);

    if (!user) {
      const rec: FinanceRecordItem = {
        id: makeLocalId('fin'),
        ownerId: PERSONAL_OWNER_ID,
        recordType: data.recordType,
        title: cleanTitle,
        category: cleanCategory,
        accountName: cleanAccount,
        amountMinor: cleanAmount,
        date: cleanDate,
        ...(data.targetAmountMinor !== undefined
          ? { targetAmountMinor: Math.max(0, Math.round(data.targetAmountMinor)) }
          : {}),
        ...(typeof data.isRecurring === 'boolean' ? { isRecurring: data.isRecurring } : {}),
        ...(data.notes ? { notes: sanitizeString(data.notes, 1000) } : {}),
      };
      setFinanceRecords((prev) => [rec, ...prev]);
      return;
    }

    try {
      const payload: Record<string, unknown> = {
        ownerId: user.uid,
        recordType: data.recordType,
        title: cleanTitle,
        category: cleanCategory,
        accountName: cleanAccount,
        amountMinor: cleanAmount,
        date: cleanDate,
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
    if (!user) {
      setFinanceRecords((prev) => prev.filter((f) => f.id !== recordId));
      return;
    }
    try {
      await deleteDoc(doc(db, 'finance_records', recordId));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `finance_records/${recordId}`);
    }
  };

  const createKnowledgeItem = async (data: Omit<KnowledgeItemRecord, 'id' | 'ownerId'>) => {
    const cleanTitle = sanitizeString(data.title, 200, 'Resource');
    const cleanStatus = data.status || 'in_progress';
    const cleanCurrent = Math.max(0, Math.round(data.progressCurrent || 0));
    const cleanTotal = Math.max(1, Math.round(data.progressTotal || 100));
    const cleanUnit = sanitizeString(data.progressUnit, 32, 'pages');

    if (!user) {
      const rec: KnowledgeItemRecord = {
        id: makeLocalId('know'),
        ownerId: PERSONAL_OWNER_ID,
        itemType: data.itemType,
        title: cleanTitle,
        status: cleanStatus,
        progressCurrent: cleanCurrent,
        progressTotal: cleanTotal,
        progressUnit: cleanUnit,
        ...(data.authorOrSource ? { authorOrSource: sanitizeString(data.authorOrSource, 150) } : {}),
        ...(data.rating !== undefined
          ? { rating: Math.max(1, Math.min(5, Math.round(data.rating))) }
          : {}),
        ...(data.tags ? { tags: sanitizeString(data.tags, 200) } : {}),
        ...(data.takeaways ? { takeaways: sanitizeString(data.takeaways, 4000) } : {}),
        ...(data.linkedEntityId ? { linkedEntityId: sanitizeString(data.linkedEntityId, 128) } : {}),
      };
      setKnowledgeItems((prev) => [rec, ...prev]);
      return;
    }

    try {
      const payload: Record<string, unknown> = {
        ownerId: user.uid,
        itemType: data.itemType,
        title: cleanTitle,
        status: cleanStatus,
        progressCurrent: cleanCurrent,
        progressTotal: cleanTotal,
        progressUnit: cleanUnit,
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
    const clamped = Math.max(0, Math.min(item.progressTotal, Math.round(newCurrent)));
    const nextStatus: KnowledgeItemRecord['status'] =
      clamped >= item.progressTotal ? 'completed' : 'in_progress';

    if (!user) {
      setKnowledgeItems((prev) =>
        prev.map((k) =>
          k.id === item.id
            ? {
                ...k,
                progressCurrent: clamped,
                status: nextStatus,
                ...(takeaways !== undefined ? { takeaways: sanitizeString(takeaways, 4000) } : {}),
              }
            : k
        )
      );
      if (nextStatus === 'completed' && item.status !== 'completed') {
        await awardXpAndCoins(50, 25, {
          activityKey: `knowledge_complete_${item.id}`,
          reason: `Completed Library Item: ${item.title}`,
          sourceModule: 'study',
        });
      }
      return;
    }

    try {
      const payload: Record<string, unknown> = {
        progressCurrent: clamped,
        status: nextStatus,
        updatedAt: serverTimestamp(),
      };
      if (takeaways !== undefined) payload.takeaways = sanitizeString(takeaways, 4000);
      await updateDoc(doc(db, 'knowledge_items', item.id), payload);
      if (nextStatus === 'completed' && item.status !== 'completed') {
        await awardXpAndCoins(50, 25, {
          activityKey: `knowledge_complete_${item.id}`,
          reason: `Completed Library Item: ${item.title}`,
          sourceModule: 'study',
        });
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `knowledge_items/${item.id}`);
    }
  };

  const deleteKnowledgeItem = async (itemId: string) => {
    if (!user) {
      setKnowledgeItems((prev) => prev.filter((k) => k.id !== itemId));
      return;
    }
    try {
      await deleteDoc(doc(db, 'knowledge_items', itemId));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `knowledge_items/${itemId}`);
    }
  };

  const createGoalHabit = async (data: Omit<GoalHabitRecord, 'id' | 'ownerId'>) => {
    const cleanTitle = sanitizeString(data.title, 200, 'Goal / Habit');
    const cleanStatus = data.status || 'active';
    const cleanFreq = data.frequency || 'daily';
    const cleanProgress = Math.max(0, Math.min(100, Math.round(data.progressPercent || 0)));
    const cleanStreak = Math.max(0, Math.round(data.streakCount || 0));
    const cleanDone = Boolean(data.completedToday);
    const cleanXp = Math.max(0, Math.min(10000, Math.round(data.xpReward || 25)));
    const cleanCoins = Math.max(0, Math.min(100000, Math.round(data.coinCostOrReward || 15)));

    if (!user) {
      const rec: GoalHabitRecord = {
        id: makeLocalId('gh'),
        ownerId: PERSONAL_OWNER_ID,
        recordType: data.recordType,
        title: cleanTitle,
        status: cleanStatus,
        frequency: cleanFreq,
        progressPercent: cleanProgress,
        streakCount: cleanStreak,
        completedToday: cleanDone,
        xpReward: cleanXp,
        coinCostOrReward: cleanCoins,
        ...(data.whyReason ? { whyReason: sanitizeString(data.whyReason, 500) } : {}),
        ...(data.lastCompletedDate
          ? { lastCompletedDate: sanitizeString(data.lastCompletedDate, 16) }
          : {}),
        ...(data.targetDate ? { targetDate: sanitizeString(data.targetDate, 16) } : {}),
        ...(data.nextSmallAction
          ? { nextSmallAction: sanitizeString(data.nextSmallAction, 300) }
          : {}),
      };
      setGoalsHabits((prev) => [rec, ...prev]);
      return;
    }

    try {
      const payload: Record<string, unknown> = {
        ownerId: user.uid,
        recordType: data.recordType,
        title: cleanTitle,
        status: cleanStatus,
        frequency: cleanFreq,
        progressPercent: cleanProgress,
        streakCount: cleanStreak,
        completedToday: cleanDone,
        xpReward: cleanXp,
        coinCostOrReward: cleanCoins,
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
    const nextDone = !record.completedToday;
    const nextStreak = nextDone ? record.streakCount + 1 : Math.max(0, record.streakCount - 1);
    const nextProgress =
      record.recordType === 'goal'
        ? Math.min(100, record.progressPercent + (nextDone ? 20 : -20))
        : nextDone
        ? 100
        : 0;
    const nextStatus: GoalHabitRecord['status'] =
      nextProgress >= 100 && record.recordType !== 'habit' ? 'completed' : 'active';

    if (!user) {
      setGoalsHabits((prev) =>
        prev.map((g) =>
          g.id === record.id
            ? {
                ...g,
                completedToday: nextDone,
                streakCount: nextStreak,
                progressPercent: Math.max(0, nextProgress),
                lastCompletedDate: todayDate,
                status: nextStatus,
              }
            : g
        )
      );
      if (nextDone) {
        await awardXpAndCoins(record.xpReward || 25, record.coinCostOrReward || 10, {
          activityKey: `habit_goal_${record.id}_${todayDate}`,
          reason: `Completed ${record.recordType}: ${record.title}`,
          sourceModule: 'habit',
        });
      }
      return;
    }

    try {
      await updateDoc(doc(db, 'goals_habits', record.id), {
        completedToday: nextDone,
        streakCount: nextStreak,
        progressPercent: Math.max(0, nextProgress),
        lastCompletedDate: todayDate,
        status: nextStatus,
        updatedAt: serverTimestamp(),
      });
      if (nextDone) {
        await awardXpAndCoins(record.xpReward || 25, record.coinCostOrReward || 10, {
          activityKey: `habit_goal_${record.id}_${todayDate}`,
          reason: `Completed ${record.recordType}: ${record.title}`,
          sourceModule: 'habit',
        });
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `goals_habits/${record.id}`);
    }
  };

  const deleteGoalHabit = async (recordId: string) => {
    if (!user) {
      setGoalsHabits((prev) => prev.filter((g) => g.id !== recordId));
      return;
    }
    try {
      await deleteDoc(doc(db, 'goals_habits', recordId));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `goals_habits/${recordId}`);
    }
  };

  const redeemReward = async (reward: GoalHabitRecord) => {
    if (!profile) return;
    if (profile.coins < reward.coinCostOrReward) return;
    await awardXpAndCoins(0, -reward.coinCostOrReward, {
      reason: `Redeemed Reward: ${reward.title}`,
      sourceModule: 'shop',
    });
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
    const cleanTitle = sanitizeString(data.actionTitle, 200, 'AI Action');
    const cleanTool = sanitizeString(data.toolName, 100, 'assistant_tool');
    const cleanTarget = sanitizeString(data.targetModule, 64, 'System');
    const cleanSummary = sanitizeString(data.summary, 1500, 'Executed action');
    const cleanPayload = data.payloadJson ? sanitizeString(data.payloadJson, 4000) : undefined;

    if (!user) {
      const rec: AiActionLogRecord = {
        id: makeLocalId('ailog'),
        ownerId: PERSONAL_OWNER_ID,
        actionTitle: cleanTitle,
        toolName: cleanTool,
        permissionLevel: data.permissionLevel,
        status: data.status,
        targetModule: cleanTarget,
        summary: cleanSummary,
        ...(cleanPayload ? { payloadJson: cleanPayload } : {}),
      };
      setAiLogs((prev) => [rec, ...prev]);
      return;
    }

    try {
      const payload: Record<string, unknown> = {
        ownerId: user.uid,
        actionTitle: cleanTitle,
        toolName: cleanTool,
        permissionLevel: data.permissionLevel,
        status: data.status,
        targetModule: cleanTarget,
        summary: cleanSummary,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };
      if (cleanPayload) payload.payloadJson = cleanPayload;
      await addDoc(collection(db, 'ai_action_logs'), payload);
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'ai_action_logs');
    }
  };

  const resolveAiProposal = async (
    log: AiActionLogRecord,
    decision: 'approved' | 'rejected' | 'undone'
  ) => {
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

      if (!user) {
        setAiLogs((prev) =>
          prev.map((a) => (a.id === log.id ? { ...a, status: decision } : a))
        );
        return;
      }

      await updateDoc(doc(db, 'ai_action_logs', log.id), {
        status: decision,
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      if (user) {
        handleFirestoreError(err, OperationType.UPDATE, `ai_action_logs/${log.id}`);
      }
    }
  };

  const deleteAiLog = async (logId: string) => {
    if (!user) {
      setAiLogs((prev) => prev.filter((a) => a.id !== logId));
      return;
    }
    try {
      await deleteDoc(doc(db, 'ai_action_logs', logId));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `ai_action_logs/${logId}`);
    }
  };

  const saveDailyReview = async (data: Omit<DailyReviewRecord, 'id' | 'ownerId'>) => {
    const cleanDate = sanitizeString(data.date, 16, todayDate);
    const cleanCommit = Math.max(0, Math.min(100, Math.round(data.commitmentScore)));
    const cleanComp = Math.max(0, Math.min(100, Math.round(data.completionScore)));
    const cleanCons = Math.max(0, Math.min(100, Math.round(data.consistencyScore)));
    const cleanPlan = Math.max(0, Math.min(100, Math.round(data.planningAccuracyScore)));
    const cleanWell = Math.max(0, Math.min(100, Math.round(data.wellbeingScore)));

    if (!user) {
      const rec: DailyReviewRecord = {
        id: makeLocalId('rev'),
        ownerId: PERSONAL_OWNER_ID,
        date: cleanDate,
        energyLevel: data.energyLevel,
        commitmentScore: cleanCommit,
        completionScore: cleanComp,
        consistencyScore: cleanCons,
        planningAccuracyScore: cleanPlan,
        wellbeingScore: cleanWell,
        ...(data.wins ? { wins: sanitizeString(data.wins, 1000) } : {}),
        ...(data.obstacles ? { obstacles: sanitizeString(data.obstacles, 1000) } : {}),
        ...(data.tomorrowAdjustment
          ? { tomorrowAdjustment: sanitizeString(data.tomorrowAdjustment, 1000) }
          : {}),
      };
      setDailyReviews((prev) => [rec, ...prev.filter((r) => r.date !== cleanDate)]);
      await awardXpAndCoins(30, 15, {
        activityKey: `daily_review_${cleanDate}`,
        reason: `Completed Daily Review (${cleanDate})`,
        sourceModule: 'mission',
      });
      return;
    }

    try {
      const payload: Record<string, unknown> = {
        ownerId: user.uid,
        date: cleanDate,
        energyLevel: data.energyLevel,
        commitmentScore: cleanCommit,
        completionScore: cleanComp,
        consistencyScore: cleanCons,
        planningAccuracyScore: cleanPlan,
        wellbeingScore: cleanWell,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };
      if (data.wins) payload.wins = sanitizeString(data.wins, 1000);
      if (data.obstacles) payload.obstacles = sanitizeString(data.obstacles, 1000);
      if (data.tomorrowAdjustment) {
        payload.tomorrowAdjustment = sanitizeString(data.tomorrowAdjustment, 1000);
      }

      await addDoc(collection(db, 'daily_reviews'), payload);
      await awardXpAndCoins(30, 15, {
        activityKey: `daily_review_${cleanDate}`,
        reason: `Completed Daily Review (${cleanDate})`,
        sourceModule: 'mission',
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'daily_reviews');
    }
  };

  const updateCalendarEvent = async (
    eventId: string,
    partial: Partial<Omit<CalendarEventItem, 'id' | 'ownerId'>>
  ) => {
    const clean: Partial<CalendarEventItem> = {};
    if (partial.title !== undefined) clean.title = sanitizeString(partial.title, 200);
    if (partial.eventType !== undefined) clean.eventType = partial.eventType;
    if (partial.date !== undefined) clean.date = sanitizeString(partial.date, 16);
    if (partial.startTime !== undefined) clean.startTime = sanitizeString(partial.startTime, 10);
    if (partial.endTime !== undefined) clean.endTime = sanitizeString(partial.endTime, 10);
    if (partial.location !== undefined) clean.location = sanitizeString(partial.location, 200);
    if (partial.isProtectedAnchor !== undefined) {
      clean.isProtectedAnchor = Boolean(partial.isProtectedAnchor);
    }

    if (!user) {
      setEvents((prev) => prev.map((e) => (e.id === eventId ? { ...e, ...clean } : e)));
      return;
    }

    try {
      await updateDoc(doc(db, 'calendar_events', eventId), {
        ...clean,
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `calendar_events/${eventId}`);
    }
  };

  const updateStudyModule = async (
    moduleId: string,
    partial: Partial<Omit<StudyModuleItem, 'id' | 'ownerId'>>
  ) => {
    const clean: Partial<StudyModuleItem> = {};
    if (partial.code !== undefined) clean.code = sanitizeString(partial.code, 32);
    if (partial.title !== undefined) clean.title = sanitizeString(partial.title, 200);
    if (partial.term !== undefined) clean.term = sanitizeString(partial.term, 64);
    if (partial.examDate !== undefined) clean.examDate = sanitizeString(partial.examDate, 32);
    if (partial.targetGrade !== undefined) {
      clean.targetGrade = sanitizeString(partial.targetGrade, 16);
    }
    if (partial.totalLectures !== undefined) {
      clean.totalLectures = Math.max(0, Math.min(500, Math.round(partial.totalLectures)));
    }
    if (partial.completedLectures !== undefined) {
      clean.completedLectures = Math.max(0, Math.min(500, Math.round(partial.completedLectures)));
    }

    if (!user) {
      setStudyModules((prev) => prev.map((m) => (m.id === moduleId ? { ...m, ...clean } : m)));
      return;
    }

    try {
      await updateDoc(doc(db, 'study_modules', moduleId), {
        ...clean,
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `study_modules/${moduleId}`);
    }
  };

  const updateStudyItem = async (
    itemId: string,
    partial: Partial<Omit<StudyItemRecord, 'id' | 'ownerId' | 'moduleId'>>
  ) => {
    const clean: Partial<StudyItemRecord> = {};
    if (partial.title !== undefined) clean.title = sanitizeString(partial.title, 200);
    if (partial.status !== undefined) clean.status = partial.status;
    if (partial.importance !== undefined) clean.importance = partial.importance;
    if (partial.estimatedMinutes !== undefined) {
      clean.estimatedMinutes = Math.max(1, Math.min(600, Math.round(partial.estimatedMinutes)));
    }
    if (partial.confidenceRating !== undefined) {
      clean.confidenceRating = Math.max(1, Math.min(5, Math.round(partial.confidenceRating)));
    }
    if (partial.nextReviewDate !== undefined) {
      clean.nextReviewDate = sanitizeString(partial.nextReviewDate, 32);
    }
    if (partial.lastStudiedDate !== undefined) {
      clean.lastStudiedDate = sanitizeString(partial.lastStudiedDate, 32);
    }
    if (partial.notes !== undefined) clean.notes = sanitizeString(partial.notes, 4000);
    if (partial.frontPrompt !== undefined) {
      clean.frontPrompt = sanitizeString(partial.frontPrompt, 500);
    }
    if (partial.backAnswer !== undefined) {
      clean.backAnswer = sanitizeString(partial.backAnswer, 2000);
    }

    if (!user) {
      setStudyItems((prev) => prev.map((s) => (s.id === itemId ? { ...s, ...clean } : s)));
      return;
    }

    try {
      await updateDoc(doc(db, 'study_items', itemId), {
        ...clean,
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `study_items/${itemId}`);
    }
  };

  const updateHealthLog = async (
    logId: string,
    partial: Partial<Omit<HealthLogRecord, 'id' | 'ownerId'>>
  ) => {
    const clean: Partial<HealthLogRecord> = {};
    if (partial.title !== undefined) clean.title = sanitizeString(partial.title, 200);
    if (partial.date !== undefined) clean.date = sanitizeString(partial.date, 16);
    if (partial.weightKg !== undefined) clean.weightKg = Number(partial.weightKg);
    if (partial.durationMinutes !== undefined) {
      clean.durationMinutes = Math.round(partial.durationMinutes);
    }
    if (partial.calories !== undefined) clean.calories = Math.round(partial.calories);
    if (partial.proteinGrams !== undefined) clean.proteinGrams = Math.round(partial.proteinGrams);
    if (partial.notes !== undefined) clean.notes = sanitizeString(partial.notes, 1000);

    if (!user) {
      setHealthLogs((prev) => prev.map((h) => (h.id === logId ? { ...h, ...clean } : h)));
      return;
    }

    try {
      await updateDoc(doc(db, 'health_logs', logId), {
        ...clean,
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `health_logs/${logId}`);
    }
  };

  const updateFinanceRecord = async (
    recordId: string,
    partial: Partial<Omit<FinanceRecordItem, 'id' | 'ownerId'>>
  ) => {
    const clean: Partial<FinanceRecordItem> = {};
    if (partial.title !== undefined) clean.title = sanitizeString(partial.title, 200);
    if (partial.category !== undefined) clean.category = sanitizeString(partial.category, 64);
    if (partial.accountName !== undefined) {
      clean.accountName = sanitizeString(partial.accountName, 64);
    }
    if (partial.amountMinor !== undefined) {
      clean.amountMinor = Math.max(0, Math.round(partial.amountMinor));
    }
    if (partial.date !== undefined) clean.date = sanitizeString(partial.date, 16);
    if (partial.notes !== undefined) clean.notes = sanitizeString(partial.notes, 1000);

    if (!user) {
      setFinanceRecords((prev) => prev.map((f) => (f.id === recordId ? { ...f, ...clean } : f)));
      return;
    }

    try {
      await updateDoc(doc(db, 'finance_records', recordId), {
        ...clean,
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `finance_records/${recordId}`);
    }
  };

  const updateKnowledgeItem = async (
    itemId: string,
    partial: Partial<Omit<KnowledgeItemRecord, 'id' | 'ownerId'>>
  ) => {
    const clean: Partial<KnowledgeItemRecord> = {};
    if (partial.title !== undefined) clean.title = sanitizeString(partial.title, 200);
    if (partial.authorOrSource !== undefined) {
      clean.authorOrSource = sanitizeString(partial.authorOrSource, 150);
    }
    if (partial.status !== undefined) clean.status = partial.status;
    if (partial.progressCurrent !== undefined) {
      clean.progressCurrent = Math.max(0, Math.round(partial.progressCurrent));
    }
    if (partial.progressTotal !== undefined) {
      clean.progressTotal = Math.max(1, Math.round(partial.progressTotal));
    }
    if (partial.takeaways !== undefined) clean.takeaways = sanitizeString(partial.takeaways, 4000);
    if (partial.tags !== undefined) clean.tags = sanitizeString(partial.tags, 200);

    if (!user) {
      setKnowledgeItems((prev) => prev.map((k) => (k.id === itemId ? { ...k, ...clean } : k)));
      return;
    }

    try {
      await updateDoc(doc(db, 'knowledge_items', itemId), {
        ...clean,
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `knowledge_items/${itemId}`);
    }
  };

  const updateGoalHabit = async (
    recordId: string,
    partial: Partial<Omit<GoalHabitRecord, 'id' | 'ownerId'>>
  ) => {
    const clean: Partial<GoalHabitRecord> = {};
    if (partial.title !== undefined) clean.title = sanitizeString(partial.title, 200);
    if (partial.whyReason !== undefined) clean.whyReason = sanitizeString(partial.whyReason, 500);
    if (partial.status !== undefined) clean.status = partial.status;
    if (partial.progressPercent !== undefined) {
      clean.progressPercent = Math.max(0, Math.min(100, Math.round(partial.progressPercent)));
    }
    if (partial.completedToday !== undefined) clean.completedToday = Boolean(partial.completedToday);

    if (!user) {
      setGoalsHabits((prev) => prev.map((g) => (g.id === recordId ? { ...g, ...clean } : g)));
      return;
    }

    try {
      await updateDoc(doc(db, 'goals_habits', recordId), {
        ...clean,
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `goals_habits/${recordId}`);
    }
  };

  const clearAllWorkspaceData = async () => {
    if (user) {
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
    }

    setStudyItems([]);
    setStudyModules([]);
    setTasks([]);
    setEvents([]);
    setHealthLogs([]);
    setFinanceRecords([]);
    setKnowledgeItems([]);
    setGoalsHabits([]);
    setAiLogs([]);
    setDailyReviews([]);
    setLocalPomodoroSessions([]);
    setPersonalRecords([]);
    setTrainingLoadLogs([]);
    setRecoveryLogs([]);
    setWorkoutSchedules([]);
    setWeeklyFitnessReports([]);
    setActiveScheduleProposal(null);
    setRpgState(DEFAULT_RPG_STATE);
    if (!user) {
      setProfile(createDefaultPersonalProfile());
    }

    try {
      Object.values(LS_DATA_KEYS).forEach((k) => localStorage.removeItem(k));
      localStorage.removeItem('lifeos_pomodoro_sessions_v1');
      localStorage.removeItem('lifeos_fitness_prs_v1');
      localStorage.removeItem('lifeos_fitness_tload_v1');
      localStorage.removeItem('lifeos_fitness_recovery_v1');
      localStorage.removeItem('lifeos_fitness_schedules_v1');
      localStorage.removeItem('lifeos_fitness_reports_v1');
      localStorage.removeItem('lifeos_rpg_world_v1');
      localStorage.removeItem('lifeos_active_schedule_proposal_v1');
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

  // Filter out internal pomodoro_session, persistent_memory, fitness_intelligence_store, and gamification_rpg_store records from visible AI Action Logs
  const visibleAiLogs = React.useMemo(
    () =>
      aiLogs.filter(
        (l) =>
          l.toolName !== 'pomodoro_session' &&
          l.toolName !== 'persistent_memory' &&
          l.toolName !== 'fitness_intelligence_store' &&
          l.toolName !== 'gamification_rpg_store'
      ),
    [aiLogs]
  );

  // Hydrate RPG Gamification store from Firestore ai_action_logs if remote snapshot exists
  useEffect(() => {
    const rpgLogs = aiLogs.filter(
      (l) => l.toolName === 'gamification_rpg_store' && Boolean(l.payloadJson)
    );
    if (rpgLogs.length === 0) return;
    const latest = rpgLogs[0];
    if (!latest?.payloadJson) return;
    try {
      const parsed = JSON.parse(latest.payloadJson) as Partial<RpgGamificationState>;
      if (parsed && parsed.updatedAt) {
        setRpgState((prev) => {
          if (!prev.updatedAt || parsed.updatedAt! > prev.updatedAt) {
            const merged: RpgGamificationState = {
              ...DEFAULT_RPG_STATE,
              ...prev,
              ...parsed,
              ownedItemIds: Array.from(
                new Set([
                  ...STARTER_ITEM_IDS,
                  ...prev.ownedItemIds,
                  ...(parsed.ownedItemIds || []),
                ])
              ),
            };
            try {
              localStorage.setItem('lifeos_rpg_world_v1', JSON.stringify(merged));
            } catch {
              // ignore
            }
            return merged;
          }
          return prev;
        });
      }
    } catch {
      // ignore malformed JSON
    }
  }, [aiLogs]);

  // Hydrate Fitness Intelligence store from Firestore ai_action_logs if remote snapshot exists
  useEffect(() => {
    const fitLogs = aiLogs.filter(
      (l) => l.toolName === 'fitness_intelligence_store' && Boolean(l.payloadJson)
    );
    if (fitLogs.length === 0) return;
    const latest = fitLogs[0];
    if (!latest?.payloadJson) return;
    try {
      const parsed = JSON.parse(latest.payloadJson);
      if (parsed && typeof parsed === 'object') {
        if (Array.isArray(parsed.prs) && parsed.prs.length > 0 && personalRecords.length === 0) {
          setPersonalRecords(parsed.prs);
        }
        if (
          Array.isArray(parsed.tloads) &&
          parsed.tloads.length > 0 &&
          trainingLoadLogs.length === 0
        ) {
          setTrainingLoadLogs(parsed.tloads);
        }
        if (
          Array.isArray(parsed.recoveries) &&
          parsed.recoveries.length > 0 &&
          recoveryLogs.length === 0
        ) {
          setRecoveryLogs(parsed.recoveries);
        }
        if (
          Array.isArray(parsed.schedules) &&
          parsed.schedules.length > 0 &&
          workoutSchedules.length === 0
        ) {
          setWorkoutSchedules(parsed.schedules);
        }
        if (Array.isArray(parsed.reports) && parsed.reports.length > 0 && weeklyFitnessReports.length === 0) {
          setWeeklyFitnessReports(parsed.reports);
        }
        if (typeof parsed.targetW === 'number' && parsed.targetW > 0) {
          setTargetWeightKgState(parsed.targetW);
        }
      }
    } catch {
      // ignore malformed JSON
    }
  }, [aiLogs]);

  // Also ensure any existing completed workouts in health_logs have TrainingLoadLogs & PRs derived
  useEffect(() => {
    const ownerId = user?.uid || PERSONAL_OWNER_ID;
    const workoutHealthLogs = healthLogs.filter((h) => h.logType === 'workout');
    if (workoutHealthLogs.length === 0) return;
    const existingIds = new Set(trainingLoadLogs.map((l) => l.workoutId));
    const missing = workoutHealthLogs.filter((w) => !existingIds.has(w.id));
    if (missing.length === 0) return;

    let nextPRs = [...personalRecords];
    const addedLoads: TrainingLoadLog[] = [];
    for (const w of missing) {
      const exList = parseExercisesFromWorkoutInput(
        w.exercisesSummary,
        w.title,
        w.volumeKg || 0,
        w.rpe || 8
      );
      addedLoads.push(
        buildTrainingLoadLog({
          workoutId: w.id,
          workoutTitle: w.title,
          date: w.date,
          durationMinutes: w.durationMinutes || 45,
          rpe: w.rpe || 8,
          exercises: exList,
          fallbackVolumeKg: w.volumeKg,
          ownerId,
        })
      );
      const prEval = evaluateAndUpdatePersonalRecords({
        existingPRs: nextPRs,
        workoutId: w.id,
        workoutDate: w.date,
        exercises: exList,
        ownerId,
      });
      nextPRs = prEval.updatedPRs;
    }

    const mergedLoads = [...addedLoads, ...trainingLoadLogs].sort((a, b) =>
      b.date.localeCompare(a.date)
    );
    setTrainingLoadLogs(mergedLoads);
    setPersonalRecords(nextPRs);
    try {
      localStorage.setItem('lifeos_fitness_tload_v1', JSON.stringify(mergedLoads));
      localStorage.setItem('lifeos_fitness_prs_v1', JSON.stringify(nextPRs));
    } catch {
      // ignore
    }
  }, [user, healthLogs]);

  const persistFitnessIntelStore = async (params: {
    prs: PersonalRecord[];
    tloads: TrainingLoadLog[];
    recoveries: RecoveryLog[];
    schedules: WorkoutSchedule[];
    reports: WeeklyFitnessReport[];
    targetW: number;
    summaryNote: string;
  }) => {
    try {
      localStorage.setItem('lifeos_fitness_prs_v1', JSON.stringify(params.prs));
      localStorage.setItem('lifeos_fitness_tload_v1', JSON.stringify(params.tloads));
      localStorage.setItem('lifeos_fitness_recovery_v1', JSON.stringify(params.recoveries));
      localStorage.setItem('lifeos_fitness_schedules_v1', JSON.stringify(params.schedules));
      localStorage.setItem('lifeos_fitness_reports_v1', JSON.stringify(params.reports));
      localStorage.setItem('lifeos_fitness_target_weight_v1', String(params.targetW));
    } catch {
      // ignore
    }

    if (user) {
      const compactPayload = JSON.stringify({
        prs: params.prs.slice(0, 15),
        tloads: params.tloads.slice(0, 12),
        recoveries: params.recoveries.slice(0, 12),
        schedules: params.schedules.slice(0, 14),
        reports: params.reports.slice(0, 3),
        targetW: params.targetW,
        updatedAt: new Date().toISOString(),
      }).slice(0, 3950);

      const existingFitLog = aiLogs.find((l) => l.toolName === 'fitness_intelligence_store');
      if (existingFitLog) {
        try {
          await updateDoc(doc(db, 'ai_action_logs', existingFitLog.id), {
            summary: sanitizeString(params.summaryNote, 1500, 'Updated Fitness Intelligence Store'),
            payloadJson: compactPayload,
            updatedAt: serverTimestamp(),
          });
        } catch {
          // ignore
        }
      } else {
        await logAiAction({
          actionTitle: 'Fitness Intelligence Store',
          toolName: 'fitness_intelligence_store',
          permissionLevel: 'routine_write',
          status: 'executed',
          targetModule: 'health',
          summary: sanitizeString(params.summaryNote, 1500, 'Initialized Fitness Intelligence Store'),
          payloadJson: compactPayload,
        });
      }
    }
  };

  const dismissPrCelebrationBanner = () => setPrCelebrationBanner(null);

  const setTargetWeightKg = async (kg: number) => {
    const clean = Math.max(30, Math.min(250, Math.round(kg * 10) / 10));
    setTargetWeightKgState(clean);
    await persistFitnessIntelStore({
      prs: personalRecords,
      tloads: trainingLoadLogs,
      recoveries: recoveryLogs,
      schedules: workoutSchedules,
      reports: weeklyFitnessReports,
      targetW: clean,
      summaryNote: `Updated target body weight to ${clean} kg`,
    });
  };

  const logWorkoutWithExercises = async (data: {
    title: string;
    date: string;
    durationMinutes: number;
    rpe: number;
    exercises: WorkoutExerciseEntry[];
    notes?: string;
    scheduleIdToComplete?: string;
  }) => {
    const ownerId = user?.uid || PERSONAL_OWNER_ID;
    const workoutId = `wk_${Date.now()}`;
    const totalVol = data.exercises.reduce(
      (acc, ex) => acc + (ex.sets || 1) * (ex.reps || 1) * (ex.weightKg || 0),
      0
    );
    const exercisesSummary = data.exercises
      .map((ex) => `${ex.exerciseName}: ${ex.sets}x${ex.reps} @ ${ex.weightKg}kg`)
      .join(', ');

    if (user) {
      const payload: Record<string, unknown> = {
        ownerId: user.uid,
        logType: 'workout',
        date: sanitizeString(data.date, 16, todayDate),
        title: sanitizeString(data.title, 200, 'Workout Session'),
        durationMinutes: Math.max(1, Math.round(data.durationMinutes || 45)),
        volumeKg: Math.round(totalVol),
        rpe: Math.max(1, Math.min(10, Math.round(data.rpe || 8))),
        exercisesSummary: sanitizeString(exercisesSummary, 1500),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };
      if (data.notes) payload.notes = sanitizeString(data.notes, 1000);
      await addDoc(collection(db, 'health_logs'), payload);
    } else {
      const localWorkout: HealthLogRecord = {
        id: workoutId,
        ownerId,
        logType: 'workout',
        date: sanitizeString(data.date, 16, todayDate),
        title: sanitizeString(data.title, 200, 'Workout Session'),
        durationMinutes: Math.max(1, Math.round(data.durationMinutes || 45)),
        volumeKg: Math.round(totalVol),
        rpe: Math.max(1, Math.min(10, Math.round(data.rpe || 8))),
        exercisesSummary: sanitizeString(exercisesSummary, 1500),
        ...(data.notes ? { notes: sanitizeString(data.notes, 1000) } : {}),
      };
      setHealthLogs((prev) => [localWorkout, ...prev]);
    }

    await awardXpAndCoins(40, 15, {
      activityKey: `workout_${workoutId}`,
      reason: `Logged Workout: ${data.title}`,
      sourceModule: 'workout',
    });

    const loadEntry = buildTrainingLoadLog({
      workoutId,
      workoutTitle: data.title,
      date: data.date || todayDate,
      durationMinutes: data.durationMinutes || 45,
      rpe: data.rpe || 8,
      exercises: data.exercises,
      fallbackVolumeKg: totalVol,
      ownerId,
    });

    const prResult = evaluateAndUpdatePersonalRecords({
      existingPRs: personalRecords,
      workoutId,
      workoutDate: data.date || todayDate,
      exercises: data.exercises,
      ownerId,
    });

    const nextLoadLogs = [loadEntry, ...trainingLoadLogs];
    let nextSchedules = [...workoutSchedules];
    if (data.scheduleIdToComplete) {
      nextSchedules = nextSchedules.map((s) =>
        s.id === data.scheduleIdToComplete
          ? {
              ...s,
              status: 'completed' as const,
              completedWorkoutLogId: workoutId,
              completedAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            }
          : s
      );
    }

    setTrainingLoadLogs(nextLoadLogs);
    setPersonalRecords(prResult.updatedPRs);
    setWorkoutSchedules(nextSchedules);
    if (prResult.celebrationMessages.length > 0) {
      setPrCelebrationBanner(prResult.celebrationMessages);
    }

    await persistFitnessIntelStore({
      prs: prResult.updatedPRs,
      tloads: nextLoadLogs,
      recoveries: recoveryLogs,
      schedules: nextSchedules,
      reports: weeklyFitnessReports,
      targetW: targetWeightKg,
      summaryNote: `Completed workout "${data.title}" (${loadEntry.rawVolumeKg}kg volume, ${prResult.newlyBrokenPRs.length} new PRs)`,
    });

    return {
      newlyBrokenPRs: prResult.newlyBrokenPRs,
      celebrationMessages: prResult.celebrationMessages,
    };
  };

  const logRecoveryCheckIn = async (
    data: Omit<RecoveryLog, 'id' | 'ownerId' | 'createdAt'>
  ) => {
    const newRec: RecoveryLog = {
      ...data,
      id: `rec_${Date.now()}`,
      ownerId: user?.uid || 'local_user',
      createdAt: new Date().toISOString(),
    };
    const next = [newRec, ...recoveryLogs.filter((r) => r.date !== data.date)];
    setRecoveryLogs(next);
    await persistFitnessIntelStore({
      prs: personalRecords,
      tloads: trainingLoadLogs,
      recoveries: next,
      schedules: workoutSchedules,
      reports: weeklyFitnessReports,
      targetW: targetWeightKg,
      summaryNote: `Logged recovery check-in on ${data.date} (Score: ${data.generalRecoveryScore}/100)`,
    });
    await awardXpAndCoins(15, 5, {
      activityKey: `recovery_${newRec.id}`,
      reason: `Logged Recovery Check-in (${data.date})`,
      sourceModule: 'workout',
    });
  };

  const deleteRecoveryLog = async (id: string) => {
    const next = recoveryLogs.filter((r) => r.id !== id);
    setRecoveryLogs(next);
    await persistFitnessIntelStore({
      prs: personalRecords,
      tloads: trainingLoadLogs,
      recoveries: next,
      schedules: workoutSchedules,
      reports: weeklyFitnessReports,
      targetW: targetWeightKg,
      summaryNote: `Deleted recovery log ${id}`,
    });
  };

  const scheduleWorkoutSession = async (
    data: Omit<WorkoutSchedule, 'id' | 'ownerId' | 'updatedAt'>,
    syncToLifeOSCalendar = true
  ) => {
    const schedId = `wsched_${Date.now()}`;
    const newSched: WorkoutSchedule = {
      ...data,
      id: schedId,
      ownerId: user?.uid || PERSONAL_OWNER_ID,
      status: data.status || 'planned', // Never mark completed merely because scheduled!
      updatedAt: new Date().toISOString(),
    };
    const next = [...workoutSchedules, newSched].sort((a, b) =>
      `${a.date} ${a.startTime}`.localeCompare(`${b.date} ${b.startTime}`)
    );
    setWorkoutSchedules(next);

    if (syncToLifeOSCalendar && data.status !== 'rest_day') {
      await createCalendarEvent({
        title: `Workout: ${data.templateName}`,
        eventType: 'workout',
        date: data.date,
        startTime: data.startTime,
        endTime: data.endTime,
        location: 'Gym / Training Area',
        isProtectedAnchor: false,
        linkedRecordId: schedId,
      });
    }

    await persistFitnessIntelStore({
      prs: personalRecords,
      tloads: trainingLoadLogs,
      recoveries: recoveryLogs,
      schedules: next,
      reports: weeklyFitnessReports,
      targetW: targetWeightKg,
      summaryNote: `Scheduled workout "${data.templateName}" on ${data.date} (${data.startTime}–${data.endTime})`,
    });
  };

  const updateWorkoutScheduleStatus = async (
    scheduleId: string,
    status: WorkoutSchedule['status'],
    rescheduleTo?: { date: string; startTime: string; endTime: string }
  ) => {
    const target = workoutSchedules.find((s) => s.id === scheduleId);
    if (!target) return;

    // If marking completed from the calendar, verify by logging the completed workout & evaluating PRs
    if (status === 'completed' && target.status !== 'completed') {
      await logWorkoutWithExercises({
        title: target.templateName,
        date: rescheduleTo?.date || target.date,
        durationMinutes: target.plannedDurationMinutes || 60,
        rpe: 8,
        exercises: target.plannedExercises || [],
        scheduleIdToComplete: scheduleId,
      });
      return;
    }

    const next = workoutSchedules.map((s) =>
      s.id === scheduleId
        ? {
            ...s,
            status,
            date: rescheduleTo?.date || s.date,
            startTime: rescheduleTo?.startTime || s.startTime,
            endTime: rescheduleTo?.endTime || s.endTime,
            updatedAt: new Date().toISOString(),
          }
        : s
    );
    setWorkoutSchedules(next);
    await persistFitnessIntelStore({
      prs: personalRecords,
      tloads: trainingLoadLogs,
      recoveries: recoveryLogs,
      schedules: next,
      reports: weeklyFitnessReports,
      targetW: targetWeightKg,
      summaryNote: `Updated workout schedule "${target.templateName}" to ${status}`,
    });
  };

  const deleteWorkoutSchedule = async (scheduleId: string) => {
    const next = workoutSchedules.filter((s) => s.id !== scheduleId);
    setWorkoutSchedules(next);
    await persistFitnessIntelStore({
      prs: personalRecords,
      tloads: trainingLoadLogs,
      recoveries: recoveryLogs,
      schedules: next,
      reports: weeklyFitnessReports,
      targetW: targetWeightKg,
      summaryNote: `Deleted workout schedule ${scheduleId}`,
    });
  };

  const deletePersonalRecord = async (prId: string) => {
    const next = personalRecords.filter((p) => p.id !== prId);
    setPersonalRecords(next);
    await persistFitnessIntelStore({
      prs: next,
      tloads: trainingLoadLogs,
      recoveries: recoveryLogs,
      schedules: workoutSchedules,
      reports: weeklyFitnessReports,
      targetW: targetWeightKg,
      summaryNote: `Deleted personal record ${prId}`,
    });
  };

  const generateAndSaveWeeklyFitnessReport = async (): Promise<WeeklyFitnessReport> => {
    const measurements = healthLogs
      .filter((h) => h.logType === 'measurement')
      .sort((a, b) => a.date.localeCompare(b.date));
    const workouts = healthLogs
      .filter((h) => h.logType === 'workout')
      .sort((a, b) => b.date.localeCompare(a.date));
    const meals = healthLogs
      .filter((h) => h.logType === 'meal')
      .sort((a, b) => b.date.localeCompare(a.date));

    const report = generateWeeklyFitnessCoachReport({
      ownerId: user?.uid || 'local_user',
      todayDate,
      measurements,
      workouts,
      meals,
      personalRecords,
      trainingLoadLogs,
      recoveryLogs,
      workoutSchedules,
      targetWeightKg,
      baseCalorieTarget: profile?.calorieTarget || 2350,
      baseProteinTarget: profile?.proteinTargetGrams || 165,
    });

    const nextReports = [
      report,
      ...weeklyFitnessReports.filter((r) => r.weekEndDate !== report.weekEndDate),
    ];
    setWeeklyFitnessReports(nextReports);
    await persistFitnessIntelStore({
      prs: personalRecords,
      tloads: trainingLoadLogs,
      recoveries: recoveryLogs,
      schedules: workoutSchedules,
      reports: nextReports,
      targetW: targetWeightKg,
      summaryNote: `Generated Weekly AI Fitness & Nutrition Report (${report.weekStartDate} to ${report.weekEndDate})`,
    });
    return report;
  };

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
    }

    // Credit XP and Coins (verified focus session with unique activityKey)
    if (cleanMins >= 1) {
      await awardXpAndCoins(cleanMins * 2, Math.max(8, Math.round(cleanMins * 0.6)), {
        activityKey: `pomo_${newSession.id}`,
        reason: `Completed ${cleanMins}m ${snapState.category} Pomodoro`,
        sourceModule: 'pomodoro',
      });
    }

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

  // --- PIXEL-ART RPG GAMIFICATION COMPUTED VALUES & ACTIONS ---
  const rpgLevelInfo = React.useMemo(
    () => calculateLevelProgress(profile?.xp ?? 0),
    [profile?.xp]
  );

  const rpgRankEval = React.useMemo(() => {
    const completedTasksCount = tasks.filter((t) => t.status === 'completed').length;
    const totalPomodoroMinutes = pomodoroSessions
      .filter((s) => s.mode === 'focus')
      .reduce((acc, s) => acc + s.durationMinutes, 0);
    const studiedItemsCount =
      studyItems.filter((s) => s.status === 'studied' || s.status === 'mastered').length +
      studyModules.reduce((acc, m) => acc + (m.completedLectures || 0), 0);
    const workoutsCount = healthLogs.filter((h) => h.logType === 'workout').length;

    return evaluateUserRank({
      xp: profile?.xp ?? 0,
      completedTasksCount,
      totalPomodoroMinutes,
      streakDays: profile?.streakDays ?? 0,
      studiedItemsCount,
      workoutsCount,
    });
  }, [profile?.xp, profile?.streakDays, tasks, pomodoroSessions, studyItems, studyModules, healthLogs]);

  const rpgMissions = React.useMemo(
    () =>
      computeLiveMissions({
        todayDate,
        tasks,
        pomodoroSessions,
        studyModules,
        studyItems,
        healthLogs,
        goalsHabits,
        personalRecords,
        profile,
        customMissions: rpgState.customMissions,
        claimedMissionKeys: rpgState.claimedMissionKeys,
      }),
    [
      todayDate,
      tasks,
      pomodoroSessions,
      studyModules,
      studyItems,
      healthLogs,
      goalsHabits,
      personalRecords,
      profile,
      rpgState.customMissions,
      rpgState.claimedMissionKeys,
    ]
  );

  const rpgAchievements = React.useMemo(
    () =>
      computeLiveAchievements({
        tasks,
        pomodoroSessions,
        studyModules,
        studyItems,
        healthLogs,
        goalsHabits,
        personalRecords,
        profile,
        claimedAchievementIds: rpgState.claimedAchievementIds,
      }),
    [
      tasks,
      pomodoroSessions,
      studyModules,
      studyItems,
      healthLogs,
      goalsHabits,
      personalRecords,
      profile,
      rpgState.claimedAchievementIds,
    ]
  );

  const openRpgWorld = (
    tab: 'study_room' | 'missions' | 'shop' | 'inventory' | 'achievements' = 'study_room'
  ) => {
    setRpgWorldInitialTab(tab);
    setIsRpgWorldOpen(true);
  };

  const closeRpgWorld = () => setIsRpgWorldOpen(false);
  const dismissLevelUpBanner = () => setLevelUpBanner(null);

  const claimRpgMissionReward = async (missionId: string): Promise<boolean> => {
    const mission = rpgMissions.find((m) => m.id === missionId);
    if (!mission || mission.claimed || mission.currentValue < mission.targetValue) {
      return false;
    }
    const activityKey = `mission_claim_${mission.id}`;
    if (rpgState.rewardedActivityIds.includes(activityKey)) {
      return false;
    }

    const nextRpg: RpgGamificationState = {
      ...rpgState,
      claimedMissionKeys: Array.from(new Set([...rpgState.claimedMissionKeys, mission.id])),
    };
    setRpgState(nextRpg);
    await awardXpAndCoins(mission.xpReward, mission.coinReward, {
      activityKey,
      reason: `Claimed Mission: ${mission.title}`,
      sourceModule: 'mission',
    });
    await persistRpgState(
      {
        ...nextRpg,
        rewardedActivityIds: Array.from(
          new Set([...nextRpg.rewardedActivityIds, activityKey])
        ),
      },
      `Claimed mission reward: ${mission.title}`
    );
    return true;
  };

  const claimRpgAchievementReward = async (achievementId: string): Promise<boolean> => {
    const ach = rpgAchievements.find((a) => a.id === achievementId);
    if (!ach || !ach.unlocked || ach.claimed) {
      return false;
    }
    const activityKey = `achievement_claim_${ach.id}`;
    if (rpgState.rewardedActivityIds.includes(activityKey)) {
      return false;
    }

    const nextRpg: RpgGamificationState = {
      ...rpgState,
      claimedAchievementIds: Array.from(
        new Set([...rpgState.claimedAchievementIds, ach.id])
      ),
    };
    setRpgState(nextRpg);
    await awardXpAndCoins(ach.xpReward, ach.coinReward, {
      activityKey,
      reason: `Unlocked Achievement: ${ach.title}`,
      sourceModule: 'achievement',
    });
    await persistRpgState(
      {
        ...nextRpg,
        rewardedActivityIds: Array.from(
          new Set([...nextRpg.rewardedActivityIds, activityKey])
        ),
      },
      `Claimed achievement reward: ${ach.title}`
    );
    return true;
  };

  const purchaseRpgShopItem = async (
    itemId: string
  ): Promise<{ ok: boolean; message: string }> => {
    const item = RPG_SHOP_ITEMS.find((i) => i.id === itemId);
    if (!item) {
      return { ok: false, message: 'Item not found in shop catalog.' };
    }
    if (rpgState.ownedItemIds.includes(itemId)) {
      return { ok: false, message: 'You already own this item in your inventory!' };
    }
    const currentCoins = profile?.coins ?? 0;
    if (currentCoins < item.price) {
      return {
        ok: false,
        message: `Insufficient Life Coins! You need ${item.price - currentCoins} more coins.`,
      };
    }

    const nextCoins = Math.max(0, currentCoins - item.price);
    if (profile) {
      setProfile({ ...profile, coins: nextCoins });
    }
    if (user && profile) {
      await updateProfileSettings({ coins: nextCoins });
    }

    // Automatically equip the newly purchased item in its slot
    const nextPlaced = [
      ...rpgState.placedItems.filter((p) => p.slot !== item.slot),
      { itemId: item.id, slot: item.slot, offsetX: 0, offsetY: 0 },
    ];

    const tx: RpgCoinTransaction = {
      id: `tx_shop_${Date.now()}`,
      timestamp: new Date().toISOString(),
      type: 'spend',
      amount: -item.price,
      xpDelta: 0,
      reason: `Purchased & Equipped: ${item.name}`,
      sourceModule: 'shop',
      activityKey: `buy_${item.id}`,
    };

    const nextRpg: RpgGamificationState = {
      ...rpgState,
      ownedItemIds: Array.from(new Set([...rpgState.ownedItemIds, item.id])),
      placedItems: nextPlaced,
      transactions: [tx, ...rpgState.transactions].slice(0, 60),
    };

    await persistRpgState(nextRpg, `Purchased ${item.name} for ${item.price} coins`);
    return {
      ok: true,
      message: `Purchased ${item.name} and placed it in your Study Room!`,
    };
  };

  const equipRpgItem = async (itemId: string) => {
    const item = RPG_SHOP_ITEMS.find((i) => i.id === itemId);
    if (!item || !rpgState.ownedItemIds.includes(itemId)) return;

    const nextPlaced = [
      ...rpgState.placedItems.filter((p) => p.slot !== item.slot),
      { itemId: item.id, slot: item.slot, offsetX: 0, offsetY: 0 },
    ];
    await persistRpgState(
      { ...rpgState, placedItems: nextPlaced },
      `Equipped ${item.name} in ${item.slot}`
    );
  };

  const unequipRpgSlot = async (slot: RpgRoomSlot) => {
    const nextPlaced = rpgState.placedItems.filter((p) => p.slot !== slot);
    await persistRpgState(
      { ...rpgState, placedItems: nextPlaced },
      `Stored item from slot ${slot}`
    );
  };

  const moveRpgPlacedItem = async (slot: RpgRoomSlot, dx: number, dy: number) => {
    const nextPlaced = rpgState.placedItems.map((p) =>
      p.slot === slot
        ? {
            ...p,
            offsetX: Math.max(-35, Math.min(35, p.offsetX + dx)),
            offsetY: Math.max(-20, Math.min(20, p.offsetY + dy)),
          }
        : p
    );
    await persistRpgState({ ...rpgState, placedItems: nextPlaced }, `Moved ${slot}`);
  };

  const resetRpgPlacedItemPosition = async (slot: RpgRoomSlot) => {
    const nextPlaced = rpgState.placedItems.map((p) =>
      p.slot === slot ? { ...p, offsetX: 0, offsetY: 0 } : p
    );
    await persistRpgState({ ...rpgState, placedItems: nextPlaced }, `Reset ${slot} position`);
  };

  const setRpgEnvironment = async (env: StudyEnvironmentMode) => {
    await persistRpgState(
      { ...rpgState, activeEnvironment: env },
      `Switched Study Room environment to ${env}`
    );
  };

  const setRpgAmbientSound = async (sound: AmbientSoundType, volume?: number) => {
    await persistRpgState(
      {
        ...rpgState,
        activeAmbientSound: sound,
        ambientVolume: volume !== undefined ? volume : rpgState.ambientVolume,
      },
      `Updated ambient sound to ${sound}`
    );
  };

  const updateRpgAvatar = async (partial: Partial<RpgAvatarConfig>) => {
    const nextAvatar = { ...rpgState.avatar, ...partial };
    await persistRpgState({ ...rpgState, avatar: nextAvatar }, 'Updated Pixel Avatar');
  };

  const saveRpgRoomPreset = async (name: string) => {
    const cleanName = sanitizeString(name, 40, 'Custom Room Setup');
    const newPreset = {
      id: `preset_${Date.now()}`,
      name: cleanName,
      createdAt: new Date().toISOString(),
      environment: rpgState.activeEnvironment,
      placedItems: [...rpgState.placedItems],
    };
    const nextPresets = [newPreset, ...rpgState.savedRoomPresets].slice(0, 8);
    await persistRpgState(
      { ...rpgState, savedRoomPresets: nextPresets },
      `Saved room preset "${cleanName}"`
    );
  };

  const loadRpgRoomPreset = async (presetId: string) => {
    const found = rpgState.savedRoomPresets.find((p) => p.id === presetId);
    if (!found) return;
    await persistRpgState(
      {
        ...rpgState,
        activeEnvironment: found.environment,
        placedItems: [...found.placedItems],
      },
      `Loaded room preset "${found.name}"`
    );
  };

  const deleteRpgRoomPreset = async (presetId: string) => {
    const nextPresets = rpgState.savedRoomPresets.filter((p) => p.id !== presetId);
    await persistRpgState(
      { ...rpgState, savedRoomPresets: nextPresets },
      'Deleted room preset'
    );
  };

  const generateAiPersonalizedMissions = async (): Promise<RpgMission[]> => {
    const openTasksList = tasks.filter((t) => t.status !== 'completed');
    const dueRevs = studyItems.filter(
      (s) => s.status === 'review_due' || s.nextReviewDate <= todayDate
    );
    const upcomingExam =
      studyModules
        .filter((m) => m.examDate && m.examDate >= todayDate)
        .sort((a, b) => a.examDate.localeCompare(b.examDate))[0] || null;

    try {
      const res = await fetch('/api/ai/rpg-missions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contextSnapshot: {
            todayDate,
            openTasksCount: openTasksList.length,
            sampleTasks: openTasksList.slice(0, 4).map((t) => t.title),
            dueRevisionsCount: dueRevs.length,
            upcomingExam: upcomingExam
              ? {
                  code: upcomingExam.code,
                  title: upcomingExam.title,
                  examDate: upcomingExam.examDate,
                }
              : null,
            energyLevel: persistentMemory.userProfile?.afternoonEnergy || 'medium',
            streakDays: profile?.streakDays ?? 0,
          },
        }),
      });
      const data = await res.json();
      const generated: RpgMission[] = Array.isArray(data.missions) ? data.missions : [];
      if (generated.length > 0) {
        const nextCustom = [...generated, ...rpgState.customMissions].slice(0, 6);
        await persistRpgState(
          { ...rpgState, customMissions: nextCustom },
          `Generated ${generated.length} AI Personalized RPG Missions`
        );
        return generated;
      }
    } catch {
      // ignore network error
    }
    return [];
  };

  const importWorkspaceBackup = async (backup: Record<string, unknown>) => {
    if (backup.profile && typeof backup.profile === 'object') {
      const mergedProfile: UserProfile = {
        ...createDefaultPersonalProfile(),
        ...(backup.profile as Partial<UserProfile>),
        uid: user?.uid || PERSONAL_OWNER_ID,
      };
      setProfile(mergedProfile);
      saveLocalStore(LS_DATA_KEYS.profile, mergedProfile);
    }
    if (Array.isArray(backup.tasks)) setTasks(backup.tasks as TaskItem[]);
    if (Array.isArray(backup.events)) setEvents(backup.events as CalendarEventItem[]);
    if (Array.isArray(backup.studyModules)) {
      setStudyModules(backup.studyModules as StudyModuleItem[]);
    }
    if (Array.isArray(backup.studyItems)) setStudyItems(backup.studyItems as StudyItemRecord[]);
    if (Array.isArray(backup.healthLogs)) setHealthLogs(backup.healthLogs as HealthLogRecord[]);
    if (Array.isArray(backup.financeRecords)) {
      setFinanceRecords(backup.financeRecords as FinanceRecordItem[]);
    }
    if (Array.isArray(backup.knowledgeItems)) {
      setKnowledgeItems(backup.knowledgeItems as KnowledgeItemRecord[]);
    }
    if (Array.isArray(backup.goalsHabits)) {
      setGoalsHabits(backup.goalsHabits as GoalHabitRecord[]);
    }
    if (Array.isArray(backup.dailyReviews)) {
      setDailyReviews(backup.dailyReviews as DailyReviewRecord[]);
    }
    if (Array.isArray(backup.pomodoroSessions)) {
      const importedSessions = backup.pomodoroSessions as PomodoroSessionRecord[];
      setLocalPomodoroSessions(importedSessions);
      saveLocalStore('lifeos_pomodoro_sessions_v1', importedSessions);
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
        importWorkspaceBackup,
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
        personalRecords,
        trainingLoadLogs,
        recoveryLogs,
        workoutSchedules,
        weeklyFitnessReports,
        targetWeightKg,
        prCelebrationBanner,
        dismissPrCelebrationBanner,
        setTargetWeightKg,
        logWorkoutWithExercises,
        logRecoveryCheckIn,
        deleteRecoveryLog,
        scheduleWorkoutSession,
        updateWorkoutScheduleStatus,
        deleteWorkoutSchedule,
        generateAndSaveWeeklyFitnessReport,
        deletePersonalRecord,
        rpgState,
        rpgMissions,
        rpgAchievements,
        rpgRankEval,
        rpgLevelInfo,
        isRpgWorldOpen,
        rpgWorldInitialTab,
        openRpgWorld,
        closeRpgWorld,
        levelUpBanner,
        dismissLevelUpBanner,
        claimRpgMissionReward,
        claimRpgAchievementReward,
        purchaseRpgShopItem,
        equipRpgItem,
        unequipRpgSlot,
        moveRpgPlacedItem,
        resetRpgPlacedItemPosition,
        setRpgEnvironment,
        setRpgAmbientSound,
        updateRpgAvatar,
        saveRpgRoomPreset,
        loadRpgRoomPreset,
        deleteRpgRoomPreset,
        generateAiPersonalizedMissions,
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
