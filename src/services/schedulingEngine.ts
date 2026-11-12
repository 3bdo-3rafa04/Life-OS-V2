export type EnergyLevel = 'high' | 'medium' | 'low';

export type CognitiveDemand = 'high' | 'medium' | 'low';

export type LectureLifecycleStatus =
  | 'unstudied'
  | 'partially_completed'
  | 'studied'
  | 'review_due'
  | 'mastered';

export type StudyStageType =
  | 'first_time_study'
  | 'active_recall_notes'
  | 'practice_mcqs'
  | 'spaced_revision'
  | 'final_review'
  | 'general_task';

export interface TimeWindowRule {
  id: string;
  label: string;
  startTime: string; // HH:MM (24h)
  endTime: string;   // HH:MM (24h)
  daysOfWeek?: number[]; // 0=Sun .. 6=Sat (undefined = all days)
  category: 'university' | 'sleep' | 'meal' | 'prayer' | 'personal' | 'deep_work' | 'light_work' | 'blocked_learned';
  confirmed: boolean;
  isTemporary?: boolean;
  dateOnly?: string; // YYYY-MM-DD if only for a single date
  sourceNote?: string;
}

export interface EnergyProfileConfig {
  timezone: string; // Default: 'Africa/Cairo'
  wakeTime: string; // e.g. '07:00'
  sleepTime: string; // e.g. '23:00'
  morningEnergy: EnergyLevel;   // Wake - 12:00
  afternoonEnergy: EnergyLevel; // 12:00 - 17:00
  eveningEnergy: EnergyLevel;   // 17:00 - Sleep
  preferredDeepWorkWindows: { start: string; end: string }[];
  preferredLightWorkWindows: { start: string; end: string }[];
  preferredSessionMinutes: number; // e.g. 50
  shortBreakMinutes: number;       // e.g. 10
  longBreakMinutes: number;        // e.g. 25
  intensiveSessionThresholdMinutes: number; // e.g. 60
  bufferMinutes: number;           // e.g. 10
  maxDailyStudyMinutes: number;    // e.g. 360 (6h)
  maxCapacityUtilization: number;  // e.g. 0.82 (keep 18% flexible time)
  mealWindows: { label: string; start: string; end: string }[];
  fixedCommitments: TimeWindowRule[];
}

export interface AcademicSubjectMemory {
  moduleId: string;
  moduleName: string;
  examDate: string; // YYYY-MM-DD or ISO
  examTime?: string; // HH:MM
  importance: 'critical' | 'high' | 'medium' | 'low';
  defaultLectureMinutes: number;
  revisionRequiredCount: number;
  mcqPracticeTarget: number;
  previousPerformancePct?: number;
  difficultTopics: string[];
}

export interface LectureMemoryMeta {
  studyItemId: string;
  moduleId: string;
  lectureNumber: number;
  prerequisiteItemIds: string[];
  difficulty: CognitiveDemand;
  estimatedMinutes: number;
  minMinutes: number;
  maxMinutes: number;
  completedMinutes: number;
  lifecycleStatus: LectureLifecycleStatus;
  revisionCount: number;
  mcqCompletedCount: number;
  mcqTargetCount: number;
  lastStudiedAt?: string;
}

export interface SessionFeedbackEntry {
  id: string;
  activityId: string;
  title: string;
  moduleId?: string;
  completed: boolean;
  estimatedMinutes: number;
  actualMinutes: number;
  difficultyAccuracy: 'too_easy' | 'accurate' | 'too_hard';
  userEnergyDuringSession: EnergyLevel;
  timeSlotConvenient: boolean;
  scheduledStartTime: string;
  recordedAt: string;
  notes?: string;
}

export interface LearnedPreferenceRule {
  id: string;
  ruleText: string;
  ruleType: 'blocked_window' | 'energy_override' | 'duration_multiplier' | 'study_preference' | 'university_schedule';
  startTime?: string;
  endTime?: string;
  daysOfWeek?: number[];
  energyLevel?: EnergyLevel;
  periodOfDay?: 'morning' | 'afternoon' | 'evening';
  confirmed: boolean; // False if uncertain/temporary -> asks user for confirmation
  isTemporary: boolean;
  createdAt: string;
}

export interface PersistentMemoryStore {
  userProfile: EnergyProfileConfig;
  academicMemory: {
    subjects: Record<string, AcademicSubjectMemory>;
    lectures: Record<string, LectureMemoryMeta>;
    difficultTopics: string[];
  };
  behavioralMemory: {
    durationMultiplier: number; // Actual / Estimated ratio (default 1.0)
    postponedTaskCounts: Record<string, number>;
    missedSessionsCount: number;
    preferredStudyHours: string[];
    successfulTimeSlots: string[];
    feedbackHistory: SessionFeedbackEntry[];
    learnedRules: LearnedPreferenceRule[];
  };
  updatedAt: string;
}

export interface SchedulableCandidate {
  id: string;
  sourceType: 'lecture' | 'task' | 'exam_revision' | 'exam_mcq';
  sourceId: string;
  title: string;
  subject: string;
  moduleId?: string;
  lectureNumber?: number;
  prerequisiteNumbers?: number[];
  prerequisiteIds?: string[];
  stageType: StudyStageType;
  lifecycleStatus?: LectureLifecycleStatus;
  priority: 'critical' | 'high' | 'medium' | 'low';
  cognitiveDifficulty: CognitiveDemand;
  energyRequirement: EnergyLevel;
  estimatedMinutes: number;
  minMinutes: number;
  maxMinutes: number;
  deadlineDate?: string; // YYYY-MM-DD
  examDate?: string;     // YYYY-MM-DD
  daysUntilExam?: number;
  flexibility: 'rigid' | 'moderate' | 'flexible';
  urgencyScore: number;
  rankingReasons: string[];
}

export interface BusyInterval {
  dateStr: string;
  startMinutes: number;
  endMinutes: number;
  startTime: string;
  endTime: string;
  title: string;
  source: 'past_time' | 'sleep' | 'calendar_event' | 'university' | 'prayer' | 'meal' | 'learned_rule' | 'break_buffer';
}

export interface FreeTimeSlot {
  dateStr: string;
  startMinutes: number;
  endMinutes: number;
  durationMinutes: number;
  startTime: string;
  endTime: string;
  energyLevel: EnergyLevel;
  isDeepWorkPreferred: boolean;
}

export interface ProposedScheduleBlock {
  id: string;
  candidateId: string;
  sourceType: 'lecture' | 'task' | 'exam_revision' | 'exam_mcq' | 'break';
  sourceId: string;
  title: string;
  subject: string;
  moduleId?: string;
  lectureNumber?: number;
  stageType: StudyStageType;
  dateStr: string;     // YYYY-MM-DD in user's timezone
  startTime: string;   // HH:MM in user's timezone
  endTime: string;     // HH:MM in user's timezone
  startUtcIso: string; // UTC ISO timestamp
  endUtcIso: string;   // UTC ISO timestamp
  durationMinutes: number;
  minMinutes: number;
  maxMinutes: number;
  priority: 'critical' | 'high' | 'medium' | 'low';
  cognitiveDifficulty: CognitiveDemand;
  energyRequirement: EnergyLevel;
  slotEnergyLevel: EnergyLevel;
  schedulingReason: string;
  examDeadline?: string;
  daysUntilExam?: number;
  status: 'proposed' | 'approved' | 'completed' | 'skipped';
  breakAfterMinutes: number;
}

export interface ExamReadinessReport {
  moduleId: string;
  moduleName: string;
  examDate: string;
  daysRemaining: number;
  totalLectures: number;
  completedLectures: number;
  partiallyCompletedLectures: number;
  unstudiedLectures: number;
  needsRevisionLectures: number;
  totalRequiredMinutes: number;
  scheduledMinutesInPlan: number;
  availableMinutesBeforeExam: number;
  isAtRisk: boolean;
  warningMessage?: string;
  preparationStagesSummary: {
    firstTimeStudyMinutes: number;
    activeRecallMinutes: number;
    mcqPracticeMinutes: number;
    spacedRevisionMinutes: number;
  };
}

export interface ConstraintValidationReport {
  valid: boolean;
  noPastScheduling: boolean;
  noOverlappingEvents: boolean;
  noImpossibleDurations: boolean;
  noIgnoredFixedCommitments: boolean;
  noBrokenPrerequisites: boolean;
  noUnrealisticWorkload: boolean;
  examWarningsChecked: boolean;
  violations: string[];
}

export interface ScheduleGenerationInput {
  nowIso?: string; // Server UTC ISO timestamp (defaults to new Date().toISOString())
  timezone?: string; // Defaults to 'Africa/Cairo'
  targetDays?: number; // 1 for daily, 7 for weekly
  startDateStr?: string; // Optional override YYYY-MM-DD
  dailyMaxHoursOverride?: Record<string, number>; // e.g. { '2025-05-15': 2 } ("Today I have only two hours available")
  energyOverrideByDate?: Record<string, EnergyLevel>; // e.g. { '2025-05-15': 'low' } ("I am exhausted today")
  excludeTimeWindows?: { dateStr: string; startTime: string; endTime: string; reason: string }[]; // e.g. missed morning session
  forcedMoveItem?: { itemIdOrTitle: string; targetDateStr: string; preferredStartTime?: string };
  existingEvents: Array<{
    id: string;
    title: string;
    dateStr?: string; // YYYY-MM-DD
    startTime: string; // HH:MM
    endTime: string;   // HH:MM
    category?: string;
  }>;
  prayers?: Array<{
    name: string;
    time: string; // HH:MM
    bufferMinutes?: number;
    completed?: boolean;
  }>;
  tasks: Array<{
    id: string;
    title: string;
    category: string;
    priority: 'high' | 'medium' | 'low';
    estimatedMinutes: number;
    completed: boolean;
    dueDate?: string;
    energyLevel?: EnergyLevel;
    moduleId?: string;
  }>;
  studyModules: Array<{
    id: string;
    name: string;
    examDate: string;
  }>;
  studyItems: Array<{
    id: string;
    moduleId: string;
    title: string;
    type: string;
    status: string;
    estimatedMinutes?: number;
    completedMinutes?: number;
    lectureNumber?: number;
    difficulty?: CognitiveDemand;
    prerequisiteIds?: string[];
    lastStudiedAt?: string;
    sourceRef?: string;
  }>;
  memory: PersistentMemoryStore;
}

export interface ScheduleGenerationResult {
  generatedAtUtc: string;
  currentLocalDate: string;
  currentLocalTime: string;
  timezone: string;
  proposedBlocks: ProposedScheduleBlock[];
  unscheduledTasks: Array<{
    candidate: SchedulableCandidate;
    reason: string;
    recommendedAction: string;
  }>;
  examReports: ExamReadinessReport[];
  energyDistribution: {
    highMinutes: number;
    mediumMinutes: number;
    lowMinutes: number;
    breakMinutes: number;
    totalScheduledStudyMinutes: number;
    totalAvailableMinutes: number;
    utilizationPct: number;
  };
  busyIntervalsByDate: Record<string, BusyInterval[]>;
  freeSlotsByDate: Record<string, FreeTimeSlot[]>;
  constraintCheck: ConstraintValidationReport;
  warnings: string[];
  explanationSummary: string[];
}

// ============================================================================
// SERVICE 1: TIMEZONE & USER PROFILE SERVICE (Africa/Cairo default + DST safe)
// ============================================================================

