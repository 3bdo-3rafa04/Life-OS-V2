import {
  MuscleGroup,
  ExerciseMechanicsType,
  WorkoutExerciseEntry,
  PersonalRecord,
  PersonalRecordHistoryPoint,
  TrainingLoadLog,
  RecoveryLog,
  WorkoutSchedule,
  WeightTrendSnapshot,
  WeeklyFitnessReport,
  HealthLogRecord,
  CalendarEventItem,
  TaskItem,
} from '../types.ts';
import {
  parseTimeToMinutes,
  formatMinutesToTime,
  roundUpToNext5Minutes,
  addDaysToDateStr,
} from './schedulingEngine.ts';

export const MUSCLE_GROUPS: MuscleGroup[] = [
  'Chest',
  'Back',
  'Legs',
  'Shoulders',
  'Arms',
  'Core',
  'Full Body',
];

export interface WorkoutTemplatePreset {
  id: string;
  name: string;
  targetMuscleGroups: MuscleGroup[];
  defaultDurationMinutes: number;
  exercises: WorkoutExerciseEntry[];
}

export const WORKOUT_TEMPLATES: WorkoutTemplatePreset[] = [
  {
    id: 'tpl_push',
    name: 'Push Day (Chest, Shoulders & Triceps)',
    targetMuscleGroups: ['Chest', 'Shoulders', 'Arms'],
    defaultDurationMinutes: 60,
    exercises: [
      {
        exerciseName: 'Barbell Bench Press',
        muscleGroup: 'Chest',
        exerciseType: 'compound',
        sets: 4,
        reps: 8,
        weightKg: 75,
        rpe: 8,
      },
      {
        exerciseName: 'Overhead Barbell Press',
        muscleGroup: 'Shoulders',
        exerciseType: 'compound',
        sets: 3,
        reps: 8,
        weightKg: 45,
        rpe: 8,
      },
      {
        exerciseName: 'Incline Dumbbell Press',
        muscleGroup: 'Chest',
        exerciseType: 'compound',
        sets: 3,
        reps: 10,
        weightKg: 28,
        rpe: 8,
      },
      {
        exerciseName: 'Lateral Raises',
        muscleGroup: 'Shoulders',
        exerciseType: 'isolation',
        sets: 3,
        reps: 15,
        weightKg: 12,
        rpe: 8,
      },
      {
        exerciseName: 'Cable Tricep Pushdowns',
        muscleGroup: 'Arms',
        exerciseType: 'isolation',
        sets: 3,
        reps: 12,
        weightKg: 25,
        rpe: 8,
      },
    ],
  },
  {
    id: 'tpl_pull',
    name: 'Pull Day (Back, Lats & Biceps)',
    targetMuscleGroups: ['Back', 'Arms'],
    defaultDurationMinutes: 60,
    exercises: [
      {
        exerciseName: 'Barbell Row',
        muscleGroup: 'Back',
        exerciseType: 'compound',
        sets: 4,
        reps: 8,
        weightKg: 70,
        rpe: 8,
      },
      {
        exerciseName: 'Weighted Pull-Ups',
        muscleGroup: 'Back',
        exerciseType: 'bodyweight',
        sets: 3,
        reps: 8,
        weightKg: 75,
        rpe: 8,
      },
      {
        exerciseName: 'Seated Cable Row',
        muscleGroup: 'Back',
        exerciseType: 'compound',
        sets: 3,
        reps: 10,
        weightKg: 60,
        rpe: 8,
      },
      {
        exerciseName: 'Barbell Bicep Curl',
        muscleGroup: 'Arms',
        exerciseType: 'isolation',
        sets: 3,
        reps: 10,
        weightKg: 30,
        rpe: 8,
      },
    ],
  },
  {
    id: 'tpl_legs',
    name: 'Leg Day (Quads, Hamstrings & Core)',
    targetMuscleGroups: ['Legs', 'Core'],
    defaultDurationMinutes: 65,
    exercises: [
      {
        exerciseName: 'Barbell Back Squat',
        muscleGroup: 'Legs',
        exerciseType: 'compound',
        sets: 4,
        reps: 6,
        weightKg: 100,
        rpe: 8,
      },
      {
        exerciseName: 'Romanian Deadlift',
        muscleGroup: 'Legs',
        exerciseType: 'compound',
        sets: 3,
        reps: 8,
        weightKg: 95,
        rpe: 8,
      },
      {
        exerciseName: 'Leg Press',
        muscleGroup: 'Legs',
        exerciseType: 'compound',
        sets: 3,
        reps: 12,
        weightKg: 160,
        rpe: 8,
      },
      {
        exerciseName: 'Hanging Leg Raises',
        muscleGroup: 'Core',
        exerciseType: 'bodyweight',
        sets: 3,
        reps: 15,
        weightKg: 70,
        rpe: 7,
      },
    ],
  },
  {
    id: 'tpl_upper',
    name: 'Upper Body Strength',
    targetMuscleGroups: ['Chest', 'Back', 'Shoulders', 'Arms'],
    defaultDurationMinutes: 55,
    exercises: [
      {
        exerciseName: 'Barbell Bench Press',
        muscleGroup: 'Chest',
        exerciseType: 'compound',
        sets: 4,
        reps: 5,
        weightKg: 82.5,
        rpe: 8,
      },
      {
        exerciseName: 'Barbell Row',
        muscleGroup: 'Back',
        exerciseType: 'compound',
        sets: 4,
        reps: 6,
        weightKg: 75,
        rpe: 8,
      },
      {
        exerciseName: 'Overhead Barbell Press',
        muscleGroup: 'Shoulders',
        exerciseType: 'compound',
        sets: 3,
        reps: 6,
        weightKg: 50,
        rpe: 8,
      },
    ],
  },
  {
    id: 'tpl_fullbody',
    name: 'Full Body Conditioning & Core',
    targetMuscleGroups: ['Full Body', 'Legs', 'Chest', 'Back', 'Core'],
    defaultDurationMinutes: 50,
    exercises: [
      {
        exerciseName: 'Deadlift',
        muscleGroup: 'Full Body',
        exerciseType: 'compound',
        sets: 3,
        reps: 5,
        weightKg: 120,
        rpe: 8,
      },
      {
        exerciseName: 'Dumbbell Bench Press',
        muscleGroup: 'Chest',
        exerciseType: 'compound',
        sets: 3,
        reps: 10,
        weightKg: 30,
        rpe: 8,
      },
      {
        exerciseName: 'Goblet Squat',
        muscleGroup: 'Legs',
        exerciseType: 'compound',
        sets: 3,
        reps: 12,
        weightKg: 32,
        rpe: 7,
      },
    ],
  },
];

// ============================================================================
// PART A: PERSONAL RECORDS (PR TRACKER) & 1RM FORMULA ENGINE
// ============================================================================

export function inferMuscleGroupFromExercise(exerciseName: string): MuscleGroup {
  const lower = exerciseName.toLowerCase();
  if (/bench|chest|fly|pec|push-?up|dip/i.test(lower)) return 'Chest';
  if (/row|pull-?up|chin-?up|lat|back|pulldown/i.test(lower)) return 'Back';
  if (/squat|leg|lunge|calf|hamstring|quad|rdl|romanian/i.test(lower)) return 'Legs';
  if (/overhead|shoulder|ohp|lateral|delt|military/i.test(lower)) return 'Shoulders';
  if (/curl|tricep|bicep|extension|skullcrusher|preacher|arm/i.test(lower)) return 'Arms';
  if (/plank|ab|crunch|core|leg raise/i.test(lower)) return 'Core';
  if (/deadlift|clean|snatch|thruster|burpee|full/i.test(lower)) return 'Full Body';
  return 'Full Body';
}

export function inferExerciseMechanics(exerciseName: string): ExerciseMechanicsType {
  const lower = exerciseName.toLowerCase();
  if (/push-?up|pull-?up|chin-?up|plank|dip|hanging|bodyweight/i.test(lower)) {
    return 'bodyweight';
  }
  if (/curl|extension|lateral|fly|raise|pushdown|calf/i.test(lower)) {
    return 'isolation';
  }
  return 'compound';
}

