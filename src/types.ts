export type NavDestination =
  | 'overview'
  | 'calendar'
  | 'tasks'
  | 'pomodoro'
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
  pomodoro: 'timer' | 'analytics' | 'history';
  study: 'modules' | 'exams' | 'flashcards' | 'schedule_import' | 'analytics';
  library: 'books' | 'courses' | 'podcasts';
  health:
    | 'measurements'
    | 'workouts'
    | 'pr_tracker'
    | 'training_load'
    | 'workout_calendar'
    | 'nutrition'
    | 'weekly_coach'
    | 'sleep_water';
  finance: 'transactions' | 'budgets' | 'subscriptions' | 'savings';
  goals: 'goals' | 'projects' | 'habits';
  rank: 'quests' | 'achievements' | 'rewards';
  analytics: 'overview' | 'reports';
  spoon_feeder: 'workspace';
  settings: 'permissions';
};

export type PomodoroMode = 'focus' | 'short_break' | 'long_break';

export type PomodoroCategory =
  | 'Deep Study'
  | 'Active Recall'
  | 'Lecture Review'
  | 'Exam Practice'
  | 'Problem Solving'
  | 'Reading & Notes';

export interface PomodoroSessionRecord {
  id: string;
  date: string;
  durationMinutes: number;
  mode: PomodoroMode;
  category: PomodoroCategory;
  moduleId?: string;
  moduleCode?: string;
  taskId?: string;
  taskTitle?: string;
  studyItemId?: string;
  studyItemTitle?: string;
  notes?: string;
  completedAt: string;
  firestoreLogId?: string;
}

export interface PomodoroTimerState {
  running: boolean;
  mode: PomodoroMode;
  category: PomodoroCategory;
  totalDurationSeconds: number;
  remainingSeconds: number;
  elapsedFocusSeconds: number;
  sessionNumber: number;
  focusMinutesPreset: number;
  shortBreakMinutesPreset: number;
  longBreakMinutesPreset: number;
  autoStartBreaks: boolean;
  autoStartFocus: boolean;
  soundEnabled: boolean;
  browserNotificationsEnabled: boolean;
  linkedModuleId: string;
  linkedStudyItemId: string;
  linkedTaskId: string;
  customLabel: string;
  liveAlert: {
    id: string;
    title: string;
    message: string;
    timestamp: string;
    mode: PomodoroMode;
  } | null;
}

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

export type MuscleGroup =
  | 'Chest'
  | 'Back'
  | 'Legs'
  | 'Shoulders'
  | 'Arms'
  | 'Core'
  | 'Full Body';

export type ExerciseMechanicsType = 'compound' | 'isolation' | 'bodyweight' | 'cardio';

export interface WorkoutExerciseEntry {
  exerciseName: string;
  muscleGroup: MuscleGroup;
  exerciseType: ExerciseMechanicsType;
  sets: number;
  reps: number;
  weightKg: number;
  rpe?: number;
  isActualTested1RM?: boolean;
  estimated1RM?: number;
}

export interface PersonalRecordHistoryPoint {
  date: string;
  weightKg: number;
  reps: number;
  estimated1RM: number;
  actualTested1RM?: number;
  isActualTested1RM: boolean;
  workoutId?: string;
}

export interface PersonalRecord {
  id: string;
  ownerId: string;
  exerciseName: string;
  muscleGroup: MuscleGroup;
  exerciseType: ExerciseMechanicsType;
  maxWeightKg: number;
  repsAtMaxWeight: number;
  maxReps: number;
  weightAtMaxReps: number;
  bestEstimated1RM: number;
  bestActualTested1RM?: number;
  isActualTested1RM: boolean;
  bestPerformanceSummary: string;
  achievedDate: string;
  workoutId?: string;
  previousRecords: PersonalRecordHistoryPoint[];
  updatedAt: string;
}