export function parseTimeToMinutes(timeStr: string): number {
  if (!timeStr || typeof timeStr !== 'string') return 0;
  const clean = timeStr.trim();
  const ampmMatch = clean.match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)$/i);
  if (ampmMatch) {
    let h = parseInt(ampmMatch[1], 10);
    const m = parseInt(ampmMatch[2] || '0', 10);
    const period = ampmMatch[3].toLowerCase();
    if (period === 'pm' && h < 12) h += 12;
    if (period === 'am' && h === 12) h = 0;
    return Math.max(0, Math.min(1439, h * 60 + m));
  }
  const parts = clean.split(':');
  const h = parseInt(parts[0] || '0', 10);
  const m = parseInt(parts[1] || '0', 10);
  if (Number.isNaN(h) || Number.isNaN(m)) return 0;
  return Math.max(0, Math.min(1440, h * 60 + m));
}

export function formatMinutesToTime(totalMinutes: number): string {
  const clamped = Math.max(0, Math.min(1439, Math.round(totalMinutes)));
  const h = Math.floor(clamped / 60);
  const m = clamped % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export function roundUpToNext5Minutes(minutes: number): number {
  return Math.min(1439, Math.ceil(minutes / 5) * 5);
}

export function getNowInTimezone(timezone = 'Africa/Cairo', referenceIso?: string): {
  utcIso: string;
  dateStr: string;
  timeStr: string;
  minutesFromMidnight: number;
  dayOfWeek: number;
  timezone: string;
} {
  const dateObj = referenceIso ? new Date(referenceIso) : new Date();
  const safeTz = timezone || 'Africa/Cairo';
  try {
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: safeTz,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
      weekday: 'short',
    });
    const parts = formatter.formatToParts(dateObj);
    const map: Record<string, string> = {};
    for (const p of parts) {
      map[p.type] = p.value;
    }
    const year = map.year || '2025';
    const month = map.month || '01';
    const day = map.day || '01';
    let hour = parseInt(map.hour || '0', 10);
    if (hour === 24) hour = 0;
    const minute = parseInt(map.minute || '0', 10);
    const dateStr = `${year}-${month}-${day}`;
    const minutesFromMidnight = hour * 60 + minute;
    const timeStr = formatMinutesToTime(minutesFromMidnight);
    const weekdayMap: Record<string, number> = {
      Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6,
    };
    const dayOfWeek = weekdayMap[map.weekday || 'Sun'] ?? dateObj.getUTCDay();
    return {
      utcIso: dateObj.toISOString(),
      dateStr,
      timeStr,
      minutesFromMidnight,
      dayOfWeek,
      timezone: safeTz,
    };
  } catch {
    const utcIso = dateObj.toISOString();
    const dateStr = utcIso.slice(0, 10);
    const minutesFromMidnight = dateObj.getUTCHours() * 60 + dateObj.getUTCMinutes();
    return {
      utcIso,
      dateStr,
      timeStr: formatMinutesToTime(minutesFromMidnight),
      minutesFromMidnight,
      dayOfWeek: dateObj.getUTCDay(),
      timezone: 'UTC',
    };
  }
}

export function localDateTimeToUtcIso(dateStr: string, timeStr: string, timezone = 'Africa/Cairo'): string {
  try {
    const [y, m, d] = dateStr.split('-').map(Number);
    const mins = parseTimeToMinutes(timeStr);
    const h = Math.floor(mins / 60);
    const min = mins % 60;
    const approxUtc = new Date(Date.UTC(y, (m || 1) - 1, d || 1, h, min, 0));
    const inTz = getNowInTimezone(timezone, approxUtc.toISOString());
    const diffMinutes = (h * 60 + min) - inTz.minutesFromMidnight;
    let dayDiff = 0;
    if (inTz.dateStr < dateStr) dayDiff = 1;
    else if (inTz.dateStr > dateStr) dayDiff = -1;
    const adjustedMs = approxUtc.getTime() + (diffMinutes + dayDiff * 1440) * 60 * 1000;
    return new Date(adjustedMs).toISOString();
  } catch {
    return `${dateStr}T${timeStr}:00.000Z`;
  }
}

export function addDaysToDateStr(dateStr: string, daysToAdd: number): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(Date.UTC(y, (m || 1) - 1, (d || 1) + daysToAdd, 12, 0, 0));
  return dt.toISOString().slice(0, 10);
}

export function getDayOfWeekForDateStr(dateStr: string): number {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(Date.UTC(y, (m || 1) - 1, d || 1, 12, 0, 0));
  return dt.getUTCDay();
}

export function daysBetweenDates(startDateStr: string, endDateStr: string): number {
  if (!startDateStr || !endDateStr) return 14;
  const cleanStart = startDateStr.slice(0, 10);
  const cleanEnd = endDateStr.slice(0, 10);
  const [y1, m1, d1] = cleanStart.split('-').map(Number);
  const [y2, m2, d2] = cleanEnd.split('-').map(Number);
  if (Number.isNaN(y1) || Number.isNaN(y2)) return 14;
  const t1 = Date.UTC(y1, (m1 || 1) - 1, d1 || 1);
  const t2 = Date.UTC(y2, (m2 || 1) - 1, d2 || 1);
  return Math.round((t2 - t1) / (1000 * 60 * 60 * 24));
}

export function createDefaultPersistentMemory(timezone = 'Africa/Cairo'): PersistentMemoryStore {
  return {
    userProfile: {
      timezone,
      wakeTime: '07:00',
      sleepTime: '23:00',
      morningEnergy: 'high',
      afternoonEnergy: 'medium',
      eveningEnergy: 'low',
      preferredDeepWorkWindows: [
        { start: '08:00', end: '12:00' },
        { start: '16:30', end: '19:30' },
      ],
      preferredLightWorkWindows: [
        { start: '14:15', end: '16:15' },
        { start: '20:30', end: '22:30' },
      ],
      preferredSessionMinutes: 50,
      shortBreakMinutes: 10,
      longBreakMinutes: 25,
      intensiveSessionThresholdMinutes: 60,
      bufferMinutes: 10,
      maxDailyStudyMinutes: 360,
      maxCapacityUtilization: 0.82,
      mealWindows: [
        { label: 'Lunch & Recharge', start: '13:30', end: '14:15' },
        { label: 'Dinner Break', start: '20:00', end: '20:30' },
      ],
      fixedCommitments: [],
    },
    academicMemory: {
      subjects: {},
      lectures: {},
      difficultTopics: [],
    },
    behavioralMemory: {
      durationMultiplier: 1.0,
      postponedTaskCounts: {},
      missedSessionsCount: 0,
      preferredStudyHours: ['08:30', '10:30', '16:30'],
      successfulTimeSlots: [],
      feedbackHistory: [],
      learnedRules: [],
    },
    updatedAt: new Date().toISOString(),
  };
}

// ============================================================================
// SERVICE 2: ACADEMIC DATA & LECTURE SEQUENCE SERVICE
// ============================================================================

export function extractLectureNumber(title: string, explicitNumber?: number): number | undefined {
  if (typeof explicitNumber === 'number' && !Number.isNaN(explicitNumber) && explicitNumber > 0) {
    return explicitNumber;
  }
  if (!title) return undefined;
  const patterns = [
    /\b(?:lecture|lec|lect|l|chapter|ch|module|part|topic|session)\s*#?\s*(\d{1,3})\b/i,
    /^(\d{1,3})\s*[:.-]\s+/,
    /\b(\d{1,3})\s*:\s*[a-z]/i,
  ];
  for (const regex of patterns) {
    const match = title.match(regex);
    if (match && match[1]) {
      const parsed = parseInt(match[1], 10);
      if (!Number.isNaN(parsed) && parsed > 0) return parsed;
    }
  }
  return undefined;
}

export function classifyLectureDifficulty(
  title: string,
  explicitDifficulty?: CognitiveDemand,
  difficultTopics: string[] = []
): CognitiveDemand {
  if (explicitDifficulty) return explicitDifficulty;
  const lower = (title || '').toLowerCase();
  for (const topic of difficultTopics) {
    if (topic && lower.includes(topic.toLowerCase())) return 'high';
  }
  if (
    /\b(pathology|pharmacology|neuroanatomy|physiology|cardiology|arrhythmia|ischemia|mechanism|pathophysiology|surgery|oncology|immunology|biochemistry|clinical management|complex|advanced)\b/i.test(
      lower
    )
  ) {
    return 'high';
  }
  if (/\b(introduction|intro|overview|terminology|history|orientation|summary|admin|organization)\b/i.test(lower)) {
    return 'low';
  }
  return 'medium';
}

export function resolveLectureLifecycleStatus(
  rawStatus: string,
  completedMinutes = 0,
  estimatedMinutes = 60,
  memMeta?: LectureMemoryMeta
): LectureLifecycleStatus {
  if (memMeta?.lifecycleStatus) return memMeta.lifecycleStatus;
  const norm = (rawStatus || '').toLowerCase().trim();
  if (norm === 'mastered') return 'mastered';
  if (norm === 'review_due' || norm === 'needs_revision') return 'review_due';
  if (norm === 'studied' || norm === 'completed') return 'studied';
  if (norm === 'partially_completed' || norm === 'in_progress' || (completedMinutes > 0 && completedMinutes < estimatedMinutes)) {
    return 'partially_completed';
  }
  return 'unstudied';
}

export function classifyTaskCognitiveDemand(
  title: string,
  category: string,
  stageType: StudyStageType,
  lectureDifficulty?: CognitiveDemand,
  explicitEnergy?: EnergyLevel
): { cognitiveDifficulty: CognitiveDemand; energyRequirement: EnergyLevel } {
  if (explicitEnergy) {
    return { cognitiveDifficulty: explicitEnergy, energyRequirement: explicitEnergy };
  }
  const lower = `${title} ${category}`.toLowerCase();

  // Stage-based medical rules from Part 1.C
  if (stageType === 'first_time_study') {
    const level: EnergyLevel = lectureDifficulty === 'low' ? 'medium' : 'high';
    return { cognitiveDifficulty: lectureDifficulty || 'high', energyRequirement: level };
  }
  if (stageType === 'active_recall_notes' || stageType === 'practice_mcqs' || stageType === 'spaced_revision') {
    return { cognitiveDifficulty: 'medium', energyRequirement: 'medium' };
  }
  if (stageType === 'final_review') {
    return { cognitiveDifficulty: 'high', energyRequirement: 'high' };
  }

  // General task classification
  if (
    /\b(new lecture|difficult|complex|pathology|cardiology|anatomy|physiology|pharmacology|exam prep|problem solving|synthesis|deep)\b/i.test(
      lower
    )
  ) {
    return { cognitiveDifficulty: 'high', energyRequirement: 'high' };
  }
  if (/\b(mcq|qbank|question|review|revise|revision|flashcard|ank|notes|summarize|practice)\b/i.test(lower)) {
    return { cognitiveDifficulty: 'medium', energyRequirement: 'medium' };
  }
  if (/\b(organize|admin|email|clean|read|light|familiar|schedule|sort|folder|errand)\b/i.test(lower)) {
    return { cognitiveDifficulty: 'low', energyRequirement: 'low' };
  }

  return { cognitiveDifficulty: 'medium', energyRequirement: 'medium' };
}

// ============================================================================
// SERVICE 3: CALENDAR & AVAILABILITY SERVICE
// ============================================================================