/**
 * Calculates 1RM while strictly distinguishing between:
 * - Actual Tested 1RM (when reps === 1)
 * - Estimated 1RM (using Epley formula weight * (1 + reps / 30) for reps 2..15)
 */
export function calculateExercise1RM(
  weightKg: number,
  reps: number,
  exerciseType: ExerciseMechanicsType
): {
  estimated1RM: number;
  actualTested1RM?: number;
  isActualTested1RM: boolean;
} {
  if (weightKg <= 0 || reps <= 0) {
    return { estimated1RM: 0, isActualTested1RM: false };
  }
  if (reps === 1) {
    const rounded = Math.round(weightKg * 10) / 10;
    return {
      estimated1RM: rounded,
      actualTested1RM: rounded,
      isActualTested1RM: true,
    };
  }
  // For bodyweight endurance (>15 reps with no external load), cap estimation factor
  const effectiveReps = exerciseType === 'bodyweight' ? Math.min(reps, 10) : Math.min(reps, 15);
  const epley = weightKg * (1 + effectiveReps / 30);
  return {
    estimated1RM: Math.round(epley * 10) / 10,
    actualTested1RM: undefined,
    isActualTested1RM: false,
  };
}

/**
 * Parses a human-readable exercises string (e.g., "Bench Press 3x8 @ 80kg, Squat 4x5 @ 100kg")
 * or falls back to a structured exercise entry from the workout title & volume.
 */
export function parseExercisesFromWorkoutInput(
  exercisesSummary: string | undefined,
  workoutTitle: string,
  totalVolumeKg: number,
  rpe = 8
): WorkoutExerciseEntry[] {
  const entries: WorkoutExerciseEntry[] = [];
  if (exercisesSummary && exercisesSummary.trim()) {
    const parts = exercisesSummary
      .split(/[,;\n]+/)
      .map((s) => s.trim())
      .filter(Boolean);

    for (const part of parts) {
      // Match patterns like "Bench Press: 3x8 @ 80kg" or "Squat 4 x 6 100kg" or "Pull-ups 3x10"
      const match = part.match(
        /^([A-Za-z0-9\s\-()]+?)\s*[:\-]?\s*(\d+)\s*[x×]\s*(\d+)(?:\s*(?:@|at|-)?\s*(\d+(?:\.\d+)?)\s*(?:kg|lbs)?)?/i
      );
      if (match) {
        const name = match[1].trim();
        const sets = Math.max(1, parseInt(match[2], 10));
        const reps = Math.max(1, parseInt(match[3], 10));
        const weightKg = match[4] ? parseFloat(match[4]) : 50;
        entries.push({
          exerciseName: name,
          muscleGroup: inferMuscleGroupFromExercise(name),
          exerciseType: inferExerciseMechanics(name),
          sets,
          reps,
          weightKg,
          rpe,
        });
      }
    }
  }

  if (entries.length === 0 && workoutTitle.trim()) {
    const cleanTitle = workoutTitle.trim();
    const mg = inferMuscleGroupFromExercise(cleanTitle);
    const estSets = 4;
    const estReps = 8;
    const estWeight =
      totalVolumeKg > 0
        ? Math.max(10, Math.round((totalVolumeKg / (estSets * estReps)) * 2) / 2)
        : 60;
    entries.push({
      exerciseName: cleanTitle,
      muscleGroup: mg,
      exerciseType: inferExerciseMechanics(cleanTitle),
      sets: estSets,
      reps: estReps,
      weightKg: estWeight,
      rpe,
    });
  }

  return entries;
}

export interface PrEvaluationResult {
  updatedPRs: PersonalRecord[];
  newlyBrokenPRs: PersonalRecord[];
  celebrationMessages: string[];
}

/**
 * Evaluates a completed workout's exercises against existing Personal Records.
 * Only updates PRs when verified by a completed workout.
 */
export function evaluateAndUpdatePersonalRecords(params: {
  existingPRs: PersonalRecord[];
  workoutId: string;
  workoutDate: string;
  exercises: WorkoutExerciseEntry[];
  ownerId: string;
}): PrEvaluationResult {
  const prMap = new Map<string, PersonalRecord>();
  for (const pr of params.existingPRs) {
    prMap.set(pr.exerciseName.toLowerCase().trim(), {
      ...pr,
      previousRecords: [...(pr.previousRecords || [])],
    });
  }

  const newlyBrokenPRs: PersonalRecord[] = [];
  const celebrationMessages: string[] = [];

  for (const ex of params.exercises) {
    if (!ex.exerciseName || ex.weightKg <= 0 || ex.reps <= 0) continue;
    const key = ex.exerciseName.toLowerCase().trim();
    const calc = calculateExercise1RM(ex.weightKg, ex.reps, ex.exerciseType);
    const existing = prMap.get(key);

    if (!existing) {
      const initialHistory: PersonalRecordHistoryPoint = {
        date: params.workoutDate,
        weightKg: ex.weightKg,
        reps: ex.reps,
        estimated1RM: calc.estimated1RM,
        actualTested1RM: calc.actualTested1RM,
        isActualTested1RM: calc.isActualTested1RM,
        workoutId: params.workoutId,
      };
      const newPr: PersonalRecord = {
        id: `pr_${key.replace(/[^a-z0-9]/g, '_')}_${Date.now()}`,
        ownerId: params.ownerId,
        exerciseName: ex.exerciseName.trim(),
        muscleGroup: ex.muscleGroup,
        exerciseType: ex.exerciseType,
        maxWeightKg: ex.weightKg,
        repsAtMaxWeight: ex.reps,
        maxReps: ex.reps,
        weightAtMaxReps: ex.weightKg,
        bestEstimated1RM: calc.estimated1RM,
        bestActualTested1RM: calc.actualTested1RM,
        isActualTested1RM: calc.isActualTested1RM,
        bestPerformanceSummary: `${ex.weightKg} kg × ${ex.reps} reps (${
          calc.isActualTested1RM
            ? `Tested 1RM: ${calc.actualTested1RM} kg`
            : `Est. 1RM: ${calc.estimated1RM} kg`
        })`,
        achievedDate: params.workoutDate,
        workoutId: params.workoutId,
        previousRecords: [initialHistory],
        updatedAt: new Date().toISOString(),
      };
      prMap.set(key, newPr);
      newlyBrokenPRs.push(newPr);
      celebrationMessages.push(
        `New Baseline PR Recorded for ${ex.exerciseName}: ${ex.weightKg} kg × ${ex.reps} reps (${
          calc.isActualTested1RM
            ? `Actual Tested 1RM: ${calc.actualTested1RM} kg`
            : `Est. 1RM: ${calc.estimated1RM} kg`
        })!`
      );
      continue;
    }

    const beatMaxWeight = ex.weightKg > existing.maxWeightKg;
    const beatMaxRepsAtSameOrHigherWeight =
      ex.reps > existing.maxReps && ex.weightKg >= existing.weightAtMaxReps * 0.85;
    const beatEstimated1RM = calc.estimated1RM > existing.bestEstimated1RM;
    const beatActual1RM =
      calc.isActualTested1RM &&
      calc.actualTested1RM !== undefined &&
      calc.actualTested1RM > (existing.bestActualTested1RM || 0);

    if (beatMaxWeight || beatMaxRepsAtSameOrHigherWeight || beatEstimated1RM || beatActual1RM) {
      const reasons: string[] = [];
      if (beatMaxWeight) {
        reasons.push(`Max Weight ${existing.maxWeightKg}kg → ${ex.weightKg}kg`);
      }
      if (beatActual1RM) {
        reasons.push(
          `Actual Tested 1RM ${existing.bestActualTested1RM || 0}kg → ${calc.actualTested1RM}kg`
        );
      } else if (beatEstimated1RM) {
        reasons.push(`Est. 1RM ${existing.bestEstimated1RM}kg → ${calc.estimated1RM}kg`);
      }
      if (beatMaxRepsAtSameOrHigherWeight && !beatMaxWeight) {
        reasons.push(`Max Reps ${existing.maxReps} → ${ex.reps} @ ${ex.weightKg}kg`);
      }

      const newHistoryPoint: PersonalRecordHistoryPoint = {
        date: params.workoutDate,
        weightKg: ex.weightKg,
        reps: ex.reps,
        estimated1RM: calc.estimated1RM,
        actualTested1RM: calc.actualTested1RM,
        isActualTested1RM: calc.isActualTested1RM,
        workoutId: params.workoutId,
      };

      const updated: PersonalRecord = {
        ...existing,
        maxWeightKg: Math.max(existing.maxWeightKg, ex.weightKg),
        repsAtMaxWeight:
          ex.weightKg >= existing.maxWeightKg ? ex.reps : existing.repsAtMaxWeight,
        maxReps: Math.max(existing.maxReps, ex.reps),
        weightAtMaxReps:
          ex.reps >= existing.maxReps ? ex.weightKg : existing.weightAtMaxReps,
        bestEstimated1RM: Math.max(existing.bestEstimated1RM, calc.estimated1RM),
        bestActualTested1RM: calc.actualTested1RM
          ? Math.max(existing.bestActualTested1RM || 0, calc.actualTested1RM)
          : existing.bestActualTested1RM,
        isActualTested1RM: existing.isActualTested1RM || calc.isActualTested1RM,
        bestPerformanceSummary:
          calc.estimated1RM >= existing.bestEstimated1RM
            ? `${ex.weightKg} kg × ${ex.reps} reps (${
                calc.isActualTested1RM
                  ? `Tested 1RM: ${calc.actualTested1RM} kg`
                  : `Est. 1RM: ${calc.estimated1RM} kg`
              })`
            : existing.bestPerformanceSummary,
        achievedDate: params.workoutDate,
        workoutId: params.workoutId,
        previousRecords: [...existing.previousRecords, newHistoryPoint],
        updatedAt: new Date().toISOString(),
      };

      prMap.set(key, updated);
      newlyBrokenPRs.push(updated);
      celebrationMessages.push(
        `NEW PERSONAL RECORD in ${ex.exerciseName}: ${ex.weightKg} kg × ${ex.reps} reps (${reasons.join(
          ' · '
        )})!`
      );
    }
  }

  return {
    updatedPRs: Array.from(prMap.values()).sort((a, b) =>
      b.achievedDate.localeCompare(a.achievedDate)
    ),
    newlyBrokenPRs,
    celebrationMessages,
  };
}

