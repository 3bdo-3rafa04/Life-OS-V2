import React, { useState, useMemo } from 'react';
import { useLifeOS } from '../context/LifeOSContext.tsx';
import { NavDestination } from '../types.ts';
import { SmartSchedulerPanel } from './SmartSchedulerPanel.tsx';
import { PixelAvatarSprite } from './PixelStudyRoomCanvas.tsx';
import {
  Play,
  Pause,
  Check,
  Sparkles,
  Plus,
  ArrowRight,
  Wand2,
  Trash2,
  Calendar,
  BookOpen,
  HeartPulse,
  Target,
  ChevronDown,
  ChevronUp,
  Clock,
  Flame,
  Trophy,
  Gamepad2,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';

interface DashboardViewProps {
  onNavigate: (dest: NavDestination) => void;
  onOpenQuickAdd: () => void;
  onOpenSpoonFeeder: (initialPrompt?: string) => void;
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
    personalRecords,
    workoutSchedules,
    financeRecords,
    goalsHabits,
    pomodoroState,
    pomodoroSessions,
    todayDate,
    currentTimeStr,
    timezone,
    updateTaskStatus,
    deleteTask,
    toggleHabitOrGoalCompletion,
    togglePomodoro,
    completePomodoroSession,
    generateSmartSchedule,
    rpgState,
    rpgRankEval,
    rpgLevelInfo,
    openRpgWorld,
  } = useLifeOS();

  const [chartRange, setChartRange] = useState<'today' | '7d' | '30d' | '12m'>('7d');
  const [briefingText, setBriefingText] = useState<string>('');
  const [loadingBriefing, setLoadingBriefing] = useState(false);
  const [showPlanDayModal, setShowPlanDayModal] = useState(false);
  const [showSecondaryAnalytics, setShowSecondaryAnalytics] = useState(false);

  const formatTimer = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const currency = profile?.currency || 'EGP';
  const firstName = profile?.displayName?.split(' ')[0] || 'User';

  // Time-aware greeting
  const greetingLabel = useMemo(() => {
    const hour = Number(currentTimeStr?.split(':')[0] || 9);
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  }, [currentTimeStr]);

  // 1. Tasks & Priorities
  const totalTasksCount = tasks.length;
  const completedTasksCount = tasks.filter((t) => t.status === 'completed').length;
  const openTasks = tasks.filter((t) => t.status !== 'completed');
  const completionPct =
    totalTasksCount > 0 ? Math.round((completedTasksCount / totalTasksCount) * 100) : 0;

  // 2. Study & Exams
  const dueRevisions = studyItems.filter(
    (s) => s.status === 'review_due' || s.nextReviewDate <= todayDate
  );
  const overdueRevisions = dueRevisions.filter((s) => s.nextReviewDate < todayDate);
  const upcomingExams = useMemo(
    () =>
      studyModules
        .filter((m) => m.examDate && m.examDate >= todayDate)
        .sort((a, b) => (a.examDate || '').localeCompare(b.examDate || '')),
    [studyModules, todayDate]
  );
  const nextExam = upcomingExams[0] || null;

  // 3. Habits & Goals
  const habits = goalsHabits.filter((g) => g.recordType === 'habit');
  const habitsDone = habits.filter((h) => h.completedToday).length;
  const habitsTotal = habits.length;
  const activeGoals = goalsHabits.filter((g) => g.recordType === 'goal');
  const activeQuest = goalsHabits.find((g) => g.recordType === 'quest');

  // 4. Health & Fitness Snapshot
  const measurements = useMemo(
    () =>
      healthLogs
        .filter((h) => h.logType === 'measurement')
        .sort((a, b) => a.date.localeCompare(b.date)),
    [healthLogs]
  );
  const latestWeight = measurements[measurements.length - 1]?.weightKg || null;
  const todayMeals = healthLogs.filter((h) => h.logType === 'meal' && h.date === todayDate);
  const todayCalories = todayMeals.reduce((acc, m) => acc + (m.calories || 0), 0);
  const todayProtein = todayMeals.reduce((acc, m) => acc + (m.proteinGrams || 0), 0);
  const calorieTarget = profile?.calorieTarget || 2350;
  const proteinTarget = profile?.proteinTargetGrams || 165;
  const todayWorkoutPlanned = workoutSchedules.find((w) => w.date === todayDate);

  // 5. Finance Snapshot
  const todayExpenses = financeRecords
    .filter((f) => f.recordType === 'expense' && f.date === todayDate)
    .reduce((acc, r) => acc + r.amountMinor / 100, 0);
  const currentMonthPrefix = todayDate.slice(0, 7);
  const monthExpenses = financeRecords
    .filter((f) => f.recordType === 'expense' && f.date.startsWith(currentMonthPrefix))
    .reduce((acc, r) => acc + r.amountMinor / 100, 0);
  const totalBudget = financeRecords
    .filter((f) => f.recordType === 'budget')
    .reduce((acc, r) => acc + (r.targetAmountMinor || r.amountMinor) / 100, 0);

  // 6. Study Time Chart (Pomodoro-based)
  const liveActivePomodoroMins =
    pomodoroState.mode === 'focus' ? Math.floor(pomodoroState.elapsedFocusSeconds / 60) : 0;

  const { chartData, totalStudyHours } = useMemo(() => {
    const days: { date: string; day: string; studyHours: number; revisionHours: number }[] = [];
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    let sumHours = 0;

    const numDays = chartRange === 'today' ? 1 : chartRange === '30d' ? 14 : 7;

    for (let i = numDays - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const iso = d.toISOString().split('T')[0];
      const dayLabel = chartRange === '30d' ? iso.slice(5) : dayNames[d.getDay()];

      const dayPomodoros = pomodoroSessions.filter(
        (s) => s.date === iso && s.mode === 'focus'
      );

      const isToday = iso === todayDate;
      const liveDeepExtra =
        isToday &&
        pomodoroState.category !== 'Active Recall' &&
        pomodoroState.category !== 'Exam Practice'
          ? liveActivePomodoroMins
          : 0;
      const liveRecallExtra =
        isToday &&
        (pomodoroState.category === 'Active Recall' ||
          pomodoroState.category === 'Exam Practice')
          ? liveActivePomodoroMins
          : 0;

      const deepStudyPomodoroMins =
        dayPomodoros
          .filter(
            (s) => s.category !== 'Active Recall' && s.category !== 'Exam Practice'
          )
          .reduce((acc, s) => acc + s.durationMinutes, 0) + liveDeepExtra;

      const recallPomodoroMins =
        dayPomodoros
          .filter(
            (s) => s.category === 'Active Recall' || s.category === 'Exam Practice'
          )
          .reduce((acc, s) => acc + s.durationMinutes, 0) + liveRecallExtra;

      const studyH = Math.round((deepStudyPomodoroMins / 60) * 100) / 100;
      const revH = Math.round((recallPomodoroMins / 60) * 100) / 100;
      sumHours += studyH + revH;

      days.push({
        date: iso,
        day: dayLabel,
        studyHours: studyH,
        revisionHours: revH,
      });
    }
    return { chartData: days, totalStudyHours: Math.round(sumHours * 10) / 10 };
  }, [
    pomodoroSessions,
    chartRange,
    todayDate,
    liveActivePomodoroMins,
    pomodoroState.category,
  ]);

  const linkedTaskObj = tasks.find((t) => t.id === pomodoroState.linkedTaskId);
  const linkedStudyObj = studyItems.find((s) => s.id === pomodoroState.linkedStudyItemId);
  const activeFocusItem =
    linkedStudyObj?.title ||
    linkedTaskObj?.title ||
    pomodoroState.customLabel ||
    openTasks[0]?.title ||
    dueRevisions[0]?.title ||
    pomodoroState.category;

  const todayEvents = events
    .filter((e) => e.date === todayDate)
    .sort((a, b) => a.startTime.localeCompare(b.startTime));

  const upcomingEventsToday = todayEvents.filter((e) => e.endTime >= currentTimeStr);

  const handleCompletePomodoro = async () => {
    await completePomodoroSession();
  };

  const handleGenerateBriefing = async () => {
    setLoadingBriefing(true);
    try {
      const res = await fetch('/api/ai/daily-briefing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contextSnapshot: {
            todayDate,
            pendingTasks: openTasks.slice(0, 5).map((t) => t.title),
            dueRevisions: dueRevisions.slice(0, 5).map((r) => r.title),
            prayerMethod: profile?.prayerMethod || 'Egypt',
          },
        }),
      });
      const data = await res.json();
      setBriefingText(data.briefing || '');
    } catch {
      setBriefingText(
        `You have ${openTasks.length} open tasks and ${dueRevisions.length} due revisions today.`
      );
    } finally {
      setLoadingBriefing(false);
    }
  };

  const handleOpenPlanMyDay = async () => {
    setShowPlanDayModal(true);
    await generateSmartSchedule({ targetDays: 1 });
  };

  const totalPomodoroSecs = Math.max(60, pomodoroState.totalDurationSeconds);
  const ringProgress = Math.min(
    1,
    Math.max(0, 1 - pomodoroState.remainingSeconds / totalPomodoroSecs)
  );
  const ringRadius = 38;
  const ringCircumference = 2 * Math.PI * ringRadius;
  const ringOffset = ringCircumference * (1 - ringProgress);

  const formattedDateLabel = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  });

  return (
    <div className="space-y-6">
      {/* 1. COMMAND CENTER HEADER: Greeting, Date & Primary Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-1">
        <div>
          <h1 className="text-2xl md:text-[28px] font-semibold tracking-tight text-[var(--text-primary)]">
            {greetingLabel}, {firstName}
          </h1>
          <p className="text-xs md:text-sm text-[var(--text-secondary)] mt-1">
            {formattedDateLabel} · <span className="font-mono">{currentTimeStr}</span> ({timezone}) ·{' '}
            <span className="text-[var(--accent)] font-medium">
              {openTasks.length} open tasks
            </span>
            , {dueRevisions.length} revisions due
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => openRpgWorld('study_room')}
            className="px-3.5 py-2 rounded-xl bg-[#172A32] hover:bg-[#294C45] border border-[#D7B779]/50 text-[#D7B779] text-xs font-semibold flex items-center gap-2 transition-colors"
            title="Open Full-Screen Pixel-Art RPG World & Study Room"
          >
            <Gamepad2 className="w-3.5 h-3.5" />
            <span>
              {rpgRankEval.rank} · Lv.{rpgLevelInfo.level}
            </span>
          </button>
          <button
            onClick={handleOpenPlanMyDay}
            className="px-3.5 py-2 rounded-xl bg-[var(--bg-secondary)] hover:bg-[var(--bg-hover)] border border-[var(--border-glass)] text-[var(--text-primary)] text-xs font-medium flex items-center gap-1.5 transition-colors"
          >
            <Wand2 className="w-3.5 h-3.5 text-[var(--accent)]" />
            Plan my day
          </button>
          <button
            onClick={onOpenQuickAdd}
            className="px-3.5 py-2 rounded-xl bg-[var(--bg-secondary)] hover:bg-[var(--bg-hover)] border border-[var(--border-glass)] text-[var(--text-primary)] text-xs font-medium flex items-center gap-1.5 transition-colors"
          >
            <Plus className="w-3.5 h-3.5 text-[var(--accent)]" />
            Add task
          </button>
          <button
            onClick={togglePomodoro}
            className="px-4 py-2 rounded-xl bg-[#456B57] dark:bg-[#9BB9A2] text-white dark:text-[#171E1B] text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm"
          >
            {pomodoroState.running ? (
              <>
                <Pause className="w-3.5 h-3.5" /> Pause focus
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5" /> Start focus
              </>
            )}
          </button>
        </div>
      </div>

      {/* 2. PRIMARY DAILY WORKSPACE ROW: Today's Top Priorities + Upcoming Schedule & Live Focus */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left (7 cols): Today's Top Priorities + Daily Habits */}
        <div className="lg:col-span-7 space-y-5">
          {/* Today's Priorities Card */}
          <div className="sage-card p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-sm font-semibold text-[var(--text-primary)]">
                  Today&apos;s Priorities
                </h2>
                <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                  {completedTasksCount} of {totalTasksCount} tasks completed ({completionPct}%)
                </p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={onOpenQuickAdd}
                  className="text-xs font-medium text-[var(--accent)] hover:underline"
                >
                  + Quick add
                </button>
                <button
                  onClick={() => onNavigate('tasks')}
                  className="text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] flex items-center gap-1"
                >
                  All tasks <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            </div>

            {tasks.length > 0 ? (
              <div className="space-y-1.5">
                {tasks.slice(0, 6).map((t) => {
                  const isDone = t.status === 'completed';
                  return (
                    <div
                      key={t.id}
                      className="flex items-center justify-between gap-3 py-2 px-2.5 rounded-xl hover:bg-[var(--bg-secondary)]/60 transition-colors group"
                    >
                      <div
                        onClick={() => updateTaskStatus(t, isDone ? 'todo' : 'completed')}
                        className="flex items-center gap-3 min-w-0 flex-1 cursor-pointer"
                      >
                        <div
                          className={`w-4 h-4 rounded-md flex items-center justify-center shrink-0 border transition-colors ${
                            isDone
                              ? 'bg-[#456B57] dark:bg-[#9BB9A2] border-[#456B57] dark:border-[#9BB9A2] text-white dark:text-[#171E1B]'
                              : 'border-[var(--text-muted)] bg-transparent'
                          }`}
                        >
                          {isDone && <Check className="w-3 h-3 stroke-[3]" />}
                        </div>
                        <span
                          className={`text-xs font-medium truncate ${
                            isDone
                              ? 'line-through text-[var(--text-muted)]'
                              : 'text-[var(--text-primary)]'
                          }`}
                        >
                          {t.title}
                        </span>
                        {t.priority === 'critical' || t.priority === 'high' ? (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-[#D97A6C]/15 text-[#D97A6C] shrink-0">
                            {t.priority}
                          </span>
                        ) : null}
                      </div>
                      <div className="flex items-center gap-2.5 shrink-0">
                        <span className="text-[11px] text-[var(--text-muted)] font-mono tabular-nums">
                          {t.estimatedMinutes || 30}m
                        </span>
                        <button
                          onClick={() => deleteTask(t.id)}
                          className="opacity-70 group-hover:opacity-100 text-[var(--text-muted)] hover:text-[#D97A6C] transition-opacity"
                          title="Delete task"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="py-7 text-center space-y-2.5">
                <p className="text-xs text-[var(--text-secondary)]">
                  Your priority list is clear for today.
                </p>
                <button
                  onClick={onOpenQuickAdd}
                  className="px-3.5 py-1.5 rounded-xl bg-[#456B57] dark:bg-[#9BB9A2] text-white dark:text-[#171E1B] text-xs font-semibold"
                >
                  + Add your first priority
                </button>
              </div>
            )}
          </div>

          {/* 5. Habits & Daily Progress Bar */}
          <div className="sage-card p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Flame className="w-4 h-4 text-[#D8B26E]" />
                <h2 className="text-sm font-semibold text-[var(--text-primary)]">
                  Daily Habits &amp; Rituals
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[var(--bg-secondary)] text-[var(--accent)] tabular-nums">
                  {habitsDone}/{habitsTotal} done · {profile?.streakDays || 0}d streak
                </span>
              </div>
              <button
                onClick={() => onNavigate('goals')}
                className="text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] flex items-center gap-1"
              >
                Manage <ArrowRight className="w-3 h-3" />
              </button>
            </div>

            {habits.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {habits.map((h) => (
                  <button
                    key={h.id}
                    onClick={() => toggleHabitOrGoalCompletion(h)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-medium flex items-center gap-2 border transition-all ${
                      h.completedToday
                        ? 'bg-[#456B57]/15 dark:bg-[#9BB9A2]/20 border-[#456B57]/40 dark:border-[#9BB9A2]/40 text-[var(--text-primary)]'
                        : 'bg-[var(--bg-primary)] border-[var(--border-glass)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    <span
                      className={`w-3.5 h-3.5 rounded-full flex items-center justify-center ${
                        h.completedToday
                          ? 'bg-[#456B57] dark:bg-[#9BB9A2] text-white dark:text-[#171E1B]'
                          : 'border border-[var(--text-muted)]'
                      }`}
                    >
                      {h.completedToday && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                    </span>
                    <span>{h.title}</span>
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-xs text-[var(--text-secondary)]">
                No daily habits configured yet. Open Life &amp; Finance to add daily habits.
              </p>
            )}
          </div>
        </div>

        {/* Right (5 cols): 3. Upcoming Schedule & Active Focus Session */}
        <div className="lg:col-span-5 sage-card p-5 flex flex-col justify-between space-y-5">
          {/* Active Focus Session Header */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-[var(--accent)]" />
                <span className="text-xs font-semibold text-[var(--text-primary)]">
                  Focus Timer · {pomodoroState.category}
                </span>
              </div>
              <button
                onClick={() => onNavigate('pomodoro')}
                className="text-xs font-medium text-[var(--accent)] hover:underline"
              >
                Pomodoro Studio →
              </button>
            </div>

            <div className="p-3.5 rounded-2xl bg-[var(--bg-primary)] border border-[var(--border-glass)] flex items-center gap-4">
              <div className="relative w-20 h-20 shrink-0 flex items-center justify-center">
                <svg className="w-20 h-20 -rotate-90" viewBox="0 0 96 96">
                  <circle
                    cx="48"
                    cy="48"
                    r={ringRadius}
                    fill="none"
                    stroke="var(--bg-secondary)"
                    strokeWidth="6"
                  />
                  <circle
                    cx="48"
                    cy="48"
                    r={ringRadius}
                    fill="none"
                    stroke="var(--accent)"
                    strokeWidth="6"
                    strokeLinecap="round"
                    strokeDasharray={ringCircumference}
                    strokeDashoffset={ringOffset}
                  />
                </svg>
                <span className="absolute text-sm font-bold text-[var(--text-primary)] font-mono tabular-nums">
                  {formatTimer(pomodoroState.remainingSeconds)}
                </span>
              </div>

              <div className="min-w-0 flex-1">
                <h3 className="text-xs font-semibold text-[var(--text-primary)] truncate">
                  {activeFocusItem}
                </h3>
                <p className="text-[11px] text-[var(--text-secondary)] mt-0.5 tabular-nums">
                  Session #{pomodoroState.sessionNumber} · {totalStudyHours}h focused ({chartRange})
                </p>
                <div className="flex items-center gap-2 mt-2.5">
                  <button
                    onClick={togglePomodoro}
                    className="px-3 py-1.5 rounded-lg bg-[var(--bg-secondary)] hover:bg-[var(--bg-hover)] text-xs font-medium text-[var(--text-primary)] flex items-center gap-1 transition-colors"
                  >
                    {pomodoroState.running ? (
                      <>
                        <Pause className="w-3 h-3" /> Pause
                      </>
                    ) : (
                      <>
                        <Play className="w-3 h-3" /> Start
                      </>
                    )}
                  </button>
                  <button
                    onClick={handleCompletePomodoro}
                    className="px-3 py-1.5 rounded-lg bg-[#456B57] dark:bg-[#9BB9A2] text-white dark:text-[#171E1B] text-xs font-semibold transition-colors"
                  >
                    Log session
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Upcoming Schedule & Next Events */}
          <div className="pt-2 border-t border-[var(--border-glass)] flex-1 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2.5">
                <div className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-[var(--accent)]" />
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
                    Today&apos;s Schedule ({todayEvents.length})
                  </h3>
                </div>
                <button
                  onClick={() => onNavigate('calendar')}
                  className="text-xs font-medium text-[var(--accent)] hover:underline"
                >
                  Open Calendar →
                </button>
              </div>

              {todayEvents.length > 0 ? (
                <div className="space-y-1.5">
                  {(upcomingEventsToday.length > 0 ? upcomingEventsToday : todayEvents)
                    .slice(0, 4)
                    .map((ev) => (
                      <div
                        key={ev.id}
                        className="flex items-center justify-between gap-2 py-1.5 px-2.5 rounded-xl bg-[var(--bg-primary)]/60 border border-[var(--border-glass)] text-xs"
                      >
                        <span className="text-[var(--text-muted)] font-mono tabular-nums shrink-0">
                          {ev.startTime}–{ev.endTime}
                        </span>
                        <span
                          className={`flex-1 truncate font-medium ${
                            ev.eventType === 'prayer' || ev.isProtectedAnchor
                              ? 'text-[#D8B26E]'
                              : 'text-[var(--text-primary)]'
                          }`}
                        >
                          {ev.title}
                        </span>
                      </div>
                    ))}
                </div>
              ) : (
                <div className="py-4 text-center rounded-xl bg-[var(--bg-primary)]/50 border border-[var(--border-glass)]">
                  <p className="text-xs text-[var(--text-secondary)]">
                    No blocks scheduled for today yet.
                  </p>
                  <button
                    onClick={handleOpenPlanMyDay}
                    className="mt-1.5 text-xs font-semibold text-[var(--accent)] hover:underline"
                  >
                    Generate adaptive schedule →
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 3. DOMAIN SNAPSHOT ROW: (4) Study & Exams, (6) Health & Fitness, (8) Contextual AI Insights */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* (4) Study Progress & Upcoming Exams */}
        <div className="sage-card p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-[var(--accent)]" />
                <h2 className="text-sm font-semibold text-[var(--text-primary)]">
                  Study &amp; Revisions
                </h2>
              </div>
              <button
                onClick={() => onNavigate('study')}
                className="text-xs font-medium text-[var(--accent)] hover:underline"
              >
                Study Hub →
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 my-2">
              <div className="p-3 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-glass)]">
                <p className="text-[11px] text-[var(--text-secondary)]">Revisions Due</p>
                <p className="text-xl font-bold text-[var(--text-primary)] tabular-nums mt-0.5">
                  {dueRevisions.length}
                </p>
                <p className="text-[10px] text-[#D8B26E] mt-0.5">
                  {overdueRevisions.length} overdue
                </p>
              </div>
              <div className="p-3 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-glass)]">
                <p className="text-[11px] text-[var(--text-secondary)]">Active Modules</p>
                <p className="text-xl font-bold text-[var(--text-primary)] tabular-nums mt-0.5">
                  {studyModules.length}
                </p>
                <p className="text-[10px] text-[var(--text-muted)] mt-0.5">
                  {studyItems.length} lectures
                </p>
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-[var(--border-glass)] text-xs text-[var(--text-secondary)] flex items-center justify-between">
            <span className="truncate">
              {nextExam
                ? `Next exam: ${nextExam.title} (${nextExam.examDate})`
                : 'All exam dates up to date'}
            </span>
          </div>
        </div>

        {/* (6) Health & Fitness Snapshot */}
        <div className="sage-card p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <HeartPulse className="w-4 h-4 text-[var(--accent)]" />
                <h2 className="text-sm font-semibold text-[var(--text-primary)]">
                  Health &amp; Fitness
                </h2>
              </div>
              <button
                onClick={() => onNavigate('health')}
                className="text-xs font-medium text-[var(--accent)] hover:underline"
              >
                Health Hub →
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 my-2">
              <div className="p-3 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-glass)]">
                <p className="text-[11px] text-[var(--text-secondary)]">Body Weight</p>
                <p className="text-xl font-bold text-[var(--text-primary)] tabular-nums mt-0.5">
                  {latestWeight ? `${latestWeight} kg` : '—'}
                </p>
                <p className="text-[10px] text-[var(--accent)] mt-0.5">
                  {personalRecords.length} exercise PRs
                </p>
              </div>
              <div className="p-3 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-glass)]">
                <p className="text-[11px] text-[var(--text-secondary)]">Nutrition Today</p>
                <p className="text-xl font-bold text-[var(--text-primary)] tabular-nums mt-0.5">
                  {todayCalories}{' '}
                  <span className="text-xs font-normal text-[var(--text-muted)]">kcal</span>
                </p>
                <p className="text-[10px] text-[var(--text-muted)] tabular-nums mt-0.5">
                  {todayProtein}g / {proteinTarget}g protein
                </p>
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-[var(--border-glass)] text-xs text-[var(--text-secondary)] flex items-center justify-between">
            <span className="truncate">
              {todayWorkoutPlanned
                ? `Today: ${todayWorkoutPlanned.templateName} (${todayWorkoutPlanned.status})`
                : `Target: ${calorieTarget} kcal · ${(profile?.waterLoggedTodayMl || 0) / 1000}L water`}
            </span>
          </div>
        </div>

        {/* (8) Contextual AI Insights & Recommendations */}
        <div className="sage-card p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2.5">
              <div className="flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-[var(--accent)]" />
                <h2 className="text-sm font-semibold text-[var(--text-primary)]">
                  Spoon Feeder AI
                </h2>
              </div>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[var(--bg-secondary)] text-[var(--accent)]">
                CONTEXTUAL
              </span>
            </div>

            <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
              {briefingText ||
                `You have ${openTasks.length} open tasks and ${dueRevisions.length} due revisions. Generate a quick daily briefing or open the AI drawer to organize your day.`}
            </p>
          </div>

          <div className="flex items-center justify-between gap-2 mt-4 pt-3 border-t border-[var(--border-glass)]">
            <button
              onClick={handleGenerateBriefing}
              disabled={loadingBriefing}
              className="px-3.5 py-1.5 rounded-xl bg-[#456B57] dark:bg-[#9BB9A2] text-white dark:text-[#171E1B] text-xs font-semibold transition-colors"
            >
              {loadingBriefing ? 'Analyzing...' : 'Daily briefing'}
            </button>

            <button
              onClick={() => onOpenSpoonFeeder()}
              className="text-xs font-medium text-[var(--accent)] hover:underline flex items-center gap-1"
            >
              Open AI Assistant <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>

      {/* 4. PROGRESSIVE DISCLOSURE: Study Time Chart, Goals, Finance & Rank */}
      <div className="sage-card overflow-hidden">
        <button
          onClick={() => setShowSecondaryAnalytics((prev) => !prev)}
          className="w-full px-5 py-3.5 flex items-center justify-between text-left hover:bg-[var(--bg-secondary)]/40 transition-colors"
        >
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-xs font-semibold text-[var(--text-primary)]">
              Detailed Study Analytics, Goals, Finance &amp; Rank
            </span>
            <span className="text-xs text-[var(--text-secondary)] tabular-nums">
              {totalStudyHours}h focused · {activeGoals.length} active goals · {currency}{' '}
              {Math.round(todayExpenses)} spent today · Level {profile?.level || 1}
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-xs font-medium text-[var(--accent)]">
            <span>{showSecondaryAnalytics ? 'Hide details' : 'Expand details'}</span>
            {showSecondaryAnalytics ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </div>
        </button>

        {showSecondaryAnalytics && (
          <div className="p-5 pt-2 border-t border-[var(--border-glass)] space-y-5">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
              {/* Pomodoro Study Time Chart (7 cols) */}
              <div className="lg:col-span-7 p-4 rounded-2xl bg-[var(--bg-primary)] border border-[var(--border-glass)] flex flex-col justify-between">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-4">
                  <div>
                    <p className="text-xs font-medium text-[var(--text-secondary)]">
                      Study time (Pomodoro timer)
                    </p>
                    <div className="flex items-center gap-2.5 mt-1">
                      <span className="text-2xl font-bold text-[var(--text-primary)] tabular-nums">
                        {totalStudyHours} h
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-[var(--bg-secondary)] text-[var(--accent)]">
                        {pomodoroSessions.length} pomodoros logged
                      </span>
                    </div>
                  </div>

                  <div className="inline-flex items-center p-1 rounded-xl bg-[var(--bg-card)] border border-[var(--border-glass)] text-xs">
                    {(
                      [
                        { id: 'today', label: 'Today' },
                        { id: '7d', label: '7 days' },
                        { id: '30d', label: '30 days' },
                        { id: '12m', label: '12 months' },
                      ] as const
                    ).map((tab) => (
                      <button
                        key={tab.id}
                        onClick={() => setChartRange(tab.id)}
                        className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
                          chartRange === tab.id
                            ? 'bg-[#456B57] dark:bg-[#9BB9A2] text-white dark:text-[#171E1B] font-semibold'
                            : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                        }`}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="h-44 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                      data={chartData}
                      margin={{ top: 6, right: 8, left: -24, bottom: 0 }}
                    >
                      <defs>
                        <linearGradient id="sageGrad1" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#9BB9A2" stopOpacity={0.55} />
                          <stop offset="95%" stopColor="#9BB9A2" stopOpacity={0.08} />
                        </linearGradient>
                        <linearGradient id="sageGrad2" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#6C8C76" stopOpacity={0.45} />
                          <stop offset="95%" stopColor="#6C8C76" stopOpacity={0.05} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="rgba(189, 211, 193, 0.12)"
                        vertical={false}
                      />
                      <XAxis
                        dataKey="day"
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
                          backgroundColor: 'var(--bg-card)',
                          borderColor: 'var(--border-glass)',
                          borderRadius: '10px',
                          fontSize: '12px',
                          color: 'var(--text-primary)',
                        }}
                      />
                      <Area
                        type="monotone"
                        dataKey="studyHours"
                        stackId="1"
                        stroke="#9BB9A2"
                        strokeWidth={2}
                        fill="url(#sageGrad1)"
                        name="Study Blocks (h)"
                      />
                      <Area
                        type="monotone"
                        dataKey="revisionHours"
                        stackId="1"
                        stroke="#789A82"
                        strokeWidth={1.5}
                        fill="url(#sageGrad2)"
                        name="Revisions (h)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* (7) Goals, Finance & Rank Summary (5 cols) */}
              <div className="lg:col-span-5 space-y-4">
                {/* Goals & Rank Card (Clickable -> Opens Full-Screen Pixel-Art RPG World) */}
                <div
                  onClick={() => openRpgWorld('study_room')}
                  className="p-4 rounded-2xl bg-[#172A32] border border-[#D7B779]/50 hover:border-[#D7B779] cursor-pointer transition-all text-[#E8DDC8]"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-[#0F1D23] border border-[#D7B779]/50 flex items-center justify-center overflow-hidden">
                        <PixelAvatarSprite avatar={rpgState.avatar} size={24} />
                      </div>
                      <h3 className="text-xs font-bold text-[#D7B779]">
                        {rpgRankEval.rank} Rank · Pixel RPG World
                      </h3>
                    </div>
                    <span className="text-xs text-[#D7B779] font-semibold hover:underline">
                      Enter RPG World →
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs mt-2">
                    <span className="font-semibold text-[#E8DDC8]">
                      Level {rpgLevelInfo.level} · {rpgState.ownedItemIds.length} room items owned
                    </span>
                    <span className="text-[#D7B779] font-mono tabular-nums">
                      {profile?.xp || 0} XP · {profile?.coins || 0} coins
                    </span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-[#0F1D23] mt-2 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-[#D7B779]"
                      style={{
                        width: `${rpgLevelInfo.progressPercent}%`,
                      }}
                    />
                  </div>
                  {activeQuest && (
                    <p className="text-[11px] text-[#E8DDC8]/75 mt-2 truncate">
                      Active Quest: {activeQuest.title} (+{activeQuest.xpReward} XP)
                    </p>
                  )}
                </div>

                {/* Finance & Budget Card */}
                <div className="p-4 rounded-2xl bg-[var(--bg-primary)] border border-[var(--border-glass)]">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Target className="w-4 h-4 text-[var(--accent)]" />
                      <h3 className="text-xs font-semibold text-[var(--text-primary)]">
                        Finance &amp; Monthly Budget
                      </h3>
                    </div>
                    <button
                      onClick={() => onNavigate('finance')}
                      className="text-xs text-[var(--accent)] hover:underline"
                    >
                      Open Finance →
                    </button>
                  </div>

                  <div className="flex items-baseline justify-between mt-1">
                    <div>
                      <p className="text-[11px] text-[var(--text-secondary)]">Spent Today</p>
                      <p className="text-lg font-bold text-[var(--text-primary)] tabular-nums">
                        {currency} {Math.round(todayExpenses).toLocaleString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-[11px] text-[var(--text-secondary)]">This Month</p>
                      <p className="text-xs font-semibold text-[var(--text-primary)] tabular-nums">
                        {currency} {Math.round(monthExpenses).toLocaleString()}
                        {totalBudget > 0
                          ? ` / ${Math.round(totalBudget).toLocaleString()}`
                          : ''}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Context-Aware Plan My Day Modal */}
      {showPlanDayModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="w-full max-w-5xl max-h-[90vh] overflow-y-auto">
            <SmartSchedulerPanel onClose={() => setShowPlanDayModal(false)} />
          </div>
        </div>
      )}
    </div>
  );
};