export interface TrainingLoadLog {
  id: string;
  ownerId: string;
  workoutId: string;
  date: string;
  workoutTitle: string;
  durationMinutes: number;
  rpe: number;
  totalSets: number;
  rawVolumeKg: number;
  adjustedVolumeLoad: number;
  setsByMuscleGroup: Partial<Record<MuscleGroup, number>>;
  volumeByMuscleGroup: Partial<Record<MuscleGroup, number>>;
  exercises: WorkoutExerciseEntry[];
  createdAt: string;
}

export interface RecoveryLog {
  id: string;
  ownerId: string;
  date: string;
  muscleSoreness: number;
  fatigueLevel: number;
  sleepQuality: number;
  sleepHours: number;
  energyLevel: number;
  generalRecoveryScore: number;
  soreMuscleGroups?: MuscleGroup[];
  notes?: string;
  createdAt: string;
}

export type WorkoutScheduleStatus = 'planned' | 'completed' | 'missed' | 'rest_day';

export interface WorkoutSchedule {
  id: string;
  ownerId: string;
  date: string;
  startTime: string;
  endTime: string;
  templateId?: string;
  templateName: string;
  targetMuscleGroups: MuscleGroup[];
  plannedDurationMinutes: number;
  plannedExercises: WorkoutExerciseEntry[];
  status: WorkoutScheduleStatus;
  completedWorkoutId?: string;
  notes?: string;
  updatedAt: string;
}

export interface WeightTrendSnapshot {
  id: string;
  ownerId: string;
  date: string;
  actualWeightKg: number;
  rolling7DayAvgKg: number | null;
  measurementsIn7DayWindow: number;
  weeklyChangeKg: number | null;
  monthlyChangeKg: number | null;
  weeklyChangeRatePct: number | null;
  targetWeightKg?: number;
  distanceToTargetKg: number | null;
  isPlateauDetected: boolean;
  isShortTermFluctuation: boolean;
  trendStatus: 'on_track' | 'losing' | 'gaining' | 'plateau' | 'fluctuation_spike' | 'insufficient_data';
  explanation: string;
  biweeklyNutritionRecommendation: string;
}

export interface WeeklyFitnessReport {
  id: string;
  ownerId: string;
  weekStartDate: string;
  weekEndDate: string;
  generatedAt: string;
  referencedDataSummary: {
    measurementCount: number;
    completedWorkoutCount: number;
    plannedWorkoutCount: number;
    mealLogCount: number;
    recoveryLogCount: number;
    newPrCount: number;
    insufficientDataWarnings: string[];
  };
  sections: {
    weeklyOverview: {
      recordedFacts: string[];
      aiInterpretation: string;
    };
    bodyProgress: {
      currentWeightKg: number | null;
      weeklyAvgWeightKg: number | null;
      weightChangeKg: number | null;
      targetWeightKg: number | null;
      recordedFacts: string[];
      aiInterpretation: string;
    };
    workoutPerformance: {
      completedWorkouts: number;
      plannedWorkouts: number;
      totalVolumeKg: number;
      totalSets: number;
      newPersonalRecords: string[];
      muscleGroupSets: Record<MuscleGroup, number>;
      recordedFacts: string[];
      aiInterpretation: string;
    };
    nutritionPerformance: {
      avgDailyCalories: number | null;
      avgProteinGrams: number | null;
      avgCarbsGrams: number | null;
      avgFatGrams: number | null;
      adherencePercent: number | null;
      daysLogged: number;
      trainingAdjustedCalorieTarget: number;
      trainingAdjustedProteinTarget: number;
      recordedFacts: string[];
      aiInterpretation: string;
    };
    recoveryAndTrainingLoad: {
      avgRecoveryScore: number | null;
      avgSleepHours: number | null;
      avgSleepQuality: number | null;
      avgFatigue: number | null;
      avgSoreness: number | null;
      loadStatus: 'optimal' | 'high_fatigue_risk' | 'under_training' | 'insufficient_data';
      recordedFacts: string[];
      aiInterpretation: string;
    };
    achievements: string[];
    areasForImprovement: string[];
    recommendationsForNextWeek: string[];
  };
}

