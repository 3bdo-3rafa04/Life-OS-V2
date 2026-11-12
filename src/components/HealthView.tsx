import React, { useState, useMemo } from 'react';
import { useLifeOS } from '../context/LifeOSContext.tsx';
import { Plus, Trash2, X } from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';

interface HealthViewProps {
  subPage?: string;
  onSubPageChange?: (sub: string) => void;
}

export const HealthView: React.FC<HealthViewProps> = ({
  subPage = 'measurements',
  onSubPageChange,
}) => {
  const {
    profile,
    healthLogs,
    todayDate,
    createHealthLog,
    deleteHealthLog,
    updateProfileSettings,
  } = useLifeOS();

  const [activeTab, setActiveTab] = useState<
    'measurements' | 'workouts' | 'nutrition' | 'sleep_water'
  >(
    (subPage as 'measurements' | 'workouts' | 'nutrition' | 'sleep_water') ||
      'measurements'
  );

  const [showLogModal, setShowLogModal] = useState(false);

  // Measurement Form
  const [weightKg, setWeightKg] = useState('');
  const [waistCm, setWaistCm] = useState('');
  const [chestCm, setChestCm] = useState('');

  // Workout Form
  const [workoutTitle, setWorkoutTitle] = useState('');
  const [workoutMins, setWorkoutMins] = useState(45);
  const [workoutVol, setWorkoutVol] = useState(4000);
  const [workoutRpe, setWorkoutRpe] = useState(8);
  const [workoutExercises, setWorkoutExercises] = useState('');

  // Meal Form
  const [mealTitle, setMealTitle] = useState('');
  const [mealCalories, setMealCalories] = useState(500);
  const [mealProtein, setMealProtein] = useState(35);
  const [mealCarbs, setMealCarbs] = useState(50);
  const [mealFat, setMealFat] = useState(15);

  const switchTab = (
    tab: 'measurements' | 'workouts' | 'nutrition' | 'sleep_water'
  ) => {
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
  const calorieTarget = profile?.calorieTarget || 2350;
  const proteinTarget = profile?.proteinTargetGrams || 165;
  const waterTargetMl = profile?.waterTargetMl || 3000;
  const waterLoggedMl = profile?.waterLoggedTodayMl || 0;
  const waterGlasses = Math.min(8, Math.round(waterLoggedMl / 375));

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
    setWeightKg('');
    setWaistCm('');
    setChestCm('');
    setShowLogModal(false);
  };

  const handleLogWorkout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!workoutTitle.trim()) return;
    await createHealthLog(
      {
        logType: 'workout',
        date: todayDate,
        title: workoutTitle.trim(),
        durationMinutes: workoutMins,
        volumeKg: workoutVol,
        rpe: workoutRpe,
        exercisesSummary: workoutExercises.trim() || undefined,
      },
      true
    );
    setWorkoutTitle('');
    setWorkoutExercises('');
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

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-[#E8EDE8]">Health</h1>
          <p className="text-xs text-[#9AA79E] mt-1">
            {measurements.length} measurements · {workouts.length} workouts · {meals.length} meals
            logged
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex items-center p-1 rounded-xl bg-[#222C27] border border-[#BDD3C1]/15 text-xs">
            {(
              [
                { id: 'measurements', label: 'Measurements' },
                { id: 'workouts', label: 'Workouts' },
                { id: 'nutrition', label: 'Nutrition' },
                { id: 'sleep_water', label: 'Sleep & water' },
              ] as const
            ).map((t) => (
              <button
                key={t.id}
                onClick={() => switchTab(t.id)}
                className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
                  activeTab === t.id
                    ? 'bg-[#9BB9A2] text-[#171E1B] font-semibold'
                    : 'text-[#9AA79E] hover:text-[#E8EDE8]'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          <button
            onClick={() => setShowLogModal(true)}
            className="px-4 py-2 rounded-xl bg-[#9BB9A2] hover:bg-[#a9c5b0] text-[#171E1B] text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" /> Log measurement
          </button>
        </div>
      </div>

      {/* Top 4 KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="sage-card p-4">
          <p className="text-xs text-[#9AA79E]">Body weight</p>
          <p className="text-2xl font-bold text-[#E8EDE8] mt-1">
            {latestMeasurement?.weightKg ? `${latestMeasurement.weightKg} kg` : '—'}
          </p>
          <p className="text-xs text-[#9BB9A2] mt-1">
            {latestMeasurement ? `Logged ${latestMeasurement.date}` : 'No measurement yet'}
          </p>
        </div>
        <div className="sage-card p-4">
          <p className="text-xs text-[#9AA79E]">Workouts logged</p>
          <p className="text-2xl font-bold text-[#E8EDE8] mt-1">{workouts.length}</p>
          <p className="text-xs text-[#9BB9A2] mt-1">
            {workouts[0] ? `Last: ${workouts[0].title}` : 'Log a workout below'}
          </p>
        </div>
        <div className="sage-card p-4">
          <p className="text-xs text-[#9AA79E]">Calories today</p>
          <p className="text-2xl font-bold text-[#E8EDE8] mt-1">{todayCalories}</p>
          <p className="text-xs text-[#9AA79E] mt-1">
            of {calorieTarget} kcal · {todayProtein}g protein
          </p>
        </div>
        <div className="sage-card p-4">
          <p className="text-xs text-[#9AA79E]">Water today</p>
          <p className="text-2xl font-bold text-[#E8EDE8] mt-1">
            {(waterLoggedMl / 1000).toFixed(2)} L
          </p>
          <p className="text-xs text-[#9BB9A2] mt-1">
            of {(waterTargetMl / 1000).toFixed(1)} L target
          </p>
        </div>
      </div>

      {/* MEASUREMENTS & WORKOUTS */}
      {(activeTab === 'measurements' || activeTab === 'workouts') && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Left 7-Col Body Measurements Chart + History */}
          <div className="lg:col-span-7 sage-card p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-[#E8EDE8]">Body measurements</h2>
              <button
                onClick={() => setShowLogModal(true)}
                className="text-xs text-[#9BB9A2] hover:underline"
              >
                + Add measurement
              </button>
            </div>

            {measurements.length > 0 ? (
              <>
                <div className="h-44">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={measurements}>
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
                      <Line
                        type="monotone"
                        dataKey="weightKg"
                        stroke="#9BB9A2"
                        strokeWidth={2.5}
                        dot={{ r: 3.5, fill: '#9BB9A2' }}
                        name="Weight (kg)"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                <div className="overflow-x-auto pt-2 border-t border-[#BDD3C1]/10">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="text-[10px] uppercase tracking-wider text-[#65756B] border-b border-[#BDD3C1]/10">
                        <th className="py-2">Date</th>
                        <th className="py-2">Weight</th>
                        <th className="py-2">Waist</th>
                        <th className="py-2">Chest</th>
                        <th className="py-2 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#BDD3C1]/8">
                      {measurements.map((row) => (
                        <tr key={row.id}>
                          <td className="py-2.5 font-medium text-[#E8EDE8]">{row.date}</td>
                          <td className="py-2.5 text-[#9BB9A2] font-semibold">
                            {row.weightKg ? `${row.weightKg} kg` : '—'}
                          </td>
                          <td className="py-2.5 text-[#9AA79E]">
                            {row.waistCm ? `${row.waistCm} cm` : '—'}
                          </td>
                          <td className="py-2.5 text-[#9AA79E]">
                            {row.chestCm ? `${row.chestCm} cm` : '—'}
                          </td>
                          <td className="py-2.5 text-right">
                            <button
                              onClick={() => deleteHealthLog(row.id)}
                              className="text-[#65756B] hover:text-[#D97A6C]"
                            >
                              <Trash2 className="w-3.5 h-3.5 inline" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            ) : (
              <div className="py-12 text-center space-y-2">
                <p className="text-xs text-[#9AA79E]">No body measurements logged yet.</p>
                <button
                  onClick={() => setShowLogModal(true)}
                  className="px-4 py-2 rounded-xl bg-[#9BB9A2] text-[#171E1B] text-xs font-semibold"
                >
                  + Log first measurement
                </button>
              </div>
            )}
          </div>

          {/* Right 5-Col Workout Logger & History */}
          <div className="lg:col-span-5 sage-card p-5 flex flex-col justify-between space-y-4">
            <form onSubmit={handleLogWorkout} className="space-y-3">
              <h2 className="text-sm font-semibold text-[#E8EDE8]">Log workout session</h2>
              <input
                type="text"
                required
                value={workoutTitle}
                onChange={(e) => setWorkoutTitle(e.target.value)}
                placeholder="Workout title (e.g. Push day, Upper body)..."
                className="w-full sage-input px-3.5 py-2 text-xs"
              />
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-[10px] text-[#9AA79E] mb-1">Duration (m)</label>
                  <input
                    type="number"
                    min={1}
                    value={workoutMins}
                    onChange={(e) => setWorkoutMins(Number(e.target.value))}
                    className="w-full sage-input px-2.5 py-1.5 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-[#9AA79E] mb-1">Volume (kg)</label>
                  <input
                    type="number"
                    min={0}
                    value={workoutVol}
                    onChange={(e) => setWorkoutVol(Number(e.target.value))}
                    className="w-full sage-input px-2.5 py-1.5 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-[#9AA79E] mb-1">RPE (1–10)</label>
                  <input
                    type="number"
                    min={1}
                    max={10}
                    value={workoutRpe}
                    onChange={(e) => setWorkoutRpe(Number(e.target.value))}
                    className="w-full sage-input px-2.5 py-1.5 text-xs"
                  />
                </div>
              </div>
              <input
                type="text"
                value={workoutExercises}
                onChange={(e) => setWorkoutExercises(e.target.value)}
                placeholder="Exercises summary (optional)..."
                className="w-full sage-input px-3.5 py-2 text-xs"
              />
              <button
                type="submit"
                className="w-full py-2 rounded-xl bg-[#9BB9A2] text-[#171E1B] text-xs font-semibold"
              >
                Save workout (+40 XP)
              </button>
            </form>

            <div className="pt-3 border-t border-[#BDD3C1]/10 space-y-2">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-[#65756B]">
                WORKOUT HISTORY ({workouts.length})
              </p>
              {workouts.length > 0 ? (
                workouts.slice(0, 5).map((w) => (
                  <div
                    key={w.id}
                    className="p-3 rounded-xl bg-[#2C3932]/75 flex items-center justify-between text-xs"
                  >
                    <div>
                      <p className="font-semibold text-[#E8EDE8]">{w.title}</p>
                      <p className="text-[11px] text-[#9AA79E]">
                        {w.date} · {w.durationMinutes || 45}m · {w.volumeKg || 0} kg · RPE{' '}
                        {w.rpe || 8}
                      </p>
                    </div>
                    <button
                      onClick={() => deleteHealthLog(w.id)}
                      className="text-[#65756B] hover:text-[#D97A6C]"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))
              ) : (
                <p className="text-xs text-[#65756B]">No workouts logged yet.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* NUTRITION TAB */}
      {activeTab === 'nutrition' && (
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
              <h2 className="text-sm font-semibold text-[#E8EDE8]">Daily targets</h2>
              <div className="flex items-center gap-5">
                <div className="w-24 h-24 rounded-full border-4 border-[#9BB9A2] flex flex-col items-center justify-center shrink-0">
                  <span className="text-base font-bold text-[#E8EDE8]">{todayCalories}</span>
                  <span className="text-[10px] text-[#9AA79E]">of {calorieTarget} kcal</span>
                </div>

                <div className="flex-1 space-y-2.5 text-xs">
                  {[
                    {
                      label: 'Protein',
                      val: `${todayProtein} / ${proteinTarget} g`,
                      pct: Math.min(100, Math.round((todayProtein / proteinTarget) * 100)),
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
      )}

      {/* SLEEP & WATER TAB */}
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
              Calorie target: {calorieTarget} kcal · Protein target: {proteinTarget} g · Water
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
              <h3 className="text-base font-semibold text-[#E8EDE8]">Log Body Measurement</h3>
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
