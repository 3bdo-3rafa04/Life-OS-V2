export type NavDestination =
  | 'overview'
  | 'calendar'
  | 'tasks'
  | 'study'
  | 'library'
  | 'health'
  | 'finance'
  | 'goals'
  | 'rank'
  | 'analytics'
  | 'spoon_feeder'
  | 'settings';

export type SubPageMap = {
  overview: 'dashboard';
  calendar: 'week' | 'day_month' | 'agenda';
  tasks: 'board' | 'list';
  study: 'modules' | 'exams' | 'flashcards' | 'schedule_import' | 'analytics';
  library: 'books' | 'courses' | 'podcasts';
  health: 'measurements' | 'workouts' | 'nutrition' | 'sleep_water';
  finance: 'transactions' | 'budgets' | 'subscriptions' | 'savings';
  goals: 'goals' | 'projects' | 'habits';
  rank: 'quests' | 'achievements' | 'rewards';
  analytics: 'overview' | 'reports';
  spoon_feeder: 'workspace';
  settings: 'permissions';
};

export interface UserProfile {
  uid: string;
  displayName: string;
  currency: string;
  timezone: string;
  city?: string;
  prayerMethod?: 'MWL' | 'ISNA' | 'Egypt' | 'Makkah' | 'Karachi' | 'Tehran';
  prayerBufferMinutes?: number;
  xp: number;
  level: number;
  coins: number;
  streakDays?: number;
  calorieTarget?: number;
  proteinTargetGrams?: number;
  waterTargetMl?: number;
  waterLoggedTodayMl?: number;
  aiRoutineAutoApprove?: boolean;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface TaskItem {
  id: string;
  ownerId: string;
  title: string;
  notes?: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  status: 'todo' | 'in_progress' | 'completed' | 'blocked' | 'deferred' | 'dropped';
  statusReason?: string;
  category: 'study' | 'work' | 'health' | 'finance' | 'personal' | 'routine';
  estimatedMinutes: number;
  actualMinutes?: number;
  dueDate: string;
  scheduledStart?: string;
  linkedGoalId?: string;
  linkedModuleId?: string;
  isRecurring?: boolean;
  recurrenceRule?: string;
}

export interface CalendarEventItem {
  id: string;
  ownerId: string;
  title: string;
  eventType: 'fixed' | 'lecture' | 'study_block' | 'workout' | 'prayer' | 'routine' | 'exam';
  date: string;
  startTime: string;
  endTime: string;
  location?: string;
  isProtectedAnchor: boolean;
  linkedRecordId?: string;
}

export interface StudyModuleItem {
  id: string;
  ownerId: string;
  code: string;
  title: string;
  term: string;
  examDate: string;
  targetGrade?: string;
  totalLectures: number;
  completedLectures: number;
}

export interface StudyItemRecord {
  id: string;
  ownerId: string;
  moduleId: string;
  moduleCode: string;
  title: string;
  itemType: 'lecture' | 'flashcard' | 'quiz_topic';
  status: 'unstudied' | 'studied' | 'review_due' | 'mastered';
  importance: 'high' | 'medium' | 'low';
  estimatedMinutes: number;
  confidenceRating: number;
  stabilityDays?: number;
  difficultyScore?: number;
  repetitionCount: number;
  lastStudiedDate?: string;
  nextReviewDate: string;
  notes?: string;
  frontPrompt?: string;
  backAnswer?: string;
  sourceRef?: string;
}

export interface HealthLogRecord {
  id: string;
  ownerId: string;
  logType: 'measurement' | 'workout' | 'meal';
  date: string;
  title: string;
  weightKg?: number;
  waistCm?: number;
  chestCm?: number;
  armsCm?: number;
  durationMinutes?: number;
  volumeKg?: number;
  rpe?: number;
  exercisesSummary?: string;
  calories?: number;
  proteinGrams?: number;
  carbsGrams?: number;
  fatGrams?: number;
  notes?: string;
}

export interface FinanceRecordItem {
  id: string;
  ownerId: string;
  recordType: 'expense' | 'income' | 'budget' | 'savings_goal' | 'subscription';
  title: string;
  category: string;
  accountName: string;
  amountMinor: number;
  targetAmountMinor?: number;
  date: string;
  isRecurring?: boolean;
  notes?: string;
}

export interface KnowledgeItemRecord {
  id: string;
  ownerId: string;
  itemType: 'book' | 'course' | 'podcast' | 'article' | 'note';
  title: string;
  authorOrSource?: string;
  status: 'wishlist' | 'planned' | 'in_progress' | 'paused' | 'completed';
  progressCurrent: number;
  progressTotal: number;
  progressUnit: string;
  rating?: number;
  tags?: string;
  takeaways?: string;
  linkedEntityId?: string;
}

export interface GoalHabitRecord {
  id: string;
  ownerId: string;
  recordType: 'goal' | 'habit' | 'quest' | 'reward';
  title: string;
  whyReason?: string;
  status: 'active' | 'completed' | 'paused' | 'stalled';
  frequency: 'daily' | 'weekly' | 'custom' | 'once';
  progressPercent: number;
  streakCount: number;
  completedToday: boolean;
  lastCompletedDate?: string;
  targetDate?: string;
  xpReward: number;
  coinCostOrReward: number;
  nextSmallAction?: string;
}

export interface AiActionLogRecord {
  id: string;
  ownerId: string;
  actionTitle: string;
  toolName: string;
  permissionLevel: 'read' | 'routine_write' | 'consequential' | 'destructive';
  status: 'executed' | 'pending_approval' | 'approved' | 'rejected' | 'undone';
  targetModule: string;
  summary: string;
  payloadJson?: string;
}

export interface DailyReviewRecord {
  id: string;
  ownerId: string;
  date: string;
  energyLevel: 'high' | 'moderate' | 'low' | 'recovering';
  commitmentScore: number;
  completionScore: number;
  consistencyScore: number;
  planningAccuracyScore: number;
  wellbeingScore: number;
  wins?: string;
  obstacles?: string;
  tomorrowAdjustment?: string;
}