export function getEnergyAtMinute(
  minuteOfDay: number,
  profile: EnergyProfileConfig,
  overrideForDay?: EnergyLevel
): { energyLevel: EnergyLevel; isDeepWorkPreferred: boolean } {
  if (overrideForDay) {
    return { energyLevel: overrideForDay, isDeepWorkPreferred: overrideForDay === 'high' };
  }

  for (const dw of profile.preferredDeepWorkWindows || []) {
    const s = parseTimeToMinutes(dw.start);
    const e = parseTimeToMinutes(dw.end);
    if (minuteOfDay >= s && minuteOfDay < e) {
      return { energyLevel: 'high', isDeepWorkPreferred: true };
    }
  }

  for (const lw of profile.preferredLightWorkWindows || []) {
    const s = parseTimeToMinutes(lw.start);
    const e = parseTimeToMinutes(lw.end);
    if (minuteOfDay >= s && minuteOfDay < e) {
      return { energyLevel: 'low', isDeepWorkPreferred: false };
    }
  }

  if (minuteOfDay < 12 * 60) {
    return { energyLevel: profile.morningEnergy, isDeepWorkPreferred: profile.morningEnergy === 'high' };
  }
  if (minuteOfDay < 17 * 60) {
    return { energyLevel: profile.afternoonEnergy, isDeepWorkPreferred: profile.afternoonEnergy === 'high' };
  }
  return { energyLevel: profile.eveningEnergy, isDeepWorkPreferred: profile.eveningEnergy === 'high' };
}

export function computeBusyAndFreeSlotsForDate(params: {
  dateStr: string;
  isToday: boolean;
  currentMinutesFromMidnight: number;
  profile: EnergyProfileConfig;
  existingEvents: ScheduleGenerationInput['existingEvents'];
  prayers: ScheduleGenerationInput['prayers'];
  learnedRules: LearnedPreferenceRule[];
  excludeTimeWindows?: ScheduleGenerationInput['excludeTimeWindows'];
  energyOverride?: EnergyLevel;
}): { busyIntervals: BusyInterval[]; freeSlots: FreeTimeSlot[] } {
  const {
    dateStr,
    isToday,
    currentMinutesFromMidnight,
    profile,
    existingEvents,
    prayers,
    learnedRules,
    excludeTimeWindows,
    energyOverride,
  } = params;

  const rawBusy: BusyInterval[] = [];
  const dayOfWeek = getDayOfWeekForDateStr(dateStr);

  // 1. Sleep / Wake boundaries
  const wakeMin = parseTimeToMinutes(profile.wakeTime || '07:00');
  const sleepMin = parseTimeToMinutes(profile.sleepTime || '23:00');
  if (wakeMin > 0) {
    rawBusy.push({
      dateStr,
      startMinutes: 0,
      endMinutes: wakeMin,
      startTime: '00:00',
      endTime: formatMinutesToTime(wakeMin),
      title: 'Sleep Window (Morning)',
      source: 'sleep',
    });
  }
  if (sleepMin < 1440) {
    rawBusy.push({
      dateStr,
      startMinutes: sleepMin,
      endMinutes: 1440,
      startTime: formatMinutesToTime(sleepMin),
      endTime: '23:59',
      title: 'Sleep Window (Night)',
      source: 'sleep',
    });
  }

  // 2. CRITICAL PART 1.A: Never schedule in the past on today's date
  if (isToday) {
    const earliestValidStart = roundUpToNext5Minutes(currentMinutesFromMidnight + 5);
    rawBusy.push({
      dateStr,
      startMinutes: 0,
      endMinutes: earliestValidStart,
      startTime: '00:00',
      endTime: formatMinutesToTime(earliestValidStart),
      title: 'Elapsed Past Time Today',
      source: 'past_time',
    });
  }

  // 3. Meal windows
  for (const meal of profile.mealWindows || []) {
    const s = parseTimeToMinutes(meal.start);
    const e = parseTimeToMinutes(meal.end);
    if (e > s) {
      rawBusy.push({
        dateStr,
        startMinutes: s,
        endMinutes: e,
        startTime: formatMinutesToTime(s),
        endTime: formatMinutesToTime(e),
        title: meal.label || 'Meal Break',
        source: 'meal',
      });
    }
  }

  // 4. Fixed commitments from user profile (university classes, personal commitments)
  for (const rule of profile.fixedCommitments || []) {
    if (!rule.confirmed) continue;
    if (rule.dateOnly && rule.dateOnly !== dateStr) continue;
    if (rule.daysOfWeek && rule.daysOfWeek.length > 0 && !rule.daysOfWeek.includes(dayOfWeek)) continue;
    const s = Math.max(0, parseTimeToMinutes(rule.startTime) - (profile.bufferMinutes || 5));
    const e = Math.min(1440, parseTimeToMinutes(rule.endTime) + (profile.bufferMinutes || 5));
    if (e > s) {
      rawBusy.push({
        dateStr,
        startMinutes: s,
        endMinutes: e,
        startTime: formatMinutesToTime(s),
        endTime: formatMinutesToTime(e),
        title: rule.label,
        source: rule.category === 'university' ? 'university' : 'learned_rule',
      });
    }
  }

  // 5. Learned behavioral/availability rules (e.g. "I cannot study at 10 AM because I have university lectures")
  for (const learned of learnedRules || []) {
    if (!learned.confirmed) continue;
    if (learned.ruleType !== 'blocked_window' && learned.ruleType !== 'university_schedule') continue;
    if (learned.daysOfWeek && learned.daysOfWeek.length > 0 && !learned.daysOfWeek.includes(dayOfWeek)) continue;
    if (learned.startTime && learned.endTime) {
      const s = Math.max(0, parseTimeToMinutes(learned.startTime) - 5);
      const e = Math.min(1440, parseTimeToMinutes(learned.endTime) + 5);
      if (e > s) {
        rawBusy.push({
          dateStr,
          startMinutes: s,
          endMinutes: e,
          startTime: formatMinutesToTime(s),
          endTime: formatMinutesToTime(e),
          title: learned.ruleText,
          source: learned.ruleType === 'university_schedule' ? 'university' : 'learned_rule',
        });
      }
    }
  }

  // 6. Existing Calendar Events on this date
  for (const ev of existingEvents || []) {
    const evDate = ev.dateStr ? ev.dateStr.slice(0, 10) : dateStr;
    if (evDate !== dateStr) continue;
    const rawStart = parseTimeToMinutes(ev.startTime);
    const rawEnd = parseTimeToMinutes(ev.endTime);
    const s = Math.max(0, rawStart - 5);
    const e = Math.min(1440, (rawEnd > rawStart ? rawEnd : rawStart + 60) + 5);
    rawBusy.push({
      dateStr,
      startMinutes: s,
      endMinutes: e,
      startTime: formatMinutesToTime(rawStart),
      endTime: formatMinutesToTime(rawEnd > rawStart ? rawEnd : rawStart + 60),
      title: ev.title,
      source:
        ev.category === 'lecture' || /lecture|class|university|hospital|clinic|round|lab/i.test(ev.title)
          ? 'university'
          : 'calendar_event',
    });
  }

  // 7. Prayer times + buffer
  for (const pr of prayers || []) {
    const pMin = parseTimeToMinutes(pr.time);
    const buf = pr.bufferMinutes ?? 20;
    const s = Math.max(0, pMin - 5);
    const e = Math.min(1440, pMin + buf);
    if (e > s) {
      rawBusy.push({
        dateStr,
        startMinutes: s,
        endMinutes: e,
        startTime: formatMinutesToTime(s),
        endTime: formatMinutesToTime(e),
        title: `${pr.name} Prayer`,
        source: 'prayer',
      });
    }
  }

  // 8. Explicit excluded windows (e.g. missed session window)
  for (const ex of excludeTimeWindows || []) {
    if (ex.dateStr !== dateStr) continue;
    const s = parseTimeToMinutes(ex.startTime);
    const e = parseTimeToMinutes(ex.endTime);
    if (e > s) {
      rawBusy.push({
        dateStr,
        startMinutes: s,
        endMinutes: e,
        startTime: formatMinutesToTime(s),
        endTime: formatMinutesToTime(e),
        title: ex.reason || 'Unavailable Window',
        source: 'learned_rule',
      });
    }
  }

  // Sort & merge overlapping busy intervals to determine clean free slots
  const sortedBusy = [...rawBusy].sort((a, b) => a.startMinutes - b.startMinutes);
  const mergedBusy: Array<{ start: number; end: number }> = [];
  for (const b of sortedBusy) {
    if (b.endMinutes <= b.startMinutes) continue;
    if (mergedBusy.length === 0) {
      mergedBusy.push({ start: b.startMinutes, end: b.endMinutes });
    } else {
      const last = mergedBusy[mergedBusy.length - 1];
      if (b.startMinutes <= last.end) {
        last.end = Math.max(last.end, b.endMinutes);
      } else {
        mergedBusy.push({ start: b.startMinutes, end: b.endMinutes });
      }
    }
  }

  // Slice free gaps into energy-homogeneous windows so High/Med/Low energy matching is accurate
  const rawFreeGaps: Array<{ start: number; end: number }> = [];
  let cursor = 0;
  for (const b of mergedBusy) {
    if (b.start > cursor) {
      rawFreeGaps.push({ start: cursor, end: b.start });
    }
    cursor = Math.max(cursor, b.end);
  }
  if (cursor < 1440) {
    rawFreeGaps.push({ start: cursor, end: 1440 });
  }

  // Energy boundary split points (12:00, 17:00, plus deep/light work boundaries)
  const splitBoundaries = new Set<number>([12 * 60, 17 * 60]);
  for (const w of profile.preferredDeepWorkWindows || []) {
    splitBoundaries.add(parseTimeToMinutes(w.start));
    splitBoundaries.add(parseTimeToMinutes(w.end));
  }
  for (const w of profile.preferredLightWorkWindows || []) {
    splitBoundaries.add(parseTimeToMinutes(w.start));
    splitBoundaries.add(parseTimeToMinutes(w.end));
  }
  const sortedSplits = Array.from(splitBoundaries).sort((a, b) => a - b);

  const freeSlots: FreeTimeSlot[] = [];
  for (const gap of rawFreeGaps) {
    const startAligned = roundUpToNext5Minutes(gap.start);
    const endAligned = Math.floor(gap.end / 5) * 5;
    if (endAligned - startAligned < 20) continue;

    let subStart = startAligned;
    for (const boundary of sortedSplits) {
      if (boundary > subStart + 15 && boundary < endAligned - 15) {
        const midPoint = Math.floor((subStart + boundary) / 2);
        const energyInfo = getEnergyAtMinute(midPoint, profile, energyOverride);
        freeSlots.push({
          dateStr,
          startMinutes: subStart,
          endMinutes: boundary,
          durationMinutes: boundary - subStart,
          startTime: formatMinutesToTime(subStart),
          endTime: formatMinutesToTime(boundary),
          energyLevel: energyInfo.energyLevel,
          isDeepWorkPreferred: energyInfo.isDeepWorkPreferred,
        });
        subStart = boundary;
      }
    }

    if (endAligned - subStart >= 20) {
      const midPoint = Math.floor((subStart + endAligned) / 2);
      const energyInfo = getEnergyAtMinute(midPoint, profile, energyOverride);
      freeSlots.push({
        dateStr,
        startMinutes: subStart,
        endMinutes: endAligned,
        durationMinutes: endAligned - subStart,
        startTime: formatMinutesToTime(subStart),
        endTime: formatMinutesToTime(endAligned),
        energyLevel: energyInfo.energyLevel,
        isDeepWorkPreferred: energyInfo.isDeepWorkPreferred,
      });
    }
  }

  return { busyIntervals: sortedBusy, freeSlots };
}

