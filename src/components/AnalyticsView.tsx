import React, { useState, useMemo } from 'react';
import { useLifeOS } from '../context/LifeOSContext';

export const AnalyticsView: React.FC = () => {
  const {
    profile,
    tasks,
    studyItems,
    healthLogs,
    financeRecords,
    goalsHabits,
    dailyReviews,
    saveDailyReview,
  } = useLifeOS();

  const [subTab, setSubTab] = useState<'Overview' | 'Custom reports' | 'Daily review'>('Overview');
  const [selectedMetricA, setSelectedMetricA] = useState<'Study Hours' | 'Tasks Completed'>(
    'Study Hours'
  );
  const [selectedMetricB, setSelectedMetricB] = useState<'Workout Mins' | 'Expenses'>(
    'Workout Mins'
  );

  // Daily Review Form State
  const todayStr = new Date().toISOString().split('T')[0];
  const existingTodayReview = dailyReviews.find((r) => r.date === todayStr);

  const [wins, setWins] = useState(existingTodayReview?.wins ?? '');
  const [obstacles, setObstacles] = useState(existingTodayReview?.obstacles ?? '');
  const [tomorrowAdjustment, setTomorrowAdjustment] = useState(
    existingTodayReview?.tomorrowAdjustment ?? ''
  );
  const [energyLevel, setEnergyLevel] = useState<'high' | 'moderate' | 'low' | 'recovering'>(
    existingTodayReview?.energyLevel ?? 'high'
  );
  const [wellbeingScore, setWellbeingScore] = useState(existingTodayReview?.wellbeingScore ?? 85);
  const [reviewSavedToast, setReviewSavedToast] = useState(false);

  // Live metrics calculation
  const completedTasks = tasks.filter((t) => t.status === 'completed');
  const completionRate =
    tasks.length > 0 ? Math.round((completedTasks.length / tasks.length) * 100) : 0;

  const totalFocusMinutes = completedTasks.reduce(
    (sum, t) => sum + (t.actualMinutes || t.estimatedMinutes || 0),
    0
  );
  const totalFocusHours = +(totalFocusMinutes / 60).toFixed(1);

  const workoutLogs = healthLogs.filter((h) => h.logType === 'workout');
  const totalWorkoutMinutes = workoutLogs.reduce((s, h) => s + (h.durationMinutes || 0), 0);

  const totalExpensesMajor =
    financeRecords
      .filter((f) => f.recordType === 'expense')
      .reduce((s, f) => s + (f.amountMinor || 0), 0) / 100;

  // Last 7 days breakdown
  const last7Days = useMemo(() => {
    const days: {
      dateStr: string;
      label: string;
      plannedHrs: number;
      completedHrs: number;
      workoutMins: number;
      tasksDone: number;
      expenses: number;
    }[] = [];

    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const label = d.toLocaleDateString('en-US', { weekday: 'short' });

      const dayTasks = tasks.filter((t) => t.dueDate.startsWith(dateStr));
      const dayDone = dayTasks.filter((t) => t.status === 'completed');
      const plannedHrs = +(
        dayTasks.reduce((s, t) => s + (t.estimatedMinutes || 0), 0) / 60
      ).toFixed(1);
      const completedHrs = +(
        dayDone.reduce((s, t) => s + (t.actualMinutes || t.estimatedMinutes || 0), 0) / 60
      ).toFixed(1);

      const dayWorkoutMins = healthLogs
        .filter((h) => h.logType === 'workout' && h.date.startsWith(dateStr))
        .reduce((s, h) => s + (h.durationMinutes || 0), 0);

      const dayExpenses =
        financeRecords
          .filter((f) => f.recordType === 'expense' && f.date.startsWith(dateStr))
          .reduce((s, f) => s + (f.amountMinor || 0), 0) / 100;

      days.push({
        dateStr,
        label,
        plannedHrs,
        completedHrs,
        workoutMins: dayWorkoutMins,
        tasksDone: dayDone.length,
        expenses: +dayExpenses.toFixed(2),
      });
    }
    return days;
  }, [tasks, healthLogs, financeRecords]);

  // Last 28 days consistency grid
  const last28Days = useMemo(() => {
    const cells: { dateStr: string; count: number }[] = [];
    for (let i = 27; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const count =
        tasks.filter((t) => t.status === 'completed' && t.dueDate.startsWith(dateStr)).length +
        healthLogs.filter((h) => h.date.startsWith(dateStr)).length +
        dailyReviews.filter((r) => r.date === dateStr).length;
      cells.push({ dateStr, count });
    }
    return cells;
  }, [tasks, healthLogs, dailyReviews]);

  const handleSaveReview = async (e: React.FormEvent) => {
    e.preventDefault();
    await saveDailyReview({
      date: todayStr,
      energyLevel,
      commitmentScore: completionRate,
      completionScore: completionRate,
      consistencyScore: Math.min(100, (profile?.streakDays ?? 1) * 10),
      planningAccuracyScore: 85,
      wellbeingScore: Math.min(100, Math.max(0, Number(wellbeingScore) || 85)),
      wins: wins.trim() || 'Completed daily review',
      obstacles: obstacles.trim() || 'None logged',
      tomorrowAdjustment: tomorrowAdjustment.trim() || 'Maintain schedule blocks',
    });
    setReviewSavedToast(true);
    setTimeout(() => setReviewSavedToast(false), 3000);
  };

  const handleExportCSV = () => {
    const headers = [
      'Date',
      'Day',
      'Planned Hours',
      'Completed Hours',
      'Tasks Done',
      'Workout Mins',
      'Expenses',
    ];
    const rows = last7Days.map((d) => [
      d.dateStr,
      d.label,
      d.plannedHrs,
      d.completedHrs,
      d.tasksDone,
      d.workoutMins,
      d.expenses,
    ]);
    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `life-os-analytics-${todayStr}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 pb-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-widest text-[var(--text-muted)]">
            ANALYTICS · CROSS-SYSTEM INSIGHTS · DAILY REVIEW
          </p>
          <h1 className="text-2xl font-bold tracking-tight mt-0.5">Performance &amp; patterns</h1>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-xl p-1">
            {(['Overview', 'Custom reports', 'Daily review'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setSubTab(t)}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  subTab === t
                    ? 'bg-[var(--bg-secondary)] text-[var(--text-primary)] font-semibold'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
          <button
            onClick={handleExportCSV}
            className="px-3.5 py-2 rounded-xl text-xs font-medium bg-[var(--bg-card)] border border-[var(--border-subtle)] hover:bg-[var(--bg-hover)]"
          >
            Export CSV
          </button>
        </div>
      </div>

      {/* Top KPI Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-2xl p-5">
          <p className="text-xs text-[var(--text-muted)]">Task Completion Rate</p>
          <div className="text-3xl font-bold mt-2">{completionRate}%</div>
          <p className="text-xs text-[#6EBF8B] mt-1">
            {completedTasks.length} of {tasks.length} total tasks completed
          </p>
        </div>
        <div className="bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-2xl p-5">
          <p className="text-xs text-[var(--text-muted)]">Completed Focus Time</p>
          <div className="text-3xl font-bold mt-2">{totalFocusHours} hrs</div>
          <p className="text-xs text-[var(--text-muted)] mt-1">
            Across {studyItems.length} study items &amp; completed tasks
          </p>
        </div>
        <div className="bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-2xl p-5">
          <p className="text-xs text-[var(--text-muted)]">Total Workout Time</p>
          <div className="text-3xl font-bold mt-2">{totalWorkoutMinutes} min</div>
          <p className="text-xs text-[var(--text-muted)] mt-1">
            {workoutLogs.length} workout sessions recorded
          </p>
        </div>
        <div className="bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-2xl p-5">
          <p className="text-xs text-[var(--text-muted)]">Total Logged Expenses</p>
          <div className="text-3xl font-bold mt-2">
            {profile?.currency || 'USD'} {totalExpensesMajor.toLocaleString()}
          </div>
          <p className="text-xs text-[var(--text-muted)] mt-1">
            {financeRecords.length} total finance records
          </p>
        </div>
      </div>

      {subTab === 'Overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Planned vs Completed Hours */}
          <div className="lg:col-span-7 bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-2xl p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-base font-bold">Planned vs completed work (Last 7 days)</h2>
                <p className="text-xs text-[var(--text-muted)]">
                  Calculated from task estimated durations by due date
                </p>
              </div>
              <div className="flex items-center gap-4 text-xs">
                <span className="flex items-center gap-1.5 text-[var(--text-muted)]">
                  <span className="w-2.5 h-2.5 rounded-sm bg-[var(--bg-secondary)] inline-block" />{' '}
                  Planned
                </span>
                <span className="flex items-center gap-1.5 text-[#9BB9A2]">
                  <span className="w-2.5 h-2.5 rounded-sm bg-[#9BB9A2] inline-block" /> Completed
                </span>
              </div>
            </div>

            <div className="grid grid-cols-7 gap-3 items-end h-44 pt-4 px-2">
              {last7Days.map((d) => {
                const maxHrs = Math.max(
                  4,
                  ...last7Days.map((x) => Math.max(x.plannedHrs, x.completedHrs))
                );
                const plannedH = Math.round((d.plannedHrs / maxHrs) * 100);
                const completedH = Math.round((d.completedHrs / maxHrs) * 100);
                return (
                  <div
                    key={d.dateStr}
                    className="flex flex-col items-center gap-2 h-full justify-end"
                  >
                    <div className="w-full flex items-end justify-center gap-1.5 h-32">
                      <div
                        className="w-3 rounded-t bg-[var(--bg-secondary)] transition-all"
                        style={{ height: `${Math.max(6, plannedH)}%` }}
                        title={`Planned: ${d.plannedHrs}h`}
                      />
                      <div
                        className="w-3 rounded-t bg-[#9BB9A2] transition-all"
                        style={{ height: `${Math.max(6, completedH)}%` }}
                        title={`Completed: ${d.completedHrs}h`}
                      />
                    </div>
                    <div className="text-[11px] text-[var(--text-muted)] font-medium">
                      {d.label}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 28-Day Consistency Heatmap */}
          <div className="lg:col-span-5 bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-2xl p-6 flex flex-col justify-between">
            <div>
              <h2 className="text-base font-bold mb-1">28-day activity consistency</h2>
              <p className="text-xs text-[var(--text-muted)] mb-5">
                Combined completions across tasks, health logs, and daily reviews
              </p>

              <div className="grid grid-cols-7 gap-2">
                {last28Days.map((cell) => {
                  const intensity =
                    cell.count === 0
                      ? 'bg-[var(--bg-secondary)]/50'
                      : cell.count === 1
                      ? 'bg-[#9BB9A2]/30'
                      : cell.count <= 3
                      ? 'bg-[#9BB9A2]/60'
                      : 'bg-[#9BB9A2]';
                  return (
                    <div
                      key={cell.dateStr}
                      className={`h-8 rounded-lg ${intensity} border border-[var(--border-subtle)] flex items-center justify-center text-[10px] font-medium`}
                      title={`${cell.dateStr}: ${cell.count} actions`}
                    >
                      {cell.count > 0 ? cell.count : ''}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="pt-4 mt-4 border-t border-[var(--border-subtle)] flex items-center justify-between text-xs text-[var(--text-muted)]">
              <span>Active streak: {profile?.streakDays ?? 0} days</span>
              <span>{goalsHabits.filter((g) => g.completedToday).length} habits done today</span>
            </div>
          </div>
        </div>
      )}

      {subTab === 'Custom reports' && (
        <div className="bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-2xl p-6 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-bold">Cross-domain correlation table (Last 7 days)</h2>
              <p className="text-xs text-[var(--text-muted)]">
                Compare any two metrics across your live workspace records
              </p>
            </div>
            <div className="flex items-center gap-2">
              <select
                value={selectedMetricA}
                onChange={(e) =>
                  setSelectedMetricA(e.target.value as 'Study Hours' | 'Tasks Completed')
                }
                className="px-3 py-1.5 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-subtle)] text-xs"
              >
                <option value="Study Hours">Study Hours</option>
                <option value="Tasks Completed">Tasks Completed</option>
              </select>
              <span className="text-xs text-[var(--text-muted)]">vs</span>
              <select
                value={selectedMetricB}
                onChange={(e) => setSelectedMetricB(e.target.value as 'Workout Mins' | 'Expenses')}
                className="px-3 py-1.5 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-subtle)] text-xs"
              >
                <option value="Workout Mins">Workout Mins</option>
                <option value="Expenses">Expenses</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[var(--border-subtle)] text-[11px] uppercase text-[var(--text-muted)]">
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Day</th>
                  <th className="py-3 px-4">{selectedMetricA}</th>
                  <th className="py-3 px-4">{selectedMetricB}</th>
                  <th className="py-3 px-4">Planned Hours</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-subtle)] text-xs">
                {last7Days.map((d) => (
                  <tr key={d.dateStr} className="hover:bg-[var(--bg-hover)]/40">
                    <td className="py-3 px-4 font-mono">{d.dateStr}</td>
                    <td className="py-3 px-4">{d.label}</td>
                    <td className="py-3 px-4 font-semibold text-[#9BB9A2]">
                      {selectedMetricA === 'Study Hours' ? `${d.completedHrs} hrs` : d.tasksDone}
                    </td>
                    <td className="py-3 px-4 font-semibold">
                      {selectedMetricB === 'Workout Mins'
                        ? `${d.workoutMins} min`
                        : `${profile?.currency || 'USD'} ${d.expenses}`}
                    </td>
                    <td className="py-3 px-4 text-[var(--text-muted)]">{d.plannedHrs} hrs</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {subTab === 'Daily review' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <form
            onSubmit={handleSaveReview}
            className="lg:col-span-7 bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-2xl p-6 space-y-4"
          >
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold">End-of-day reflection ({todayStr})</h2>
                <p className="text-xs text-[var(--text-muted)]">
                  Saves to Firestore and awards +40 XP &amp; +15 coins
                </p>
              </div>
              {reviewSavedToast && (
                <span className="px-3 py-1 rounded-lg bg-[#6EBF8B]/20 text-[#6EBF8B] text-xs font-semibold">
                  Review saved ✓
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-[var(--text-muted)] mb-1">Energy level</label>
                <select
                  value={energyLevel}
                  onChange={(e) =>
                    setEnergyLevel(e.target.value as 'high' | 'moderate' | 'low' | 'recovering')
                  }
                  className="w-full px-3 py-2 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-subtle)] text-sm"
                >
                  <option value="high">High</option>
                  <option value="moderate">Moderate</option>
                  <option value="low">Low</option>
                  <option value="recovering">Recovering</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-[var(--text-muted)] mb-1">
                  Wellbeing score (0 - 100)
                </label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={wellbeingScore}
                  onChange={(e) => setWellbeingScore(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-subtle)] text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs text-[var(--text-muted)] mb-1">
                Today&apos;s wins
              </label>
              <textarea
                rows={2}
                value={wins}
                onChange={(e) => setWins(e.target.value)}
                placeholder="What went well today?"
                className="w-full px-3 py-2 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-subtle)] text-sm"
              />
            </div>

            <div>
              <label className="block text-xs text-[var(--text-muted)] mb-1">
                Obstacles / Root cause of friction
              </label>
              <textarea
                rows={2}
                value={obstacles}
                onChange={(e) => setObstacles(e.target.value)}
                placeholder="What caused friction or delay?"
                className="w-full px-3 py-2 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-subtle)] text-sm"
              />
            </div>

            <div>
              <label className="block text-xs text-[var(--text-muted)] mb-1">
                Adjustment &amp; priorities for tomorrow
              </label>
              <textarea
                rows={3}
                value={tomorrowAdjustment}
                onChange={(e) => setTomorrowAdjustment(e.target.value)}
                placeholder="Complete active recall deck, protect morning study block..."
                className="w-full px-3 py-2 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-subtle)] text-sm"
              />
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                className="px-5 py-2.5 rounded-xl text-xs font-semibold bg-[var(--accent)] text-[#0F1613] hover:opacity-90"
              >
                Save Daily Review
              </button>
            </div>
          </form>

          {/* Past Reviews Log */}
          <div className="lg:col-span-5 bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-2xl p-6">
            <h2 className="text-base font-bold mb-4">
              Recent daily reviews ({dailyReviews.length})
            </h2>
            {dailyReviews.length === 0 ? (
              <div className="py-10 text-center text-xs text-[var(--text-muted)] border border-dashed border-[var(--border-subtle)] rounded-xl">
                No daily reviews submitted yet. Complete your first reflection on the left.
              </div>
            ) : (
              <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
                {dailyReviews.map((r) => (
                  <div
                    key={r.id}
                    className="p-4 rounded-xl bg-[var(--bg-secondary)]/40 border border-[var(--border-subtle)] space-y-1.5"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-[#9BB9A2]">{r.date}</span>
                      <span className="text-[var(--text-muted)] capitalize">
                        Energy: {r.energyLevel} · Wellbeing {r.wellbeingScore}%
                      </span>
                    </div>
                    <p className="text-xs">
                      <strong className="text-[var(--text-secondary)]">Wins:</strong> {r.wins}
                    </p>
                    {r.obstacles && r.obstacles !== 'None logged' && (
                      <p className="text-xs text-[var(--text-muted)]">
                        <strong>Obstacles:</strong> {r.obstacles}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
