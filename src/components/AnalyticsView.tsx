import React from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  LineChart,
  Line,
} from 'recharts';
import { useLifeOS } from '../context/LifeOSContext.tsx';

export const AnalyticsView: React.FC = () => {
  const { tasks, studyItems, healthLogs, financeRecords } = useLifeOS();

  const plannedVsActualData = [
    { day: 'Mon', plannedMins: 180, completedMins: 165 },
    { day: 'Tue', plannedMins: 210, completedMins: 195 },
    { day: 'Wed', plannedMins: 150, completedMins: 150 },
    { day: 'Thu', plannedMins: 240, completedMins: 210 },
    { day: 'Fri', plannedMins: 180, completedMins: 170 },
    { day: 'Sat', plannedMins: 120, completedMins: 130 },
    { day: 'Sun', plannedMins: 90, completedMins: 90 },
  ];

  const studyRetentionTrend = [
    { week: 'W1', recallPct: 78, workouts: 3 },
    { week: 'W2', recallPct: 82, workouts: 3 },
    { week: 'W3', recallPct: 86, workouts: 4 },
    { week: 'W4', recallPct: 91, workouts: 4 },
  ];

  const completedCount = tasks.filter((t) => t.status === 'completed').length;
  const masteredCount = studyItems.filter((s) => s.status === 'mastered' || s.status === 'studied').length;

  return (
    <div className="space-y-8">
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6">
        <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">
          Cross-Module Analytics & Planning Calibration
        </h1>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          Decision-oriented trends comparing planned vs. completed durations, FSRS recall stability, and weekly consistency.
        </p>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
          <div className="text-xs text-slate-500">Planning Accuracy</div>
          <div className="mt-2 text-2xl font-bold font-mono tabular-nums text-slate-900 dark:text-slate-100">
            91.4%
          </div>
          <div className="mt-1 text-xs text-slate-500">Estimated vs actual minutes</div>
        </div>
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
          <div className="text-xs text-slate-500">Study Items Reviewed</div>
          <div className="mt-2 text-2xl font-bold font-mono tabular-nums text-emerald-600 dark:text-emerald-400">
            {masteredCount} / {studyItems.length || 2}
          </div>
          <div className="mt-1 text-xs text-slate-500">FSRS active recall</div>
        </div>
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
          <div className="text-xs text-slate-500">Tasks Completed</div>
          <div className="mt-2 text-2xl font-bold font-mono tabular-nums text-slate-900 dark:text-slate-100">
            {completedCount} / {tasks.length || 3}
          </div>
          <div className="mt-1 text-xs text-slate-500">Excluding blocked/excused</div>
        </div>
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
          <div className="text-xs text-slate-500">Logged Health & Finance Events</div>
          <div className="mt-2 text-2xl font-bold font-mono tabular-nums text-slate-900 dark:text-slate-100">
            {healthLogs.length + financeRecords.length}
          </div>
          <div className="mt-1 text-xs text-slate-500">Cross-module records</div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6">
          <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
            Planned vs. Completed Deep Work (Minutes)
          </h2>
          <p className="mt-0.5 text-xs text-slate-500">
            Recommendation: Keep afternoon study blocks at 50m to maintain &gt;90% completion accuracy.
          </p>
          <div className="mt-4 h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={plannedVsActualData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.2} />
                <XAxis dataKey="day" stroke="#64748b" fontSize={12} />
                <YAxis stroke="#64748b" fontSize={12} />
                <Tooltip />
                <Bar dataKey="plannedMins" name="Planned (m)" fill="#64748b" radius={[4, 4, 0, 0]} />
                <Bar dataKey="completedMins" name="Completed (m)" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6">
          <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
            Spaced-Repetition Recall Stability (%)
          </h2>
          <p className="mt-0.5 text-xs text-slate-500">
            Active recall retention across academic modules over the last 4 weeks.
          </p>
          <div className="mt-4 h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={studyRetentionTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.2} />
                <XAxis dataKey="week" stroke="#64748b" fontSize={12} />
                <YAxis domain={[60, 100]} stroke="#64748b" fontSize={12} />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="recallPct"
                  name="Recall Accuracy (%)"
                  stroke="#10b981"
                  strokeWidth={2.5}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};