// ============================================================================
// SERVICE 4: PERSISTENT MEMORY & NATURAL LANGUAGE CORRECTION SERVICE
// ============================================================================

export function extractMemoryCorrectionFromText(
  userMessage: string,
  nowDateStr: string
): {
  detected: boolean;
  learnedRule?: LearnedPreferenceRule;
  energyUpdate?: Partial<EnergyProfileConfig>;
  requiresUserConfirmation: boolean;
  confirmationPrompt?: string;
} {
  const text = (userMessage || '').trim();
  if (!text) return { detected: false, requiresUserConfirmation: false };

  // Pattern 1: "I cannot study at 10 AM because I have university lectures" or "I have university lectures from 9 AM to 1 PM"
  const rangeMatch = text.match(
    /\b(?:cannot|can't|dont|don't|unable to|busy|have university|have lectures|have classes).*?\b(?:from|between)\s+(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)\s+(?:to|until|and|-)\s+(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)/i
  );
  if (rangeMatch) {
    const startMin = parseTimeToMinutes(rangeMatch[1]);
    const endMin = parseTimeToMinutes(rangeMatch[2]);
    const finalEnd = endMin > startMin ? endMin : Math.min(1439, startMin + 120);
    const isUni = /university|lecture|class|college|hospital|round|lab/i.test(text);
    const isTemporary = /\b(today only|just today|this afternoon only)\b/i.test(text);
    return {
      detected: true,
      requiresUserConfirmation: isTemporary,
      confirmationPrompt: isTemporary
        ? `Should I save "${formatMinutesToTime(startMin)} - ${formatMinutesToTime(finalEnd)}" as a permanent recurring rule or only for today?`
        : undefined,
      learnedRule: {
        id: `rule_${Date.now()}`,
        ruleText: isUni
          ? `University lectures/classes (${formatMinutesToTime(startMin)}–${formatMinutesToTime(finalEnd)})`
          : `Unavailable window (${formatMinutesToTime(startMin)}–${formatMinutesToTime(finalEnd)})`,
        ruleType: isUni ? 'university_schedule' : 'blocked_window',
        startTime: formatMinutesToTime(startMin),
        endTime: formatMinutesToTime(finalEnd),
        daysOfWeek: isUni ? [0, 1, 2, 3, 4] : undefined, // Sun-Thu default academic week in Cairo
        confirmed: !isTemporary,
        isTemporary,
        createdAt: new Date().toISOString(),
      },
    };
  }

  // Pattern 2: Single time blocked ("I cannot study at 10 AM because I have university lectures")
  const singleTimeBlock = text.match(
    /\b(?:cannot|can't|do not|don't|never)\s+(?:study|schedule|work)\s+(?:at|around)\s+(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)/i
  );
  if (singleTimeBlock) {
    const startMin = parseTimeToMinutes(singleTimeBlock[1]);
    const isUni = /university|lecture|class|college|round/i.test(text);
    const durationBlock = isUni ? 120 : 90;
    const endMin = Math.min(1439, startMin + durationBlock);
    const isUncertain = /\b(maybe|sometimes|might|today)\b/i.test(text);
    return {
      detected: true,
      requiresUserConfirmation: isUncertain,
      confirmationPrompt: isUncertain
        ? `Would you like me to permanently block ${formatMinutesToTime(startMin)}–${formatMinutesToTime(endMin)} in your memory profile?`
        : undefined,
      learnedRule: {
        id: `rule_${Date.now()}`,
        ruleText: isUni
          ? `University lectures block around ${formatMinutesToTime(startMin)} (${formatMinutesToTime(startMin)}–${formatMinutesToTime(endMin)})`
          : `Blocked study window (${formatMinutesToTime(startMin)}–${formatMinutesToTime(endMin)})`,
        ruleType: isUni ? 'university_schedule' : 'blocked_window',
        startTime: formatMinutesToTime(startMin),
        endTime: formatMinutesToTime(endMin),
        daysOfWeek: isUni ? [0, 1, 2, 3, 4] : undefined,
        confirmed: !isUncertain,
        isTemporary: isUncertain,
        createdAt: new Date().toISOString(),
      },
    };
  }

  // Pattern 3: Energy pattern learning ("My energy is highest in the morning", "I have low energy in the afternoon")
  const energyMatch = text.match(
    /\b(morning|afternoon|evening)s?\s+(?:energy\s+is\s+|i\s+am\s+|i\s+feel\s+)?(high|low|medium|exhausted|productive|sharp|tired)/i
  );
  if (energyMatch) {
    const period = energyMatch[1].toLowerCase() as 'morning' | 'afternoon' | 'evening';
    const rawLevel = energyMatch[2].toLowerCase();
    const mappedLevel: EnergyLevel =
      rawLevel === 'high' || rawLevel === 'productive' || rawLevel === 'sharp'
        ? 'high'
        : rawLevel === 'low' || rawLevel === 'exhausted' || rawLevel === 'tired'
          ? 'low'
          : 'medium';
    const isTemp = /\b(today|right now|tonight)\b/i.test(text);
    const energyUpdate: Partial<EnergyProfileConfig> = {};
    if (!isTemp) {
      if (period === 'morning') energyUpdate.morningEnergy = mappedLevel;
      if (period === 'afternoon') energyUpdate.afternoonEnergy = mappedLevel;
      if (period === 'evening') energyUpdate.eveningEnergy = mappedLevel;
    }
    return {
      detected: true,
      requiresUserConfirmation: isTemp,
      confirmationPrompt: isTemp
        ? `I adjusted today's ${period} energy to ${mappedLevel.toUpperCase()}. Should I also save this as your permanent ${period} energy profile?`
        : undefined,
      energyUpdate: !isTemp ? energyUpdate : undefined,
      learnedRule: {
        id: `rule_${Date.now()}`,
        ruleText: `${period.charAt(0).toUpperCase() + period.slice(1)} energy preference: ${mappedLevel.toUpperCase()}`,
        ruleType: 'energy_override',
        periodOfDay: period,
        energyLevel: mappedLevel,
        confirmed: !isTemp,
        isTemporary: isTemp,
        createdAt: new Date().toISOString(),
      },
    };
  }

  return { detected: false, requiresUserConfirmation: false };
}

export function applySessionFeedbackToMemory(
  memory: PersistentMemoryStore,
  feedback: Omit<SessionFeedbackEntry, 'id' | 'recordedAt'>
): PersistentMemoryStore {
  const next: PersistentMemoryStore = JSON.parse(JSON.stringify(memory));
  const entry: SessionFeedbackEntry = {
    ...feedback,
    id: `fb_${Date.now()}`,
    recordedAt: new Date().toISOString(),
  };

  next.behavioralMemory.feedbackHistory = [entry, ...(next.behavioralMemory.feedbackHistory || [])].slice(0, 50);

  // Update realistic duration multiplier based on actual vs estimated completion time
  if (feedback.completed && feedback.estimatedMinutes > 0 && feedback.actualMinutes > 0) {
    const sampleRatio = Math.max(0.6, Math.min(1.8, feedback.actualMinutes / feedback.estimatedMinutes));
    const prevMultiplier = next.behavioralMemory.durationMultiplier || 1.0;
    next.behavioralMemory.durationMultiplier = Number((prevMultiplier * 0.75 + sampleRatio * 0.25).toFixed(2));
  }

  if (!feedback.completed) {
    next.behavioralMemory.missedSessionsCount = (next.behavioralMemory.missedSessionsCount || 0) + 1;
    const count = next.behavioralMemory.postponedTaskCounts[feedback.activityId] || 0;
    next.behavioralMemory.postponedTaskCounts[feedback.activityId] = count + 1;
  } else if (feedback.timeSlotConvenient && feedback.scheduledStartTime) {
    if (!next.behavioralMemory.successfulTimeSlots.includes(feedback.scheduledStartTime)) {
      next.behavioralMemory.successfulTimeSlots = [
        feedback.scheduledStartTime,
        ...next.behavioralMemory.successfulTimeSlots,
      ].slice(0, 10);
    }
  }

  next.updatedAt = new Date().toISOString();
  return next;
}

// ============================================================================
// SERVICE 5: TASK & EXAM-AWARE PRIORITIZATION ENGINE
// ============================================================================