// ============================================================================
// PART B: TRAINING LOAD & RECOVERY INTELLIGENCE ENGINE
// ============================================================================

export function buildTrainingLoadLog(params: {
  workoutId: string;
  workoutTitle: string;
  date: string;
  durationMinutes: number;
  rpe: number;
  exercises: WorkoutExerciseEntry[];
  fallbackVolumeKg?: number;
  ownerId: string;
}): TrainingLoadLog {
  const setsByMuscleGroup: Partial<Record<MuscleGroup, number>> = {};
  const volumeByMuscleGroup: Partial<Record<MuscleGroup, number>> = {};
  let totalSets = 0;
  let rawVolumeKg = 0;
  let adjustedVolumeLoad = 0;

  for (const ex of params.exercises) {
    const sets = Math.max(1, ex.sets || 1);
    const reps = Math.max(1, ex.reps || 1);
    const weight = Math.max(0, ex.weightKg || 0);
    const exVol = sets * reps * weight;

    // Exercise mechanics factor: compound movements impose higher systemic load than isolation
    const mechanicsMultiplier =
      ex.exerciseType === 'compound' ? 1.0 : ex.exerciseType === 'bodyweight' ? 0.85 : 0.75;

    totalSets += sets;
    rawVolumeKg += exVol;
    adjustedVolumeLoad += Math.round(exVol * mechanicsMultiplier);

    setsByMuscleGroup[ex.muscleGroup] = (setsByMuscleGroup[ex.muscleGroup] || 0) + sets;
    volumeByMuscleGroup[ex.muscleGroup] = (volumeByMuscleGroup[ex.muscleGroup] || 0) + exVol;
  }

  if (rawVolumeKg === 0 && params.fallbackVolumeKg && params.fallbackVolumeKg > 0) {
    rawVolumeKg = params.fallbackVolumeKg;
    adjustedVolumeLoad = params.fallbackVolumeKg;
  }

  return {
    id: `tload_${params.workoutId}`,
    ownerId: params.ownerId,
    workoutId: params.workoutId,
    date: params.date,
    workoutTitle: params.workoutTitle,
    durationMinutes: params.durationMinutes,
    rpe: params.rpe,
    totalSets: totalSets || 4,
    rawVolumeKg: Math.round(rawVolumeKg),
    adjustedVolumeLoad: Math.round(adjustedVolumeLoad),
    setsByMuscleGroup,
    volumeByMuscleGroup,
    exercises: params.exercises,
    createdAt: new Date().toISOString(),
  };
}

export interface WeeklyTrainingLoadSummary {
  workoutsThisWeek: number;
  restDaysThisWeek: number;
  totalWeeklyVolumeKg: number;
  totalAdjustedLoad: number;
  totalWeeklySets: number;
  totalDurationMinutes: number;
  avgRpe: number | null;
  setsPerMuscleGroup: Record<MuscleGroup, number>;
  volumePerMuscleGroup: Record<MuscleGroup, number>;
  avgRecoveryScore: number | null;
  avgSleepHours: number | null;
  avgSoreness: number | null;
  avgFatigue: number | null;
  loadStatus: 'optimal' | 'high_fatigue_risk' | 'under_training' | 'insufficient_data';
  primarySuggestion:
    | 'Consider an additional recovery day'
    | 'Reduce training volume temporarily'
    | 'Maintain the current training load'
    | 'Gradually increase training load'
    | 'Log workouts and recovery feedback to unlock load guidance';
  detailedExplanation: string;
  // Cross-module Nutrition linkage
  nutritionAdjustment: {
    extraCaloriesForTraining: number;
    recommendedDailyCalories: number;
    recommendedProteinGrams: number;
    rationale: string;
  };
}

