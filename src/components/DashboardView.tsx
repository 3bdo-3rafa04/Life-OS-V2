import React, { useState, useEffect, useMemo } from 'react';
import { useLifeOS } from '../context/LifeOSContext.tsx';
import { NavDestination } from '../types.ts';
import {
  Play,
  Pause,
  Check,
  Sparkles,
  Plus,
  ArrowRight,
  Wand2,
  X,
  CheckCircle2,
  Trash2,
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
    financeRecords,
    goalsHabits,
    todayDate,
    updateTaskStatus,
    deleteTask,
    createCalendarEvent,
    awardXpAndCoins,
  } = useLifeOS();

  const [chartRange, setChartRange] = useState<'today' | '7d' | '30d' | '12m'>('7d');
  const [pomodoroSeconds, setPomodoroSeconds] = useState(25 * 60);
  const [pomodoroRunning, setPomodoroRunning] = useState(false);
  const [pomodoroSessionCount, setPomodoroSessionCount] = useState(1);
  const [briefingText, setBriefingText] = useState<string>('');
  const [loadingBriefing, setLoadingBriefing] = useState(false);
  const [showPlanDayModal, setShowPlanDayModal] = useState(false);
  const [planEnergy, setPlanEnergy] = useState<'Low' | 'Normal' | 'High'>('Normal');
  const [planFocus, setPlanFocus] = useState<'Balanced' | 'Exam crunch' | 'Catch-up' | 'Light day'>('Balanced');
  const [planApplied, setPlanApplied] = useState(false);

  useEffect(() => {
    if (!pomodoroRunning) return;
    const timer = setInterval(() => {
      setPomodoroSeconds((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [pomodoroRunning]);

  const formatTimer = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const currency = profile?.currency || 'EGP';
  const firstName = profile?.displayName?.split(' ')[0] || 'User';

  const totalTasksCount = tasks.length;
  const completedTasksCount = tasks.filter((t) => t.status === 'completed').length;
  const openTasks = tasks.filter((t) => t.status !== 'completed');
  const completionPct =
    totalTasksCount > 0 ? Math.round((completedTasksCount / totalTasksCount) * 100) : 0;

  const dueRevisions = studyItems.filter(
    (s) => s.status === 'review_due' || s.nextReviewDate <= todayDate
  );
  const overdueRevisions = dueRevisions.filter((s) => s.nextReviewDate < todayDate);

  const habits = goalsHabits.filter((g) => g.recordType === 'habit');
  const habitsDone = habits.filter((h) => h.completedToday).length;
  const habitsTotal = habits.length;

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

  // Build real 7-day study chart data from studyItems, tasks, and calendar study events
  const { chartData, totalStudyHours } = useMemo(() => {
    const days: { date: string; day: string; studyHours: number; revisionHours: number }[] = [];
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    let sumHours = 0;

    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const iso = d.toISOString().split('T')[0];
      const dayLabel = dayNames[d.getDay()];

      const studiedMins = studyItems
        .filter((s) => s.lastStudiedDate === iso)
        .reduce((acc, s) => acc + (s.estimatedMinutes || 30), 0);

      const completedStudyTaskMins = tasks
        .filter((t) => t.category === 'study' && t.status === 'completed' && t.dueDate === iso)
        .reduce((acc, t) => acc + (t.estimatedMinutes || 30), 0);

      const eventStudyMins = events
        .filter(
          (e) =>
            e.date === iso && (e.eventType === 'study_block' || e.eventType === 'lecture')
        )
        .reduce((acc) => acc + 60, 0);

      const studyH = Math.round(((completedStudyTaskMins + eventStudyMins) / 60) * 10) / 10;
      const revH = Math.round((studiedMins / 60) * 10) / 10;
      sumHours += studyH + revH;

      days.push({
        date: iso,
        day: dayLabel,
        studyHours: studyH,
        revisionHours: revH,
      });
    }
    return { chartData: days, totalStudyHours: Math.round(sumHours * 10) / 10 };
  }, [studyItems, tasks, events]);

  const activeFocusItem = openTasks[0]?.title || dueRevisions[0]?.title || 'Ready for focus';
  const todayEvents = events
    .filter((e) => e.date === todayDate)
    .sort((a, b) => a.startTime.localeCompare(b.startTime));

  const activeQuest = goalsHabits.find((g) => g.recordType === 'quest');

  const handleCompletePomodoro = async () => {
    setPomodoroRunning(false);
    setPomodoroSeconds(25 * 60);
    setPomodoroSessionCount((c) => c + 1);
    await awardXpAndCoins(25, 10);
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

  // Build proposed day schedule dynamically from user's real open tasks & due revisions
  const proposedSlots = useMemo(() => {
    const slots: {
      time: string;
      startTime: string;
      endTime: string;
      title: string;
      tone: 'sage' | 'gold' | 'neutral';
      eventType: 'prayer' | 'study_block' | 'fixed';
    }[] = [
      {
        time: '04:18 - 04:45',
        startTime: '04:18',
        endTime: '04:45',
        title: 'Fajr prayer (protected)',
        tone: 'gold',
        eventType: 'prayer',
      },
    ];

    const firstStudy = dueRevisions[0]?.title || openTasks[0]?.title;
    if (firstStudy) {
      slots.push({
        time: '09:00 - 10:30',
        startTime: '09:00',
        endTime: '10:30',
        title: firstStudy,
        tone: 'sage',
        eventType: 'study_block',
      });
    }

    slots.push({
      time: '11:52 - 12:15',
      startTime: '11:52',
      endTime: '12:15',
      title: 'Dhuhr prayer (protected)',
      tone: 'gold',
      eventType: 'prayer',
    });

    const secondItem = openTasks[1]?.title || dueRevisions[1]?.title;
    if (secondItem) {
      slots.push({
        time: '13:00 - 14:15',
        startTime: '13:00',
        endTime: '14:15',
        title: secondItem,
        tone: 'neutral',
        eventType: 'fixed',
      });
    }

    slots.push({
      time: '15:05 - 15:25',
      startTime: '15:05',
      endTime: '15:25',
      title: 'Asr prayer (protected)',
      tone: 'gold',
      eventType: 'prayer',
    });

    const thirdItem = openTasks[2]?.title || dueRevisions[2]?.title;
    if (thirdItem) {
      slots.push({
        time: '15:30 - 17:00',
        startTime: '15:30',
        endTime: '17:00',
        title: thirdItem,
        tone: 'sage',
        eventType: 'study_block',
      });
    }

    slots.push({
      time: '18:18 - 18:40',
      startTime: '18:18',
      endTime: '18:40',
      title: 'Maghrib prayer (protected)',
      tone: 'gold',
      eventType: 'prayer',
    });

    return slots;
  }, [openTasks, dueRevisions]);

  const handleApplyDayPlan = async () => {
    for (const slot of proposedSlots) {
      const alreadyExists = events.some(
        (e) => e.date === todayDate && e.startTime === slot.startTime && e.title === slot.title
      );
      if (!alreadyExists) {
        await createCalendarEvent({
          title: slot.title,
          eventType: slot.eventType,
          date: todayDate,
          startTime: slot.startTime,
          endTime: slot.endTime,
          location: slot.eventType === 'prayer' ? 'Protected Anchor' : 'Workspace',
          isProtectedAnchor: slot.eventType === 'prayer',
        });
      }
    }
    setPlanApplied(true);
    setTimeout(() => {
      setShowPlanDayModal(false);
      setPlanApplied(false);
    }, 800);
  };

  const totalPomodoroSecs = 25 * 60;
  const ringProgress = Math.min(1, Math.max(0, 1 - pomodoroSeconds / totalPomodoroSecs));
  const ringRadius = 42;
  const ringCircumference = 2 * Math.PI * ringRadius;
  const ringOffset = ringCircumference * (1 - ringProgress);

  const formattedDateLabel = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  });

  return (
    <div className="space-y-5">
      {/* Header Row */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-[28px] font-semibold tracking-tight text-[#E8EDE8]">
            Good morning, {firstName}
          </h1>
          <p className="text-xs md:text-sm text-[#9AA79E] mt-1">
            {formattedDateLabel} · {openTasks.length} open tasks, {dueRevisions.length} revisions
            due
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => setShowPlanDayModal(true)}
            className="px-3.5 py-2 rounded-xl bg-[#2C3932] hover:bg-[#35453C] border border-[#BDD3C1]/15 text-[#E8EDE8] text-xs font-medium flex items-center gap-1.5 transition-colors"
          >
            <Wand2 className="w-3.5 h-3.5 text-[#9BB9A2]" />
            Plan my day
          </button>
          <button
            onClick={() => onNavigate('analytics')}
            className="px-3.5 py-2 rounded-xl bg-[#2C3932] hover:bg-[#35453C] border border-[#BDD3C1]/15 text-[#E8EDE8] text-xs font-medium transition-colors"
          >
            Full report
          </button>
          <button
            onClick={() => setPomodoroRunning((r) => !r)}
            className="px-4 py-2 rounded-xl bg-[#9BB9A2] hover:bg-[#a9c5b0] text-[#171E1B] text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            {pomodoroRunning ? 'Pause focus' : 'Start focus'}
          </button>
        </div>
      </div>

      {/* Top Row: Study Time Chart (8 cols) + Right Now Focus Card (4 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Study time, last 7 days */}
        <div className="lg:col-span-8 sage-card p-5 flex flex-col justify-between">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-4">
            <div>
              <p className="text-xs font-medium text-[#9AA79E]">Study time, last 7 days</p>
              <div className="flex items-center gap-2.5 mt-1">
                <span className="text-2xl font-bold text-[#E8EDE8]">{totalStudyHours} h</span>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-[#9BB9A2]/20 text-[#9BB9A2]">
                  {studyModules.length} modules
                </span>
              </div>
            </div>

            <div className="inline-flex items-center p-1 rounded-xl bg-[#1C2520] border border-[#BDD3C1]/10 text-xs">
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
                      ? 'bg-[#9BB9A2] text-[#171E1B] font-semibold'
                      : 'text-[#9AA79E] hover:text-[#E8EDE8]'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          <div className="h-44 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 6, right: 8, left: -24, bottom: 0 }}>
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
                  stroke="rgba(189, 211, 193, 0.08)"
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
                    backgroundColor: '#171E1B',
                    borderColor: 'rgba(189, 211, 193, 0.2)',
                    borderRadius: '10px',
                    fontSize: '12px',
                    color: '#E8EDE8',
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

          <div className="flex items-center justify-between mt-3 pt-2 border-t border-[#BDD3C1]/10 text-[11px] text-[#9AA79E]">
            <div className="flex items-center gap-5">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#9BB9A2]" /> Study Blocks
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#6C8C76]" /> Revisions
              </span>
            </div>
            <button
              onClick={() => onNavigate('study')}
              className="text-[#9BB9A2] hover:underline"
            >
              Open Study →
            </button>
          </div>
        </div>

        {/* Right now Focus & Next Up Card */}
        <div className="lg:col-span-4 sage-card p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium text-[#9AA79E]">Right now</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#9BB9A2]/20 text-[#9BB9A2]">
                Focus
              </span>
            </div>

            <div className="flex items-center gap-4">
              <div className="relative w-24 h-24 shrink-0 flex items-center justify-center">
                <svg className="w-24 h-24 -rotate-90" viewBox="0 0 100 100">
                  <circle
                    cx="50"
                    cy="50"
                    r={ringRadius}
                    fill="none"
                    stroke="#2C3932"
                    strokeWidth="7"
                  />
                  <circle
                    cx="50"
                    cy="50"
                    r={ringRadius}
                    fill="none"
                    stroke="#9BB9A2"
                    strokeWidth="7"
                    strokeLinecap="round"
                    strokeDasharray={ringCircumference}
                    strokeDashoffset={ringOffset}
                  />
                </svg>
                <span className="absolute text-base font-bold text-[#E8EDE8] font-mono">
                  {formatTimer(pomodoroSeconds)}
                </span>
              </div>

              <div className="min-w-0 flex-1">
                <h3 className="text-sm font-semibold text-[#E8EDE8] truncate">
                  {activeFocusItem}
                </h3>
                <p className="text-xs text-[#9AA79E] mt-0.5">
                  Pomodoro session #{pomodoroSessionCount}
                </p>
                <div className="flex items-center gap-2 mt-3">
                  <button
                    onClick={() => setPomodoroRunning((r) => !r)}
                    className="px-3 py-1.5 rounded-lg bg-[#2C3932] hover:bg-[#37473F] text-xs font-medium text-[#E8EDE8] flex items-center gap-1 transition-colors"
                  >
                    {pomodoroRunning ? (
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
                    className="px-3 py-1.5 rounded-lg bg-[#9BB9A2] hover:bg-[#a9c5b0] text-xs font-semibold text-[#171E1B] transition-colors"
                  >
                    Done
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3.5 border-t border-[#BDD3C1]/10">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-[#65756B]">
                NEXT UP TODAY
              </p>
              <button
                onClick={() => onNavigate('calendar')}
                className="text-[11px] text-[#9BB9A2] hover:underline"
              >
                Calendar →
              </button>
            </div>
            <div className="space-y-1.5 text-xs">
              {todayEvents.length > 0 ? (
                todayEvents.slice(0, 3).map((ev) => (
                  <div key={ev.id} className="flex items-center justify-between py-0.5">
                    <span className="text-[#65756B] font-mono w-12">{ev.startTime}</span>
                    <span
                      className={`flex-1 truncate ${
                        ev.eventType === 'prayer' || ev.isProtectedAnchor
                          ? 'text-[#D8B26E] font-medium'
                          : 'text-[#E8EDE8]'
                      }`}
                    >
                      {ev.title}
                    </span>
                  </div>
                ))
              ) : (
                <p className="text-xs text-[#9AA79E] py-1">
                  No events scheduled for today yet. Click &ldquo;Plan my day&rdquo; above to
                  generate your schedule.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Middle Row: 4 KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Tasks done */}
        <button
          onClick={() => onNavigate('tasks')}
          className="sage-card p-4 text-left hover:border-[#9BB9A2]/40 transition-all"
        >
          <p className="text-xs text-[#9AA79E]">Tasks done</p>
          <p className="text-2xl font-bold text-[#E8EDE8] mt-1">
            {completedTasksCount} / {totalTasksCount}
          </p>
          <p className="text-xs text-[#9BB9A2] mt-1">
            {totalTasksCount > 0 ? `${completionPct}% of your tasks` : 'No tasks created yet'}
          </p>
          <div className="w-full h-1.5 rounded-full bg-[#171E1B] mt-3 overflow-hidden">
            <div
              className="h-full rounded-full bg-[#9BB9A2]"
              style={{ width: `${Math.min(100, completionPct)}%` }}
            />
          </div>
        </button>

        {/* Revisions due */}
        <button
          onClick={() => onNavigate('study')}
          className="sage-card p-4 text-left hover:border-[#9BB9A2]/40 transition-all"
        >
          <p className="text-xs text-[#9AA79E]">Revisions due</p>
          <p className="text-2xl font-bold text-[#E8EDE8] mt-1">{dueRevisions.length}</p>
          <p className="text-xs text-[#D8B26E] mt-1">
            {overdueRevisions.length} overdue ·{' '}
            {Math.max(0, dueRevisions.length - overdueRevisions.length)} today
          </p>
          <p className="text-[11px] text-[#65756B] mt-2.5">
            {studyModules.length} active modules · {studyItems.length} study items
          </p>
        </button>

        {/* Habits today */}
        <button
          onClick={() => onNavigate('goals')}
          className="sage-card p-4 text-left hover:border-[#9BB9A2]/40 transition-all"
        >
          <p className="text-xs text-[#9AA79E]">Habits today</p>
          <p className="text-2xl font-bold text-[#E8EDE8] mt-1">
            {habitsDone} / {habitsTotal}
          </p>
          <p className="text-xs text-[#9BB9A2] mt-1">
            Streak: {profile?.streakDays || 0} days
          </p>
          <div className="flex items-center gap-1.5 mt-2.5">
            {Array.from({ length: Math.max(habitsTotal, 5) })
              .slice(0, 7)
              .map((_, idx) => (
                <span
                  key={idx}
                  className={`w-3.5 h-3.5 rounded-full ${
                    idx < habitsDone ? 'bg-[#9BB9A2]' : 'bg-[#2C3932]'
                  }`}
                />
              ))}
          </div>
        </button>

        {/* Spent today */}
        <button
          onClick={() => onNavigate('finance')}
          className="sage-card p-4 text-left hover:border-[#9BB9A2]/40 transition-all"
        >
          <p className="text-xs text-[#9AA79E]">Spent today</p>
          <p className="text-2xl font-bold text-[#E8EDE8] mt-1">
            {currency} {Math.round(todayExpenses)}
          </p>
          <p className="text-xs text-[#9BB9A2] mt-1">
            {totalBudget > 0 && monthExpenses > totalBudget
              ? 'Over budget'
              : 'Tracked in Finance'}
          </p>
          <p className="text-[11px] text-[#65756B] mt-2.5">
            Month: {Math.round(monthExpenses).toLocaleString()}
            {totalBudget > 0 ? ` / ${Math.round(totalBudget).toLocaleString()}` : ''}
          </p>
        </button>
      </div>

      {/* Bottom Row: Priorities + Rank + Spoon Feeder AI */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Priorities */}
        <div className="lg:col-span-5 sage-card p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3.5">
              <h2 className="text-sm font-semibold text-[#E8EDE8]">Priorities</h2>
              <button
                onClick={onOpenQuickAdd}
                className="text-xs font-medium text-[#9BB9A2] hover:underline"
              >
                + Add task
              </button>
            </div>

            {tasks.length > 0 ? (
              <div className="space-y-2">
                {tasks.slice(0, 5).map((t) => {
                  const isDone = t.status === 'completed';
                  return (
                    <div
                      key={t.id}
                      className="flex items-center justify-between gap-3 py-1.5 px-2 rounded-lg hover:bg-[#2C3932]/50 transition-colors"
                    >
                      <div
                        onClick={() => updateTaskStatus(t, isDone ? 'todo' : 'completed')}
                        className="flex items-center gap-2.5 min-w-0 flex-1 cursor-pointer"
                      >
                        <div
                          className={`w-4 h-4 rounded flex items-center justify-center shrink-0 border ${
                            isDone
                              ? 'bg-[#9BB9A2] border-[#9BB9A2] text-[#171E1B]'
                              : 'border-[#65756B] bg-transparent'
                          }`}
                        >
                          {isDone && <Check className="w-3 h-3 stroke-[3]" />}
                        </div>
                        <span
                          className={`text-xs truncate ${
                            isDone ? 'line-through text-[#65756B]' : 'text-[#E8EDE8]'
                          }`}
                        >
                          {t.title}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-[11px] text-[#65756B] font-mono">
                          {t.estimatedMinutes || 30}m
                        </span>
                        <button
                          onClick={() => deleteTask(t.id)}
                          className="text-[#65756B] hover:text-[#D97A6C]"
                          title="Delete task"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="py-6 text-center space-y-2">
                <p className="text-xs text-[#9AA79E]">No priority tasks yet.</p>
                <button
                  onClick={onOpenQuickAdd}
                  className="px-3.5 py-1.5 rounded-lg bg-[#9BB9A2] text-[#171E1B] text-xs font-semibold"
                >
                  + Add your first task
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Rank Card */}
        <div
          onClick={() => onNavigate('rank')}
          className="lg:col-span-3 sage-card p-5 flex flex-col justify-between cursor-pointer hover:border-[#9BB9A2]/40 transition-all"
        >
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-[#E8EDE8]">Rank</h2>
              <span className="text-xs font-semibold text-[#D8B26E]">
                {profile?.coins || 0} coins
              </span>
            </div>

            <div className="flex items-center gap-3.5 my-2">
              <div className="w-12 h-12 rounded-full bg-[#2C3932] border-2 border-[#9BB9A2] flex items-center justify-center text-lg font-bold text-[#E8EDE8]">
                {profile?.level || 1}
              </div>
              <div>
                <h3 className="text-base font-bold text-[#E8EDE8]">
                  {(profile?.level || 1) >= 5 ? 'Scholar' : 'Apprentice'}
                </h3>
                <p className="text-xs text-[#9AA79E]">
                  {profile?.xp || 0} / {(profile?.level || 1) * 250} XP to Level{' '}
                  {(profile?.level || 1) + 1}
                </p>
              </div>
            </div>

            <div className="w-full h-2 rounded-full bg-[#171E1B] mt-3 overflow-hidden">
              <div
                className="h-full rounded-full bg-[#9BB9A2]"
                style={{
                  width: `${Math.min(
                    100,
                    Math.round((((profile?.xp || 0) % 250) / 250) * 100)
                  )}%`,
                }}
              />
            </div>
          </div>

          <p className="text-xs text-[#9AA79E] mt-3 pt-2.5 border-t border-[#BDD3C1]/10 truncate">
            {activeQuest ? (
              <>
                Quest: {activeQuest.title} ·{' '}
                <span className="text-[#9BB9A2]">+{activeQuest.xpReward} XP</span>
              </>
            ) : (
              'Complete tasks & revisions to earn XP'
            )}
          </p>
        </div>

        {/* Spoon Feeder AI Inline Card */}
        <div className="lg:col-span-4 sage-card p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2.5">
              <div className="flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-[#9BB9A2]" />
                <h2 className="text-sm font-semibold text-[#E8EDE8]">Spoon Feeder AI</h2>
              </div>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#9BB9A2]/20 text-[#9BB9A2]">
                LIVE
              </span>
            </div>

            <p className="text-xs text-[#E8EDE8]/90 leading-relaxed">
              {briefingText ||
                `You have ${openTasks.length} open tasks and ${dueRevisions.length} due revisions. Ask Spoon Feeder to time-block your day or generate a daily briefing.`}
            </p>
          </div>

          <div className="flex items-center justify-between gap-2 mt-4 pt-3 border-t border-[#BDD3C1]/10">
            <button
              onClick={handleGenerateBriefing}
              disabled={loadingBriefing}
              className="px-3.5 py-1.5 rounded-lg bg-[#9BB9A2] hover:bg-[#a9c5b0] text-[#171E1B] text-xs font-semibold transition-colors"
            >
              {loadingBriefing ? 'Generating...' : 'Daily briefing'}
            </button>

            <button
              onClick={() => onOpenSpoonFeeder()}
              className="text-xs font-medium text-[#9BB9A2] hover:underline flex items-center gap-1"
            >
              Workspace <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>

      {/* Plan My Day Modal */}
      {showPlanDayModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-3xl rounded-2xl bg-[#222C27] border border-[#BDD3C1]/25 shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-[#BDD3C1]/10 flex items-start justify-between">
              <div>
                <h2 className="text-lg font-semibold text-[#E8EDE8]">
                  Plan my day · {formattedDateLabel}
                </h2>
                <p className="text-xs text-[#9AA79E] mt-0.5">
                  Spoon Feeder builds a realistic schedule around your prayer anchors and real tasks
                </p>
              </div>
              <button
                onClick={() => setShowPlanDayModal(false)}
                className="p-1.5 rounded-lg text-[#9AA79E] hover:text-[#E8EDE8] hover:bg-[#2C3932]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-[#9AA79E] mb-2">
                    How is your energy today?
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {(['Low', 'Normal', 'High'] as const).map((lvl) => (
                      <button
                        key={lvl}
                        onClick={() => setPlanEnergy(lvl)}
                        className={`py-2 rounded-xl text-xs font-medium transition-colors ${
                          planEnergy === lvl
                            ? 'bg-[#9BB9A2] text-[#171E1B] font-semibold'
                            : 'bg-[#2C3932] text-[#9AA79E] hover:text-[#E8EDE8]'
                        }`}
                      >
                        {lvl}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs text-[#9AA79E] mb-2">Focus for today</label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {(['Balanced', 'Exam crunch', 'Catch-up', 'Light day'] as const).map((f) => (
                      <button
                        key={f}
                        onClick={() => setPlanFocus(f)}
                        className={`py-2 px-2 rounded-xl text-xs font-medium transition-colors ${
                          planFocus === f
                            ? 'bg-[#9BB9A2] text-[#171E1B] font-semibold'
                            : 'bg-[#2C3932] text-[#9AA79E] hover:text-[#E8EDE8]'
                        }`}
                      >
                        {f}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                <div className="md:col-span-7 space-y-2">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-[#65756B]">
                    PROPOSED SCHEDULE ({proposedSlots.length} BLOCKS)
                  </p>
                  {proposedSlots.map((slot, idx) => (
                    <div
                      key={idx}
                      className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs ${
                        slot.tone === 'gold'
                          ? 'bg-[#352F23] border border-[#D8B26E]/30 text-[#D8B26E]'
                          : slot.tone === 'sage'
                          ? 'bg-[#2C3932] border border-[#9BB9A2]/30 text-[#E8EDE8]'
                          : 'bg-[#1C2520] border border-[#BDD3C1]/10 text-[#E8EDE8]'
                      }`}
                    >
                      <span className="font-mono text-[11px] opacity-80 w-28 shrink-0">
                        {slot.time}
                      </span>
                      <span className="font-medium truncate">{slot.title}</span>
                    </div>
                  ))}
                </div>

                <div className="md:col-span-5 rounded-xl bg-[#2C3932]/70 border border-[#BDD3C1]/15 p-4 flex flex-col justify-between">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-[#65756B] mb-3">
                      WHY THIS PLAN
                    </p>
                    <ul className="space-y-2.5 text-xs text-[#E8EDE8]/90">
                      <li>• Prayer anchors protected with {profile?.prayerBufferMinutes || 15}-min buffers</li>
                      <li>• Prioritizes {openTasks.length} open tasks &amp; {dueRevisions.length} due revisions</li>
                      <li>• Energy mode: {planEnergy} · Strategy: {planFocus}</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            <div className="px-6 py-4 bg-[#1C2520] border-t border-[#BDD3C1]/10 flex items-center justify-end gap-3">
              <button
                onClick={() => setShowPlanDayModal(false)}
                className="px-4 py-2 rounded-xl bg-[#2C3932] text-xs font-medium text-[#9AA79E] hover:text-[#E8EDE8]"
              >
                Cancel
              </button>
              <button
                onClick={handleApplyDayPlan}
                className="px-5 py-2 rounded-xl bg-[#9BB9A2] hover:bg-[#a9c5b0] text-[#171E1B] text-xs font-semibold transition-colors"
              >
                {planApplied ? 'Applied to Calendar ✓' : 'Apply plan to today'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