export function buildRankedCandidatesAndExamReports(params: {
  currentDateStr: string;
  targetDays: number;
  tasks: ScheduleGenerationInput['tasks'];
  studyModules: ScheduleGenerationInput['studyModules'];
  studyItems: ScheduleGenerationInput['studyItems'];
  memory: PersistentMemoryStore;
  totalAvailableMinutesPerDayAvg: number;
}): {
  candidates: SchedulableCandidate[];
  examReports: ExamReadinessReport[];
} {
  const { currentDateStr, tasks, studyModules, studyItems, memory, totalAvailableMinutesPerDayAvg } = params;
  const durationMultiplier = memory.behavioralMemory?.durationMultiplier || 1.0;
  const difficultTopics = memory.academicMemory?.difficultTopics || [];

  const moduleMap = new Map<string, { id: string; name: string; examDate: string; daysUntilExam: number }>();
  for (const mod of studyModules || []) {
    const days = Math.max(1, daysBetweenDates(currentDateStr, mod.examDate));
    moduleMap.set(mod.id, {
      id: mod.id,
      name: mod.name,
      examDate: mod.examDate,
      daysUntilExam: days,
    });
  }

  const candidates: SchedulableCandidate[] = [];
  const examReports: ExamReadinessReport[] = [];

  // Group study items by module and sort strictly by lectureNumber
  const itemsByModule = new Map<string, typeof studyItems>();
  for (const item of studyItems || []) {
    const list = itemsByModule.get(item.moduleId) || [];
    list.push(item);
    itemsByModule.set(item.moduleId, list);
  }

  for (const [moduleId, rawItems] of itemsByModule.entries()) {
    const modInfo = moduleMap.get(moduleId) || {
      id: moduleId,
      name: 'Academic Subject',
      examDate: addDaysToDateStr(currentDateStr, 14),
      daysUntilExam: 14,
    };

    // Sort items by extracted lecture number so Lecture 1 always comes before Lecture 2, 3, 4
    const enriched = rawItems
      .map((item, idx) => {
        const memMeta = memory.academicMemory?.lectures?.[item.id];
        let parsedSourceMeta: Record<string, any> = {};
        if (item.sourceRef && item.sourceRef.trim().startsWith('{')) {
          try {
            parsedSourceMeta = JSON.parse(item.sourceRef);
          } catch {
            parsedSourceMeta = {};
          }
        }
        const lectureNum =
          extractLectureNumber(item.title, item.lectureNumber ?? memMeta?.lectureNumber ?? parsedSourceMeta.lectureNumber) ??
          idx + 1;
        const baseEst = item.estimatedMinutes ?? memMeta?.estimatedMinutes ?? parsedSourceMeta.estimatedMinutes ?? 60;
        const completedMin = item.completedMinutes ?? memMeta?.completedMinutes ?? 0;
        const difficulty = classifyLectureDifficulty(
          item.title,
          item.difficulty ?? memMeta?.difficulty ?? parsedSourceMeta.difficulty,
          difficultTopics
        );
        const lifecycleStatus = resolveLectureLifecycleStatus(item.status, completedMin, baseEst, memMeta);
        return {
          raw: item,
          lectureNum,
          baseEst,
          completedMin,
          difficulty,
          lifecycleStatus,
        };
      })
      .sort((a, b) => a.lectureNum - b.lectureNum);

    let completedLectures = 0;
    let partiallyCompletedLectures = 0;
    let unstudiedLectures = 0;
    let needsRevisionLectures = 0;
    let firstTimeStudyMinutes = 0;
    let activeRecallMinutes = 0;
    let mcqPracticeMinutes = 0;
    let spacedRevisionMinutes = 0;

    // Track preceding unstudied lectures as prerequisites
    const unstudiedOrPartialLectureNumbers: number[] = [];

    for (const entry of enriched) {
      const { raw, lectureNum, baseEst, completedMin, difficulty, lifecycleStatus } = entry;
      const rawAdjusted = Math.max(25, (baseEst - completedMin) * durationMultiplier * (difficulty === 'high' ? 1.15 : 1.0));
      const adjustedEst = Math.round(rawAdjusted / 5) * 5;

      if (lifecycleStatus === 'mastered') {
        completedLectures++;
        continue;
      }

      const prerequisiteNums = unstudiedOrPartialLectureNumbers.filter((n) => n < lectureNum);
      const examProximityBoost = Math.max(0, 120 - modInfo.daysUntilExam * 6);
      const difficultyBoost = difficulty === 'high' ? 30 : difficulty === 'medium' ? 15 : 5;
      // Earlier lectures get higher sequence priority so Lecture 1 always ranks above Lecture 2, 3, 4
      const sequenceBonus = Math.max(0, 50 - lectureNum * 8);

      if (lifecycleStatus === 'unstudied' || lifecycleStatus === 'partially_completed') {
        if (lifecycleStatus === 'unstudied') unstudiedLectures++;
        else partiallyCompletedLectures++;
        unstudiedOrPartialLectureNumbers.push(lectureNum);

        firstTimeStudyMinutes += adjustedEst;
        const { cognitiveDifficulty, energyRequirement } = classifyTaskCognitiveDemand(
          raw.title,
          modInfo.name,
          'first_time_study',
          difficulty
        );

        const priority: 'critical' | 'high' | 'medium' | 'low' =
          modInfo.daysUntilExam <= 5 ? 'critical' : modInfo.daysUntilExam <= 10 || difficulty === 'high' ? 'high' : 'medium';

        const reasons: string[] = [
          `Exam in ${modInfo.daysUntilExam} day${modInfo.daysUntilExam === 1 ? '' : 's'} (${modInfo.examDate})`,
          `Lecture #${lectureNum} sequence order${prerequisiteNums.length > 0 ? ` (requires Lecture ${prerequisiteNums.join(', ')} first)` : ' (foundational prerequisite)'}`,
          `${cognitiveDifficulty.toUpperCase()} cognitive demand matched to peak energy`,
        ];

        candidates.push({
          id: `cand_lec_${raw.id}`,
          sourceType: 'lecture',
          sourceId: raw.id,
          title: raw.title,
          subject: modInfo.name,
          moduleId,
          lectureNumber: lectureNum,
          prerequisiteNumbers: prerequisiteNums,
          stageType: 'first_time_study',
          lifecycleStatus,
          priority,
          cognitiveDifficulty,
          energyRequirement,
          estimatedMinutes: Math.min(90, Math.max(30, adjustedEst)),
          minMinutes: 30,
          maxMinutes: 90,
          deadlineDate: modInfo.examDate,
          examDate: modInfo.examDate,
          daysUntilExam: modInfo.daysUntilExam,
          flexibility: modInfo.daysUntilExam <= 5 ? 'rigid' : 'moderate',
          urgencyScore: 100 + examProximityBoost + difficultyBoost + sequenceBonus,
          rankingReasons: reasons,
        });

        // If exam is within 10 days, also plan Active Recall & MCQs stage after first-time study
        if (modInfo.daysUntilExam <= 10) {
          const mcqMinutes = 35;
          mcqPracticeMinutes += mcqMinutes;
          candidates.push({
            id: `cand_mcq_${raw.id}`,
            sourceType: 'exam_mcq',
            sourceId: raw.id,
            title: `${raw.title} — Active Recall & MCQs`,
            subject: modInfo.name,
            moduleId,
            lectureNumber: lectureNum,
            prerequisiteNumbers: [...prerequisiteNums, lectureNum], // Requires the lecture itself to be studied first!
            stageType: 'practice_mcqs',
            lifecycleStatus,
            priority: modInfo.daysUntilExam <= 4 ? 'high' : 'medium',
            cognitiveDifficulty: 'medium',
            energyRequirement: 'medium',
            estimatedMinutes: mcqMinutes,
            minMinutes: 25,
            maxMinutes: 50,
            deadlineDate: modInfo.examDate,
            examDate: modInfo.examDate,
            daysUntilExam: modInfo.daysUntilExam,
            flexibility: 'moderate',
            urgencyScore: 75 + examProximityBoost + sequenceBonus - 15,
            rankingReasons: [
              `Reinforces Lecture #${lectureNum} via Active Recall & MCQs before ${modInfo.name} exam`,
              `MEDIUM cognitive load suitable for afternoon/steady energy slots`,
            ],
          });
        }
      } else if (lifecycleStatus === 'studied' || lifecycleStatus === 'review_due') {
        completedLectures++;
        needsRevisionLectures++;
        const revMinutes = Math.round((35 * durationMultiplier) / 5) * 5;
        spacedRevisionMinutes += revMinutes;

        candidates.push({
          id: `cand_rev_${raw.id}`,
          sourceType: 'exam_revision',
          sourceId: raw.id,
          title: `${raw.title} — Spaced Revision & MCQs`,
          subject: modInfo.name,
          moduleId,
          lectureNumber: lectureNum,
          prerequisiteNumbers: [],
          stageType: 'spaced_revision',
          lifecycleStatus,
          priority: modInfo.daysUntilExam <= 5 ? 'high' : 'medium',
          cognitiveDifficulty: 'medium',
          energyRequirement: 'medium',
          estimatedMinutes: revMinutes,
          minMinutes: 25,
          maxMinutes: 60,
          deadlineDate: modInfo.examDate,
          examDate: modInfo.examDate,
          daysUntilExam: modInfo.daysUntilExam,
          flexibility: 'moderate',
          urgencyScore: 85 + examProximityBoost + sequenceBonus,
          rankingReasons: [
            `Lecture #${lectureNum} studied previously but requires spaced revision before ${modInfo.examDate}`,
            `MEDIUM cognitive demand (active recall + flashcards/MCQs)`,
          ],
        });
      }
    }

    const totalRequiredMinutes =
      firstTimeStudyMinutes + activeRecallMinutes + mcqPracticeMinutes + spacedRevisionMinutes;
    const availableMinutesBeforeExam = Math.round(
      modInfo.daysUntilExam * Math.max(90, totalAvailableMinutesPerDayAvg * 0.75)
    );
    const isAtRisk =
      totalRequiredMinutes > availableMinutesBeforeExam ||
      (modInfo.daysUntilExam <= 5 && unstudiedLectures >= 4) ||
      (modInfo.daysUntilExam <= 3 && unstudiedLectures >= 2);

    examReports.push({
      moduleId,
      moduleName: modInfo.name,
      examDate: modInfo.examDate,
      daysRemaining: modInfo.daysUntilExam,
      totalLectures: enriched.length,
      completedLectures,
      partiallyCompletedLectures,
      unstudiedLectures,
      needsRevisionLectures,
      totalRequiredMinutes,
      scheduledMinutesInPlan: 0, // Populated after slot allocation
      availableMinutesBeforeExam,
      isAtRisk,
      warningMessage: isAtRisk
        ? `${modInfo.name} exam in ${modInfo.daysUntilExam}d requires ~${Math.round(
            totalRequiredMinutes / 60
          )}h (${unstudiedLectures} unstudied lectures, ${needsRevisionLectures} revisions), which is intensive before ${modInfo.examDate}. Prioritize foundational lectures and high-yield MCQs immediately.`
        : undefined,
      preparationStagesSummary: {
        firstTimeStudyMinutes,
        activeRecallMinutes,
        mcqPracticeMinutes,
        spacedRevisionMinutes,
      },
    });
  }

  // Add incomplete tasks
  for (const task of tasks || []) {
    if (task.completed) continue;
    const rawEst = task.estimatedMinutes || 45;
    const adjustedEst = Math.round((rawEst * durationMultiplier) / 5) * 5;
    const { cognitiveDifficulty, energyRequirement } = classifyTaskCognitiveDemand(
      task.title,
      task.category,
      'general_task',
      undefined,
      task.energyLevel
    );
    const daysToDue = task.dueDate ? Math.max(0, daysBetweenDates(currentDateStr, task.dueDate)) : 7;
    const priorityScore = task.priority === 'high' ? 40 : task.priority === 'medium' ? 20 : 5;
    const dueBoost = Math.max(0, 60 - daysToDue * 8);
    const postponedCount = memory.behavioralMemory?.postponedTaskCounts?.[task.id] || 0;
    const antiProcrastinationBoost = Math.min(25, postponedCount * 8);

    candidates.push({
      id: `cand_task_${task.id}`,
      sourceType: 'task',
      sourceId: task.id,
      title: task.title,
      subject: task.category ? task.category.charAt(0).toUpperCase() + task.category.slice(1) : 'General',
      moduleId: task.moduleId,
      stageType: 'general_task',
      priority: task.priority === 'high' && daysToDue <= 1 ? 'critical' : task.priority,
      cognitiveDifficulty,
      energyRequirement,
      estimatedMinutes: Math.min(90, Math.max(20, adjustedEst)),
      minMinutes: 20,
      maxMinutes: 90,
      deadlineDate: task.dueDate,
      flexibility: daysToDue <= 1 ? 'rigid' : 'flexible',
      urgencyScore: 60 + priorityScore + dueBoost + antiProcrastinationBoost,
      rankingReasons: [
        `${task.priority.toUpperCase()} priority task${task.dueDate ? ` due ${task.dueDate}` : ''}`,
        `${energyRequirement.toUpperCase()} energy requirement`,
      ],
    });
  }

  // Sort candidates deterministically: highest urgencyScore first, but strictly respecting lecture sequence within same module
  candidates.sort((a, b) => {
    if (a.moduleId && a.moduleId === b.moduleId && a.lectureNumber !== undefined && b.lectureNumber !== undefined) {
      if (a.lectureNumber !== b.lectureNumber) {
        return a.lectureNumber - b.lectureNumber;
      }
      // First-time study before MCQs for the same lecture number
      if (a.stageType === 'first_time_study' && b.stageType !== 'first_time_study') return -1;
      if (b.stageType === 'first_time_study' && a.stageType !== 'first_time_study') return 1;
    }
    return b.urgencyScore - a.urgencyScore;
  });

  return { candidates, examReports };
}

// ============================================================================
// SERVICE 6: DETERMINISTIC SCHEDULING & CONSTRAINT-VALIDATION ENGINE
// ============================================================================