export function analyzeWeeklyTrainingLoadAndRecovery(params: {
  trainingLoadLogs: TrainingLoadLog[];
  recoveryLogs: RecoveryLog[];
  todayDate: string;
  baseCalorieTarget: number;
  baseProteinTarget: number;
  latestWeightKg?: number;
}): WeeklyTrainingLoadSummary {
  const weekStartStr = addDaysToDateStr(params.todayDate, -6);
  const weekLoadLogs = params.trainingLoadLogs.filter(
    (l) => l.date >= weekStartStr && l.date <= params.todayDate
  );
  const weekRecoveryLogs = params.recoveryLogs.filter(
    (r) => r.date >= weekStartStr && r.date <= params.todayDate
  );

  const uniqueWorkoutDays = new Set(weekLoadLogs.map((l) => l.date));
  const workoutsThisWeek = weekLoadLogs.length;
  const restDaysThisWeek = Math.max(0, 7 - uniqueWorkoutDays.size);

  const setsPerMuscleGroup: Record<MuscleGroup, number> = {
    Chest: 0,
    Back: 0,
    Legs: 0,
    Shoulders: 0,
    Arms: 0,
    Core: 0,
    'Full Body': 0,
  };
  const volumePerMuscleGroup: Record<MuscleGroup, number> = {
    Chest: 0,
    Back: 0,
    Legs: 0,
    Shoulders: 0,
    Arms: 0,
    Core: 0,
    'Full Body': 0,
  };

  let totalWeeklyVolumeKg = 0;
  let totalAdjustedLoad = 0;
  let totalWeeklySets = 0;
  let totalDurationMinutes = 0;
  let rpeSum = 0;

  for (const log of weekLoadLogs) {
    totalWeeklyVolumeKg += log.rawVolumeKg || 0;
    totalAdjustedLoad += log.adjustedVolumeLoad || log.rawVolumeKg || 0;
    totalWeeklySets += log.totalSets || 0;
    totalDurationMinutes += log.durationMinutes || 0;
    rpeSum += log.rpe || 7.5;

    for (const mg of MUSCLE_GROUPS) {
      setsPerMuscleGroup[mg] += log.setsByMuscleGroup?.[mg] || 0;
      volumePerMuscleGroup[mg] += log.volumeByMuscleGroup?.[mg] || 0;
    }
  }

  const avgRpe =
    weekLoadLogs.length > 0 ? Math.round((rpeSum / weekLoadLogs.length) * 10) / 10 : null;

  const avgRecoveryScore =
    weekRecoveryLogs.length > 0
      ? Math.round(
          weekRecoveryLogs.reduce((a, b) => a + b.generalRecoveryScore, 0) /
            weekRecoveryLogs.length
        )
      : null;
  const avgSleepHours =
    weekRecoveryLogs.length > 0
      ? Math.round(
          (weekRecoveryLogs.reduce((a, b) => a + b.sleepHours, 0) / weekRecoveryLogs.length) * 10
        ) / 10
      : null;
  const avgSoreness =
    weekRecoveryLogs.length > 0
      ? Math.round(
          (weekRecoveryLogs.reduce((a, b) => a + b.muscleSoreness, 0) /
            weekRecoveryLogs.length) *
            10
        ) / 10
      : null;
  const avgFatigue =
    weekRecoveryLogs.length > 0
      ? Math.round(
          (weekRecoveryLogs.reduce((a, b) => a + b.fatigueLevel, 0) / weekRecoveryLogs.length) *
            10
        ) / 10
      : null;

  let loadStatus: WeeklyTrainingLoadSummary['loadStatus'] = 'optimal';
  let primarySuggestion: WeeklyTrainingLoadSummary['primarySuggestion'] =
    'Maintain the current training load';
  let detailedExplanation = '';

  if (weekLoadLogs.length === 0 && weekRecoveryLogs.length === 0) {
    loadStatus = 'insufficient_data';
    primarySuggestion = 'Log workouts and recovery feedback to unlock load guidance';
    detailedExplanation =
      'Insufficient training and recovery data recorded in the past 7 days. Log at least one workout and recovery check-in to evaluate training load appropriateness.';
  } else if (
    (avgRecoveryScore !== null && avgRecoveryScore < 48) ||
    (avgFatigue !== null && avgFatigue >= 8 && (avgRpe || 0) >= 8.5)
  ) {
    loadStatus = 'high_fatigue_risk';
    primarySuggestion =
      restDaysThisWeek <= 1
        ? 'Consider an additional recovery day'
        : 'Reduce training volume temporarily';
    detailedExplanation = `Your 7-day recovery feedback shows elevated fatigue (${
      avgFatigue ?? 'N/A'
    }/10) and lower recovery readiness (${
      avgRecoveryScore ?? 'N/A'
    }/100) alongside an average session RPE of ${
      avgRpe ?? 'N/A'
    }. Note: high volume alone does not automatically indicate overtraining, but pairing high session RPE with low recovery readiness suggests reducing working sets by ~15–20% or adding a rest day.`;
  } else if (workoutsThisWeek <= 1) {
    loadStatus = 'under_training';
    primarySuggestion = 'Gradually increase training load';
    detailedExplanation = `You completed ${workoutsThisWeek} workout(s) in the last 7 days (${totalWeeklySets} total sets). Recovery readiness is ${
      avgRecoveryScore !== null ? `${avgRecoveryScore}/100` : 'unrecorded'
    }. You have ample recovery headroom to gradually add 1–2 training sessions this week.`;
  } else if (
    workoutsThisWeek >= 3 &&
    (avgRecoveryScore === null || avgRecoveryScore >= 72) &&
    (avgRpe === null || avgRpe <= 8.0)
  ) {
    loadStatus = 'optimal';
    primarySuggestion = 'Gradually increase training load';
    detailedExplanation = `Strong training consistency (${workoutsThisWeek} sessions, ${totalWeeklyVolumeKg.toLocaleString()} kg volume) paired with good recovery (${
      avgRecoveryScore !== null ? `${avgRecoveryScore}/100` : 'no high fatigue reported'
    }). You can apply progressive overload (+2.5 kg or +1 rep on main lifts) where form remains solid.`;
  } else {
    loadStatus = 'optimal';
    primarySuggestion = 'Maintain the current training load';
    detailedExplanation = `Weekly training load (${workoutsThisWeek} workouts, ${totalWeeklySets} sets, ${totalWeeklyVolumeKg.toLocaleString()} kg total volume, avg RPE ${
      avgRpe ?? 'N/A'
    }) is well balanced with your current recovery indicators (${
      restDaysThisWeek
    } rest days). Maintain current volume and monitor soreness.`;
  }

  // Cross-module Nutrition calculation based on actual training demands & recovery
  const extraCaloriesForTraining = Math.round(
    (totalDurationMinutes * 6.5) / 7 + (workoutsThisWeek >= 4 ? 120 : workoutsThisWeek >= 2 ? 60 : 0)
  );
  const recommendedDailyCalories = params.baseCalorieTarget + extraCaloriesForTraining;
  const weightForProtein = params.latestWeightKg || 75;
  const proteinMultiplier =
    workoutsThisWeek >= 4 || loadStatus === 'high_fatigue_risk' ? 2.1 : 1.8;
  const recommendedProteinGrams = Math.max(
    params.baseProteinTarget,
    Math.round(weightForProtein * proteinMultiplier)
  );

  return {
    workoutsThisWeek,
    restDaysThisWeek,
    totalWeeklyVolumeKg,
    totalAdjustedLoad,
    totalWeeklySets,
    totalDurationMinutes,
    avgRpe,
    setsPerMuscleGroup,
    volumePerMuscleGroup,
    avgRecoveryScore,
    avgSleepHours,
    avgSoreness,
    avgFatigue,
    loadStatus,
    primarySuggestion,
    detailedExplanation,
    nutritionAdjustment: {
      extraCaloriesForTraining,
      recommendedDailyCalories,
      recommendedProteinGrams,
      rationale:
        workoutsThisWeek > 0
          ? `Adjusted daily target by +${extraCaloriesForTraining} kcal/day (to ${recommendedDailyCalories} kcal) and ${recommendedProteinGrams}g protein based on ${workoutsThisWeek} weekly workouts (${totalDurationMinutes} total training mins) and recovery demand.`
          : `Baseline target (${params.baseCalorieTarget} kcal · ${params.baseProteinTarget}g protein) maintained as no workouts were logged in the last 7 days.`,
    },
  };
}

// ============================================================================
// PART C: SMART WEIGHT TREND ANALYSIS ENGINE
// ============================================================================

