import React, { useState, useMemo } from 'react';
import { useLifeOS } from '../context/LifeOSContext.tsx';
import {
  MuscleGroup,
  ExerciseMechanicsType,
  WorkoutExerciseEntry,
  WorkoutScheduleStatus,
} from '../types.ts';
import {
  WORKOUT_TEMPLATES,
  calculateExercise1RM,
  analyzeWeeklyTrainingLoadAndRecovery,
  computeWeightTrendSnapshots,
  suggestOptimalWorkoutSlot,
  suggestMissedWorkoutAdjustment,
  generateWeeklyFitnessCoachReport,
  evaluateFiveCoreFitnessQuestions,
} from '../services/fitnessIntelligenceEngine.ts';
import {
  Plus,
  Trash2,
  X,
  Trophy,
  Activity,
  TrendingUp,
  Calendar,
  Brain,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  Dumbbell,
  Flame,
  Scale,
  Clock,
  ShieldCheck,
  Award,
  RefreshCw,
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from 'recharts';

interface HealthViewProps {
  subPage?: string;
  onSubPageChange?: (sub: string) => void;
}

type HealthTabId =
  | 'measurements'
  | 'workouts'
  | 'pr_tracker'
  | 'training_load'
  | 'workout_calendar'
  | 'nutrition'
  | 'weekly_coach'
  | 'sleep_water';

const MUSCLE_GROUPS: MuscleGroup[] = [
  'Chest',
  'Back',
  'Legs',
  'Shoulders',
  'Arms',
  'Core',
  'Full Body',
];

const EXERCISE_MECHANICS: ExerciseMechanicsType[] = [
  'compound',
  'isolation',
  'bodyweight',
  'cardio',
];

interface StructuredExerciseRow {
  id: string;
  exerciseName: string;
  muscleGroup: MuscleGroup;
  exerciseType: ExerciseMechanicsType;
  sets: number;
  reps: number;
  weightKg: number;
  rpe: number;
}

export const HealthView: React.FC<HealthViewProps> = ({
  subPage = 'measurements',
  onSubPageChange,
}) => {
  const {
    user,
    profile,
    healthLogs,
    events,
    tasks,
    todayDate,
    currentTimeStr,
    personalRecords,
    trainingLoadLogs,
    recoveryLogs,
    workoutSchedules,
    weeklyFitnessReports,
    targetWeightKg,
    prCelebrationBanner,
    createHealthLog,
    deleteHealthLog,
    updateProfileSettings,
    logWorkoutWithExercises,
    logRecoveryCheckIn,
    deleteRecoveryLog,
    scheduleWorkoutSession,
    updateWorkoutScheduleStatus,
    deleteWorkoutSchedule,
    generateAndSaveWeeklyFitnessReport,
    deletePersonalRecord,
    setTargetWeightKg,
    dismissPrCelebrationBanner,
  } = useLifeOS();

  const [activeTab, setActiveTab] = useState<HealthTabId>(
    (subPage as HealthTabId) || 'measurements'
  );
  const [showLogModal, setShowLogModal] = useState(false);

  // Measurement Form
  const [weightKg, setWeightKg] = useState('');
  const [waistCm, setWaistCm] = useState('');
  const [chestCm, setChestCm] = useState('');
  const [targetWeightInput, setTargetWeightInput] = useState(
    targetWeightKg ? String(targetWeightKg) : ''
  );

  // Structured Workout Form (with per-exercise entries for PR & Training Load calculation)
  const [workoutTitle, setWorkoutTitle] = useState('');
  const [workoutMins, setWorkoutMins] = useState(50);
  const [workoutRpe, setWorkoutRpe] = useState(8);
  const [workoutNotes, setWorkoutNotes] = useState('');
  const [structuredExercises, setStructuredExercises] = useState<StructuredExerciseRow[]>([
    {
      id: 'ex-1',
      exerciseName: 'Barbell Bench Press',
      muscleGroup: 'Chest',
      exerciseType: 'compound',
      sets: 4,
      reps: 8,
      weightKg: 75,
      rpe: 8,
    },
  ]);

  // PR Tracker Filter State
  const [selectedPrMuscle, setSelectedPrMuscle] = useState<MuscleGroup | 'ALL'>('ALL');
  const [selectedPrExercise, setSelectedPrExercise] = useState<string>('');

  // Recovery Check-In Form State
  const [recSoreness, setRecSoreness] = useState(2);
  const [recFatigue, setRecFatigue] = useState(4);
  const [recSleepQuality, setRecSleepQuality] = useState(8);
  const [recSleepHours, setRecSleepHours] = useState(7.5);
  const [recEnergy, setRecEnergy] = useState(8);
  const [recSoreMuscles, setRecSoreMuscles] = useState<MuscleGroup[]>([]);
  const [recNotes, setRecNotes] = useState('');

  // Workout Calendar State
  const [calendarViewMode, setCalendarViewMode] = useState<'week' | 'month'>('week');
  const [schedTemplateId, setSchedTemplateId] = useState(WORKOUT_TEMPLATES[0].id);
  const [schedDate, setSchedDate] = useState(todayDate);
  const [schedStartTime, setSchedStartTime] = useState('18:00');
  const [schedDuration, setSchedDuration] = useState(60);
  const [schedCustomTitle, setSchedCustomTitle] = useState('');
  const [aiSlotSuggestionNote, setAiSlotSuggestionNote] = useState<string | null>(null);
  const [missedWorkoutNotice, setMissedWorkoutNotice] = useState<{
    workoutId: string;
    workoutTitle: string;
    suggestedDate: string;
    suggestedStartTime: string;
    suggestedEndTime: string;
    explanation: string;
  } | null>(null);

  // Meal Form
  const [mealTitle, setMealTitle] = useState('');
  const [mealCalories, setMealCalories] = useState(550);
  const [mealProtein, setMealProtein] = useState(40);
  const [mealCarbs, setMealCarbs] = useState(55);
  const [mealFat, setMealFat] = useState(16);

  // Weekly Coach Report Selection
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
  const [showCoreQuestions, setShowCoreQuestions] = useState(false);

  const switchTab = (tab: HealthTabId) => {
    setActiveTab(tab);
    if (onSubPageChange) onSubPageChange(tab);
  };

  const measurements = useMemo(
    () =>
      healthLogs
        .filter((h) => h.logType === 'measurement')
        .sort((a, b) => a.date.localeCompare(b.date)),
    [healthLogs]
  );

  const workouts = useMemo(
    () =>
      healthLogs
        .filter((h) => h.logType === 'workout')
        .sort((a, b) => b.date.localeCompare(a.date)),
    [healthLogs]
  );

  const meals = useMemo(
    () =>
      healthLogs
        .filter((h) => h.logType === 'meal')
        .sort((a, b) => b.date.localeCompare(a.date)),
    [healthLogs]
  );

  const todayMeals = meals.filter((m) => m.date === todayDate);
  const todayCalories = todayMeals.reduce((acc, m) => acc + (m.calories || 0), 0);
  const todayProtein = todayMeals.reduce((acc, m) => acc + (m.proteinGrams || 0), 0);
  const todayCarbs = todayMeals.reduce((acc, m) => acc + (m.carbsGrams || 0), 0);
  const todayFat = todayMeals.reduce((acc, m) => acc + (m.fatGrams || 0), 0);

  const latestMeasurement = measurements[measurements.length - 1] || null;
  const baseCalorieTarget = profile?.calorieTarget || 2350;
  const baseProteinTarget = profile?.proteinTargetGrams || 165;
  const waterTargetMl = profile?.waterTargetMl || 3000;
  const waterLoggedMl = profile?.waterLoggedTodayMl || 0;
  const waterGlasses = Math.min(8, Math.round(waterLoggedMl / 375));

  // Compute Weekly Training Load & Recovery Intelligence + Nutrition Adjustment
  const loadRecoverySummary = useMemo(
    () =>
      analyzeWeeklyTrainingLoadAndRecovery({
        trainingLoadLogs,
        recoveryLogs,
        todayDate,
        baseCalorieTarget,
        baseProteinTarget,
        latestWeightKg: latestMeasurement?.weightKg,
      }),
    [
      trainingLoadLogs,
      recoveryLogs,
      todayDate,
      baseCalorieTarget,
      baseProteinTarget,
      latestMeasurement,
    ]
  );

  // Compute Smart Weight Trend Analysis (7-day rolling avg, plateau & short-term spike detection)
  const weightTrendAnalysis = useMemo(
    () =>
      computeWeightTrendSnapshots({
        measurements,
        targetWeightKg,
        ownerId: user?.uid || 'local_user',
        workoutsThisWeek: loadRecoverySummary.workoutsThisWeek,
      }),
    [measurements, targetWeightKg, user?.uid, loadRecoverySummary.workoutsThisWeek]
  );

  const weightTrendSnapshots = weightTrendAnalysis.snapshots;
  const latestWeightSnapshot = weightTrendAnalysis.latestSnapshot;

  // Live Weekly Coach Report Preview (or saved report)
  const liveOrSavedReport = useMemo(() => {
    if (selectedReportId) {
      const found = weeklyFitnessReports.find((r) => r.id === selectedReportId);
      if (found) return found;
    }
    if (weeklyFitnessReports.length > 0) {
      return weeklyFitnessReports[0];
    }
    return generateWeeklyFitnessCoachReport({
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
      baseCalorieTarget,
      baseProteinTarget,
    });
  }, [
    selectedReportId,
    weeklyFitnessReports,
    user?.uid,
    todayDate,
    measurements,
    workouts,
    meals,
    personalRecords,
    trainingLoadLogs,
    recoveryLogs,
    workoutSchedules,
    targetWeightKg,
    baseCalorieTarget,
    baseProteinTarget,
  ]);

  // Evaluate the 5 Core Fitness Questions (Part H)
  const fiveCoreQuestionsList = useMemo(() => {
    const summary = evaluateFiveCoreFitnessQuestions({
      latestWeightSnapshot,
      personalRecords,
      loadSummary: loadRecoverySummary,
      latestReport: liveOrSavedReport,
    });
    return [
      summary.q1BodyProgress,
      summary.q2GettingStronger,
      summary.q3TrainingLoadAppropriate,
      summary.q4EatingAccordingToNeeds,
      summary.q5ImproveNextWeek,
    ];
  }, [latestWeightSnapshot, personalRecords, loadRecoverySummary, liveOrSavedReport]);

  // Filtered Personal Records
  const filteredPRs = useMemo(() => {
    const list =
      selectedPrMuscle === 'ALL'
        ? personalRecords
        : personalRecords.filter((pr) => pr.muscleGroup === selectedPrMuscle);
    return [...list].sort((a, b) => b.bestEstimated1RM - a.bestEstimated1RM);
  }, [personalRecords, selectedPrMuscle]);

  // Active PR for Strength Progression Chart
  const activePrRecord = useMemo(() => {
    if (selectedPrExercise) {
      const found = personalRecords.find((p) => p.exerciseName === selectedPrExercise);
      if (found) return found;
    }
    return filteredPRs[0] || null;
  }, [personalRecords, selectedPrExercise, filteredPRs]);

  const strengthProgressionData = useMemo(() => {
    if (!activePrRecord) return [];
    const points = [
      ...activePrRecord.previousRecords.map((prev) => ({
        date: prev.date,
        weightKg: prev.weightKg,
        estimated1RM: prev.estimated1RM,
        reps: prev.reps,
        label: prev.isActualTested1RM ? 'Actual 1RM' : 'Est. 1RM',
      })),
    ];
    if (
      points.length === 0 ||
      points[points.length - 1].date !== activePrRecord.achievedDate ||
      points[points.length - 1].estimated1RM !== activePrRecord.bestEstimated1RM
    ) {
      points.push({
        date: activePrRecord.achievedDate,
        weightKg: activePrRecord.maxWeightKg,
        estimated1RM: activePrRecord.bestEstimated1RM,
        reps: activePrRecord.maxReps,
        label: activePrRecord.isActualTested1RM ? 'Actual 1RM' : 'Est. 1RM',
      });
    }
    return points.sort((a, b) => a.date.localeCompare(b.date));
  }, [activePrRecord]);

  // Muscle Group Set Distribution Chart Data
  const muscleSetChartData = useMemo(() => {
    return MUSCLE_GROUPS.map((mg) => ({
      muscle: mg,
      sets: loadRecoverySummary.setsPerMuscleGroup[mg] || 0,
    }));
  }, [loadRecoverySummary]);

  // Handlers
  const handleLogMeasurement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!weightKg) return;
    await createHealthLog({
      logType: 'measurement',
      date: todayDate,
      title: `Body Measurement (${weightKg} kg)`,
      weightKg: Number(weightKg),
      waistCm: waistCm ? Number(waistCm) : undefined,
      chestCm: chestCm ? Number(chestCm) : undefined,
    });
    if (targetWeightInput && !Number.isNaN(Number(targetWeightInput))) {
      await setTargetWeightKg(Number(targetWeightInput));
    }
    setWeightKg('');
    setWaistCm('');
    setChestCm('');
    setShowLogModal(false);
  };

  const handleSaveTargetWeight = async () => {
    if (!targetWeightInput) return;
    const parsed = Number(targetWeightInput);
    if (!Number.isNaN(parsed) && parsed > 25 && parsed < 300) {
      await setTargetWeightKg(parsed);
    }
  };

  const handleApplyWorkoutTemplate = (templateId: string) => {
    const tpl = WORKOUT_TEMPLATES.find((t) => t.id === templateId);
    if (!tpl) return;
    setWorkoutTitle(tpl.name);
    setWorkoutMins(tpl.defaultDurationMinutes);
    setStructuredExercises(
      tpl.exercises.map((ex, idx) => ({
        id: `tpl-ex-${idx}-${Date.now()}`,
        exerciseName: ex.exerciseName,
        muscleGroup: ex.muscleGroup,
        exerciseType: ex.exerciseType,
        sets: ex.sets,
        reps: ex.reps,
        weightKg: ex.weightKg,
        rpe: ex.rpe || 8,
      }))
    );
  };

  const handleAddExerciseRow = () => {
    setStructuredExercises((prev) => [
      ...prev,
      {
        id: `ex-${Date.now()}-${prev.length}`,
        exerciseName: '',
        muscleGroup: 'Chest',
        exerciseType: 'compound',
        sets: 3,
        reps: 10,
        weightKg: 40,
        rpe: 8,
      },
    ]);
  };

  const handleRemoveExerciseRow = (id: string) => {
    setStructuredExercises((prev) => prev.filter((item) => item.id !== id));
  };

  const handleUpdateExerciseRow = (
    id: string,
    field: keyof StructuredExerciseRow,
    value: string | number
  ) => {
    setStructuredExercises((prev) =>
      prev.map((row) => (row.id === id ? { ...row, [field]: value } : row))
    );
  };

  const handleLogStructuredWorkout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!workoutTitle.trim()) return;

    const validExercises: WorkoutExerciseEntry[] = structuredExercises
      .filter((ex) => ex.exerciseName.trim().length > 0)
      .map((ex) => {
        const calc = calculateExercise1RM(
          Number(ex.weightKg) || 0,
          Number(ex.reps) || 1,
          ex.exerciseType
        );
        return {
          exerciseName: ex.exerciseName.trim(),
          muscleGroup: ex.muscleGroup,
          exerciseType: ex.exerciseType,
          sets: Math.max(1, Number(ex.sets) || 1),
          reps: Math.max(1, Number(ex.reps) || 1),
          weightKg: Math.max(0, Number(ex.weightKg) || 0),
          rpe: Math.min(10, Math.max(1, Number(ex.rpe) || workoutRpe)),
          isActualTested1RM: calc.isActualTested1RM,
          estimated1RM: calc.estimated1RM,
        };
      });

    await logWorkoutWithExercises({
      title: workoutTitle.trim(),
      date: todayDate,
      durationMinutes: workoutMins,
      rpe: workoutRpe,
      exercises: validExercises,
      notes: workoutNotes.trim() || undefined,
    });

    setWorkoutTitle('');
    setWorkoutNotes('');
  };

  const handleLogRecovery = async (e: React.FormEvent) => {
    e.preventDefault();
    // Calculate 0-100 general recovery score from sleep quality, energy, soreness, and fatigue
    const computedScore = Math.max(
      10,
      Math.min(
        100,
        Math.round(
          recSleepQuality * 4.5 +
            recEnergy * 4.0 +
            (6 - recSoreness) * 1.5 +
            (11 - recFatigue) * 1.5
        )
      )
    );
    await logRecoveryCheckIn({
      date: todayDate,
      muscleSoreness: recSoreness,
      fatigueLevel: recFatigue,
      sleepQuality: recSleepQuality,
      sleepHours: recSleepHours,
      energyLevel: recEnergy,
      generalRecoveryScore: computedScore,
      soreMuscleGroups: recSoreMuscles,
      notes: recNotes.trim() || undefined,
    });
    setRecNotes('');
  };

  const toggleSoreMuscle = (mg: MuscleGroup) => {
    setRecSoreMuscles((prev) =>
      prev.includes(mg) ? prev.filter((m) => m !== mg) : [...prev, mg]
    );
  };

  const handleSuggestOptimalWorkoutTime = () => {
    const suggestion = suggestOptimalWorkoutSlot({
      targetDate: schedDate,
      todayDate,
      currentTimeStr,
      durationMinutes: schedDuration,
      existingEvents: events,
      tasks,
      workoutSchedules,
      recoveryLogs,
    });
    setSchedDate(suggestion.date);
    setSchedStartTime(suggestion.startTime);
    setAiSlotSuggestionNote(
      `${suggestion.date} · ${suggestion.startTime}–${suggestion.endTime}: ${suggestion.reason}`
    );
  };

  const handleScheduleWorkoutSubmit = async (
    e: React.FormEvent,
    overrideStatus: WorkoutScheduleStatus = 'planned'
  ) => {
    e.preventDefault();
    const tpl = WORKOUT_TEMPLATES.find((t) => t.id === schedTemplateId) || WORKOUT_TEMPLATES[0];
    const [sh, sm] = schedStartTime.split(':').map(Number);
    const totalEndMins = (sh || 18) * 60 + (sm || 0) + (schedDuration || 60);
    const endH = Math.min(23, Math.floor(totalEndMins / 60));
    const endM = totalEndMins % 60;
    const endTimeStr = `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`;

    await scheduleWorkoutSession({
      date: schedDate,
      startTime: schedStartTime,
      endTime: endTimeStr,
      templateId: tpl.id,
      templateName:
        overrideStatus === 'rest_day'
          ? 'Scheduled Active Recovery / Rest Day'
          : schedCustomTitle.trim() || tpl.name,
      targetMuscleGroups: overrideStatus === 'rest_day' ? [] : tpl.targetMuscleGroups,
      plannedDurationMinutes: schedDuration || tpl.defaultDurationMinutes,
      plannedExercises: overrideStatus === 'rest_day' ? [] : tpl.exercises,
      status: overrideStatus,
      notes: aiSlotSuggestionNote || undefined,
    });
    setSchedCustomTitle('');
    setAiSlotSuggestionNote(null);
  };

  const handleMarkWorkoutMissed = async (workoutId: string) => {
    await updateWorkoutScheduleStatus(workoutId, 'missed');
    const target = workoutSchedules.find((w) => w.id === workoutId);
    if (target) {
      const adjustment = suggestMissedWorkoutAdjustment({
        missedWorkout: { ...target, status: 'missed' },
        allSchedules: workoutSchedules,
        existingEvents: events,
        recoveryLogs,
        tasks,
        todayDate,
        currentTimeStr,
      });
      setMissedWorkoutNotice({
        workoutId: target.id,
        workoutTitle: target.templateName,
        suggestedDate: adjustment.suggestedDate,
        suggestedStartTime: adjustment.suggestedStartTime,
        suggestedEndTime: adjustment.suggestedEndTime,
        explanation: adjustment.explanation,
      });
    }
  };

  const handleApplyMissedReschedule = async () => {
    if (!missedWorkoutNotice) return;
    await updateWorkoutScheduleStatus(missedWorkoutNotice.workoutId, 'planned', {
      date: missedWorkoutNotice.suggestedDate,
      startTime: missedWorkoutNotice.suggestedStartTime,
      endTime: missedWorkoutNotice.suggestedEndTime,
    });
    setMissedWorkoutNotice(null);
  };

  const handleLogMeal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mealTitle.trim()) return;
    await createHealthLog({
      logType: 'meal',
      date: todayDate,
      title: mealTitle.trim(),
      calories: mealCalories,
      proteinGrams: mealProtein,
      carbsGrams: mealCarbs,
      fatGrams: mealFat,
    });
    setMealTitle('');
  };

  const handleSetWaterMl = async (newMl: number) => {
    const clamped = Math.max(0, Math.min(15000, Math.round(newMl)));
    await updateProfileSettings({ waterLoggedTodayMl: clamped });
  };

  // Calendar days generator for Workout Calendar (7-day week or 28-day month window around todayDate)
  const calendarDays = useMemo(() => {
    const base = new Date(`${todayDate}T00:00:00Z`);
    const count = calendarViewMode === 'week' ? 7 : 28;
    const startOffset = calendarViewMode === 'week' ? -2 : -7;
    const days: {
      dateStr: string;
      dayLabel: string;
      isToday: boolean;
      scheduled: typeof workoutSchedules;
    }[] = [];

    for (let i = startOffset; i < startOffset + count; i++) {
      const d = new Date(base.getTime() + i * 86400000);
      const dateStr = d.toISOString().split('T')[0];
      const dayLabel = d.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        timeZone: 'UTC',
      });
      days.push({
        dateStr,
        dayLabel,
        isToday: dateStr === todayDate,
        scheduled: workoutSchedules.filter((ws) => ws.date === dateStr),
      });
    }
    return days;
  }, [todayDate, calendarViewMode, workoutSchedules]);

  // Workout Calendar consistency stats
  const workoutCalendarStats = useMemo(() => {
    const completedCount = workoutSchedules.filter((w) => w.status === 'completed').length;
    const plannedCount = workoutSchedules.filter((w) => w.status === 'planned').length;
    const missedCount = workoutSchedules.filter((w) => w.status === 'missed').length;
    const restCount = workoutSchedules.filter((w) => w.status === 'rest_day').length;
    const denom = completedCount + missedCount;
    const consistencyPct = denom > 0 ? Math.round((completedCount / denom) * 100) : 100;
    return { completedCount, plannedCount, missedCount, restCount, consistencyPct };
  }, [workoutSchedules]);

  const effectiveCalorieTarget =
    loadRecoverySummary.nutritionAdjustment.recommendedDailyCalories || baseCalorieTarget;
  const effectiveProteinTarget =
    loadRecoverySummary.nutritionAdjustment.recommendedProteinGrams || baseProteinTarget;

  return (
    <div className="space-y-5 pb-10">
      {/* PR CELEBRATION NOTIFICATION BANNER */}
      {prCelebrationBanner && prCelebrationBanner.length > 0 && (
        <div className="p-4 rounded-2xl bg-gradient-to-r from-[#222C27] via-[#2C3932] to-[#222C27] border-2 border-[#6EBF8B] shadow-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start sm:items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#6EBF8B]/20 text-[#6EBF8B] flex items-center justify-center shrink-0">
              <Trophy className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#6EBF8B]">
                  NEW PERSONAL RECORD ACHIEVED!
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#6EBF8B]/20 text-[#6EBF8B]">
                  +{prCelebrationBanner.length} PR{prCelebrationBanner.length > 1 ? 's' : ''}
                </span>
              </div>
              <div className="mt-1 space-y-0.5">
                {prCelebrationBanner.map((msg, idx) => (
                  <p key={idx} className="text-xs font-semibold text-[#E8EDE8]">
                    {msg}
                  </p>
                ))}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => switchTab('pr_tracker')}
              className="px-3.5 py-2 rounded-xl bg-[#6EBF8B] text-[#171E1B] text-xs font-semibold"
            >
              Open PR Dashboard
            </button>
            <button
              onClick={dismissPrCelebrationBanner}
              className="p-1.5 rounded-lg text-[#9AA79E] hover:text-[#E8EDE8]"
              title="Dismiss celebration"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Header & 8-Module Navigation */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold text-[#E8EDE8]">
              Health &amp; Fitness Intelligence Hub
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-[#9BB9A2]/20 text-[#9BB9A2]">
              Unified Ecosystem
            </span>
          </div>
          <p className="text-xs text-[#9AA79E] mt-1">
            {measurements.length} measurements · {workouts.length} workouts ·{' '}
            {personalRecords.length} exercise PRs · {recoveryLogs.length} recovery check-ins
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex flex-wrap items-center p-1 rounded-xl bg-[#222C27] border border-[#BDD3C1]/15 text-xs gap-1">
            {(
              [
                { id: 'measurements', label: 'Weight Trend', icon: Scale },
                { id: 'workouts', label: 'Workouts', icon: Dumbbell },
                { id: 'pr_tracker', label: 'PR Tracker', icon: Trophy },
                { id: 'training_load', label: 'Load & Recovery', icon: Activity },
                { id: 'workout_calendar', label: 'Workout Calendar', icon: Calendar },
                { id: 'nutrition', label: 'AI Nutrition', icon: Flame },
                { id: 'weekly_coach', label: 'Weekly AI Coach', icon: Brain },
                { id: 'sleep_water', label: 'Hydration', icon: Clock },
              ] as const
            ).map((t) => {
              const Icon = t.icon;
              return (
                <button
                  key={t.id}
                  onClick={() => switchTab(t.id)}
                  className={`px-2.5 py-1.5 rounded-lg font-medium transition-colors flex items-center gap-1.5 ${
                    activeTab === t.id
                      ? 'bg-[#9BB9A2] text-[#171E1B] font-semibold'
                      : 'text-[#9AA79E] hover:text-[#E8EDE8]'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{t.label}</span>
                </button>
              );
            })}
          </div>

          <button
            onClick={() => setShowLogModal(true)}
            className="px-3.5 py-2 rounded-xl bg-[#9BB9A2] hover:bg-[#a9c5b0] text-[#171E1B] text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" /> Log Weight
          </button>
        </div>
      </div>

      {/* PART H: THE 5 CORE FITNESS INTELLIGENCE QUESTIONS BAR (Progressive Disclosure) */}
      <div className="sage-card overflow-hidden border border-[#9BB9A2]/25">
        <button
          onClick={() => setShowCoreQuestions((prev) => !prev)}
          className="w-full px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-left hover:bg-[#2C3932]/40 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[#9BB9A2]" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-[#9BB9A2]">
              Live Fitness Intelligence · 5 Core Questions
            </h2>
            <span className="hidden md:inline text-[11px] text-[#9AA79E]">
              · Cross-module synthesis (Weight Trend + PRs + Training Load + Recovery + Nutrition)
            </span>
          </div>
          <span className="text-xs font-semibold text-[#9BB9A2]">
            {showCoreQuestions ? 'Hide 5 Questions ▲' : 'Show 5 Questions ▼'}
          </span>
        </button>

        {showCoreQuestions && (
          <div className="p-4 pt-2 border-t border-[#BDD3C1]/10 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-3">
            {fiveCoreQuestionsList.map((item, idx) => (
              <div
                key={idx}
                className="p-3 rounded-xl bg-[#171E1B]/90 border border-[#BDD3C1]/12 flex flex-col justify-between space-y-2"
              >
                <div className="space-y-1">
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-[10px] font-mono text-[#65756B]">Q{idx + 1}</span>
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold uppercase bg-[#9BB9A2]/20 text-[#9BB9A2] border border-[#9BB9A2]/30">
                      {item.status}
                    </span>
                  </div>
                  <p className="text-xs font-semibold text-[#E8EDE8] leading-snug">
                    {item.question}
                  </p>
                </div>
                <div className="pt-1 border-t border-[#BDD3C1]/10">
                  <p className="text-[10px] text-[#9AA79E] leading-relaxed">{item.answer}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Top 4 Live KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="sage-card p-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-[#9AA79E]">Body Weight &amp; 7d Avg</p>
            <Scale className="w-4 h-4 text-[#9BB9A2]" />
          </div>
          <p className="text-2xl font-bold text-[#E8EDE8] mt-1">
            {latestMeasurement?.weightKg ? `${latestMeasurement.weightKg} kg` : '—'}
          </p>
          <p className="text-xs text-[#9BB9A2] mt-1">
            {latestWeightSnapshot?.rolling7DayAvgKg !== null &&
            latestWeightSnapshot?.rolling7DayAvgKg !== undefined
              ? `7-Day Rolling Avg: ${latestWeightSnapshot.rolling7DayAvgKg} kg`
              : 'Log ≥2 weights in 7d for rolling avg'}
          </p>
        </div>

        <div className="sage-card p-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-[#9AA79E]">Personal Records (PRs)</p>
            <Trophy className="w-4 h-4 text-[#E5B567]" />
          </div>
          <p className="text-2xl font-bold text-[#E8EDE8] mt-1">{personalRecords.length}</p>
          <p className="text-xs text-[#9BB9A2] mt-1">
            {personalRecords[0]
              ? `Top: ${personalRecords[0].exerciseName} (${personalRecords[0].maxWeightKg}kg)`
              : 'Complete a workout to track PRs'}
          </p>
        </div>

        <div className="sage-card p-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-[#9AA79E]">Weekly Training Load</p>
            <Activity className="w-4 h-4 text-[#6EBF8B]" />
          </div>
          <p className="text-2xl font-bold text-[#E8EDE8] mt-1">
            {loadRecoverySummary.totalWeeklyVolumeKg.toLocaleString()} kg
          </p>
          <p className="text-xs text-[#9BB9A2] mt-1">
            {loadRecoverySummary.workoutsThisWeek} sessions ·{' '}
            {loadRecoverySummary.totalWeeklySets} sets ·{' '}
            {loadRecoverySummary.loadStatus.replace('_', ' ')}
          </p>
        </div>

        <div className="sage-card p-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-[#9AA79E]">Training-Linked Nutrition</p>
            <Flame className="w-4 h-4 text-[#D97777]" />
          </div>
          <p className="text-2xl font-bold text-[#E8EDE8] mt-1">
            {todayCalories} / {effectiveCalorieTarget}
          </p>
          <p className="text-xs text-[#9BB9A2] mt-1">
            kcal · {todayProtein}g / {effectiveProteinTarget}g protein
          </p>
        </div>
      </div>

      {/* =====================================================================
          TAB 1: SMART WEIGHT TREND ANALYSIS (SECTION 14.C)
         ===================================================================== */}
      {activeTab === 'measurements' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            {/* Left 8-Col: Dual-Line Weight Chart (Actual vs Rolling 7-Day Average) */}
            <div className="lg:col-span-8 sage-card p-5 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h2 className="text-sm font-semibold text-[#E8EDE8]">
                    Smart Body Weight Trend · Actual vs. Rolling 7-Day Average
                  </h2>
                  <p className="text-xs text-[#9AA79E]">
                    Evaluates diet effectiveness using moving averages rather than isolated
                    single-day spikes
                  </p>
                </div>
                <button
                  onClick={() => setShowLogModal(true)}
                  className="px-3 py-1.5 rounded-xl bg-[#9BB9A2] text-[#171E1B] text-xs font-semibold shrink-0"
                >
                  + Log Weight Entry
                </button>
              </div>

              {weightTrendSnapshots.length > 0 ? (
                <>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={weightTrendSnapshots}>
                        <CartesianGrid
                          strokeDasharray="3 3"
                          stroke="rgba(189,211,193,0.08)"
                          vertical={false}
                        />
                        <XAxis
                          dataKey="date"
                          axisLine={false}
                          tickLine={false}
                          tick={{ fill: '#65756B', fontSize: 11 }}
                        />
                        <YAxis
                          domain={['auto', 'auto']}
                          axisLine={false}
                          tickLine={false}
                          tick={{ fill: '#65756B', fontSize: 11 }}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: '#171E1B',
                            borderColor: 'rgba(189,211,193,0.25)',
                            borderRadius: '10px',
                            fontSize: '12px',
                          }}
                        />
                        <Legend wrapperStyle={{ fontSize: '11px' }} />
                        <Line
                          type="monotone"
                          dataKey="actualWeightKg"
                          stroke="#9AA79E"
                          strokeWidth={1.75}
                          strokeDasharray="4 4"
                          dot={{ r: 3, fill: '#9AA79E' }}
                          name="Actual Daily Weight (kg)"
                        />
                        <Line
                          type="monotone"
                          dataKey="rolling7DayAvgKg"
                          stroke="#6EBF8B"
                          strokeWidth={3}
                          connectNulls
                          dot={{ r: 4, fill: '#6EBF8B' }}
                          name="Rolling 7-Day Average (kg)"
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Plateau or Short-Term Fluctuation Intelligence Banner */}
                  {latestWeightSnapshot && (
                    <div
                      className={`p-3.5 rounded-xl border text-xs space-y-1 ${
                        latestWeightSnapshot.isShortTermFluctuation
                          ? 'bg-[#E5B567]/12 border-[#E5B567]/40 text-[#E8EDE8]'
                          : latestWeightSnapshot.isPlateauDetected
                          ? 'bg-[#D97777]/12 border-[#D97777]/40 text-[#E8EDE8]'
                          : 'bg-[#2C3932]/70 border-[#BDD3C1]/20 text-[#E8EDE8]'
                      }`}
                    >
                      <div className="flex items-center gap-2 font-semibold">
                        <TrendingUp className="w-4 h-4 text-[#9BB9A2]" />
                        <span>
                          {latestWeightSnapshot.isShortTermFluctuation
                            ? 'Short-Term Water/Glycogen Fluctuation Detected (Rolling Average Stable)'
                            : latestWeightSnapshot.isPlateauDetected
                            ? 'Multi-Week Weight Plateau Detected'
                            : 'Smart Weight Trend Analysis'}
                        </span>
                      </div>
                      <p className="text-[#9AA79E] leading-relaxed">
                        {latestWeightSnapshot.explanation}
                      </p>
                      <p className="text-[#9BB9A2] font-medium pt-1">
                        Biweekly AI Diet Assessment:{' '}
                        {latestWeightSnapshot.biweeklyNutritionRecommendation}
                      </p>
                    </div>
                  )}

                  {/* Measurement History Table with Rolling Avg */}
                  <div className="overflow-x-auto pt-2 border-t border-[#BDD3C1]/10">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="text-[10px] uppercase tracking-wider text-[#65756B] border-b border-[#BDD3C1]/10">
                          <th className="py-2">Date</th>
                          <th className="py-2">Actual Weight</th>
                          <th className="py-2">7-Day Rolling Avg</th>
                          <th className="py-2">Weekly Change</th>
                          <th className="py-2">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#BDD3C1]/8">
                        {measurements
                          .slice()
                          .reverse()
                          .map((row) => {
                            const snap = weightTrendSnapshots.find((s) => s.date === row.date);
                            return (
                              <tr key={row.id}>
                                <td className="py-2.5 font-medium text-[#E8EDE8]">{row.date}</td>
                                <td className="py-2.5 text-[#E8EDE8] font-semibold">
                                  {row.weightKg ? `${row.weightKg} kg` : '—'}
                                </td>
                                <td className="py-2.5 text-[#6EBF8B] font-semibold">
                                  {snap?.rolling7DayAvgKg !== null &&
                                  snap?.rolling7DayAvgKg !== undefined
                                    ? `${snap.rolling7DayAvgKg} kg`
                                    : 'Insufficient 7d pts'}
                                </td>
                                <td className="py-2.5 text-[#9AA79E]">
                                  {snap?.weeklyChangeKg !== null &&
                                  snap?.weeklyChangeKg !== undefined
                                    ? `${snap.weeklyChangeKg > 0 ? '+' : ''}${snap.weeklyChangeKg} kg/wk`
                                    : '—'}
                                </td>
                                <td className="py-2.5">
                                  <button
                                    onClick={() => deleteHealthLog(row.id)}
                                    className="text-[#65756B] hover:text-[#D97A6C]"
                                  >
                                    <Trash2 className="w-3.5 h-3.5 inline" />
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                      </tbody>
                    </table>
                  </div>
                </>
              ) : (
                <div className="py-12 text-center space-y-2">
                  <p className="text-xs text-[#9AA79E]">
                    No body weight measurements logged yet. Start logging to unlock rolling 7-day
                    trend analysis.
                  </p>
                  <button
                    onClick={() => setShowLogModal(true)}
                    className="px-4 py-2 rounded-xl bg-[#9BB9A2] text-[#171E1B] text-xs font-semibold"
                  >
                    + Log First Weight
                  </button>
                </div>
              )}
            </div>

            {/* Right 4-Col: Target Weight Progress, Weekly vs Monthly Comparison */}
            <div className="lg:col-span-4 space-y-4">
              <div className="sage-card p-5 space-y-3">
                <h3 className="text-sm font-semibold text-[#E8EDE8]">
                  Goal Weight &amp; Progress Tracker
                </h3>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    step="0.1"
                    value={targetWeightInput}
                    onChange={(e) => setTargetWeightInput(e.target.value)}
                    placeholder="Target weight (e.g. 72.0 kg)"
                    className="flex-1 sage-input px-3 py-2 text-xs"
                  />
                  <button
                    onClick={handleSaveTargetWeight}
                    className="px-3.5 py-2 rounded-xl bg-[#9BB9A2] text-[#171E1B] text-xs font-semibold"
                  >
                    Save Goal
                  </button>
                </div>

                {targetWeightKg && latestWeightSnapshot ? (
                  <div className="p-3.5 rounded-xl bg-[#171E1B] border border-[#BDD3C1]/15 space-y-2">
                    <div className="flex justify-between text-xs">
                      <span className="text-[#9AA79E]">Current (7d Avg / Actual)</span>
                      <span className="font-bold text-[#E8EDE8]">
                        {latestWeightSnapshot.rolling7DayAvgKg ??
                          latestWeightSnapshot.actualWeightKg}{' '}
                        kg
                      </span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-[#9AA79E]">Target Weight</span>
                      <span className="font-bold text-[#6EBF8B]">{targetWeightKg} kg</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-[#9AA79E]">Remaining Distance</span>
                      <span className="font-semibold text-[#9BB9A2]">
                        {Math.abs(
                          (latestWeightSnapshot.rolling7DayAvgKg ??
                            latestWeightSnapshot.actualWeightKg) - targetWeightKg
                        ).toFixed(1)}{' '}
                        kg to goal
                      </span>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-[#9AA79E]">
                    Set a target weight above to track your distance to goal.
                  </p>
                )}
              </div>

              <div className="sage-card p-5 space-y-3">
                <h3 className="text-sm font-semibold text-[#E8EDE8]">
                  Weekly &amp; Monthly Trend Comparison
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-xl bg-[#171E1B] border border-[#BDD3C1]/12">
                    <p className="text-[10px] uppercase text-[#65756B]">Weekly Change</p>
                    <p className="text-base font-bold text-[#E8EDE8] mt-1">
                      {latestWeightSnapshot?.weeklyChangeKg !== null &&
                      latestWeightSnapshot?.weeklyChangeKg !== undefined
                        ? `${latestWeightSnapshot.weeklyChangeKg > 0 ? '+' : ''}${latestWeightSnapshot.weeklyChangeKg} kg`
                        : '—'}
                    </p>
                    <p className="text-[10px] text-[#9AA79E] mt-0.5">vs 7 days ago</p>
                  </div>
                  <div className="p-3 rounded-xl bg-[#171E1B] border border-[#BDD3C1]/12">
                    <p className="text-[10px] uppercase text-[#65756B]">Monthly Change</p>
                    <p className="text-base font-bold text-[#E8EDE8] mt-1">
                      {latestWeightSnapshot?.monthlyChangeKg !== null &&
                      latestWeightSnapshot?.monthlyChangeKg !== undefined
                        ? `${latestWeightSnapshot.monthlyChangeKg > 0 ? '+' : ''}${latestWeightSnapshot.monthlyChangeKg} kg`
                        : '—'}
                    </p>
                    <p className="text-[10px] text-[#9AA79E] mt-0.5">vs 28 days ago</p>
                  </div>
                </div>
                <p className="text-[11px] text-[#9AA79E] leading-relaxed">
                  Note: Rolling 7-day averages require at least 2 measurements within a 7-day
                  window. Single-day spikes are never used to slash calories prematurely.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          TAB 2: WORKOUT CENTER & STRUCTURED EXERCISE LOGGER
         ===================================================================== */}
      {activeTab === 'workouts' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Left 7-Col: Structured Multi-Exercise Logger (Powers PR Tracker + Training Load) */}
          <div className="lg:col-span-7 sage-card p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h2 className="text-sm font-semibold text-[#E8EDE8]">
                  Log Structured Workout Session
                </h2>
                <p className="text-xs text-[#9AA79E]">
                  Automatically detects Personal Records (Actual 1RM vs Estimated 1RM) and updates
                  Muscle Group Training Load
                </p>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {WORKOUT_TEMPLATES.map((tpl) => (
                  <button
                    key={tpl.id}
                    type="button"
                    onClick={() => handleApplyWorkoutTemplate(tpl.id)}
                    className="px-2.5 py-1 rounded-lg bg-[#2C3932] hover:bg-[#37473F] text-[11px] text-[#9BB9A2] font-medium"
                  >
                    {tpl.name.split(' ')[0]} {tpl.name.split(' ')[1]}
                  </button>
                ))}
              </div>
            </div>

            <form onSubmit={handleLogStructuredWorkout} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-[10px] text-[#9AA79E] mb-1">
                    Session Title
                  </label>
                  <input
                    type="text"
                    required
                    value={workoutTitle}
                    onChange={(e) => setWorkoutTitle(e.target.value)}
                    placeholder="e.g. Push Day (Chest, Shoulders & Triceps)"
                    className="w-full sage-input px-3 py-2 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-[#9AA79E] mb-1">
                    Duration (mins)
                  </label>
                  <input
                    type="number"
                    min={5}
                    value={workoutMins}
                    onChange={(e) => setWorkoutMins(Number(e.target.value))}
                    className="w-full sage-input px-3 py-2 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-[#9AA79E] mb-1">
                    Session RPE (1–10)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={10}
                    value={workoutRpe}
                    onChange={(e) => setWorkoutRpe(Number(e.target.value))}
                    className="w-full sage-input px-3 py-2 text-xs"
                  />
                </div>
              </div>

              {/* Exercise Rows */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-[#E8EDE8]">
                    Exercises ({structuredExercises.length})
                  </span>
                  <button
                    type="button"
                    onClick={handleAddExerciseRow}
                    className="text-xs text-[#9BB9A2] hover:underline flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Exercise
                  </button>
                </div>

                {structuredExercises.map((ex) => {
                  const preview1RM = calculateExercise1RM(
                    Number(ex.weightKg) || 0,
                    Number(ex.reps) || 1,
                    ex.exerciseType
                  );
                  return (
                    <div
                      key={ex.id}
                      className="p-3 rounded-xl bg-[#171E1B] border border-[#BDD3C1]/12 space-y-2"
                    >
                      <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center">
                        <div className="sm:col-span-4">
                          <label className="block text-[9px] text-[#65756B]">Exercise Name</label>
                          <input
                            type="text"
                            required
                            value={ex.exerciseName}
                            onChange={(e) =>
                              handleUpdateExerciseRow(ex.id, 'exerciseName', e.target.value)
                            }
                            placeholder="Barbell Bench Press"
                            className="w-full sage-input px-2.5 py-1.5 text-xs"
                          />
                        </div>
                        <div className="sm:col-span-2">
                          <label className="block text-[9px] text-[#65756B]">Muscle</label>
                          <select
                            value={ex.muscleGroup}
                            onChange={(e) =>
                              handleUpdateExerciseRow(
                                ex.id,
                                'muscleGroup',
                                e.target.value as MuscleGroup
                              )
                            }
                            className="w-full sage-input px-2 py-1.5 text-xs"
                          >
                            {MUSCLE_GROUPS.map((mg) => (
                              <option key={mg} value={mg}>
                                {mg}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="sm:col-span-2">
                          <label className="block text-[9px] text-[#65756B]">Type</label>
                          <select
                            value={ex.exerciseType}
                            onChange={(e) =>
                              handleUpdateExerciseRow(
                                ex.id,
                                'exerciseType',
                                e.target.value as ExerciseMechanicsType
                              )
                            }
                            className="w-full sage-input px-2 py-1.5 text-xs"
                          >
                            {EXERCISE_MECHANICS.map((t) => (
                              <option key={t} value={t}>
                                {t}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="sm:col-span-1">
                          <label className="block text-[9px] text-[#65756B]">Sets</label>
                          <input
                            type="number"
                            min={1}
                            value={ex.sets}
                            onChange={(e) =>
                              handleUpdateExerciseRow(ex.id, 'sets', Number(e.target.value))
                            }
                            className="w-full sage-input px-2 py-1.5 text-xs"
                          />
                        </div>
                        <div className="sm:col-span-1">
                          <label className="block text-[9px] text-[#65756B]">Reps</label>
                          <input
                            type="number"
                            min={1}
                            value={ex.reps}
                            onChange={(e) =>
                              handleUpdateExerciseRow(ex.id, 'reps', Number(e.target.value))
                            }
                            className="w-full sage-input px-2 py-1.5 text-xs"
                          />
                        </div>
                        <div className="sm:col-span-2 flex items-end gap-1">
                          <div className="flex-1">
                            <label className="block text-[9px] text-[#65756B]">Weight (kg)</label>
                            <input
                              type="number"
                              step="0.5"
                              min={0}
                              value={ex.weightKg}
                              onChange={(e) =>
                                handleUpdateExerciseRow(ex.id, 'weightKg', Number(e.target.value))
                              }
                              className="w-full sage-input px-2 py-1.5 text-xs"
                            />
                          </div>
                          {structuredExercises.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveExerciseRow(ex.id)}
                              className="p-1.5 text-[#65756B] hover:text-[#D97A6C]"
                              title="Remove exercise"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-[10px] text-[#9AA79E] pt-1 border-t border-[#BDD3C1]/8">
                        <span>
                          Volume: {ex.sets * ex.reps * (ex.weightKg || 0)} kg ({ex.sets}×{ex.reps}{' '}
                          @ {ex.weightKg}kg)
                        </span>
                        <span className="text-[#9BB9A2] font-medium">
                          {preview1RM.isActualTested1RM
                            ? `Actual Tested 1RM: ${preview1RM.actualTested1RM} kg`
                            : preview1RM.estimated1RM > 0
                            ? `Est. 1RM (Epley): ${preview1RM.estimated1RM} kg`
                            : 'Bodyweight / Unweighted'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              <button
                type="submit"
                className="w-full py-2.5 rounded-xl bg-[#9BB9A2] hover:bg-[#a9c5b0] text-[#171E1B] text-xs font-semibold"
              >
                Complete &amp; Log Workout (+40 XP · Auto-Detect PRs &amp; Update Training Load)
              </button>
            </form>
          </div>

          {/* Right 5-Col: Recent Workouts & Volume Log */}
          <div className="lg:col-span-5 sage-card p-5 space-y-4">
            <h2 className="text-sm font-semibold text-[#E8EDE8]">
              Completed Workout Sessions ({workouts.length})
            </h2>
            {workouts.length > 0 ? (
              <div className="space-y-2.5 max-h-[540px] overflow-y-auto pr-1">
                {workouts.map((w) => (
                  <div
                    key={w.id}
                    className="p-3.5 rounded-xl bg-[#2C3932]/75 border border-[#BDD3C1]/12 space-y-1.5 text-xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-[#E8EDE8]">{w.title}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] text-[#9BB9A2] font-mono">{w.date}</span>
                        <button
                          onClick={() => deleteHealthLog(w.id)}
                          className="text-[#65756B] hover:text-[#D97A6C]"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                    <p className="text-[11px] text-[#9AA79E]">
                      Duration: {w.durationMinutes || 45}m · Volume:{' '}
                      {(w.volumeKg || 0).toLocaleString()} kg · RPE {w.rpe || 8}
                    </p>
                    {w.exercisesSummary && (
                      <p className="text-[11px] text-[#9BB9A2] leading-relaxed">
                        {w.exercisesSummary}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-[#9AA79E] py-8 text-center">
                No completed workouts logged yet. Choose a template on the left and log your
                session!
              </p>
            )}
          </div>
        </div>
      )}

      {/* =====================================================================
          TAB 3: PERSONAL RECORDS DASHBOARD (SECTION 14.A)
         ===================================================================== */}
      {activeTab === 'pr_tracker' && (
        <div className="space-y-4">
          {/* Muscle Group Filter Bar */}
          <div className="sage-card p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold text-[#E8EDE8] flex items-center gap-2">
                <Trophy className="w-4 h-4 text-[#E5B567]" />
                Personal Records (PR) &amp; Strength Progression Dashboard
              </h2>
              <p className="text-xs text-[#9AA79E]">
                Strictly distinguishes Actual Tested 1RM (single-rep max lift) from Estimated 1RM
                (Epley formula for multi-rep sets)
              </p>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {(['ALL', ...MUSCLE_GROUPS] as const).map((mg) => (
                <button
                  key={mg}
                  onClick={() => setSelectedPrMuscle(mg)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                    selectedPrMuscle === mg
                      ? 'bg-[#9BB9A2] text-[#171E1B] font-semibold'
                      : 'bg-[#2C3932] text-[#9AA79E] hover:text-[#E8EDE8]'
                  }`}
                >
                  {mg}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            {/* Left 7-Col: PR Cards Grid */}
            <div className="lg:col-span-7 space-y-3">
              {filteredPRs.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {filteredPRs.map((pr) => {
                    const isSelected = activePrRecord?.id === pr.id;
                    return (
                      <div
                        key={pr.id}
                        onClick={() => setSelectedPrExercise(pr.exerciseName)}
                        className={`sage-card p-4 cursor-pointer transition-all space-y-3 border ${
                          isSelected
                            ? 'border-[#9BB9A2] bg-[#222C27]'
                            : 'border-[#BDD3C1]/12 hover:border-[#9BB9A2]/40'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-[#9BB9A2]/15 text-[#9BB9A2]">
                              {pr.muscleGroup} · {pr.exerciseType}
                            </span>
                            <h3 className="text-sm font-bold text-[#E8EDE8] mt-1">
                              {pr.exerciseName}
                            </h3>
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              deletePersonalRecord(pr.id);
                            }}
                            className="text-[#65756B] hover:text-[#D97A6C]"
                            title="Delete PR record"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        <div className="grid grid-cols-3 gap-2 text-center">
                          <div className="p-2 rounded-xl bg-[#171E1B]">
                            <p className="text-[10px] text-[#65756B]">Max Weight</p>
                            <p className="text-sm font-bold text-[#E8EDE8]">{pr.maxWeightKg} kg</p>
                          </div>
                          <div className="p-2 rounded-xl bg-[#171E1B]">
                            <p className="text-[10px] text-[#65756B]">Max Reps</p>
                            <p className="text-sm font-bold text-[#E8EDE8]">{pr.maxReps}</p>
                          </div>
                          <div className="p-2 rounded-xl bg-[#171E1B]">
                            <p className="text-[10px] text-[#65756B]">
                              {pr.isActualTested1RM ? 'Actual 1RM' : 'Est. 1RM'}
                            </p>
                            <p className="text-sm font-bold text-[#6EBF8B]">
                              {pr.isActualTested1RM && pr.bestActualTested1RM
                                ? `${pr.bestActualTested1RM} kg`
                                : `${pr.bestEstimated1RM} kg`}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center justify-between text-[11px] pt-1 border-t border-[#BDD3C1]/10">
                          <span className="text-[#9AA79E]">
                            Best: {pr.bestPerformanceSummary}
                          </span>
                          <span
                            className={`px-1.5 py-0.5 rounded text-[9px] font-semibold ${
                              pr.isActualTested1RM
                                ? 'bg-[#6EBF8B]/20 text-[#6EBF8B]'
                                : 'bg-[#E5B567]/20 text-[#E5B567]'
                            }`}
                          >
                            {pr.isActualTested1RM ? 'Tested 1RM' : 'Estimated 1RM'}
                          </span>
                        </div>
                        <div className="text-[10px] text-[#65756B]">
                          Achieved {pr.achievedDate} · {pr.previousRecords.length} record point(s)
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="sage-card p-10 text-center space-y-3">
                  <Award className="w-8 h-8 text-[#9BB9A2] mx-auto" />
                  <p className="text-xs text-[#9AA79E]">
                    No Personal Records recorded for this filter yet. Log a structured workout in
                    the Workouts tab to automatically detect and celebrate your PRs!
                  </p>
                  <button
                    onClick={() => switchTab('workouts')}
                    className="px-4 py-2 rounded-xl bg-[#9BB9A2] text-[#171E1B] text-xs font-semibold"
                  >
                    Log Structured Workout
                  </button>
                </div>
              )}
            </div>

            {/* Right 5-Col: Strength Development Chart & Previous PR History */}
            <div className="lg:col-span-5 sage-card p-5 space-y-4">
              {activePrRecord ? (
                <>
                  <div>
                    <span className="text-[10px] uppercase tracking-wider text-[#9BB9A2] font-semibold">
                      Strength Progression Curve
                    </span>
                    <h3 className="text-base font-bold text-[#E8EDE8]">
                      {activePrRecord.exerciseName}
                    </h3>
                    <p className="text-xs text-[#9AA79E]">
                      {activePrRecord.bestActualTested1RM
                        ? `Actual Tested 1RM: ${activePrRecord.bestActualTested1RM} kg · `
                        : 'No single-rep 1RM tested yet · '}
                      Estimated 1RM (Epley): {activePrRecord.bestEstimated1RM} kg
                    </p>
                  </div>

                  <div className="h-52">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={strengthProgressionData}>
                        <CartesianGrid
                          strokeDasharray="3 3"
                          stroke="rgba(189,211,193,0.08)"
                          vertical={false}
                        />
                        <XAxis
                          dataKey="date"
                          axisLine={false}
                          tickLine={false}
                          tick={{ fill: '#65756B', fontSize: 11 }}
                        />
                        <YAxis
                          domain={['auto', 'auto']}
                          axisLine={false}
                          tickLine={false}
                          tick={{ fill: '#65756B', fontSize: 11 }}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: '#171E1B',
                            borderColor: 'rgba(189,211,193,0.2)',
                            borderRadius: '8px',
                            fontSize: '12px',
                          }}
                        />
                        <Legend wrapperStyle={{ fontSize: '11px' }} />
                        <Line
                          type="monotone"
                          dataKey="weightKg"
                          stroke="#9BB9A2"
                          strokeWidth={2}
                          dot={{ r: 3.5 }}
                          name="Max Weight Lifted (kg)"
                        />
                        <Line
                          type="monotone"
                          dataKey="estimated1RM"
                          stroke="#6EBF8B"
                          strokeWidth={2.5}
                          dot={{ r: 4 }}
                          name="Estimated / Tested 1RM (kg)"
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="space-y-2 pt-2 border-t border-[#BDD3C1]/10">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-[#65756B]">
                      RECORD PROGRESSION HISTORY
                    </p>
                    {strengthProgressionData
                      .slice()
                      .reverse()
                      .map((pt, i) => (
                        <div
                          key={i}
                          className="p-2.5 rounded-xl bg-[#171E1B] flex items-center justify-between text-xs"
                        >
                          <div>
                            <span className="font-semibold text-[#E8EDE8]">
                              {pt.weightKg} kg × {pt.reps} reps
                            </span>
                            <span className="text-[#9AA79E] ml-2">({pt.date})</span>
                          </div>
                          <span className="text-[#6EBF8B] font-semibold">
                            {pt.label}: {pt.estimated1RM} kg
                          </span>
                        </div>
                      ))}
                  </div>
                </>
              ) : (
                <p className="text-xs text-[#9AA79E] py-12 text-center">
                  Select an exercise card on the left to inspect its strength development curve and
                  historical personal records.
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          TAB 4: TRAINING LOAD & RECOVERY INTELLIGENCE (SECTION 14.B)
         ===================================================================== */}
      {activeTab === 'training_load' && (
        <div className="space-y-4">
          {/* AI Non-Medical Load & Recovery Recommendation Banner */}
          <div className="sage-card p-5 border border-[#9BB9A2]/30 space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-[#6EBF8B]" />
                <h2 className="text-sm font-bold text-[#E8EDE8]">
                  Training Load &amp; Recovery Intelligence:{' '}
                  <span className="text-[#6EBF8B]">{loadRecoverySummary.primarySuggestion}</span>
                </h2>
              </div>
              <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-[#9BB9A2]/20 text-[#9BB9A2]">
                Recovery Score: {loadRecoverySummary.avgRecoveryScore ?? '—'}/100 · Status:{' '}
                {loadRecoverySummary.loadStatus.replace('_', ' ')}
              </span>
            </div>
            <p className="text-xs text-[#9AA79E] leading-relaxed">
              {loadRecoverySummary.detailedExplanation}
            </p>
            <div className="pt-2 border-t border-[#BDD3C1]/10 flex flex-wrap items-center justify-between gap-2 text-xs">
              <span className="text-[#9BB9A2] font-medium">
                Cross-Module AI Nutrition Link: {loadRecoverySummary.nutritionAdjustment.rationale}
              </span>
              <span className="font-mono text-[#E8EDE8]">
                Adjusted Daily Targets: {effectiveCalorieTarget} kcal · {effectiveProteinTarget}g
                protein
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            {/* Left 7-Col: Weekly Sets per Muscle Group Chart + Load Metrics */}
            <div className="lg:col-span-7 sage-card p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-[#E8EDE8]">
                    Weekly Sets per Muscle Group &amp; Volume Distribution
                  </h3>
                  <p className="text-xs text-[#9AA79E]">
                    Last 7 days: {loadRecoverySummary.workoutsThisWeek} workouts ·{' '}
                    {loadRecoverySummary.restDaysThisWeek} rest days · Avg RPE{' '}
                    {loadRecoverySummary.avgRpe ?? '—'}
                  </p>
                </div>
              </div>

              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={muscleSetChartData}>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="rgba(189,211,193,0.08)"
                      vertical={false}
                    />
                    <XAxis
                      dataKey="muscle"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: '#9AA79E', fontSize: 11 }}
                    />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: '#65756B', fontSize: 11 }}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#171E1B',
                        borderColor: 'rgba(189,211,193,0.2)',
                        borderRadius: '8px',
                        fontSize: '12px',
                      }}
                    />
                    <Bar
                      dataKey="sets"
                      fill="#9BB9A2"
                      radius={[6, 6, 0, 0]}
                      name="Weekly Sets"
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-[#BDD3C1]/10">
                <div className="p-3 rounded-xl bg-[#171E1B]">
                  <p className="text-[10px] text-[#65756B]">Weekly Volume</p>
                  <p className="text-sm font-bold text-[#E8EDE8]">
                    {loadRecoverySummary.totalWeeklyVolumeKg.toLocaleString()} kg
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-[#171E1B]">
                  <p className="text-[10px] text-[#65756B]">Adjusted Load</p>
                  <p className="text-sm font-bold text-[#6EBF8B]">
                    {loadRecoverySummary.totalAdjustedLoad.toLocaleString()}
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-[#171E1B]">
                  <p className="text-[10px] text-[#65756B]">Frequency</p>
                  <p className="text-sm font-bold text-[#E8EDE8]">
                    {loadRecoverySummary.workoutsThisWeek}x / wk
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-[#171E1B]">
                  <p className="text-[10px] text-[#65756B]">Duration</p>
                  <p className="text-sm font-bold text-[#E8EDE8]">
                    {loadRecoverySummary.totalDurationMinutes} mins
                  </p>
                </div>
              </div>
            </div>

            {/* Right 5-Col: Subjective Recovery Feedback Logger */}
            <div className="lg:col-span-5 sage-card p-5 space-y-4">
              <form onSubmit={handleLogRecovery} className="space-y-3">
                <h3 className="text-sm font-semibold text-[#E8EDE8]">
                  Log Daily Recovery Check-In
                </h3>
                <p className="text-xs text-[#9AA79E]">
                  Record soreness, fatigue, sleep quality, and energy so the AI calibrates load
                  recommendations
                </p>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="block text-[10px] text-[#9AA79E] mb-1">
                      Muscle Soreness (1-5): {recSoreness}
                    </label>
                    <input
                      type="range"
                      min={1}
                      max={5}
                      value={recSoreness}
                      onChange={(e) => setRecSoreness(Number(e.target.value))}
                      className="w-full accent-[#9BB9A2]"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-[#9AA79E] mb-1">
                      Systemic Fatigue (1-10): {recFatigue}
                    </label>
                    <input
                      type="range"
                      min={1}
                      max={10}
                      value={recFatigue}
                      onChange={(e) => setRecFatigue(Number(e.target.value))}
                      className="w-full accent-[#9BB9A2]"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-[#9AA79E] mb-1">
                      Sleep Quality (1-10): {recSleepQuality}
                    </label>
                    <input
                      type="range"
                      min={1}
                      max={10}
                      value={recSleepQuality}
                      onChange={(e) => setRecSleepQuality(Number(e.target.value))}
                      className="w-full accent-[#6EBF8B]"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-[#9AA79E] mb-1">
                      Energy Level (1-10): {recEnergy}
                    </label>
                    <input
                      type="range"
                      min={1}
                      max={10}
                      value={recEnergy}
                      onChange={(e) => setRecEnergy(Number(e.target.value))}
                      className="w-full accent-[#6EBF8B]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] text-[#9AA79E] mb-1">
                    Sleep Duration (Hours)
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    min={1}
                    max={16}
                    value={recSleepHours}
                    onChange={(e) => setRecSleepHours(Number(e.target.value))}
                    className="w-full sage-input px-3 py-1.5 text-xs"
                  />
                </div>

                <div>
                  <label className="block text-[10px] text-[#9AA79E] mb-1">
                    Currently Sore Muscle Groups
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {MUSCLE_GROUPS.map((mg) => {
                      const active = recSoreMuscles.includes(mg);
                      return (
                        <button
                          key={mg}
                          type="button"
                          onClick={() => toggleSoreMuscle(mg)}
                          className={`px-2 py-1 rounded-lg text-[10px] font-medium ${
                            active
                              ? 'bg-[#D97777]/25 text-[#D97777] border border-[#D97777]/40'
                              : 'bg-[#171E1B] text-[#9AA79E]'
                          }`}
                        >
                          {mg}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-2 rounded-xl bg-[#9BB9A2] text-[#171E1B] text-xs font-semibold"
                >
                  Save Recovery Check-In
                </button>
              </form>

              {recoveryLogs.length > 0 && (
                <div className="pt-3 border-t border-[#BDD3C1]/10 space-y-2">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-[#65756B]">
                    RECENT RECOVERY CHECK-INS
                  </p>
                  {recoveryLogs.slice(0, 3).map((r) => (
                    <div
                      key={r.id}
                      className="p-2.5 rounded-xl bg-[#171E1B] flex items-center justify-between text-xs"
                    >
                      <div>
                        <span className="font-semibold text-[#E8EDE8]">
                          {r.date} · Recovery {r.generalRecoveryScore}/100
                        </span>
                        <p className="text-[10px] text-[#9AA79E]">
                          Soreness {r.muscleSoreness}/5 · Fatigue {r.fatigueLevel}/10 · Sleep{' '}
                          {r.sleepHours || 7.5}h
                        </p>
                      </div>
                      <button
                        onClick={() => deleteRecoveryLog(r.id)}
                        className="text-[#65756B] hover:text-[#D97A6C]"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          TAB 5: WORKOUT CALENDAR & AI FITNESS SCHEDULING (SECTION 14.D)
         ===================================================================== */}
      {activeTab === 'workout_calendar' && (
        <div className="space-y-4">
          {/* Missed Workout Smart Single-Session Adjustment Banner */}
          {missedWorkoutNotice && (
            <div className="p-4 rounded-2xl bg-[#222C27] border border-[#E5B567] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-xs font-bold text-[#E5B567]">
                  <AlertTriangle className="w-4 h-4" />
                  <span>
                    Smart Missed-Workout Adjustment ({missedWorkoutNotice.workoutTitle})
                  </span>
                </div>
                <p className="text-xs text-[#E8EDE8]">{missedWorkoutNotice.explanation}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={handleApplyMissedReschedule}
                  className="px-3.5 py-2 rounded-xl bg-[#E5B567] text-[#171E1B] text-xs font-semibold"
                >
                  Move to {missedWorkoutNotice.suggestedDate} at{' '}
                  {missedWorkoutNotice.suggestedStartTime}
                </button>
                <button
                  onClick={() => setMissedWorkoutNotice(null)}
                  className="p-1.5 text-[#9AA79E]"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* Consistency & Status Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <div className="sage-card p-3.5">
              <p className="text-[10px] uppercase text-[#65756B]">Planned</p>
              <p className="text-xl font-bold text-[#9BB9A2] mt-0.5">
                {workoutCalendarStats.plannedCount}
              </p>
              <p className="text-[10px] text-[#9AA79E]">Awaiting verification</p>
            </div>
            <div className="sage-card p-3.5">
              <p className="text-[10px] uppercase text-[#65756B]">Completed</p>
              <p className="text-xl font-bold text-[#6EBF8B] mt-0.5">
                {workoutCalendarStats.completedCount}
              </p>
              <p className="text-[10px] text-[#9AA79E]">Explicitly verified</p>
            </div>
            <div className="sage-card p-3.5">
              <p className="text-[10px] uppercase text-[#65756B]">Missed</p>
              <p className="text-xl font-bold text-[#D97777] mt-0.5">
                {workoutCalendarStats.missedCount}
              </p>
              <p className="text-[10px] text-[#9AA79E]">Reschedulable</p>
            </div>
            <div className="sage-card p-3.5">
              <p className="text-[10px] uppercase text-[#65756B]">Rest Days</p>
              <p className="text-xl font-bold text-[#E5B567] mt-0.5">
                {workoutCalendarStats.restCount}
              </p>
              <p className="text-[10px] text-[#9AA79E]">Planned recovery</p>
            </div>
            <div className="sage-card p-3.5">
              <p className="text-[10px] uppercase text-[#65756B]">Consistency</p>
              <p className="text-xl font-bold text-[#E8EDE8] mt-0.5">
                {workoutCalendarStats.consistencyPct}%
              </p>
              <p className="text-[10px] text-[#9AA79E]">Completed vs missed</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            {/* Left 4-Col: Schedule Workout Template with AI Conflict-Free Time Finder */}
            <div className="lg:col-span-4 sage-card p-5 space-y-4">
              <div>
                <h2 className="text-sm font-semibold text-[#E8EDE8]">
                  Schedule Workout or Rest Day
                </h2>
                <p className="text-xs text-[#9AA79E]">
                  Syncs with Life OS Calendar. Never marks a workout completed merely because it was
                  scheduled.
                </p>
              </div>

              <form
                onSubmit={(e) => handleScheduleWorkoutSubmit(e, 'planned')}
                className="space-y-3 text-xs"
              >
                <div>
                  <label className="block text-[10px] text-[#9AA79E] mb-1">
                    Workout Split Template
                  </label>
                  <select
                    value={schedTemplateId}
                    onChange={(e) => setSchedTemplateId(e.target.value)}
                    className="w-full sage-input px-3 py-2 text-xs"
                  >
                    {WORKOUT_TEMPLATES.map((tpl) => (
                      <option key={tpl.id} value={tpl.id}>
                        {tpl.name} ({tpl.defaultDurationMinutes}m)
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] text-[#9AA79E] mb-1">
                    Custom Title (Optional)
                  </label>
                  <input
                    type="text"
                    value={schedCustomTitle}
                    onChange={(e) => setSchedCustomTitle(e.target.value)}
                    placeholder="Override template title..."
                    className="w-full sage-input px-3 py-2 text-xs"
                  />
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-[10px] text-[#9AA79E] mb-1">Date</label>
                    <input
                      type="date"
                      value={schedDate}
                      onChange={(e) => setSchedDate(e.target.value)}
                      className="w-full sage-input px-2 py-1.5 text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-[#9AA79E] mb-1">Start Time</label>
                    <input
                      type="time"
                      value={schedStartTime}
                      onChange={(e) => setSchedStartTime(e.target.value)}
                      className="w-full sage-input px-2 py-1.5 text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-[#9AA79E] mb-1">Duration (m)</label>
                    <input
                      type="number"
                      min={15}
                      value={schedDuration}
                      onChange={(e) => setSchedDuration(Number(e.target.value))}
                      className="w-full sage-input px-2 py-1.5 text-xs"
                    />
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleSuggestOptimalWorkoutTime}
                  className="w-full py-2 rounded-xl bg-[#2C3932] hover:bg-[#36463D] text-[#9BB9A2] font-semibold flex items-center justify-center gap-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5" /> Suggest Conflict-Free AI Time Slot
                </button>

                {aiSlotSuggestionNote && (
                  <div className="p-2.5 rounded-xl bg-[#171E1B] border border-[#9BB9A2]/30 text-[11px] text-[#9BB9A2]">
                    {aiSlotSuggestionNote}
                  </div>
                )}

                <div className="grid grid-cols-2 gap-2 pt-1">
                  <button
                    type="submit"
                    className="py-2 rounded-xl bg-[#9BB9A2] text-[#171E1B] font-semibold"
                  >
                    + Schedule Workout
                  </button>
                  <button
                    type="button"
                    onClick={(e) => handleScheduleWorkoutSubmit(e, 'rest_day')}
                    className="py-2 rounded-xl bg-[#2C3932] text-[#E5B567] font-semibold"
                  >
                    + Set Rest Day
                  </button>
                </div>
              </form>
            </div>

            {/* Right 8-Col: Interactive Weekly / Monthly Workout Calendar */}
            <div className="lg:col-span-8 sage-card p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-[#E8EDE8]">
                  Workout Calendar ({calendarViewMode === 'week' ? '7-Day View' : '28-Day View'})
                </h2>
                <div className="inline-flex rounded-xl bg-[#171E1B] p-1 text-xs">
                  <button
                    onClick={() => setCalendarViewMode('week')}
                    className={`px-3 py-1 rounded-lg ${
                      calendarViewMode === 'week'
                        ? 'bg-[#9BB9A2] text-[#171E1B] font-semibold'
                        : 'text-[#9AA79E]'
                    }`}
                  >
                    Weekly
                  </button>
                  <button
                    onClick={() => setCalendarViewMode('month')}
                    className={`px-3 py-1 rounded-lg ${
                      calendarViewMode === 'month'
                        ? 'bg-[#9BB9A2] text-[#171E1B] font-semibold'
                        : 'text-[#9AA79E]'
                    }`}
                  >
                    Monthly
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[540px] overflow-y-auto pr-1">
                {calendarDays.map((day) => (
                  <div
                    key={day.dateStr}
                    className={`p-3.5 rounded-xl border space-y-2 ${
                      day.isToday
                        ? 'bg-[#222C27] border-[#9BB9A2]/50'
                        : 'bg-[#171E1B]/80 border-[#BDD3C1]/10'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-[#E8EDE8]">
                        {day.dayLabel}
                        {day.isToday && (
                          <span className="ml-2 px-1.5 py-0.5 rounded text-[9px] bg-[#9BB9A2] text-[#171E1B]">
                            TODAY
                          </span>
                        )}
                      </span>
                      <button
                        onClick={() => setSchedDate(day.dateStr)}
                        className="text-[10px] text-[#9BB9A2] hover:underline"
                      >
                        Select date
                      </button>
                    </div>

                    {day.scheduled.length === 0 ? (
                      <p className="text-[11px] text-[#65756B]">No workout scheduled</p>
                    ) : (
                      <div className="space-y-2">
                        {day.scheduled.map((ws) => {
                          const statusColors: Record<WorkoutScheduleStatus, string> = {
                            planned: 'bg-[#9BB9A2]/15 text-[#9BB9A2] border-[#9BB9A2]/30',
                            completed: 'bg-[#6EBF8B]/20 text-[#6EBF8B] border-[#6EBF8B]/40',
                            missed: 'bg-[#D97777]/20 text-[#D97777] border-[#D97777]/40',
                            rest_day: 'bg-[#E5B567]/20 text-[#E5B567] border-[#E5B567]/40',
                          };
                          return (
                            <div
                              key={ws.id}
                              className="p-2.5 rounded-xl bg-[#222C27] border border-[#BDD3C1]/15 space-y-1.5 text-xs"
                            >
                              <div className="flex items-center justify-between gap-2">
                                <span className="font-semibold text-[#E8EDE8]">
                                  {ws.templateName}
                                </span>
                                <span
                                  className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase border ${
                                    statusColors[ws.status]
                                  }`}
                                >
                                  {ws.status.replace('_', ' ')}
                                </span>
                              </div>
                              <p className="text-[11px] text-[#9AA79E]">
                                {ws.startTime}–{ws.endTime} · {ws.plannedDurationMinutes}m
                              </p>
                              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                                {ws.status === 'planned' && (
                                  <>
                                    <button
                                      onClick={() =>
                                        updateWorkoutScheduleStatus(ws.id, 'completed')
                                      }
                                      className="px-2 py-1 rounded-lg bg-[#6EBF8B] text-[#171E1B] text-[10px] font-semibold flex items-center gap-1"
                                    >
                                      <CheckCircle2 className="w-3 h-3" /> Complete &amp; Verify
                                    </button>
                                    <button
                                      onClick={() => handleMarkWorkoutMissed(ws.id)}
                                      className="px-2 py-1 rounded-lg bg-[#D97777]/25 text-[#D97777] text-[10px] font-semibold"
                                    >
                                      Mark Missed
                                    </button>
                                  </>
                                )}
                                <button
                                  onClick={() => deleteWorkoutSchedule(ws.id)}
                                  className="ml-auto text-[#65756B] hover:text-[#D97A6C]"
                                  title="Cancel scheduled entry"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          TAB 6: AI TRAINING-LINKED NUTRITION
         ===================================================================== */}
      {activeTab === 'nutrition' && (
        <div className="space-y-4">
          {/* Cross-Module Training Load -> Nutrition Banner */}
          <div className="sage-card p-4 border border-[#9BB9A2]/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-0.5">
              <p className="text-xs font-bold text-[#9BB9A2]">
                Cross-Module Intelligence · Training Load &amp; Weight Trend Linked Nutrition
              </p>
              <p className="text-xs text-[#9AA79E]">
                {loadRecoverySummary.nutritionAdjustment.rationale}
              </p>
            </div>
            <div className="flex items-center gap-3 shrink-0 text-xs">
              <div className="px-3 py-1.5 rounded-xl bg-[#171E1B] border border-[#BDD3C1]/15">
                Base: {baseCalorieTarget} kcal / {baseProteinTarget}g P
              </div>
              <div className="px-3 py-1.5 rounded-xl bg-[#9BB9A2]/20 text-[#9BB9A2] font-bold">
                Active Target: {effectiveCalorieTarget} kcal / {effectiveProteinTarget}g P
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            <div className="lg:col-span-7 sage-card p-5 space-y-4">
              <h2 className="text-sm font-semibold text-[#E8EDE8]">
                Meals logged ({meals.length})
              </h2>

              {meals.length > 0 ? (
                <div className="space-y-2">
                  {meals.map((it) => (
                    <div
                      key={it.id}
                      className="p-3.5 rounded-xl bg-[#2C3932]/75 flex items-center justify-between gap-2 text-xs"
                    >
                      <div>
                        <p className="text-[#E8EDE8] font-medium">{it.title}</p>
                        <p className="text-[11px] text-[#9AA79E]">
                          {it.date} · {it.proteinGrams || 0}P · {it.carbsGrams || 0}C ·{' '}
                          {it.fatGrams || 0}F
                        </p>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <span className="text-[#9BB9A2] font-semibold">
                          {it.calories || 0} kcal
                        </span>
                        <button
                          onClick={() => deleteHealthLog(it.id)}
                          className="text-[#65756B] hover:text-[#D97A6C]"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-[#9AA79E] py-8 text-center">
                  No meals logged yet. Use the form on the right to log your nutrition.
                </p>
              )}
            </div>

            <div className="lg:col-span-5 space-y-4">
              <div className="sage-card p-5 space-y-4">
                <h2 className="text-sm font-semibold text-[#E8EDE8]">
                  Daily Training-Adjusted Targets
                </h2>
                <div className="flex items-center gap-5">
                  <div className="w-24 h-24 rounded-full border-4 border-[#9BB9A2] flex flex-col items-center justify-center shrink-0">
                    <span className="text-base font-bold text-[#E8EDE8]">{todayCalories}</span>
                    <span className="text-[10px] text-[#9AA79E]">
                      of {effectiveCalorieTarget} kcal
                    </span>
                  </div>

                  <div className="flex-1 space-y-2.5 text-xs">
                    {[
                      {
                        label: 'Protein (Training-Adjusted)',
                        val: `${todayProtein} / ${effectiveProteinTarget} g`,
                        pct: Math.min(
                          100,
                          Math.round((todayProtein / effectiveProteinTarget) * 100)
                        ),
                      },
                      {
                        label: 'Carbs',
                        val: `${todayCarbs} / 250 g`,
                        pct: Math.min(100, Math.round((todayCarbs / 250) * 100)),
                      },
                      {
                        label: 'Fat',
                        val: `${todayFat} / 70 g`,
                        pct: Math.min(100, Math.round((todayFat / 70) * 100)),
                      },
                    ].map((m) => (
                      <div key={m.label}>
                        <div className="flex justify-between text-[11px] mb-1">
                          <span className="text-[#9AA79E]">{m.label}</span>
                          <span className="text-[#E8EDE8] font-medium">{m.val}</span>
                        </div>
                        <div className="w-full h-1.5 rounded-full bg-[#171E1B] overflow-hidden">
                          <div
                            className="h-full rounded-full bg-[#9BB9A2]"
                            style={{ width: `${m.pct}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <form onSubmit={handleLogMeal} className="sage-card p-5 space-y-3">
                <h2 className="text-sm font-semibold text-[#E8EDE8]">Log meal</h2>
                <input
                  type="text"
                  required
                  value={mealTitle}
                  onChange={(e) => setMealTitle(e.target.value)}
                  placeholder="Meal description..."
                  className="w-full sage-input px-3.5 py-2 text-xs"
                />
                <div className="grid grid-cols-4 gap-2">
                  <div>
                    <label className="block text-[10px] text-[#9AA79E] mb-1">kcal</label>
                    <input
                      type="number"
                      min={0}
                      value={mealCalories}
                      onChange={(e) => setMealCalories(Number(e.target.value))}
                      className="w-full sage-input px-2 py-1.5 text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-[#9AA79E] mb-1">Protein (g)</label>
                    <input
                      type="number"
                      min={0}
                      value={mealProtein}
                      onChange={(e) => setMealProtein(Number(e.target.value))}
                      className="w-full sage-input px-2 py-1.5 text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-[#9AA79E] mb-1">Carbs (g)</label>
                    <input
                      type="number"
                      min={0}
                      value={mealCarbs}
                      onChange={(e) => setMealCarbs(Number(e.target.value))}
                      className="w-full sage-input px-2 py-1.5 text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-[#9AA79E] mb-1">Fat (g)</label>
                    <input
                      type="number"
                      min={0}
                      value={mealFat}
                      onChange={(e) => setMealFat(Number(e.target.value))}
                      className="w-full sage-input px-2 py-1.5 text-xs"
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  className="w-full py-2 rounded-xl bg-[#9BB9A2] text-[#171E1B] text-xs font-semibold"
                >
                  Log meal
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          TAB 7: WEEKLY AI FITNESS & NUTRITION COACH (SECTION 14.E)
         ===================================================================== */}
      {activeTab === 'weekly_coach' && (
        <div className="space-y-4">
          <div className="sage-card p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <Brain className="w-5 h-5 text-[#9BB9A2]" />
                <h2 className="text-base font-bold text-[#E8EDE8]">
                  Weekly AI Fitness &amp; Nutrition Coach Report
                </h2>
              </div>
              <p className="text-xs text-[#9AA79E] mt-1">
                Strictly separates Recorded Facts from AI Coach Interpretations across all 8
                required review sections, and explicitly discloses when data is insufficient.
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {weeklyFitnessReports.length > 1 && (
                <select
                  value={liveOrSavedReport.id}
                  onChange={(e) => setSelectedReportId(e.target.value)}
                  className="sage-input px-3 py-2 text-xs"
                >
                  {weeklyFitnessReports.map((rep) => (
                    <option key={rep.id} value={rep.id}>
                      Week {rep.weekStartDate} → {rep.weekEndDate}
                    </option>
                  ))}
                </select>
              )}
              <button
                onClick={() => generateAndSaveWeeklyFitnessReport()}
                className="px-4 py-2 rounded-xl bg-[#9BB9A2] hover:bg-[#a9c5b0] text-[#171E1B] text-xs font-semibold flex items-center gap-1.5"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Save / Refresh Weekly Report
              </button>
            </div>
          </div>

          {/* Data Provenance & Insufficient Data Disclosure Banner */}
          <div
            className={`p-4 rounded-2xl border text-xs space-y-1.5 ${
              liveOrSavedReport.referencedDataSummary.insufficientDataWarnings.length > 0
                ? 'bg-[#E5B567]/12 border-[#E5B567]/40 text-[#E8EDE8]'
                : 'bg-[#222C27] border-[#6EBF8B]/40 text-[#E8EDE8]'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="font-bold">
                Report Window: {liveOrSavedReport.weekStartDate} to{' '}
                {liveOrSavedReport.weekEndDate}
              </span>
              <span className="text-[11px] text-[#9AA79E]">
                Referenced: {liveOrSavedReport.referencedDataSummary.completedWorkoutCount}{' '}
                workouts · {liveOrSavedReport.referencedDataSummary.measurementCount} weigh-ins ·{' '}
                {liveOrSavedReport.referencedDataSummary.mealLogCount} meals ·{' '}
                {liveOrSavedReport.referencedDataSummary.newPrCount} new PRs
              </span>
            </div>
            {liveOrSavedReport.referencedDataSummary.insufficientDataWarnings.length > 0 && (
              <ul className="list-disc pl-4 text-[#E5B567] space-y-0.5">
                {liveOrSavedReport.referencedDataSummary.insufficientDataWarnings.map((w, idx) => (
                  <li key={idx}>{w}</li>
                ))}
              </ul>
            )}
          </div>

          {/* Sections 1 to 5 (Recorded Facts vs AI Interpretation) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {(
              [
                {
                  num: '1',
                  title: 'Weekly Overview',
                  facts: liveOrSavedReport.sections.weeklyOverview.recordedFacts,
                  interp: liveOrSavedReport.sections.weeklyOverview.aiInterpretation,
                },
                {
                  num: '2',
                  title: 'Body Progress & Weight Trend',
                  facts: liveOrSavedReport.sections.bodyProgress.recordedFacts,
                  interp: liveOrSavedReport.sections.bodyProgress.aiInterpretation,
                },
                {
                  num: '3',
                  title: 'Workout Performance & PRs',
                  facts: liveOrSavedReport.sections.workoutPerformance.recordedFacts,
                  interp: liveOrSavedReport.sections.workoutPerformance.aiInterpretation,
                },
                {
                  num: '4',
                  title: 'Nutrition Performance',
                  facts: liveOrSavedReport.sections.nutritionPerformance.recordedFacts,
                  interp: liveOrSavedReport.sections.nutritionPerformance.aiInterpretation,
                },
                {
                  num: '5',
                  title: 'Recovery & Training Load',
                  facts: liveOrSavedReport.sections.recoveryAndTrainingLoad.recordedFacts,
                  interp: liveOrSavedReport.sections.recoveryAndTrainingLoad.aiInterpretation,
                },
              ] as const
            ).map((sec) => (
              <div
                key={sec.num}
                className="sage-card p-5 space-y-3 border border-[#BDD3C1]/15"
              >
                <div className="flex items-center justify-between border-b border-[#BDD3C1]/10 pb-2">
                  <h3 className="text-sm font-bold text-[#E8EDE8]">
                    {sec.num}. {sec.title}
                  </h3>
                </div>

                <div className="space-y-1.5">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-[#6EBF8B]">
                    Recorded Facts (Database Ground Truth)
                  </p>
                  <ul className="space-y-1 text-xs text-[#E8EDE8] list-disc pl-4">
                    {sec.facts.map((f, i) => (
                      <li key={i}>{f}</li>
                    ))}
                  </ul>
                </div>

                <div className="p-3 rounded-xl bg-[#171E1B] border border-[#9BB9A2]/20 space-y-1">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-[#9BB9A2]">
                    AI Coach Interpretation &amp; Guidance
                  </p>
                  <p className="text-xs text-[#9AA79E] leading-relaxed">{sec.interp}</p>
                </div>
              </div>
            ))}

            {/* Sections 6, 7, 8 */}
            <div className="sage-card p-5 space-y-3 border border-[#BDD3C1]/15">
              <h3 className="text-sm font-bold text-[#E8EDE8] border-b border-[#BDD3C1]/10 pb-2">
                6. Key Achievements · 7. Areas for Improvement · 8. Next Week Action Plan
              </h3>

              <div className="space-y-1">
                <p className="text-[10px] font-bold uppercase tracking-wider text-[#6EBF8B]">
                  6. Achievements This Week
                </p>
                <ul className="space-y-1 text-xs text-[#E8EDE8] list-disc pl-4">
                  {liveOrSavedReport.sections.achievements.map((a, i) => (
                    <li key={i}>{a}</li>
                  ))}
                </ul>
              </div>

              <div className="space-y-1 pt-1">
                <p className="text-[10px] font-bold uppercase tracking-wider text-[#E5B567]">
                  7. Areas for Improvement
                </p>
                <ul className="space-y-1 text-xs text-[#E8EDE8] list-disc pl-4">
                  {liveOrSavedReport.sections.areasForImprovement.map((a, i) => (
                    <li key={i}>{a}</li>
                  ))}
                </ul>
              </div>

              <div className="space-y-1 pt-1">
                <p className="text-[10px] font-bold uppercase tracking-wider text-[#9BB9A2]">
                  8. Concrete Recommendations for Next Week
                </p>
                <ul className="space-y-1 text-xs text-[#9BB9A2] list-disc pl-4">
                  {liveOrSavedReport.sections.recommendationsForNextWeek.map((r, i) => (
                    <li key={i}>{r}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          TAB 8: SLEEP & WATER (HYDRATION)
         ===================================================================== */}
      {activeTab === 'sleep_water' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          <div className="lg:col-span-6 sage-card p-5 space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-sm font-semibold text-[#E8EDE8]">Water intake · today</h2>
                <p className="text-xs text-[#9AA79E]">
                  {(waterLoggedMl / 1000).toFixed(2)} L of {(waterTargetMl / 1000).toFixed(1)} L (
                  {waterGlasses} of 8 glasses)
                </p>
              </div>
              <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-[#9BB9A2]/20 text-[#9BB9A2]">
                {Math.min(100, Math.round((waterLoggedMl / waterTargetMl) * 100))}%
              </span>
            </div>

            <div className="grid grid-cols-8 gap-2">
              {Array.from({ length: 8 }).map((_, i) => {
                const filled = i < waterGlasses;
                return (
                  <button
                    key={i}
                    onClick={() => handleSetWaterMl((i + 1) * 375)}
                    className={`h-14 rounded-xl border flex flex-col items-center justify-center text-[10px] font-semibold transition-all ${
                      filled
                        ? 'bg-[#9BB9A2] border-[#9BB9A2] text-[#171E1B]'
                        : 'bg-[#2C3932]/50 border-[#BDD3C1]/15 text-[#9AA79E]'
                    }`}
                  >
                    <span>375</span>
                    <span className="text-[9px] opacity-75">ml</span>
                  </button>
                );
              })}
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => handleSetWaterMl(waterLoggedMl + 250)}
                className="px-4 py-2 rounded-xl bg-[#9BB9A2] text-[#171E1B] text-xs font-semibold"
              >
                + 250 ml
              </button>
              <button
                onClick={() => handleSetWaterMl(waterLoggedMl + 500)}
                className="px-4 py-2 rounded-xl bg-[#2C3932] text-[#E8EDE8] text-xs"
              >
                + 500 ml bottle
              </button>
              <button
                onClick={() => handleSetWaterMl(0)}
                className="px-3 py-2 rounded-xl bg-[#1C2520] text-[#9AA79E] text-xs"
              >
                Reset
              </button>
            </div>
          </div>

          <div className="lg:col-span-6 sage-card p-5 space-y-3">
            <h2 className="text-sm font-semibold text-[#E8EDE8]">Daily targets configuration</h2>
            <p className="text-xs text-[#9AA79E]">
              Base Calorie target: {baseCalorieTarget} kcal · Training-Adjusted Calorie target:{' '}
              {effectiveCalorieTarget} kcal · Protein target: {effectiveProteinTarget} g · Water
              target: {waterTargetMl} ml
            </p>
          </div>
        </div>
      )}

      {/* Log Measurement Modal */}
      {showLogModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={handleLogMeasurement}
            className="w-full max-w-md rounded-2xl bg-[#222C27] border border-[#BDD3C1]/25 p-6 space-y-4"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-[#E8EDE8]">
                Log Body Weight &amp; Measurements
              </h3>
              <button
                type="button"
                onClick={() => setShowLogModal(false)}
                className="text-[#9AA79E]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs text-[#9AA79E] mb-1">Weight (kg)</label>
                <input
                  type="number"
                  step="0.1"
                  required
                  value={weightKg}
                  onChange={(e) => setWeightKg(e.target.value)}
                  placeholder="74.0"
                  className="w-full sage-input px-3 py-2 text-xs"
                />
              </div>
              <div>
                <label className="block text-xs text-[#9AA79E] mb-1">Waist (cm)</label>
                <input
                  type="number"
                  step="0.1"
                  value={waistCm}
                  onChange={(e) => setWaistCm(e.target.value)}
                  placeholder="80.0"
                  className="w-full sage-input px-3 py-2 text-xs"
                />
              </div>
              <div>
                <label className="block text-xs text-[#9AA79E] mb-1">Chest (cm)</label>
                <input
                  type="number"
                  step="0.1"
                  value={chestCm}
                  onChange={(e) => setChestCm(e.target.value)}
                  placeholder="102.0"
                  className="w-full sage-input px-3 py-2 text-xs"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs text-[#9AA79E] mb-1">
                Target Goal Weight (kg, optional)
              </label>
              <input
                type="number"
                step="0.1"
                value={targetWeightInput}
                onChange={(e) => setTargetWeightInput(e.target.value)}
                placeholder="e.g. 72.0"
                className="w-full sage-input px-3 py-2 text-xs"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowLogModal(false)}
                className="px-4 py-2 rounded-xl bg-[#2C3932] text-xs text-[#9AA79E]"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-[#9BB9A2] text-[#171E1B] text-xs font-semibold"
              >
                Save measurement
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