export function validateScheduleConstraints(params: {
  proposedBlocks: ProposedScheduleBlock[];
  busyIntervalsByDate: Record<string, BusyInterval[]>;
  currentLocalDate: string;
  currentMinutesFromMidnight: number;
  maxDailyStudyMinutes: number;
  dailyMaxHoursOverride?: Record<string, number>;
}): ConstraintValidationReport {
  const {
    proposedBlocks,
    busyIntervalsByDate,
    currentLocalDate,
    currentMinutesFromMidnight,
    maxDailyStudyMinutes,
    dailyMaxHoursOverride,
  } = params;

  const violations: string[] = [];
  let noPastScheduling = true;
  let noOverlappingEvents = true;
  let noImpossibleDurations = true;
  let noIgnoredFixedCommitments = true;
  let noBrokenPrerequisites = true;
  let noUnrealisticWorkload = true;

  const studyBlocks = proposedBlocks.filter((b) => b.sourceType !== 'break');

  // 1. Check no past scheduling
  for (const b of studyBlocks) {
    const startMin = parseTimeToMinutes(b.startTime);
    if (b.dateStr < currentLocalDate || (b.dateStr === currentLocalDate && startMin < currentMinutesFromMidnight)) {
      noPastScheduling = false;
      violations.push(
        `Past scheduling violation: "${b.title}" scheduled at ${b.dateStr} ${b.startTime} (current time is ${currentLocalDate} ${formatMinutesToTime(currentMinutesFromMidnight)}).`
      );
    }
  }

  // 2. Check impossible durations
  for (const b of studyBlocks) {
    const startMin = parseTimeToMinutes(b.startTime);
    const endMin = parseTimeToMinutes(b.endTime);
    const dur = endMin - startMin;
    if (dur < 15 || dur > 180 || dur !== b.durationMinutes) {
      noImpossibleDurations = false;
      violations.push(`Invalid duration for "${b.title}": ${b.durationMinutes}m (${b.startTime}-${b.endTime}).`);
    }
  }

  // 3 & 4. Check overlaps with other proposed blocks AND fixed commitments
  const blocksByDate = new Map<string, ProposedScheduleBlock[]>();
  for (const b of studyBlocks) {
    const list = blocksByDate.get(b.dateStr) || [];
    list.push(b);
    blocksByDate.set(b.dateStr, list);
  }

  for (const [dateStr, dayBlocks] of blocksByDate.entries()) {
    const sorted = [...dayBlocks].sort((a, b) => parseTimeToMinutes(a.startTime) - parseTimeToMinutes(b.startTime));
    for (let i = 0; i < sorted.length - 1; i++) {
      const curEnd = parseTimeToMinutes(sorted[i].endTime);
      const nextStart = parseTimeToMinutes(sorted[i + 1].startTime);
      if (curEnd > nextStart) {
        noOverlappingEvents = false;
        violations.push(
          `Overlap between "${sorted[i].title}" (${sorted[i].startTime}-${sorted[i].endTime}) and "${sorted[i + 1].title}" (${sorted[i + 1].startTime}-${sorted[i + 1].endTime}) on ${dateStr}.`
        );
      }
    }

    const busyList = busyIntervalsByDate[dateStr] || [];
    for (const b of sorted) {
      const bStart = parseTimeToMinutes(b.startTime);
      const bEnd = parseTimeToMinutes(b.endTime);
      for (const busy of busyList) {
        if (busy.source === 'past_time') continue;
        if (bStart < busy.endMinutes && bEnd > busy.startMinutes) {
          noIgnoredFixedCommitments = false;
          noOverlappingEvents = false;
          violations.push(
            `Commitment conflict on ${dateStr}: "${b.title}" (${b.startTime}-${b.endTime}) overlaps "${busy.title}" (${busy.startTime}-${busy.endTime}).`
          );
        }
      }
    }

    // 6. Check daily workload cap
    const totalDayStudy = sorted.reduce((acc, item) => acc + item.durationMinutes, 0);
    const explicitCapMinutes =
      dailyMaxHoursOverride?.[dateStr] !== undefined
        ? Math.round(dailyMaxHoursOverride[dateStr] * 60)
        : maxDailyStudyMinutes;
    if (totalDayStudy > explicitCapMinutes + 5) {
      noUnrealisticWorkload = false;
      violations.push(
        `Workload exceeded on ${dateStr}: ${totalDayStudy}m scheduled exceeds cap of ${explicitCapMinutes}m.`
      );
    }
  }

  // 5. Check lecture prerequisites order chronologically
  const chronological = [...studyBlocks].sort((a, b) => {
    if (a.dateStr !== b.dateStr) return a.dateStr.localeCompare(b.dateStr);
    return parseTimeToMinutes(a.startTime) - parseTimeToMinutes(b.startTime);
  });

  const earliestSlotIndexByModuleAndLecture = new Map<string, number>();
  chronological.forEach((b, idx) => {
    if (b.moduleId && b.lectureNumber !== undefined && b.stageType === 'first_time_study') {
      const key = `${b.moduleId}::${b.lectureNumber}`;
      if (!earliestSlotIndexByModuleAndLecture.has(key)) {
        earliestSlotIndexByModuleAndLecture.set(key, idx);
      }
    }
  });

  chronological.forEach((b, idx) => {
    if (b.moduleId && b.lectureNumber !== undefined && b.stageType === 'first_time_study') {
      for (let prevNum = 1; prevNum < b.lectureNumber; prevNum++) {
        const prevKey = `${b.moduleId}::${prevNum}`;
        const prevIdx = earliestSlotIndexByModuleAndLecture.get(prevKey);
        if (prevIdx !== undefined && prevIdx > idx) {
          noBrokenPrerequisites = false;
          violations.push(
            `Prerequisite violation in ${b.subject}: Lecture ${b.lectureNumber} scheduled before Lecture ${prevNum}.`
          );
        }
      }
    }
  });

  return {
    valid:
      noPastScheduling &&
      noOverlappingEvents &&
      noImpossibleDurations &&
      noIgnoredFixedCommitments &&
      noBrokenPrerequisites &&
      noUnrealisticWorkload,
    noPastScheduling,
    noOverlappingEvents,
    noImpossibleDurations,
    noIgnoredFixedCommitments,
    noBrokenPrerequisites,
    noUnrealisticWorkload,
    examWarningsChecked: true,
    violations,
  };
}