export function computeWeightTrendSnapshots(params: {
  measurements: HealthLogRecord[];
  targetWeightKg?: number;
  ownerId: string;
  workoutsThisWeek: number;
}): {
  snapshots: WeightTrendSnapshot[];
  latestSnapshot: WeightTrendSnapshot | null;
} {
  const sorted = [...params.measurements]
    .filter((m) => typeof m.weightKg === 'number' && m.weightKg > 0)
    .sort((a, b) => a.date.localeCompare(b.date));

  if (sorted.length === 0) {
    return { snapshots: [], latestSnapshot: null };
  }

  const snapshots: WeightTrendSnapshot[] = [];

  for (let i = 0; i < sorted.length; i++) {
    const curr = sorted[i];
    const currWeight = Number(curr.weightKg);
    const windowStart7d = addDaysToDateStr(curr.date, -6);
    const window7d = sorted.filter((m) => m.date >= windowStart7d && m.date <= curr.date);

    const rolling7DayAvgKg =
      window7d.length >= 2
        ? Math.round(
            (window7d.reduce((acc, m) => acc + Number(m.weightKg), 0) / window7d.length) * 100
          ) / 100
        : null;

    // Compare against measurement ~7 days ago
    const prevWeekCutoff = addDaysToDateStr(curr.date, -7);
    const prevWeekCandidates = sorted.filter((m) => m.date <= prevWeekCutoff);
    const prevWeekRef =
      prevWeekCandidates.length > 0
        ? prevWeekCandidates[prevWeekCandidates.length - 1]
        : i > 0
        ? sorted[0]
        : null;

    const weeklyChangeKg =
      prevWeekRef && prevWeekRef.id !== curr.id
        ? Math.round(( (rolling7DayAvgKg ?? currWeight) - Number(prevWeekRef.weightKg) ) * 100) / 100
        : null;

    const weeklyChangeRatePct =
      weeklyChangeKg !== null && currWeight > 0
        ? Math.round((weeklyChangeKg / currWeight) * 10000) / 100
        : null;

    // Compare against measurement ~28 days ago
    const prevMonthCutoff = addDaysToDateStr(curr.date, -28);
    const prevMonthCandidates = sorted.filter((m) => m.date <= prevMonthCutoff);
    const prevMonthRef =
      prevMonthCandidates.length > 0 ? prevMonthCandidates[prevMonthCandidates.length - 1] : null;
    const monthlyChangeKg =
      prevMonthRef && prevMonthRef.id !== curr.id
        ? Math.round((currWeight - Number(prevMonthRef.weightKg)) * 100) / 100
        : null;

    const distanceToTargetKg =
      params.targetWeightKg !== undefined && params.targetWeightKg > 0
        ? Math.round((currWeight - params.targetWeightKg) * 100) / 100
        : null;

    // Detect short-term single-day spike/drop vs stable 7-day rolling average
    const isShortTermFluctuation =
      rolling7DayAvgKg !== null &&
      Math.abs(currWeight - rolling7DayAvgKg) >= 0.6 &&
      (weeklyChangeKg === null || Math.abs(weeklyChangeKg) <= 0.35);

    // Detect plateau: >= 4 measurements and < 0.15 kg weekly change while > 0.5 kg away from target
    const isPlateauDetected =
      window7d.length >= 3 &&
      i >= 3 &&
      weeklyChangeKg !== null &&
      Math.abs(weeklyChangeKg) < 0.15 &&
      (distanceToTargetKg === null || Math.abs(distanceToTargetKg) > 0.5);

    let trendStatus: WeightTrendSnapshot['trendStatus'] = 'on_track';
    let explanation = '';
    let biweeklyNutritionRecommendation = '';

    if (window7d.length < 2) {
      trendStatus = 'insufficient_data';
      explanation = `Recorded ${currWeight} kg on ${curr.date}. Only ${window7d.length} measurement exists in the 7-day window — log at least 2–3 measurements per week to compute a reliable 7-day rolling average.`;
      biweeklyNutritionRecommendation =
        'Do not adjust calorie targets based on a single isolated weigh-in. Log 3+ weigh-ins over 7–14 days before reassessing nutrition.';
    } else if (isShortTermFluctuation) {
      trendStatus = 'fluctuation_spike';
      explanation = `Today's scale weight (${currWeight} kg) differs from your 7-day rolling average (${rolling7DayAvgKg} kg) by ${Math.abs(
        Math.round((currWeight - rolling7DayAvgKg!) * 100) / 100
      )} kg, while your 7-day average trend remains stable (${
        weeklyChangeKg !== null ? `${weeklyChangeKg > 0 ? '+' : ''}${weeklyChangeKg} kg/wk` : 'stable'
      }). This is a normal short-term water/glycogen/sodium fluctuation, not true tissue change.`;
      biweeklyNutritionRecommendation =
        'Keep your current calorie and macro targets unchanged. Never reduce calories in reaction to a single-day scale fluctuation when the 7-day rolling average is stable.';
    } else if (isPlateauDetected) {
      trendStatus = 'plateau';
      explanation = `Weight plateau identified: 7-day rolling average is ${rolling7DayAvgKg} kg with minimal weekly change (${weeklyChangeKg} kg/wk).`;
      biweeklyNutritionRecommendation =
        params.workoutsThisWeek >= 3
          ? 'Biweekly Reassessment: Since you are training consistently, if fat loss is your goal, consider a modest 150–200 kcal/day reduction or +1,500 daily steps rather(than drastic cuts).'
          : 'Biweekly Reassessment: Before cutting calories, increase training consistency to 3+ sessions/week.';
    } else {
      trendStatus =
        weeklyChangeKg !== null && weeklyChangeKg < -0.15
          ? 'losing'
          : weeklyChangeKg !== null && weeklyChangeKg > 0.15
          ? 'gaining'
          : 'on_track';
      explanation = `7-day rolling average is ${rolling7DayAvgKg} kg (actual: ${currWeight} kg). Weekly trend change: ${
        weeklyChangeKg !== null ? `${weeklyChangeKg > 0 ? '+' : ''}${weeklyChangeKg} kg/wk` : 'N/A'
      }${
        distanceToTargetKg !== null
          ? ` · Distance to target (${params.targetWeightKg} kg): ${
              distanceToTargetKg > 0 ? `${distanceToTargetKg} kg above` : `${Math.abs(distanceToTargetKg)} kg below`
            }`
          : ''
      }.`;
      biweeklyNutritionRecommendation =
        'Biweekly Reassessment: Your 7-day weight trend is progressing steadily. Maintain your current training-adjusted calorie and protein targets.';
    }

    snapshots.push({
      id: `wtrend_${curr.id}`,
      ownerId: params.ownerId,
      date: curr.date,
      actualWeightKg: currWeight,
      rolling7DayAvgKg,
      measurementsIn7DayWindow: window7d.length,
      weeklyChangeKg,
      monthlyChangeKg,
      weeklyChangeRatePct,
      targetWeightKg: params.targetWeightKg,
      distanceToTargetKg,
      isPlateauDetected,
      isShortTermFluctuation,
      trendStatus,
      explanation,
      biweeklyNutritionRecommendation,
    });
  }

  return {
    snapshots,
    latestSnapshot: snapshots[snapshots.length - 1] || null,
  };
}

// ============================================================================
// PART D: WORKOUT CALENDAR & AI FITNESS SCHEDULING ENGINE
// ============================================================================

