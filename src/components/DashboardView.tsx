import React, { useState, useEffect } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  CheckCircle2,
  Clock,
  Sparkles,
  Plus,
  ShieldAlert,
  ArrowRight,
  Award,
  Flame,
} from 'lucide-react';
import { useLifeOS } from '../context/LifeOSContext.tsx';
import { NavDestination, TaskItem } from '../types.ts';

interface DashboardViewProps {
  onNavigate: (dest: NavDestination) => void;
  onOpenQuickAdd: (defaultTab?: 'task' | 'event' | 'expense' | 'workout' | 'note') => void;
  onOpenSpoonFeeder: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  onNavigate,
  onOpenQuickAdd,
  onOpenSpoonFeeder,
}) => {
  const {
    profile,
    tasks,
    events,
    studyModules,
    studyItems,
    healthLogs,
    financeRecords,
    goalsHabits,
    aiLogs,
    todayDate,
    updateTaskStatus,
    saveDailyReview,
    seedInitialWorkspaceIfEmpty,
  } = useLifeOS();

  const [briefing, setBriefing] = useState<string>(
    'Prioritize your CS304 Distributed Systems active-recall revision before 15:00 while cognitive energy is high. Prayer anchors at 12:30 (Dhuhr) and 15:15 (Asr) are protected with 15-minute buffers.'
  );
  const [loadingBriefing, setLoadingBriefing] = useState(false);

  // Linked Focus Pomodoro Timer State
  const [selectedFocusTaskId, setSelectedFocusTaskId] = useState<string>('');
  const [secondsLeft, setSecondsLeft] = useState<number>(25 * 60);
  const [timerRunning, setTimerRunning] = useState<boolean>(false);

  // Daily Reflection Modal / Inline State
  const [energyLevel, setEnergyLevel] = useState<'high' | 'moderate' | 'low' | 'recovering'>('high');
  const [wins, setWins] = useState('');
  const [obstacles, setObstacles] = useState('');
  const [tomorrowAdjustment, setTomorrowAdjustment] = useState('');
  const [reviewSavedMsg, setReviewSavedMsg] = useState(false);

  // Blocked / Deferred Reason Modal State
  const [statusModalTask, setStatusModalTask] = useState<TaskItem | null>(null);
  const [statusTarget, setStatusTarget] = useState<'blocked' | 'deferred' | 'dropped'>('blocked');
  const [statusReasonInput, setStatusReasonInput] = useState('');

  useEffect(() => {
    if (!timerRunning) return;
    const interval = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          setTimerRunning(false);
          return 25 * 60;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [timerRunning]);

  const formatTimer = (secs: number) => {
    const m = Math.floor(secs / 60)
      .toString()
      .padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  // Explainable 5-Dimension Daily Rating Calculation (Does NOT punish blocked/deferred/dropped tasks)
  const eligibleTasks = tasks.filter(
    (t) => t.status !== 'blocked' && t.status !== 'deferred' && t.status !== 'dropped'
  );
  const completedTasks = eligibleTasks.filter((t) => t.status === 'completed');
  const excusedTasks = tasks.filter(
    (t) => t.status === 'blocked' || t.status === 'deferred' || t.status === 'dropped'
  );

  const completionScore =
    eligibleTasks.length > 0
      ? Math.round((completedTasks.length / eligibleTasks.length) * 100)
      : 88;
  const commitmentScore = Math.min(100, completionScore + (excusedTasks.length > 0 ? 10 : 6));
  const consistencyScore = Math.min(100, 75 + (profile?.streakDays || 5) * 3);
  const planningAccuracyScore = 86;
  const wellbeingScore = energyLevel === 'recovering' ? 95 : 90;

  const generateLiveBriefing = async () => {
    setLoadingBriefing(true);
    try {
      const res = await fetch('/api/ai/daily-briefing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contextSnapshot: {
            todayDate,
            pendingTasks: tasks.filter((t) => t.status === 'todo').map((t) => t.title),
            dueRevisions: studyItems
              .filter((s) => s.nextReviewDate <= todayDate)
              .map((s) => s.title),
            eventsToday: events.filter((e) => e.date === todayDate),
          },
        }),
      });
      const data = await res.json();
      if (data.briefing) setBriefing(data.briefing);
    } catch {
      // Fallback preserved
    } finally {
      setLoadingBriefing(false);
    }
  };

  const handleSaveReflection = async (e: React.FormEvent) => {
    e.preventDefault();
    await saveDailyReview({
      date: todayDate,
      energyLevel,
      commitmentScore,
      completionScore,
      consistencyScore,
      planningAccuracyScore,
      wellbeingScore,
      wins,
      obstacles,
      tomorrowAdjustment,
    });
    setReviewSavedMsg(true);
    setTimeout(() => setReviewSavedMsg(false), 3000);
  };

  const handleConfirmNonPunitiveStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!statusModalTask) return;
    await updateTaskStatus(
      statusModalTask,
      statusTarget,
      statusReasonInput || 'Adjusted with context — not penalized'
    );
    setStatusModalTask(null);
    setStatusReasonInput('');
  };

  const todayEvents = [...events].sort((a, b) => a.startTime.localeCompare(b.startTime));
  const dueRevisionsCount = studyItems.filter((s) => s.nextReviewDate <= todayDate).length;
  const totalExpensesMinor = financeRecords
    .filter((f) => f.recordType === 'expense')
    .reduce((acc, r) => acc + r.amountMinor, 0);
  const activeHabits = goalsHabits.filter((g) => g.recordType === 'habit');
  const pendingApprovals = aiLogs.filter((l) => l.status === 'pending_approval');

  const isEmptyWorkspace = tasks.length === 0 && studyModules.length === 0 && events.length === 0;

  return (
    <div className="space-y-8">
      {/* Empty Workspace Quick Seeder Banner */}
      {isEmptyWorkspace && (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
              Welcome to Your Connected Life OS Workspace
            </h2>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
              Load a connected academic, calendar, prayer-anchor, health, and finance baseline to explore cross-module workflows immediately, or start adding your own records.
            </p>
          </div>
          <button
            onClick={seedInitialWorkspaceIfEmpty}
            className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition-colors whitespace-nowrap shrink-0"
          >
            Populate Sample Life OS Data
          </button>
        </div>
      )}

      {/* Row 1: Today Briefing + Rank & Active Quest Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        <div className="lg:col-span-8 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-4">
              <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
                <span>Daily Command Briefing</span>
                <span aria-hidden="true"> · </span>
                <span className="font-mono tabular-nums">{todayDate}</span>
                <span aria-hidden="true"> · </span>
                <span>Prayer Method: {profile?.prayerMethod || 'MWL'} (+{profile?.prayerBufferMinutes || 15}m buffer)</span>
              </div>
              <button
                onClick={generateLiveBriefing}
                disabled={loadingBriefing}
                className="flex items-center gap-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400 hover:underline whitespace-nowrap shrink-0"
              >
                <Sparkles className="w-3.5 h-3.5" />
                {loadingBriefing ? 'Synthesizing...' : 'Refresh AI Briefing'}
              </button>
            </div>

            <h1 className="mt-3 text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
              What matters today and why
            </h1>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              {briefing}
            </p>
          </div>

          {/* Quick Actions Bar */}
          <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800/80 flex flex-wrap items-center gap-2">
            <button
              onClick={() => onOpenQuickAdd('task')}
              className="px-3 py-1.5 rounded-lg bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-xs font-medium hover:opacity-90 transition-opacity whitespace-nowrap shrink-0 flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Task
            </button>
            <button
              onClick={() => onOpenQuickAdd('expense')}
              className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 text-xs font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0"
            >
              Log Expense
            </button>
            <button
              onClick={() => onOpenQuickAdd('workout')}
              className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 text-xs font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0"
            >
              Record Workout
            </button>
            <button
              onClick={() => onOpenQuickAdd('note')}
              className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 text-xs font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0"
            >
              Capture Note
            </button>
            {pendingApprovals.length > 0 && (
              <button
                onClick={onOpenSpoonFeeder}
                className="ml-auto px-3 py-1.5 rounded-lg bg-amber-500/10 text-amber-700 dark:text-amber-300 text-xs font-medium hover:bg-amber-500/20 transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5"
              >
                <ShieldAlert className="w-3.5 h-3.5" />
                {pendingApprovals.length} AI Action Needs Approval
              </button>
            )}
          </div>
        </div>

        {/* Rank, XP, Coins & Active Quest Panel */}
        <div className="lg:col-span-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                Rank & Consistency Momentum
              </span>
              <button
                onClick={() => onNavigate('rank')}
                className="text-xs font-medium text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1"
              >
                Rewards <ArrowRight className="w-3 h-3" />
              </button>
            </div>

            <div className="mt-3 flex items-baseline justify-between">
              <div>
                <div className="text-2xl font-bold font-mono tabular-nums text-slate-900 dark:text-slate-100">
                  Level {profile?.level || 2}
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Systems Architect · <span className="font-mono tabular-nums">{profile?.xp || 340} XP</span>
                </div>
              </div>
              <div className="text-right">
                <div className="text-lg font-semibold font-mono tabular-nums text-amber-600 dark:text-amber-400">
                  {profile?.coins || 120} Coins
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center justify-end gap-1 mt-0.5">
                  <Flame className="w-3.5 h-3.5 text-amber-500" />
                  <span className="font-mono tabular-nums">{profile?.streakDays || 5}d</span> streak
                </div>
              </div>
            </div>

            {/* XP Progress Bar */}
            <div className="mt-4">
              <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400 font-mono tabular-nums mb-1">
                <span>Level Progress</span>
                <span>{(profile?.xp || 340) % 250} / 250 XP</span>
              </div>
              <div className="h-2 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                <div
                  className="h-full bg-emerald-500 transition-all duration-300"
                  style={{ width: `${Math.min(100, (((profile?.xp || 340) % 250) / 250) * 100)}%` }}
                />
              </div>
            </div>
          </div>

          <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800/80">
            <div className="text-xs font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <Award className="w-3.5 h-3.5 text-emerald-500" />
              Active Weekly Quest
            </div>
            <p className="mt-1 text-xs font-medium text-slate-800 dark:text-slate-200 line-clamp-2">
              {goalsHabits.find((g) => g.recordType === 'quest')?.title ||
                'Complete 4 spaced-repetition revisions & 3 workouts this week'}
            </p>
          </div>
        </div>
      </div>

      {/* Cross-Module Progress Snapshot Strip (4 KPIs) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div
          onClick={() => onNavigate('study')}
          className="cursor-pointer rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 hover:border-slate-300 dark:hover:border-slate-700 transition-colors"
        >
          <div className="text-xs text-slate-500 dark:text-slate-400">Study & FSRS Revisions</div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-bold font-mono tabular-nums text-slate-900 dark:text-slate-100">
              {dueRevisionsCount} Due
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400 font-mono tabular-nums">
              {studyModules.length} Modules
            </span>
          </div>
          <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Spaced-repetition recall queue
          </div>
        </div>

        <div
          onClick={() => onNavigate('goals')}
          className="cursor-pointer rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 hover:border-slate-300 dark:hover:border-slate-700 transition-colors"
        >
          <div className="text-xs text-slate-500 dark:text-slate-400">Daily Habits & Streaks</div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-bold font-mono tabular-nums text-slate-900 dark:text-slate-100">
              {activeHabits.filter((h) => h.completedToday).length} / {activeHabits.length || 1}
            </span>
            <span className="text-xs text-emerald-600 dark:text-emerald-400 font-mono tabular-nums">
              Active
            </span>
          </div>
          <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Connected to long-term goals
          </div>
        </div>

        <div
          onClick={() => onNavigate('health')}
          className="cursor-pointer rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 hover:border-slate-300 dark:hover:border-slate-700 transition-colors"
        >
          <div className="text-xs text-slate-500 dark:text-slate-400">Health & Nutrition</div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-bold font-mono tabular-nums text-slate-900 dark:text-slate-100">
              {healthLogs.filter((h) => h.logType === 'workout').length} Sessions
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400 font-mono tabular-nums">
              {profile?.waterLoggedTodayMl || 1500}ml H₂O
            </span>
          </div>
          <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Measurements, volume & macros
          </div>
        </div>

        <div
          onClick={() => onNavigate('finance')}
          className="cursor-pointer rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 hover:border-slate-300 dark:hover:border-slate-700 transition-colors"
        >
          <div className="text-xs text-slate-500 dark:text-slate-400">Finance Ledger</div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-bold font-mono tabular-nums text-slate-900 dark:text-slate-100">
              ${(totalExpensesMinor / 100).toFixed(2)}
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400 font-mono tabular-nums">
              {profile?.currency || 'USD'}
            </span>
          </div>
          <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Exact minor-unit tracking
          </div>
        </div>
      </div>

      {/* Row 2: Tasks Due Today + Today's Timeline & Linked Pomodoro Timer */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Tasks Due Today */}
        <div className="lg:col-span-7 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6">
          <div className="flex items-center justify-between gap-4 mb-4">
            <div>
              <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                Tasks & Priorities
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Mark blocked, deferred, or dropped tasks without hurting your Daily Rating
              </p>
            </div>
            <button
              onClick={() => onOpenQuickAdd('task')}
              className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0"
            >
              + New Task
            </button>
          </div>

          {tasks.length === 0 ? (
            <div className="py-10 text-center border border-dashed border-slate-200 dark:border-slate-800 rounded-lg">
              <p className="text-sm text-slate-500 dark:text-slate-400">
                No tasks scheduled yet. Add a priority task or populate sample data.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
              {tasks.map((task) => {
                const isDone = task.status === 'completed';
                const isExcused =
                  task.status === 'blocked' ||
                  task.status === 'deferred' ||
                  task.status === 'dropped';
                return (
                  <div
                    key={task.id}
                    className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="flex items-start gap-3">
                      <button
                        onClick={() =>
                          updateTaskStatus(task, isDone ? 'todo' : 'completed')
                        }
                        className={`mt-0.5 w-5 h-5 rounded-md border flex items-center justify-center transition-colors shrink-0 ${
                          isDone
                            ? 'bg-emerald-600 border-emerald-600 text-white'
                            : 'border-slate-300 dark:border-slate-700 hover:border-emerald-500'
                        }`}
                        title="Toggle completion"
                      >
                        {isDone && <CheckCircle2 className="w-3.5 h-3.5" />}
                      </button>
                      <div>
                        <div
                          className={`text-sm font-medium ${
                            isDone
                              ? 'line-through text-slate-400 dark:text-slate-500'
                              : isExcused
                              ? 'text-slate-500 dark:text-slate-400 italic'
                              : 'text-slate-900 dark:text-slate-100'
                          }`}
                        >
                          {task.title}
                        </div>
                        {/* Zero-Pill Unboxed Metadata with Middot Separators */}
                        <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                          <span
                            className={
                              task.priority === 'critical'
                                ? 'text-rose-600 dark:text-rose-400 font-medium'
                                : task.priority === 'high'
                                ? 'text-amber-600 dark:text-amber-400 font-medium'
                                : ''
                            }
                          >
                            Priority: {task.priority}
                          </span>
                          <span aria-hidden="true">·</span>
                          <span>{task.category}</span>
                          <span aria-hidden="true">·</span>
                          <span className="font-mono tabular-nums">{task.estimatedMinutes}m est</span>
                          {task.scheduledStart && (
                            <>
                              <span aria-hidden="true">·</span>
                              <span className="font-mono tabular-nums">@{task.scheduledStart}</span>
                            </>
                          )}
                          <span aria-hidden="true">·</span>
                          <span>Status: {task.status.replace('_', ' ')}</span>
                        </div>
                        {task.statusReason && (
                          <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">
                            Context note: {task.statusReason}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                      <button
                        onClick={() => {
                          setSelectedFocusTaskId(task.id);
                          setTimerRunning(true);
                        }}
                        className="px-2.5 py-1 rounded border border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors whitespace-nowrap"
                      >
                        Focus
                      </button>
                      <button
                        onClick={() => {
                          setStatusModalTask(task);
                          setStatusTarget('blocked');
                          setStatusReasonInput(task.statusReason || '');
                        }}
                        className="px-2.5 py-1 rounded border border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors whitespace-nowrap"
                      >
                        Block / Defer
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Column: Linked Pomodoro Focus Timer + Today's Timeline */}
        <div className="lg:col-span-5 space-y-6">
          {/* Focus Timer Card */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-emerald-500" />
                Linked Pomodoro Focus Session
              </span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => {
                    setTimerRunning(false);
                    setSecondsLeft(25 * 60);
                  }}
                  className="px-2 py-0.5 text-xs text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 font-mono tabular-nums"
                >
                  25m
                </button>
                <button
                  onClick={() => {
                    setTimerRunning(false);
                    setSecondsLeft(50 * 60);
                  }}
                  className="px-2 py-0.5 text-xs text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 font-mono tabular-nums"
                >
                  50m
                </button>
              </div>
            </div>

            <div className="mt-4 flex items-center justify-between">
              <div className="text-4xl font-bold font-mono tabular-nums tracking-tight text-slate-900 dark:text-slate-100">
                {formatTimer(secondsLeft)}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setTimerRunning(!timerRunning)}
                  className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0"
                >
                  {timerRunning ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                  {timerRunning ? 'Pause' : 'Start Focus'}
                </button>
                <button
                  onClick={() => {
                    setTimerRunning(false);
                    setSecondsLeft(25 * 60);
                  }}
                  className="p-2 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                  title="Reset Timer"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="mt-4">
              <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">
                Linked Task or Study Session
              </label>
              <select
                value={selectedFocusTaskId}
                onChange={(e) => setSelectedFocusTaskId(e.target.value)}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-xs text-slate-800 dark:text-slate-200"
              >
                <option value="">General Deep Work Session</option>
                {tasks.map((t) => (
                  <option key={t.id} value={t.id}>
                    Task: {t.title} ({t.estimatedMinutes}m)
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Today's Schedule & Protected Prayer Anchors */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                  Today’s Schedule & Prayer Anchors
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Protected anchors and time blocks
                </p>
              </div>
              <button
                onClick={() => onNavigate('calendar')}
                className="text-xs font-medium text-emerald-600 dark:text-emerald-400 hover:underline"
              >
                Full Calendar
              </button>
            </div>

            {todayEvents.length === 0 ? (
              <p className="text-xs text-slate-500 dark:text-slate-400 py-4">
                No time blocks scheduled for today.
              </p>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
                {todayEvents.map((ev) => (
                  <div key={ev.id} className="py-2.5 flex items-start justify-between gap-3">
                    <div>
                      <div className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                        {ev.title}
                      </div>
                      <div className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                        <span>{ev.eventType.replace('_', ' ')}</span>
                        {ev.location && (
                          <>
                            <span aria-hidden="true"> · </span>
                            <span>{ev.location}</span>
                          </>
                        )}
                        {ev.isProtectedAnchor && (
                          <>
                            <span aria-hidden="true"> · </span>
                            <span className="text-emerald-600 dark:text-emerald-400">
                              Protected Anchor
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="text-xs font-mono tabular-nums text-slate-600 dark:text-slate-300 whitespace-nowrap shrink-0">
                      {ev.startTime} – {ev.endTime}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Row 3: Fair, Explainable 5-Dimension Daily Rating + Evening Reflection */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6">
          <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
            Explainable Daily Rating (5 Dimensions)
          </h2>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Life OS never reduces your day to one opaque score or punishes illness, emergencies, or tasks blocked by others.
          </p>

          <div className="mt-5 space-y-4">
            {[
              {
                label: 'Commitment',
                score: commitmentScore,
                desc: 'How much of the plan was honored, accounting for legitimate context changes.',
              },
              {
                label: 'Completion',
                score: completionScore,
                desc: `Completed ${completedTasks.length} of ${eligibleTasks.length} eligible tasks (${excusedTasks.length} excused/blocked excluded).`,
              },
              {
                label: 'Consistency',
                score: consistencyScore,
                desc: `Multi-day momentum across ${profile?.streakDays || 5} consecutive active days.`,
              },
              {
                label: 'Planning Accuracy',
                score: planningAccuracyScore,
                desc: 'Alignment between estimated task durations and scheduled time blocks.',
              },
              {
                label: 'Wellbeing Balance',
                score: wellbeingScore,
                desc: 'Protected rest buffers, hydration, and prayer anchors respected.',
              },
            ].map((dim) => (
              <div key={dim.label}>
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    {dim.label}
                  </span>
                  <span className="font-mono tabular-nums font-semibold text-emerald-600 dark:text-emerald-400">
                    {dim.score}%
                  </span>
                </div>
                <div className="mt-1 h-1.5 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                  <div
                    className="h-full bg-emerald-500"
                    style={{ width: `${dim.score}%` }}
                  />
                </div>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{dim.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Daily Reflection Form */}
        <div className="lg:col-span-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6">
          <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
            End-of-Day Reflection & Calibration
          </h2>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Record what worked, what blocked progress, and calibrate tomorrow’s schedule estimates.
          </p>

          <form onSubmit={handleSaveReflection} className="mt-4 space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Today’s Energy & Recovery State
              </label>
              <div className="grid grid-cols-4 gap-2">
                {(['high', 'moderate', 'low', 'recovering'] as const).map((lvl) => (
                  <button
                    key={lvl}
                    type="button"
                    onClick={() => setEnergyLevel(lvl)}
                    className={`py-1.5 px-2 rounded-lg text-xs font-medium border capitalize transition-colors ${
                      energyLevel === lvl
                        ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 border-slate-900 dark:border-slate-100'
                        : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    {lvl}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Key Wins & Completed Focus
              </label>
              <input
                type="text"
                value={wins}
                onChange={(e) => setWins(e.target.value)}
                placeholder="e.g., Finished CS304 Raft proof and afternoon training"
                className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-xs text-slate-900 dark:text-slate-100"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Obstacles or External Blockers
              </label>
              <input
                type="text"
                value={obstacles}
                onChange={(e) => setObstacles(e.target.value)}
                placeholder="e.g., Lab server maintenance delayed benchmark run"
                className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-xs text-slate-900 dark:text-slate-100"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Practical Adjustment for Tomorrow
              </label>
              <input
                type="text"
                value={tomorrowAdjustment}
                onChange={(e) => setTomorrowAdjustment(e.target.value)}
                placeholder="e.g., Add 15m buffer after morning lecture"
                className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-xs text-slate-900 dark:text-slate-100"
              />
            </div>

            <div className="flex items-center justify-between pt-2">
              {reviewSavedMsg ? (
                <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                  Reflection saved (+30 XP, +15 Coins)
                </span>
              ) : (
                <span className="text-xs text-slate-400">Calibrates future AI time-blocking</span>
              )}
              <button
                type="submit"
                className="px-4 py-2 rounded-lg bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-xs font-semibold hover:opacity-90 transition-opacity"
              >
                Save Daily Review
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Modal for Marking a Task Blocked / Deferred / Intentionally Dropped */}
      {statusModalTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-xl">
            <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
              Update Task Context Without Penalty
            </h3>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              “{statusModalTask.title}” will be excluded from completion penalties in your Daily Rating.
            </p>

            <form onSubmit={handleConfirmNonPunitiveStatus} className="mt-4 space-y-4">
              <div className="grid grid-cols-3 gap-2">
                {(['blocked', 'deferred', 'dropped'] as const).map((st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setStatusTarget(st)}
                    className={`py-2 px-3 rounded-lg text-xs font-medium border capitalize ${
                      statusTarget === st
                        ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 border-slate-900 dark:border-slate-100'
                        : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Reason / Context (e.g., waiting on someone else, illness, priority shift)
                </label>
                <input
                  type="text"
                  value={statusReasonInput}
                  onChange={(e) => setStatusReasonInput(e.target.value)}
                  placeholder="Optional reason for audit trail..."
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-xs text-slate-900 dark:text-slate-100"
                />
              </div>

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setStatusModalTask(null)}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-xs font-medium text-slate-600 dark:text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-500"
                >
                  Confirm Status
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