export function generateContextAwareSchedule(input: ScheduleGenerationInput): ScheduleGenerationResult {
  const memory = input.memory || createDefaultPersistentMemory(input.timezone || 'Africa/Cairo');
  const timezone = input.timezone || memory.userProfile.timezone || 'Africa/Cairo';
  const nowInfo = getNowInTimezone(timezone, input.nowIso);
  const startDateStr = input.startDateStr || nowInfo.dateStr;
  const targetDays = Math.max(1, Math.min(14, input.targetDays || 1));
  const profile = memory.userProfile;

  const busyIntervalsByDate: Record<string, BusyInterval[]> = {};
  const freeSlotsByDate: Record<string, FreeTimeSlot[]> = {};

  // Working copy of mutable free sub-slots across target days
  interface WorkingSlot extends FreeTimeSlot {
    id: string;
  }
  const workingSlotsByDate: Record<string, WorkingSlot[]> = {};

  let totalAvailableMinutesAllDays = 0;

  for (let d = 0; d < targetDays; d++) {
    const dateStr = addDaysToDateStr(startDateStr, d);
    const isToday = dateStr === nowInfo.dateStr;
    const { busyIntervals, freeSlots } = computeBusyAndFreeSlotsForDate({
      dateStr,
      isToday,
      currentMinutesFromMidnight: nowInfo.minutesFromMidnight,
      profile,
      existingEvents: input.existingEvents || [],
      prayers: input.prayers || [],
      learnedRules: memory.behavioralMemory?.learnedRules || [],
      excludeTimeWindows: input.excludeTimeWindows,
      energyOverride: input.energyOverrideByDate?.[dateStr],
    });
    busyIntervalsByDate[dateStr] = busyIntervals;
    freeSlotsByDate[dateStr] = freeSlots;
    workingSlotsByDate[dateStr] = freeSlots.map((s, idx) => ({
      ...s,
      id: `slot_${dateStr}_${idx}`,
    }));
    totalAvailableMinutesAllDays += freeSlots.reduce((sum, s) => sum + s.durationMinutes, 0);
  }

  const avgAvailablePerDay = Math.max(60, Math.round(totalAvailableMinutesAllDays / targetDays));

  // Build & rank candidates + exam readiness reports
  const { candidates, examReports } = buildRankedCandidatesAndExamReports({
    currentDateStr: nowInfo.dateStr,
    targetDays,
    tasks: input.tasks || [],
    studyModules: input.studyModules || [],
    studyItems: input.studyItems || [],
    memory,
    totalAvailableMinutesPerDayAvg: avgAvailablePerDay,
  });

  const proposedBlocks: ProposedScheduleBlock[] = [];
  const unscheduledTasks: ScheduleGenerationResult['unscheduledTasks'] = [];
  const warnings: string[] = [];
  const explanationSummary: string[] = [];

  // Track daily scheduled study minutes to enforce capacity limits (Part 2: avoid filling 100% of available time)
  const scheduledStudyMinutesByDate: Record<string, number> = {};
  const dailyCapacityLimitByDate: Record<string, number> = {};

  for (let d = 0; d < targetDays; d++) {
    const dateStr = addDaysToDateStr(startDateStr, d);
    scheduledStudyMinutesByDate[dateStr] = 0;
    const rawFreeDay = (freeSlotsByDate[dateStr] || []).reduce((acc, s) => acc + s.durationMinutes, 0);
    const utilizationBound = Math.floor(rawFreeDay * (profile.maxCapacityUtilization || 0.82));
    const userOverrideHours = input.dailyMaxHoursOverride?.[dateStr];
    if (userOverrideHours !== undefined) {
      dailyCapacityLimitByDate[dateStr] = Math.min(utilizationBound, Math.round(userOverrideHours * 60));
    } else {
      dailyCapacityLimitByDate[dateStr] = Math.min(utilizationBound, profile.maxDailyStudyMinutes || 360);
    }
  }

  // Track when each lecture (moduleId::lectureNumber) finishes so prerequisites are strictly ordered in time
  const completedOrScheduledLectureEndTimestamp = new Map<string, { dateStr: string; endMinutes: number }>();

  // Helper to compare chronological timestamps
  const isAfterOrEqual = (
    dateA: string,
    minA: number,
    dateB: string,
    minB: number
  ): boolean => {
    if (dateA > dateB) return true;
    if (dateA < dateB) return false;
    return minA >= minB;
  };

  // Energy compatibility score (higher = better match)
  const scoreSlotForCandidate = (
    slot: WorkingSlot,
    cand: SchedulableCandidate,
    earliestAllowedDate: string,
    earliestAllowedMinuteOnDate: number
  ): number => {
    if (slot.dateStr < earliestAllowedDate) return -1;
    const effectiveStart =
      slot.dateStr === earliestAllowedDate
        ? Math.max(slot.startMinutes, earliestAllowedMinuteOnDate)
        : slot.startMinutes;
    const usableDuration = slot.endMinutes - effectiveStart;
    if (usableDuration < cand.minMinutes) return -1;

    const remainingDayCap =
      (dailyCapacityLimitByDate[slot.dateStr] || 0) - (scheduledStudyMinutesByDate[slot.dateStr] || 0);
    if (remainingDayCap < cand.minMinutes) return -1;

    // On low-energy override days ("I am exhausted today"), avoid scheduling HIGH cognitive new lectures on that day if future days exist
    const dayEnergyOverride = input.energyOverrideByDate?.[slot.dateStr];
    if (dayEnergyOverride === 'low' && cand.energyRequirement === 'high' && targetDays > 1 && slot.dateStr === startDateStr) {
      return -1;
    }

    const isCriticalExamCandidate = cand.priority === 'critical' && (cand.daysUntilExam ?? 99) <= 5;

    let score = 100;
    // Match candidate energy requirement to slot energy level
    if (cand.energyRequirement === slot.energyLevel) {
      score += 55;
    } else if (cand.energyRequirement === 'high' && slot.energyLevel === 'medium') {
      score += isCriticalExamCandidate ? 42 : 20;
    } else if (cand.energyRequirement === 'medium' && slot.energyLevel === 'high') {
      score += 20;
    } else if (cand.energyRequirement === 'low' && slot.energyLevel === 'medium') {
      score += 25;
    } else if (cand.energyRequirement === 'high' && slot.energyLevel === 'low') {
      // If exam is critical (<=5 days), use open afternoon slots rather than leaving them for low-priority chores
      score += isCriticalExamCandidate ? 25 : -45;
    } else if (cand.energyRequirement === 'low' && slot.energyLevel === 'high') {
      score -= 30; // Don't waste peak deep-work energy on low-energy admin tasks if avoidable
    }

    if (cand.energyRequirement === 'high' && slot.isDeepWorkPreferred) {
      score += 25;
    }

    // Prefer earlier dates for urgent tasks, and prefer earlier slots in the day when urgency is critical
    const dayOffset = Math.max(0, daysBetweenDates(startDateStr, slot.dateStr));
    score -= dayOffset * (isCriticalExamCandidate ? 28 : 14);
    score -= Math.floor(effectiveStart / (isCriticalExamCandidate ? 45 : 120));

    return score;
  };

  const hasAtRiskExam = examReports.some((r) => r.isAtRisk && r.daysRemaining <= 5);

  for (const cand of candidates) {
    // If there is an at-risk exam within 5 days, postpone low-priority non-exam tasks to protect capacity and focus
    if (hasAtRiskExam && cand.priority === 'low' && !cand.examDate) {
      unscheduledTasks.push({
        candidate: cand,
        reason: `Postponed automatically because an upcoming exam (${examReports.find((r) => r.isAtRisk)?.moduleName}) is within 5 days with heavy unfinished lecture workload.`,
        recommendedAction: `Defer until critical exam lectures and active-recall blocks are completed.`,
      });
      continue;
    }

    // Check if prerequisites are already satisfied or scheduled
    let earliestDate = startDateStr;
    let earliestMin = 0;
    let prereqMissing = false;

    if (cand.moduleId && cand.prerequisiteNumbers && cand.prerequisiteNumbers.length > 0) {
      for (const pNum of cand.prerequisiteNumbers) {
        const key = `${cand.moduleId}::${pNum}`;
        const scheduledPrereq = completedOrScheduledLectureEndTimestamp.get(key);
        if (!scheduledPrereq) {
          prereqMissing = true;
          break;
        }
        if (isAfterOrEqual(scheduledPrereq.dateStr, scheduledPrereq.endMinutes, earliestDate, earliestMin)) {
          earliestDate = scheduledPrereq.dateStr;
          earliestMin = scheduledPrereq.endMinutes;
        }
      }
    }

    // Check forced move override (e.g., "Move cardiology lecture 3 to tomorrow")
    if (input.forcedMoveItem) {
      const matchQuery = input.forcedMoveItem.itemIdOrTitle.toLowerCase();
      if (
        cand.sourceId === input.forcedMoveItem.itemIdOrTitle ||
        cand.title.toLowerCase().includes(matchQuery) ||
        `${cand.subject} ${cand.title}`.toLowerCase().includes(matchQuery)
      ) {
        if (input.forcedMoveItem.targetDateStr >= earliestDate) {
          earliestDate = input.forcedMoveItem.targetDateStr;
          earliestMin = input.forcedMoveItem.preferredStartTime
            ? parseTimeToMinutes(input.forcedMoveItem.preferredStartTime)
            : 0;
        }
      }
    }

    if (prereqMissing) {
      unscheduledTasks.push({
        candidate: cand,
        reason: `Prerequisite Lecture ${cand.prerequisiteNumbers?.join(', ')} in ${cand.subject} must be completed before scheduling ${cand.title}.`,
        recommendedAction: `Complete Lecture ${cand.prerequisiteNumbers?.[0]} first or extend the planning horizon to multi-day view.`,
      });
      continue;
    }

    // Find the best matching slot across targetDays
    let bestDate = '';
    let bestSlotIdx = -1;
    let bestScore = -999;

    for (let d = 0; d < targetDays; d++) {
      const dateStr = addDaysToDateStr(startDateStr, d);
      const daySlots = workingSlotsByDate[dateStr] || [];
      for (let sIdx = 0; sIdx < daySlots.length; sIdx++) {
        const sc = scoreSlotForCandidate(daySlots[sIdx], cand, earliestDate, earliestMin);
        if (sc > bestScore) {
          bestScore = sc;
          bestDate = dateStr;
          bestSlotIdx = sIdx;
        }
      }
    }

    if (bestSlotIdx === -1 || !bestDate) {
      // Determine specific conflict reason
      const todayFree = (freeSlotsByDate[startDateStr] || []).reduce((acc, s) => acc + s.durationMinutes, 0);
      const todayCap = dailyCapacityLimitByDate[startDateStr] || 0;
      const todayUsed = scheduledStudyMinutesByDate[startDateStr] || 0;
      const reason =
        todayFree === 0
          ? `No available study windows remain on ${startDateStr} after accounting for current time (${nowInfo.timeStr}), fixed commitments, and sleep boundaries.`
          : todayCap - todayUsed < cand.minMinutes
            ? `Available study capacity (${todayCap}m safe limit) is full for the selected horizon without overloading your schedule.`
            : `Insufficient contiguous time slot (${cand.minMinutes}m minimum required) matching constraints.`;

      unscheduledTasks.push({
        candidate: cand,
        reason,
        recommendedAction:
          cand.priority === 'critical' || cand.priority === 'high'
            ? `Move to the next day's morning high-energy window or postpone a lower-priority task.`
            : `Defer to tomorrow or later this week to protect realistic buffer time.`,
      });
      continue;
    }

    const chosenSlot = workingSlotsByDate[bestDate][bestSlotIdx];
    const startMin = roundUpToNext5Minutes(
      bestDate === earliestDate ? Math.max(chosenSlot.startMinutes, earliestMin) : chosenSlot.startMinutes
    );
    const maxSlotAvail = chosenSlot.endMinutes - startMin;
    const remainingDayCap = (dailyCapacityLimitByDate[bestDate] || 0) - (scheduledStudyMinutesByDate[bestDate] || 0);
    const rawDuration = Math.min(
      cand.estimatedMinutes,
      cand.maxMinutes,
      maxSlotAvail,
      remainingDayCap
    );
    const allocatedDuration = Math.floor(rawDuration / 5) * 5;

    if (allocatedDuration < cand.minMinutes) {
      unscheduledTasks.push({
        candidate: cand,
        reason: `Remaining slot window (${allocatedDuration}m) is shorter than minimum effective duration (${cand.minMinutes}m).`,
        recommendedAction: `Schedule in the next day's open study block.`,
      });
      continue;
    }

    const endMin = startMin + allocatedDuration;
    const breakAfter =
      allocatedDuration >= (profile.intensiveSessionThresholdMinutes || 60)
        ? profile.longBreakMinutes || 25
        : profile.shortBreakMinutes || 10;

    const startTimeStr = formatMinutesToTime(startMin);
    const endTimeStr = formatMinutesToTime(endMin);

    const energyMatchReason =
      chosenSlot.energyLevel === cand.energyRequirement
        ? `Matched ${cand.energyRequirement.toUpperCase()} cognitive load to your ${chosenSlot.energyLevel.toUpperCase()} energy window (${startTimeStr}–${endTimeStr})`
        : `Allocated in available ${chosenSlot.energyLevel.toUpperCase()} energy window (${startTimeStr}–${endTimeStr}) to protect deadline`;

    const seqReason =
      cand.lectureNumber !== undefined
        ? `Lecture #${cand.lectureNumber} sequence validated`
        : `${cand.priority.toUpperCase()} priority task`;

    const examReason =
      cand.examDate && cand.daysUntilExam !== undefined
        ? `${cand.subject} exam in ${cand.daysUntilExam}d (${cand.examDate})`
        : cand.deadlineDate
          ? `Due ${cand.deadlineDate}`
          : 'Fits realistic daily workload with buffer';

    const block: ProposedScheduleBlock = {
      id: `blk_${cand.id}_${bestDate}_${startMin}`,
      candidateId: cand.id,
      sourceType: cand.sourceType,
      sourceId: cand.sourceId,
      title: cand.title,
      subject: cand.subject,
      moduleId: cand.moduleId,
      lectureNumber: cand.lectureNumber,
      stageType: cand.stageType,
      dateStr: bestDate,
      startTime: startTimeStr,
      endTime: endTimeStr,
      startUtcIso: localDateTimeToUtcIso(bestDate, startTimeStr, timezone),
      endUtcIso: localDateTimeToUtcIso(bestDate, endTimeStr, timezone),
      durationMinutes: allocatedDuration,
      minMinutes: cand.minMinutes,
      maxMinutes: cand.maxMinutes,
      priority: cand.priority,
      cognitiveDifficulty: cand.cognitiveDifficulty,
      energyRequirement: cand.energyRequirement,
      slotEnergyLevel: chosenSlot.energyLevel,
      schedulingReason: `${energyMatchReason} • ${seqReason} • ${examReason}. Includes ${breakAfter}m recovery break after session.`,
      examDeadline: cand.examDate || cand.deadlineDate,
      daysUntilExam: cand.daysUntilExam,
      status: 'proposed',
      breakAfterMinutes: breakAfter,
    };

    proposedBlocks.push(block);
    scheduledStudyMinutesByDate[bestDate] = (scheduledStudyMinutesByDate[bestDate] || 0) + allocatedDuration;

    if (cand.moduleId && cand.lectureNumber !== undefined && cand.stageType === 'first_time_study') {
      completedOrScheduledLectureEndTimestamp.set(`${cand.moduleId}::${cand.lectureNumber}`, {
        dateStr: bestDate,
        endMinutes: Math.min(1440, endMin + breakAfter),
      });
    }

    // Consume [occupiedStart, occupiedEnd] across ALL working slots on bestDate so break buffers are respected across sub-slots
    const occupiedStart = Math.max(0, startMin - 5);
    const occupiedEnd = roundUpToNext5Minutes(endMin + breakAfter);
    const updatedSlotsForDay: WorkingSlot[] = [];
    for (const s of workingSlotsByDate[bestDate]) {
      if (s.endMinutes <= occupiedStart || s.startMinutes >= occupiedEnd) {
        updatedSlotsForDay.push(s);
        continue;
      }
      if (occupiedStart - s.startMinutes >= 20) {
        updatedSlotsForDay.push({
          ...s,
          id: `${s.id}_pre_${startMin}`,
          endMinutes: occupiedStart,
          durationMinutes: occupiedStart - s.startMinutes,
          endTime: formatMinutesToTime(occupiedStart),
        });
      }
      if (s.endMinutes - occupiedEnd >= 20) {
        updatedSlotsForDay.push({
          ...s,
          id: `${s.id}_post_${endMin}`,
          startMinutes: occupiedEnd,
          durationMinutes: s.endMinutes - occupiedEnd,
          startTime: formatMinutesToTime(occupiedEnd),
        });
      }
    }
    workingSlotsByDate[bestDate] = updatedSlotsForDay;
  }

  // Sort proposedBlocks chronologically
  proposedBlocks.sort((a, b) => {
    if (a.dateStr !== b.dateStr) return a.dateStr.localeCompare(b.dateStr);
    return parseTimeToMinutes(a.startTime) - parseTimeToMinutes(b.startTime);
  });

  // Update scheduledMinutesInPlan on examReports and collect warnings
  for (const rep of examReports) {
    rep.scheduledMinutesInPlan = proposedBlocks
      .filter((b) => b.moduleId === rep.moduleId)
      .reduce((sum, b) => sum + b.durationMinutes, 0);
    if (rep.isAtRisk && rep.warningMessage) {
      warnings.push(rep.warningMessage);
    }
  }

  if (unscheduledTasks.length > 0) {
    const highUnscheduled = unscheduledTasks.filter(
      (u) => u.candidate.priority === 'critical' || u.candidate.priority === 'high'
    );
    if (highUnscheduled.length > 0) {
      warnings.push(
        `Capacity conflict: ${highUnscheduled.length} high-priority item(s) (${highUnscheduled
          .slice(0, 3)
          .map((u) => u.candidate.title)
          .join(', ')}) could not fit within safe daily capacity without overlapping fixed commitments or exceeding realistic study limits.`
      );
    }
  }

  // Compute Energy Distribution
  let highMinutes = 0;
  let mediumMinutes = 0;
  let lowMinutes = 0;
  let breakMinutes = 0;
  for (const b of proposedBlocks) {
    if (b.energyRequirement === 'high') highMinutes += b.durationMinutes;
    else if (b.energyRequirement === 'medium') mediumMinutes += b.durationMinutes;
    else lowMinutes += b.durationMinutes;
    breakMinutes += b.breakAfterMinutes;
  }
  const totalScheduledStudyMinutes = highMinutes + mediumMinutes + lowMinutes;
  const utilizationPct =
    totalAvailableMinutesAllDays > 0
      ? Math.min(100, Math.round(((totalScheduledStudyMinutes + breakMinutes) / totalAvailableMinutesAllDays) * 100))
      : 0;

  // Step 9: Run deterministic constraint validation
  const constraintCheck = validateScheduleConstraints({
    proposedBlocks,
    busyIntervalsByDate,
    currentLocalDate: nowInfo.dateStr,
    currentMinutesFromMidnight: nowInfo.minutesFromMidnight,
    maxDailyStudyMinutes: profile.maxDailyStudyMinutes || 360,
    dailyMaxHoursOverride: input.dailyMaxHoursOverride,
  });

  explanationSummary.push(
    `Server time verified: ${nowInfo.dateStr} ${nowInfo.timeStr} (${timezone}). Zero activities scheduled before ${nowInfo.timeStr}.`
  );
  explanationSummary.push(
    `Allocated ${proposedBlocks.length} study block(s) (${totalScheduledStudyMinutes}m active study + ${breakMinutes}m recovery breaks) across ${targetDays} day(s), utilizing ${utilizationPct}% of available capacity to preserve flexible buffer time.`
  );
  if (examReports.length > 0) {
    explanationSummary.push(
      `Enforced strict lecture sequence numbering and exam proximity ranking across ${examReports.length} subject(s).`
    );
  }

  return {
    generatedAtUtc: nowInfo.utcIso,
    currentLocalDate: nowInfo.dateStr,
    currentLocalTime: nowInfo.timeStr,
    timezone,
    proposedBlocks,
    unscheduledTasks,
    examReports,
    energyDistribution: {
      highMinutes,
      mediumMinutes,
      lowMinutes,
      breakMinutes,
      totalScheduledStudyMinutes,
      totalAvailableMinutes: totalAvailableMinutesAllDays,
      utilizationPct,
    },
    busyIntervalsByDate,
    freeSlotsByDate,
    constraintCheck,
    warnings,
    explanationSummary,
  };
}