export function suggestOptimalWorkoutSlot(params: {
  targetDate: string;
  todayDate: string;
  currentTimeStr: string;
  durationMinutes: number;
  existingEvents: CalendarEventItem[];
  tasks: TaskItem[];
  workoutSchedules: WorkoutSchedule[];
  recoveryLogs: RecoveryLog[];
  preferredWindow?: 'morning' | 'afternoon' | 'evening';
}): {
  date: string;
  startTime: string;
  endTime: string;
  reason: string;
} {
  let candidateDate = params.targetDate < params.todayDate ? params.todayDate : params.targetDate;
  const nowMin = parseTimeToMinutes(params.currentTimeStr || '13:00');
  const duration = Math.max(30, Math.min(120, params.durationMinutes || 60));

  const prefStartMin =
    params.preferredWindow === 'morning'
      ? 8 * 60
      : params.preferredWindow === 'afternoon'
      ? 15 * 60
      : 17 * 60 + 30; // Default 17:30 early evening training window

  for (let dayOffset = 0; dayOffset < 5; dayOffset++) {
    const dStr = addDaysToDateStr(candidateDate, dayOffset);
    let startMin = prefStartMin;

    // Never schedule in the past on today's date
    if (dStr === params.todayDate && startMin < nowMin + 15) {
      startMin = roundUpToNext5Minutes(nowMin + 20);
    }

    const busyIntervals = [
      ...params.existingEvents
        .filter((e) => e.date === dStr)
        .map((e) => ({
          s: parseTimeToMinutes(e.startTime) - 10,
          e: parseTimeToMinutes(e.endTime) + 10,
          label: e.title,
        })),
      ...params.workoutSchedules
        .filter((w) => w.date === dStr && w.status !== 'missed' && w.status !== 'rest_day')
        .map((w) => ({
          s: parseTimeToMinutes(w.startTime) - 10,
          e: parseTimeToMinutes(w.endTime) + 10,
          label: w.templateName,
        })),
    ].sort((a, b) => a.s - b.s);

    for (const busy of busyIntervals) {
      if (startMin < busy.e && startMin + duration > busy.s) {
        startMin = roundUpToNext5Minutes(busy.e);
      }
    }

    if (startMin + duration <= 22 * 60 + 30) {
      const latestRec = params.recoveryLogs[0];
      const recNote =
        latestRec && latestRec.generalRecoveryScore < 55
          ? `Note: latest recovery score is ${latestRec.generalRecoveryScore}/100 — keep session RPE ≤ 7.5.`
          : 'Recovery readiness supports normal training intensity.';
      return {
        date: dStr,
        startTime: formatMinutesToTime(startMin),
        endTime: formatMinutesToTime(startMin + duration),
        reason: `Selected conflict-free training window (${formatMinutesToTime(
          startMin
        )}–${formatMinutesToTime(
          startMin + duration
        )}) respecting existing Life OS commitments, prayer buffers, and current clock (${
          params.currentTimeStr
        }). ${recNote}`,
      };
    }
  }

  const fallbackDate = addDaysToDateStr(params.todayDate, 1);
  return {
    date: fallbackDate,
    startTime: '17:30',
    endTime: formatMinutesToTime(17 * 60 + 30 + duration),
    reason: `Today's schedule is full; placed workout in tomorrow's open 17:30 training slot.`,
  };
}

export function suggestMissedWorkoutAdjustment(params: {
  missedWorkout: WorkoutSchedule;
  allSchedules: WorkoutSchedule[];
  existingEvents: CalendarEventItem[];
  recoveryLogs: RecoveryLog[];
  tasks: TaskItem[];
  todayDate: string;
  currentTimeStr: string;
}): {
  suggestedDate: string;
  suggestedStartTime: string;
  suggestedEndTime: string;
  explanation: string;
} {
  // Find the next day (today after currentTimeStr or within next 3 days) that doesn't already have a planned/completed workout
  for (let offset = 0; offset <= 4; offset++) {
    const dStr = addDaysToDateStr(params.todayDate, offset);
    const hasWorkoutOnDay = params.allSchedules.some(
      (w) =>
        w.id !== params.missedWorkout.id &&
        w.date === dStr &&
        (w.status === 'planned' || w.status === 'completed')
    );
    if (!hasWorkoutOnDay) {
      const slot = suggestOptimalWorkoutSlot({
        targetDate: dStr,
        todayDate: params.todayDate,
        currentTimeStr: params.currentTimeStr,
        durationMinutes: params.missedWorkout.plannedDurationMinutes,
        existingEvents: params.existingEvents,
        tasks: params.tasks,
        workoutSchedules: params.allSchedules,
        recoveryLogs: params.recoveryLogs,
      });
      if (slot.date === dStr) {
        return {
          suggestedDate: slot.date,
          suggestedStartTime: slot.startTime,
          suggestedEndTime: slot.endTime,
          explanation: `Instead of shifting all future workouts, move "${params.missedWorkout.templateName}" to the open recovery-compatible slot on ${slot.date} (${slot.startTime}–${slot.endTime}).`,
        };
      }
    }
  }

  const fallbackSlot = suggestOptimalWorkoutSlot({
    targetDate: addDaysToDateStr(params.todayDate, 1),
    todayDate: params.todayDate,
    currentTimeStr: params.currentTimeStr,
    durationMinutes: params.missedWorkout.plannedDurationMinutes,
    existingEvents: params.existingEvents,
    tasks: params.tasks,
    workoutSchedules: params.allSchedules,
    recoveryLogs: params.recoveryLogs,
  });

  return {
    suggestedDate: fallbackSlot.date,
    suggestedStartTime: fallbackSlot.startTime,
    suggestedEndTime: fallbackSlot.endTime,
    explanation: `Suggested rescheduling "${params.missedWorkout.templateName}" to ${fallbackSlot.date} (${fallbackSlot.startTime}–${fallbackSlot.endTime}) without cascading changes across the rest of your week.`,
  };
}

// ============================================================================
// PART E, F & H: WEEKLY AI FITNESS & NUTRITION COACH + 5 CORE QUESTIONS
// ============================================================================

