import React, { useState } from 'react';
import { Activity, Dumbbell, Utensils, Droplets, Plus } from 'lucide-react';
import { useLifeOS } from '../context/LifeOSContext.tsx';

export const HealthView: React.FC = () => {
  const { profile, healthLogs, todayDate, createHealthLog, updateProfileSettings } = useLifeOS();

  const [activePillar, setActivePillar] = useState<'workout' | 'nutrition' | 'measurement'>('workout');

  // Workout Form
  const [workoutTitle, setWorkoutTitle] = useState('');
  const [durationMinutes, setDurationMinutes] = useState(50);
  const [volumeKg, setVolumeKg] = useState(4200);
  const [rpe, setRpe] = useState(8);
  const [exercisesSummary, setExercisesSummary] = useState('');
  const [syncToCalendar, setSyncToCalendar] = useState(true);

  // Nutrition Form
  const [mealTitle, setMealTitle] = useState('');
  const [calories, setCalories] = useState(650);
  const [proteinGrams, setProteinGrams] = useState(45);
  const [carbsGrams, setCarbsGrams] = useState(60);
  const [fatGrams, setFatGrams] = useState(22);

  // Measurement Form
  const [weightKg, setWeightKg] = useState(74.0);
  const [waistCm, setWaistCm] = useState(79.0);
  const [chestCm, setChestCm] = useState(101.0);
  const [armsCm, setArmsCm] = useState(36.5);
  const [measNotes, setMeasNotes] = useState('');

  const handleLogWorkout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!workoutTitle.trim()) return;
    await createHealthLog(
      {
        logType: 'workout',
        date: todayDate,
        title: workoutTitle,
        durationMinutes: Number(durationMinutes),
        volumeKg: Number(volumeKg),
        rpe: Number(rpe),
        exercisesSummary: exercisesSummary || 'Compound strength session',
      },
      syncToCalendar
    );
    setWorkoutTitle('');
    setExercisesSummary('');
  };

  const handleLogMeal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mealTitle.trim()) return;
    await createHealthLog({
      logType: 'meal',
      date: todayDate,
      title: mealTitle,
      calories: Number(calories),
      proteinGrams: Number(proteinGrams),
      carbsGrams: Number(carbsGrams),
      fatGrams: Number(fatGrams),
    });
    setMealTitle('');
  };

  const handleLogMeasurement = async (e: React.FormEvent) => {
    e.preventDefault();
    await createHealthLog({
      logType: 'measurement',
      date: todayDate,
      title: `Body Check-in (${weightKg} kg)`,
      weightKg: Number(weightKg),
      waistCm: Number(waistCm),
      chestCm: Number(chestCm),
      armsCm: Number(armsCm),
      notes: measNotes || undefined,
    });
    setMeasNotes('');
  };

  const workouts = healthLogs.filter((h) => h.logType === 'workout');
  const meals = healthLogs.filter((h) => h.logType === 'meal');
  const measurements = healthLogs.filter((h) => h.logType === 'measurement');

  const todayCalories = meals
    .filter((m) => m.date === todayDate)
    .reduce((acc, m) => acc + (m.calories || 0), 0);
  const todayProtein = meals
    .filter((m) => m.date === todayDate)
    .reduce((acc, m) => acc + (m.proteinGrams || 0), 0);

  return (
    <div className="space-y-8">
      {/* Header & Hydration Tracker */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">
            Health & Fitness — Measurements, Workouts & Nutrition
          </h1>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Constructive trend tracking without labeling days as “good” or “bad”. All nutrition values are clearly marked as estimates, not medical advice.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <div className="text-right">
            <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1 justify-end">
              <Droplets className="w-3.5 h-3.5 text-sky-500" /> Daily Hydration
            </div>
            <div className="text-sm font-bold font-mono tabular-nums text-slate-900 dark:text-slate-100">
              {profile?.waterLoggedTodayMl || 1500} / {profile?.waterTargetMl || 3000} ml
            </div>
          </div>
          <button
            onClick={() =>
              updateProfileSettings({
                waterLoggedTodayMl: (profile?.waterLoggedTodayMl || 1500) + 250,
              })
            }
            className="px-3 py-2 rounded-lg bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-xs font-semibold font-mono tabular-nums"
          >
            +250ml H₂O
          </button>
        </div>
      </div>

      {/* Summary Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
          <div className="text-xs text-slate-500 dark:text-slate-400">Latest Body Weight</div>
          <div className="mt-2 text-2xl font-bold font-mono tabular-nums text-slate-900 dark:text-slate-100">
            {measurements[0]?.weightKg ?? 74.2} kg
          </div>
          <div className="mt-1 text-xs text-slate-500 font-mono tabular-nums">
            Waist: {measurements[0]?.waistCm ?? 79.5} cm · Chest: {measurements[0]?.chestCm ?? 101} cm
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
          <div className="text-xs text-slate-500 dark:text-slate-400">Training Sessions Logged</div>
          <div className="mt-2 text-2xl font-bold font-mono tabular-nums text-slate-900 dark:text-slate-100">
            {workouts.length} Workouts
          </div>
          <div className="mt-1 text-xs text-slate-500 font-mono tabular-nums">
            Latest volume: {workouts[0]?.volumeKg ?? 4820} kg (RPE {workouts[0]?.rpe ?? 8})
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
          <div className="text-xs text-slate-500 dark:text-slate-400">
            Today’s Estimated Nutrition
          </div>
          <div className="mt-2 text-2xl font-bold font-mono tabular-nums text-slate-900 dark:text-slate-100">
            {todayCalories} / {profile?.calorieTarget || 2350} kcal
          </div>
          <div className="mt-1 text-xs text-slate-500 font-mono tabular-nums">
            Protein: {todayProtein}g / {profile?.proteinTargetGrams || 165}g target (Est.)
          </div>
        </div>
      </div>

      {/* Main Grid: Left Entry Logger, Right Historical Ledger */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6">
          <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg mb-5">
            {[
              { id: 'workout', label: 'Workout Tracker', icon: Dumbbell },
              { id: 'nutrition', label: 'Nutrition (Est.)', icon: Utensils },
              { id: 'measurement', label: 'Measurements', icon: Activity },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActivePillar(tab.id as typeof activePillar)}
                className={`flex-1 py-1.5 px-2 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${
                  activePillar === tab.id
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {activePillar === 'workout' && (
            <form onSubmit={handleLogWorkout} className="space-y-3">
              <input
                type="text"
                required
                value={workoutTitle}
                onChange={(e) => setWorkoutTitle(e.target.value)}
                placeholder="Session Title (e.g., Lower Body Strength & Core)"
                className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-xs text-slate-900 dark:text-slate-100"
              />
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Duration (m)</label>
                  <input
                    type="number"
                    value={durationMinutes}
                    onChange={(e) => setDurationMinutes(Number(e.target.value))}
                    className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-2.5 py-1.5 text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Volume (kg)</label>
                  <input
                    type="number"
                    value={volumeKg}
                    onChange={(e) => setVolumeKg(Number(e.target.value))}
                    className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-2.5 py-1.5 text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">RPE (1–10)</label>
                  <input
                    type="number"
                    min={1}
                    max={10}
                    value={rpe}
                    onChange={(e) => setRpe(Number(e.target.value))}
                    className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-2.5 py-1.5 text-xs font-mono"
                  />
                </div>
              </div>
              <textarea
                rows={3}
                value={exercisesSummary}
                onChange={(e) => setExercisesSummary(e.target.value)}
                placeholder="Exercises, sets, reps & load (e.g. Squat 4x6 @ 110kg, RDL 3x8 @ 95kg)"
                className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-3 text-xs"
              />
              <label className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
                <input
                  type="checkbox"
                  checked={syncToCalendar}
                  onChange={(e) => setSyncToCalendar(e.target.checked)}
                />
                Also add workout block to unified Calendar
              </label>
              <button
                type="submit"
                className="w-full py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center justify-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" /> Log Workout (+40 XP)
              </button>
            </form>
          )}

          {activePillar === 'nutrition' && (
            <form onSubmit={handleLogMeal} className="space-y-3">
              <input
                type="text"
                required
                value={mealTitle}
                onChange={(e) => setMealTitle(e.target.value)}
                placeholder="Meal & portions (e.g., Grilled Chicken Breast, Rice & Olive Oil)"
                className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-xs text-slate-900 dark:text-slate-100"
              />
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Est. Calories (kcal)</label>
                  <input
                    type="number"
                    value={calories}
                    onChange={(e) => setCalories(Number(e.target.value))}
                    className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-2.5 py-1.5 text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Est. Protein (g)</label>
                  <input
                    type="number"
                    value={proteinGrams}
                    onChange={(e) => setProteinGrams(Number(e.target.value))}
                    className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-2.5 py-1.5 text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Est. Carbs (g)</label>
                  <input
                    type="number"
                    value={carbsGrams}
                    onChange={(e) => setCarbsGrams(Number(e.target.value))}
                    className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-2.5 py-1.5 text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Est. Fats (g)</label>
                  <input
                    type="number"
                    value={fatGrams}
                    onChange={(e) => setFatGrams(Number(e.target.value))}
                    className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-2.5 py-1.5 text-xs font-mono"
                  />
                </div>
              </div>
              <p className="text-xs text-slate-400">
                Note: Macronutrient values are estimates for personal awareness and not medical advice.
              </p>
              <button
                type="submit"
                className="w-full py-2 rounded-lg bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-xs font-semibold"
              >
                + Record Meal Entry
              </button>
            </form>
          )}

          {activePillar === 'measurement' && (
            <form onSubmit={handleLogMeasurement} className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Weight (kg)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={weightKg}
                    onChange={(e) => setWeightKg(Number(e.target.value))}
                    className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-2.5 py-1.5 text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Waist (cm)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={waistCm}
                    onChange={(e) => setWaistCm(Number(e.target.value))}
                    className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-2.5 py-1.5 text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Chest (cm)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={chestCm}
                    onChange={(e) => setChestCm(Number(e.target.value))}
                    className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-2.5 py-1.5 text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Arms (cm)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={armsCm}
                    onChange={(e) => setArmsCm(Number(e.target.value))}
                    className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-2.5 py-1.5 text-xs font-mono"
                  />
                </div>
              </div>
              <input
                type="text"
                value={measNotes}
                onChange={(e) => setMeasNotes(e.target.value)}
                placeholder="Private notes (never inferred automatically)"
                className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-xs"
              />
              <button
                type="submit"
                className="w-full py-2 rounded-lg bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-xs font-semibold"
              >
                + Save Body Measurement
              </button>
            </form>
          )}
        </div>

        {/* Right 7 Columns: Health & Fitness Activity Log */}
        <div className="lg:col-span-7 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6">
          <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100 mb-4">
            Health, Workout & Nutrition History
          </h2>

          {healthLogs.length === 0 ? (
            <p className="py-8 text-center text-xs text-slate-500">
              No health records logged yet.
            </p>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
              {healthLogs.map((log) => (
                <div key={log.id} className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <div className="text-sm font-medium text-slate-900 dark:text-slate-100">
                      {log.title}
                    </div>
                    <div className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                      <span className="capitalize">{log.logType}</span>
                      <span aria-hidden="true"> · </span>
                      <span className="font-mono tabular-nums">{log.date}</span>
                      {log.logType === 'workout' && (
                        <>
                          <span aria-hidden="true"> · </span>
                          <span className="font-mono tabular-nums">
                            {log.durationMinutes}m · {log.volumeKg}kg vol · RPE {log.rpe}
                          </span>
                        </>
                      )}
                      {log.logType === 'meal' && (
                        <>
                          <span aria-hidden="true"> · </span>
                          <span className="font-mono tabular-nums">
                            Est. {log.calories} kcal · {log.proteinGrams}g P / {log.carbsGrams}g C / {log.fatGrams}g F
                          </span>
                        </>
                      )}
                      {log.logType === 'measurement' && (
                        <>
                          <span aria-hidden="true"> · </span>
                          <span className="font-mono tabular-nums">
                            {log.weightKg}kg · Waist {log.waistCm}cm · Chest {log.chestCm}cm
                          </span>
                        </>
                      )}
                    </div>
                    {log.exercisesSummary && (
                      <div className="mt-1 text-xs text-slate-600 dark:text-slate-300 font-mono">
                        {log.exercisesSummary}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