// ============================================================================
// SERVICE 7: ADAPTIVE RESCHEDULING ENGINE
// ============================================================================

export interface AdaptiveRescheduleRequest {
  utterance: string;
  baseInput: ScheduleGenerationInput;
}

export interface AdaptiveRescheduleResponse {
  adaptationType:
    | 'missed_session'
    | 'move_activity'
    | 'low_energy_today'
    | 'exam_moved'
    | 'constrained_hours'
    | 'general_replan';
  changesExplained: string[];
  updatedStudyModules?: ScheduleGenerationInput['studyModules'];
  scheduleResult: ScheduleGenerationResult;
}

export function runAdaptiveReschedule(req: AdaptiveRescheduleRequest): AdaptiveRescheduleResponse {
  const text = (req.utterance || '').trim();
  const lower = text.toLowerCase();
  const base = { ...req.baseInput };
  const timezone = base.timezone || base.memory?.userProfile?.timezone || 'Africa/Cairo';
  const nowInfo = getNowInTimezone(timezone, base.nowIso);
  const todayStr = nowInfo.dateStr;
  const tomorrowStr = addDaysToDateStr(todayStr, 1);

  const changesExplained: string[] = [];
  let adaptationType: AdaptiveRescheduleResponse['adaptationType'] = 'general_replan';
  let updatedStudyModules = base.studyModules ? [...base.studyModules] : [];

  // Default to a multi-day window (at least 3 days) when adapting so overflow spreads cleanly across future days instead of overloading tomorrow
  base.targetDays = Math.max(base.targetDays || 3, 3);

  // Case 1: "I missed my morning study session"
  if (/\b(missed|skipped|overslept|couldn't make).*?\b(morning|earlier|session|block)\b/i.test(lower)) {
    adaptationType = 'missed_session';
    const missedEndStr = nowInfo.timeStr > '12:30' ? nowInfo.timeStr : '12:30';
    base.excludeTimeWindows = [
      ...(base.excludeTimeWindows || []),
      {
        dateStr: todayStr,
        startTime: '06:00',
        endTime: missedEndStr,
        reason: 'Missed Morning Study Session',
      },
    ];
    base.memory = applySessionFeedbackToMemory(base.memory || createDefaultPersistentMemory(timezone), {
      activityId: 'missed_morning_session',
      title: 'Morning Study Session',
      completed: false,
      estimatedMinutes: 60,
      actualMinutes: 0,
      difficultyAccuracy: 'accurate',
      userEnergyDuringSession: 'medium',
      timeSlotConvenient: false,
      scheduledStartTime: '09:00',
    });
    changesExplained.push(
      `Marked morning window (up to ${missedEndStr}) as elapsed/missed and recalculated remaining valid slots from ${nowInfo.timeStr} onward.`
    );
    changesExplained.push(
      `Reprioritized incomplete high-priority lectures into remaining today slots and distributed overflow across the next ${base.targetDays - 1} days without overloading tomorrow.`
    );
  }

  // Case 2: "Move cardiology lecture 3 to tomorrow"
  const moveMatch = text.match(/\bmove\s+(.+?)\s+to\s+(tomorrow|next\s+day|\d{4}-\d{2}-\d{2})/i);
  if (moveMatch) {
    adaptationType = 'move_activity';
    const itemQuery = moveMatch[1].trim();
    const targetWhen = moveMatch[2].toLowerCase();
    const targetDateStr = targetWhen.includes('tomorrow') || targetWhen.includes('next') ? tomorrowStr : targetWhen;
    base.forcedMoveItem = {
      itemIdOrTitle: itemQuery,
      targetDateStr,
    };
    changesExplained.push(
      `Moved "${itemQuery}" to ${targetDateStr} and re-sequenced dependent study blocks so lecture prerequisites remain intact.`
    );
  }

  // Case 3: "I am exhausted today" / "low energy today"
  if (/\b(exhausted|burned out|burnt out|very tired|fatigued|no energy|low energy)\b/i.test(lower)) {
    adaptationType = 'low_energy_today';
    base.energyOverrideByDate = {
      ...(base.energyOverrideByDate || {}),
      [todayStr]: 'low',
    };
    base.dailyMaxHoursOverride = {
      ...(base.dailyMaxHoursOverride || {}),
      [todayStr]: Math.min(base.dailyMaxHoursOverride?.[todayStr] ?? 2.5, 2.5),
    };
    changesExplained.push(
      `Set today's (${todayStr}) energy profile to LOW and capped today's workload to light review/administrative tasks (max 2.5h).`
    );
    changesExplained.push(
      `Shifted high-cognitive medical lectures to peak high-energy morning windows on ${tomorrowStr} and subsequent days.`
    );
  }

  // Case 4: "My exam has been moved to next week"
  if (/\bexam\b.*?\b(moved|postponed|rescheduled|pushed)\b/i.test(lower)) {
    adaptationType = 'exam_moved';
    updatedStudyModules = updatedStudyModules.map((mod) => {
      if (lower.includes(mod.name.toLowerCase()) || updatedStudyModules.length === 1) {
        const newExamDate = addDaysToDateStr(mod.examDate || todayStr, 7);
        changesExplained.push(
          `Updated ${mod.name} exam date from ${mod.examDate} to ${newExamDate} (+7 days) and rebalanced daily study pacing.`
        );
        return { ...mod, examDate: newExamDate };
      }
      return mod;
    });
    base.studyModules = updatedStudyModules;
  }

  // Case 5: "Today I have only two hours available"
  const hoursMatch = text.match(
    /\b(?:today\s+i\s+have\s+only|only\s+have|limit\s+today\s+to)\s+(one|two|three|four|1|2|3|4|\d+(?:\.\d+)?)\s*(?:hours?|hrs?|h)\b/i
  );
  if (hoursMatch) {
    adaptationType = 'constrained_hours';
    const wordToNum: Record<string, number> = { one: 1, two: 2, three: 3, four: 4 };
    const rawVal = hoursMatch[1].toLowerCase();
    const hours = wordToNum[rawVal] ?? parseFloat(rawVal);
    if (!Number.isNaN(hours) && hours > 0) {
      base.dailyMaxHoursOverride = {
        ...(base.dailyMaxHoursOverride || {}),
        [todayStr]: hours,
      };
      changesExplained.push(
        `Restricted today's (${todayStr}) total study allocation to strictly <= ${hours} hour(s) (${Math.round(hours * 60)}m).`
      );
      changesExplained.push(
        `Selected only the highest-urgency priority item(s) for today and smoothly redistributed remaining tasks across future valid slots.`
      );
    }
  }

  if (changesExplained.length === 0) {
    changesExplained.push(
      `Recalculated available time slots starting from ${nowInfo.dateStr} ${nowInfo.timeStr} (${timezone}), preserving all completed tasks and fixed commitments.`
    );
  }

  const scheduleResult = generateContextAwareSchedule(base);

  return {
    adaptationType,
    changesExplained,
    updatedStudyModules,
    scheduleResult,
  };
}