export function generateWeeklyFitnessCoachReport(params: {
  ownerId: string;
  todayDate: string;
  measurements: HealthLogRecord[];
  workouts: HealthLogRecord[];
  meals: HealthLogRecord[];
  personalRecords: PersonalRecord[];
  trainingLoadLogs: TrainingLoadLog[];
  recoveryLogs: RecoveryLog[];
  workoutSchedules: WorkoutSchedule[];
  targetWeightKg?: number;
  baseCalorieTarget: number;
  baseProteinTarget: number;
}): WeeklyFitnessReport {
  const weekStartDate = addDaysToDateStr(params.todayDate, -6);
  const weekEndDate = params.todayDate;

  const weekMeasurements = params.measurements.filter(
    (m) => m.date >= weekStartDate && m.date <= weekEndDate
  );
  const weekWorkouts = params.workouts.filter(
    (w) => w.date >= weekStartDate && w.date <= weekEndDate
  );
  const weekMeals = params.meals.filter(
    (m) => m.date >= weekStartDate && m.date <= weekEndDate
  );
  const weekSchedules = params.workoutSchedules.filter(
    (s) => s.date >= weekStartDate && s.date <= weekEndDate && s.status !== 'rest_day'
  );
  const weekPRs = params.personalRecords.filter(
    (pr) => pr.achievedDate >= weekStartDate && pr.achievedDate <= weekEndDate
  );

  const loadAnalysis = analyzeWeeklyTrainingLoadAndRecovery({
    trainingLoadLogs: params.trainingLoadLogs,
    recoveryLogs: params.recoveryLogs,
    todayDate: params.todayDate,
    baseCalorieTarget: params.baseCalorieTarget,
    baseProteinTarget: params.baseProteinTarget,
    latestWeightKg:
      params.measurements.length > 0
        ? params.measurements[params.measurements.length - 1].weightKg
        : undefined,
  });

  const weightTrends = computeWeightTrendSnapshots({
    measurements: params.measurements,
    targetWeightKg: params.targetWeightKg,
    ownerId: params.ownerId,
    workoutsThisWeek: loadAnalysis.workoutsThisWeek,
  });
  const latestWeightSnap = weightTrends.latestSnapshot;

  const insufficientDataWarnings: string[] = [];
  if (weekMeasurements.length < 2) {
    insufficientDataWarnings.push(
      `Only ${weekMeasurements.length} body measurement(s) recorded this week (2+ needed for a true 7-day rolling weight average).`
    );
  }
  if (weekMeals.length === 0) {
    insufficientDataWarnings.push('No nutrition meal entries recorded in the last 7 days.');
  }
  if (params.recoveryLogs.filter((r) => r.date >= weekStartDate).length === 0) {
    insufficientDataWarnings.push(
      'No recovery check-ins (sleep, soreness, fatigue) recorded in the last 7 days.'
    );
  }

  // Nutrition aggregation by logged day
  const mealsByDate = new Map<
    string,
    { kcal: number; protein: number; carbs: number; fat: number; count: number }
  >();
  for (const meal of weekMeals) {
    const cur = mealsByDate.get(meal.date) || {
      kcal: 0,
      protein: 0,
      carbs: 0,
      fat: 0,
      count: 0,
    };
    cur.kcal += meal.calories || 0;
    cur.protein += meal.proteinGrams || 0;
    cur.carbs += meal.carbsGrams || 0;
    cur.fat += meal.fatGrams || 0;
    cur.count += 1;
    mealsByDate.set(meal.date, cur);
  }

  const daysLogged = mealsByDate.size;
  const dailyTotals = Array.from(mealsByDate.values());
  const avgDailyCalories =
    daysLogged > 0
      ? Math.round(dailyTotals.reduce((a, b) => a + b.kcal, 0) / daysLogged)
      : null;
  const avgProteinGrams =
    daysLogged > 0
      ? Math.round(dailyTotals.reduce((a, b) => a + b.protein, 0) / daysLogged)
      : null;
  const avgCarbsGrams =
    daysLogged > 0
      ? Math.round(dailyTotals.reduce((a, b) => a + b.carbs, 0) / daysLogged)
      : null;
  const avgFatGrams =
    daysLogged > 0
      ? Math.round(dailyTotals.reduce((a, b) => a + b.fat, 0) / daysLogged)
      : null;

  const targetKcal = loadAnalysis.nutritionAdjustment.recommendedDailyCalories;
  const targetProtein = loadAnalysis.nutritionAdjustment.recommendedProteinGrams;

  const adherencePercent =
    avgDailyCalories !== null && targetKcal > 0
      ? Math.max(
          0,
          Math.min(
            100,
            Math.round((1 - Math.abs(avgDailyCalories - targetKcal) / targetKcal) * 100)
          )
        )
      : null;

  const plannedCount = Math.max(weekSchedules.length, weekWorkouts.length);
  const completedCount = weekWorkouts.length;

  // Cross-module insights (e.g., strength increasing while weight is stable = body recomposition)
  const isRecompSignal =
    weekPRs.length > 0 &&
    latestWeightSnap !== null &&
    latestWeightSnap.weeklyChangeKg !== null &&
    Math.abs(latestWeightSnap.weeklyChangeKg) <= 0.25;

  const achievements: string[] = [];
  if (completedCount > 0) {
    achievements.push(
      `Completed ${completedCount} workout session(s) totaling ${loadAnalysis.totalWeeklyVolumeKg.toLocaleString()} kg of training volume.`
    );
  }
  if (weekPRs.length > 0) {
    achievements.push(
      `Achieved ${weekPRs.length} Personal Record(s): ${weekPRs
        .map((p) => `${p.exerciseName} (${p.bestPerformanceSummary})`)
        .join(', ')}.`
    );
  }
  if (isRecompSignal) {
    achievements.push(
      `Positive Body Recomposition Signal: Strength increased (${weekPRs.length} new PRs) while 7-day average body weight remained stable.`
    );
  }
  if (avgProteinGrams !== null && avgProteinGrams >= targetProtein * 0.9) {
    achievements.push(
      `Strong protein consistency averaging ${avgProteinGrams}g/day against a ${targetProtein}g training-adjusted target.`
    );
  }
  if (achievements.length === 0) {
    achievements.push('Workspace initialized — log workouts, meals, and weigh-ins to track weekly wins.');
  }

  const areasForImprovement: string[] = [];
  if (avgProteinGrams !== null && avgProteinGrams < targetProtein * 0.85) {
    areasForImprovement.push(
      `Protein intake averaged ${avgProteinGrams}g/day across ${daysLogged} logged day(s), below your training-adjusted target of ${targetProtein}g/day.`
    );
  }
  if (loadAnalysis.loadStatus === 'high_fatigue_risk') {
    areasForImprovement.push(
      `Recovery score averaged ${loadAnalysis.avgRecoveryScore ?? 'N/A'}/100 with elevated fatigue (${loadAnalysis.avgFatigue ?? 'N/A'}/10).`
    );
  }
  if (weekSchedules.filter((s) => s.status === 'missed').length > 0) {
    areasForImprovement.push(
      `${weekSchedules.filter((s) => s.status === 'missed').length} scheduled workout(s) were missed this week.`
    );
  }
  for (const warn of insufficientDataWarnings) {
    areasForImprovement.push(`Data gap: ${warn}`);
  }

  const recommendationsForNextWeek: string[] = [
    `Training Load Action: ${loadAnalysis.primarySuggestion}.`,
    loadAnalysis.nutritionAdjustment.rationale,
  ];
  if (latestWeightSnap) {
    recommendationsForNextWeek.push(latestWeightSnap.biweeklyNutritionRecommendation);
  }
  if (avgProteinGrams !== null && avgProteinGrams < targetProtein * 0.85) {
    recommendationsForNextWeek.push(
      `Add +${Math.round(targetProtein - avgProteinGrams)}g daily protein (e.g., 1 high-protein post-workout meal or shake) to support muscle recovery.`
    );
  }

  return {
    id: `wkreport_${weekEndDate}_${Date.now()}`,
    ownerId: params.ownerId,
    weekStartDate,
    weekEndDate,
    generatedAt: new Date().toISOString(),
    referencedDataSummary: {
      measurementCount: weekMeasurements.length,
      completedWorkoutCount: completedCount,
      plannedWorkoutCount: plannedCount,
      mealLogCount: weekMeals.length,
      recoveryLogCount: params.recoveryLogs.filter((r) => r.date >= weekStartDate).length,
      newPrCount: weekPRs.length,
      insufficientDataWarnings,
    },
    sections: {
      weeklyOverview: {
        recordedFacts: [
          `Period analyzed: ${weekStartDate} to ${weekEndDate}.`,
          `Recorded ${completedCount} completed workout(s), ${weekMeasurements.length} body measurement(s), ${weekMeals.length} meal entry/entries across ${daysLogged} day(s), and ${weekPRs.length} new Personal Record(s).`,
        ],
        aiInterpretation: isRecompSignal
          ? `Your strength improved (${weekPRs.length} PRs) while your weekly weight remained stable — a classic positive body recomposition indicator.`
          : completedCount > 0
          ? `Consistent training week with ${loadAnalysis.totalWeeklyVolumeKg.toLocaleString()} kg lifted. ${loadAnalysis.detailedExplanation}`
          : `Insufficient workout logs recorded this week to evaluate training progression. Schedule and complete your upcoming sessions in the Workout Calendar.`,
      },
      bodyProgress: {
        currentWeightKg: latestWeightSnap?.actualWeightKg ?? null,
        weeklyAvgWeightKg: latestWeightSnap?.rolling7DayAvgKg ?? null,
        weightChangeKg: latestWeightSnap?.weeklyChangeKg ?? null,
        targetWeightKg: params.targetWeightKg ?? null,
        recordedFacts: latestWeightSnap
          ? [
              `Latest weight: ${latestWeightSnap.actualWeightKg} kg on ${latestWeightSnap.date}.`,
              `7-day rolling average: ${
                latestWeightSnap.rolling7DayAvgKg !== null
                  ? `${latestWeightSnap.rolling7DayAvgKg} kg (${latestWeightSnap.measurementsIn7DayWindow} measurements in window)`
                  : 'Insufficient measurements (<2 in 7 days)'
              }.`,
              `Weekly change: ${
                latestWeightSnap.weeklyChangeKg !== null
                  ? `${latestWeightSnap.weeklyChangeKg > 0 ? '+' : ''}${latestWeightSnap.weeklyChangeKg} kg`
                  : 'Insufficient prior baseline'
              }.`,
            ]
          : ['No body weight measurements recorded yet.'],
        aiInterpretation: latestWeightSnap
          ? `${latestWeightSnap.explanation} ${latestWeightSnap.biweeklyNutritionRecommendation}`
          : 'Cannot evaluate body weight trajectory without recorded measurements. Log at least 3 weigh-ins per week.',
      },
      workoutPerformance: {
        completedWorkouts: completedCount,
        plannedWorkouts: plannedCount,
        totalVolumeKg: loadAnalysis.totalWeeklyVolumeKg,
        totalSets: loadAnalysis.totalWeeklySets,
        newPersonalRecords: weekPRs.map(
          (p) => `${p.exerciseName}: ${p.bestPerformanceSummary}`
        ),
        muscleGroupSets: loadAnalysis.setsPerMuscleGroup,
        recordedFacts: [
          `Completed ${completedCount} of ${plannedCount} planned workouts (${loadAnalysis.totalDurationMinutes} total minutes).`,
          `Total volume: ${loadAnalysis.totalWeeklyVolumeKg.toLocaleString()} kg across ${loadAnalysis.totalWeeklySets} working sets (Avg RPE: ${
            loadAnalysis.avgRpe ?? 'N/A'
          }).`,
          `New Personal Records verified from completed workouts: ${weekPRs.length}.`,
        ],
        aiInterpretation:
          completedCount > 0
            ? `Your training volume distribution covered ${
                Object.entries(loadAnalysis.setsPerMuscleGroup)
                  .filter(([, s]) => s > 0)
                  .map(([m, s]) => `${m} (${s} sets)`)
                  .join(', ') || 'general conditioning'
              }. ${
                weekPRs.length > 0
                  ? 'Progressive overload is evident from your new PRs.'
                  : 'Focus on adding 1 rep or 1.25–2.5 kg on primary compound lifts next week.'
              }`
            : 'No completed workouts recorded during this 7-day window.',
      },
      nutritionPerformance: {
        avgDailyCalories,
        avgProteinGrams,
        avgCarbsGrams,
        avgFatGrams,
        adherencePercent,
        daysLogged,
        trainingAdjustedCalorieTarget: targetKcal,
        trainingAdjustedProteinTarget: targetProtein,
        recordedFacts:
          daysLogged > 0
            ? [
                `Logged nutrition on ${daysLogged} of 7 days (${weekMeals.length} total meals).`,
                `Average intake on logged days: ${avgDailyCalories} kcal · ${avgProteinGrams}g Protein · ${avgCarbsGrams}g Carbs · ${avgFatGrams}g Fat.`,
                `Training-adjusted daily targets: ${targetKcal} kcal · ${targetProtein}g Protein.`,
              ]
            : ['0 meals logged in the past 7 days (insufficient nutrition data).'],
        aiInterpretation:
          daysLogged > 0
            ? `Your average calorie adherence on logged days is ${adherencePercent}%. ${
                (avgProteinGrams || 0) < targetProtein * 0.9
                  ? `Your protein intake (${avgProteinGrams}g) was below your training-adjusted target (${targetProtein}g), which can slow recovery from your ${completedCount} weekly workouts.`
                  : `Your protein intake (${avgProteinGrams}g) aligns well with your current training load.`
              }`
            : 'Insufficient meal logs to assess diet adherence. Log your daily meals so nutrition recommendations can adapt to your training volume and weight trend.',
      },
      recoveryAndTrainingLoad: {
        avgRecoveryScore: loadAnalysis.avgRecoveryScore,
        avgSleepHours: loadAnalysis.avgSleepHours,
        avgSleepQuality:
          params.recoveryLogs.length > 0
            ? Math.round(
                (params.recoveryLogs.reduce((a, b) => a + b.sleepQuality, 0) /
                  params.recoveryLogs.length) *
                  10
              ) / 10
            : null,
        avgFatigue: loadAnalysis.avgFatigue,
        avgSoreness: loadAnalysis.avgSoreness,
        loadStatus: loadAnalysis.loadStatus,
        recordedFacts: [
          `Rest days this week: ${loadAnalysis.restDaysThisWeek} of 7 days.`,
          `Average recovery score: ${
            loadAnalysis.avgRecoveryScore !== null
              ? `${loadAnalysis.avgRecoveryScore}/100`
              : 'Not recorded'
          } · Sleep: ${
            loadAnalysis.avgSleepHours !== null ? `${loadAnalysis.avgSleepHours}h` : 'Not recorded'
          } · Fatigue: ${
            loadAnalysis.avgFatigue !== null ? `${loadAnalysis.avgFatigue}/10` : 'Not recorded'
          } · Soreness: ${
            loadAnalysis.avgSoreness !== null ? `${loadAnalysis.avgSoreness}/5` : 'Not recorded'
          }.`,
        ],
        aiInterpretation: `${loadAnalysis.detailedExplanation} Recommendation: ${loadAnalysis.primarySuggestion}.`,
      },
      achievements,
      areasForImprovement,
      recommendationsForNextWeek,
    },
  };
}

export interface FiveFitnessQuestionsSummary {
  q1BodyProgress: { question: string; status: string; answer: string };
  q2GettingStronger: { question: string; status: string; answer: string };
  q3TrainingLoadAppropriate: { question: string; status: string; answer: string };
  q4EatingAccordingToNeeds: { question: string; status: string; answer: string };
  q5ImproveNextWeek: { question: string; status: string; answer: string };
}

export function evaluateFiveCoreFitnessQuestions(params: {
  latestWeightSnapshot: WeightTrendSnapshot | null;
  personalRecords: PersonalRecord[];
  loadSummary: WeeklyTrainingLoadSummary;
  latestReport: WeeklyFitnessReport;
}): FiveFitnessQuestionsSummary {
  const { latestWeightSnapshot, personalRecords, loadSummary, latestReport } = params;
  const nut = latestReport.sections.nutritionPerformance;

  return {
    q1BodyProgress: {
      question: '1. Is my body progressing toward my goal?',
      status: !latestWeightSnapshot
        ? 'Needs Data'
        : latestWeightSnapshot.trendStatus === 'fluctuation_spike'
        ? 'Stable 7d Avg'
        : latestWeightSnapshot.trendStatus === 'plateau'
        ? 'Plateau'
        : 'On Track',
      answer: latestWeightSnapshot
        ? latestWeightSnapshot.explanation
        : 'Log at least 2–3 body weight measurements this week to compute your 7-day rolling trend.',
    },
    q2GettingStronger: {
      question: '2. Am I getting stronger?',
      status:
        personalRecords.length > 0
          ? `${personalRecords.length} PRs Tracked`
          : 'Log Workouts',
      answer:
        personalRecords.length > 0
          ? `Tracking ${personalRecords.length} exercise PRs. Latest best: ${personalRecords[0].exerciseName} (${personalRecords[0].bestPerformanceSummary}).`
          : 'Complete a workout with exercise sets/weights to automatically track 1RM and volume Personal Records.',
    },
    q3TrainingLoadAppropriate: {
      question: '3. Is my training load appropriate?',
      status:
        loadSummary.loadStatus === 'optimal'
          ? 'Optimal Load'
          : loadSummary.loadStatus === 'high_fatigue_risk'
          ? 'High Fatigue'
          : loadSummary.loadStatus === 'under_training'
          ? 'Low Volume'
          : 'Needs Logs',
      answer: `${loadSummary.primarySuggestion}. (${loadSummary.workoutsThisWeek} workouts · ${loadSummary.totalWeeklySets} sets · ${loadSummary.totalWeeklyVolumeKg.toLocaleString()} kg volume this week).`,
    },
    q4EatingAccordingToNeeds: {
      question: '4. Am I eating according to my actual nutritional needs?',
      status:
        nut.daysLogged === 0
          ? 'No Meals Logged'
          : (nut.adherencePercent || 0) >= 85
          ? `${nut.adherencePercent}% Aligned`
          : 'Needs Adjustment',
      answer:
        nut.daysLogged > 0
          ? `Avg ${nut.avgDailyCalories} kcal & ${nut.avgProteinGrams}g protein across ${nut.daysLogged} logged day(s) vs training-adjusted need of ${nut.trainingAdjustedCalorieTarget} kcal & ${nut.trainingAdjustedProteinTarget}g protein.`
          : `Your training-adjusted need is ${nut.trainingAdjustedCalorieTarget} kcal & ${nut.trainingAdjustedProteinTarget}g protein/day. Log daily meals to verify adherence.`,
    },
    q5ImproveNextWeek: {
      question: '5. What should I improve next week?',
      status: 'Action Plan',
      answer:
        latestReport.sections.recommendationsForNextWeek[0] ||
        'Log 3 workouts, daily meals, and 3 morning weigh-ins to calibrate your weekly AI coaching report.',
    },
  };
}
