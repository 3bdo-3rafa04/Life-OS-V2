import React, { useState, useMemo } from 'react';
import { useLifeOS } from '../context/LifeOSContext.tsx';
import { PomodoroCategory, PomodoroMode } from '../types.ts';
import {
  Play,
  Pause,
  RotateCcw,
  CheckCircle2,
  Bell,
  Volume2,
  VolumeX,
  Plus,
  Trash2,
  Sparkles,
  BookOpen,
  CheckSquare,
  Flame,
  Clock,
  Sliders,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';

const POMODORO_CATEGORIES: {
  id: PomodoroCategory;
  label: PomodoroCategory;
  desc: string;
  badgeColor: string;
}[] = [
  {
    id: 'Deep Study',
    label: 'Deep Study',
    desc: 'First-pass comprehension & dense concept mastery',
    badgeColor: '#9BB9A2',
  },
  {
    id: 'Active Recall',
    label: 'Active Recall',
    desc: 'Flashcards, self-quizzing & closed-book retrieval',
    badgeColor: '#6EBF8B',
  },
  {
    id: 'Lecture Review',
    label: 'Lecture Review',
    desc: 'Reviewing lecture slides, PDFs & synthesized notes',
    badgeColor: '#D8B26E',
  },
  {
    id: 'Exam Practice',
    label: 'Exam Practice',
    desc: 'Timed past papers, Q-banks & clinical vignettes',
    badgeColor: '#E5B567',
  },
  {
    id: 'Problem Solving',
    label: 'Problem Solving',
    desc: 'Coding, derivations, exercises & case work',
    badgeColor: '#7FA99B',
  },
  {
    id: 'Reading & Notes',
    label: 'Reading & Notes',
    desc: 'Textbooks, research papers & knowledge synthesis',
    badgeColor: '#A9C5B0',
  },
];

const TIMER_PRESETS = [
  { label: 'Classic 25 / 5', focus: 25, short: 5, long: 15 },
  { label: 'Deep 50 / 10', focus: 50, short: 10, long: 20 },
  { label: 'Exam 90 / 15', focus: 90, short: 15, long: 30 },
  { label: 'Sprint 15 / 3', focus: 15, short: 3, long: 10 },
];

export const PomodoroView: React.FC = () => {
  const {
    studyModules,
    studyItems,
    tasks,
    todayDate,
    pomodoroState,
    pomodoroSessions,
    togglePomodoro,
    resetPomodoro,
    switchPomodoroMode,
    updatePomodoroConfig,
    completePomodoroSession,
    deletePomodoroSession,
    requestPomodoroNotificationPermission,
  } = useLifeOS();

  const [sessionNotes, setSessionNotes] = useState('');
  const [manualMinutes, setManualMinutes] = useState(25);
  const [showManualLogModal, setShowManualLogModal] = useState(false);
  const [filterCategory, setFilterCategory] = useState<string>('ALL');

  const openTasks = useMemo(
    () => tasks.filter((t) => t.status !== 'completed'),
    [tasks]
  );

  const formatClock = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  // Ring geometry
  const progress =
    pomodoroState.totalDurationSeconds > 0
      ? Math.min(
          1,
          Math.max(
            0,
            1 - pomodoroState.remainingSeconds / pomodoroState.totalDurationSeconds
          )
        )
      : 0;
  const radius = 108;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - progress);

  // Live active focus minutes not yet saved
  const liveActiveMinutes =
    pomodoroState.mode === 'focus'
      ? Math.floor(pomodoroState.elapsedFocusSeconds / 60)
      : 0;

  // Today's study stats from Pomodoro
  const todaySessions = useMemo(
    () => pomodoroSessions.filter((s) => s.date === todayDate && s.mode === 'focus'),
    [pomodoroSessions, todayDate]
  );

  const todayMinutes = useMemo(
    () =>
      todaySessions.reduce((acc, s) => acc + s.durationMinutes, 0) + liveActiveMinutes,
    [todaySessions, liveActiveMinutes]
  );

  const todayHoursLabel = useMemo(() => {
    const h = Math.floor(todayMinutes / 60);
    const m = todayMinutes % 60;
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  }, [todayMinutes]);

  // 7-day Pomodoro chart data
  const { weekChartData, weekTotalMinutes } = useMemo(() => {
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const arr: {
      date: string;
      day: string;
      deepStudyMins: number;
      recallMins: number;
      totalHours: number;
    }[] = [];
    let sumMins = 0;

    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const iso = d.toISOString().split('T')[0];
      const dayLabel = dayNames[d.getDay()];

      const dayRecs = pomodoroSessions.filter(
        (s) => s.date === iso && s.mode === 'focus'
      );
      const extraLive = iso === todayDate ? liveActiveMinutes : 0;

      const recallM = dayRecs
        .filter(
          (s) => s.category === 'Active Recall' || s.category === 'Exam Practice'
        )
        .reduce((a, b) => a + b.durationMinutes, 0);

      const deepM =
        dayRecs
          .filter(
            (s) => s.category !== 'Active Recall' && s.category !== 'Exam Practice'
          )
          .reduce((a, b) => a + b.durationMinutes, 0) + extraLive;

      const totalM = deepM + recallM;
      sumMins += totalM;

      arr.push({
        date: iso,
        day: dayLabel,
        deepStudyMins: deepM,
        recallMins: recallM,
        totalHours: Math.round((totalM / 60) * 10) / 10,
      });
    }

    return { weekChartData: arr, weekTotalMinutes: sumMins };
  }, [pomodoroSessions, todayDate, liveActiveMinutes]);

  // Category breakdown
  const categoryBreakdown = useMemo(() => {
    const map = new Map<PomodoroCategory, number>();
    for (const c of POMODORO_CATEGORIES) {
      map.set(c.id, 0);
    }
    for (const s of pomodoroSessions) {
      if (s.mode === 'focus') {
        map.set(s.category, (map.get(s.category) || 0) + s.durationMinutes);
      }
    }
    if (liveActiveMinutes > 0) {
      map.set(
        pomodoroState.category,
        (map.get(pomodoroState.category) || 0) + liveActiveMinutes
      );
    }
    return Array.from(map.entries()).map(([category, minutes]) => ({
      category,
      minutes,
      hours: Math.round((minutes / 60) * 10) / 10,
    }));
  }, [pomodoroSessions, liveActiveMinutes, pomodoroState.category]);

  const filteredSessions = useMemo(() => {
    if (filterCategory === 'ALL') return pomodoroSessions;
    return pomodoroSessions.filter((s) => s.category === filterCategory);
  }, [pomodoroSessions, filterCategory]);

  const adjustRemainingMinutes = (deltaMins: number) => {
    const deltaSecs = deltaMins * 60;
    const nextRemaining = Math.max(60, pomodoroState.remainingSeconds + deltaSecs);
    const nextTotal = Math.max(nextRemaining, pomodoroState.totalDurationSeconds + deltaSecs);
    updatePomodoroConfig({
      remainingSeconds: nextRemaining,
      totalDurationSeconds: nextTotal,
    });
  };

  const handleManualLogSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await completePomodoroSession(manualMinutes, sessionNotes);
    setSessionNotes('');
    setShowManualLogModal(false);
  };

  return (
    <div className="space-y-6 pb-10">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-widest text-[var(--text-muted)]">
            POMODORO FOCUS ENGINE · BACKGROUND TIMER · SOLE STUDY TIME SOURCE
          </p>
          <h1 className="text-2xl font-bold tracking-tight mt-0.5">
            Pomodoro &amp; Study Time Tracker
          </h1>
          <p className="text-xs text-[var(--text-secondary)] mt-0.5">
            Runs accurately in the background across tabs and powers 100% of your Study Time metrics.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => updatePomodoroConfig({ soundEnabled: !pomodoroState.soundEnabled })}
            className={`px-3 py-2 rounded-xl border text-xs font-medium flex items-center gap-1.5 transition-colors ${
              pomodoroState.soundEnabled
                ? 'bg-[#9BB9A2]/15 border-[#9BB9A2]/40 text-[#9BB9A2]'
                : 'bg-[var(--bg-card)] border-[var(--border-subtle)] text-[var(--text-muted)]'
            }`}
            title="Toggle completion sound chime"
          >
            {pomodoroState.soundEnabled ? (
              <Volume2 className="w-3.5 h-3.5" />
            ) : (
              <VolumeX className="w-3.5 h-3.5" />
            )}
            <span>{pomodoroState.soundEnabled ? 'Sound On' : 'Muted'}</span>
          </button>

          <button
            type="button"
            onClick={requestPomodoroNotificationPermission}
            className={`px-3 py-2 rounded-xl border text-xs font-medium flex items-center gap-1.5 transition-colors ${
              pomodoroState.browserNotificationsEnabled
                ? 'bg-[#6EBF8B]/15 border-[#6EBF8B]/40 text-[#6EBF8B]'
                : 'bg-[var(--bg-card)] border-[var(--border-subtle)] text-[var(--text-secondary)] hover:border-[#9BB9A2]/40'
            }`}
          >
            <Bell className="w-3.5 h-3.5" />
            <span>
              {pomodoroState.browserNotificationsEnabled
                ? 'Live Notifications Active'
                : 'Enable Live Notifications'}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setShowManualLogModal(true)}
            className="px-3.5 py-2 rounded-xl bg-[#9BB9A2] text-[#0F1613] text-xs font-semibold hover:opacity-90 flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            Log Study Session
          </button>
        </div>
      </div>

      {/* 4 KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="sage-card p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs text-[#9AA79E]">Study time today (Pomodoro)</span>
            <Clock className="w-4 h-4 text-[#9BB9A2]" />
          </div>
          <p className="text-2xl font-bold text-[#E8EDE8] mt-1.5">{todayHoursLabel}</p>
          <p className="text-xs text-[#9BB9A2] mt-1">
            {todaySessions.length} completed sessions
            {liveActiveMinutes > 0 ? ` + ${liveActiveMinutes}m active now` : ''}
          </p>
        </div>

        <div className="sage-card p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs text-[#9AA79E]">Last 7 days (Pomodoro)</span>
            <Flame className="w-4 h-4 text-[#D8B26E]" />
          </div>
          <p className="text-2xl font-bold text-[#E8EDE8] mt-1.5">
            {Math.round((weekTotalMinutes / 60) * 10) / 10} h
          </p>
          <p className="text-xs text-[#9AA79E] mt-1">
            {weekTotalMinutes} total focus minutes logged
          </p>
        </div>

        <div className="sage-card p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs text-[#9AA79E]">Active Focus Category</span>
            <Sparkles className="w-4 h-4 text-[#9BB9A2]" />
          </div>
          <p className="text-lg font-bold text-[#E8EDE8] mt-1.5 truncate">
            {pomodoroState.category}
          </p>
          <p className="text-xs text-[#9BB9A2] mt-1">
            Session #{pomodoroState.sessionNumber} ·{' '}
            {pomodoroState.running ? 'Running in background' : 'Ready'}
          </p>
        </div>

        <div className="sage-card p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs text-[#9AA79E]">Total Sessions Logged</span>
            <CheckCircle2 className="w-4 h-4 text-[#6EBF8B]" />
          </div>
          <p className="text-2xl font-bold text-[#E8EDE8] mt-1.5">
            {pomodoroSessions.length}
          </p>
          <p className="text-xs text-[#6EBF8B] mt-1">
            +{pomodoroSessions.reduce((a, b) => a + b.durationMinutes, 0)} XP earned from focus
          </p>
        </div>
      </div>

      {/* Main Grid: Left (Timer Dial & Category) + Right (Workspace Link, Presets & Analytics) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left 7 Cols: Interactive Pomodoro Studio */}
        <div className="lg:col-span-7 sage-card p-6 flex flex-col justify-between space-y-6">
          {/* Mode Selector Tabs */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="inline-flex items-center p-1 rounded-xl bg-[#171E1B] border border-[#BDD3C1]/15 text-xs">
              {(
                [
                  { id: 'focus', label: `Focus (${pomodoroState.focusMinutesPreset}m)` },
                  {
                    id: 'short_break',
                    label: `Short Break (${pomodoroState.shortBreakMinutesPreset}m)`,
                  },
                  {
                    id: 'long_break',
                    label: `Long Break (${pomodoroState.longBreakMinutesPreset}m)`,
                  },
                ] as { id: PomodoroMode; label: string }[]
              ).map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => switchPomodoroMode(m.id)}
                  className={`px-3.5 py-1.5 rounded-lg font-medium transition-all ${
                    pomodoroState.mode === m.id
                      ? 'bg-[#9BB9A2] text-[#171E1B] font-semibold'
                      : 'text-[#9AA79E] hover:text-[#E8EDE8]'
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>

            <span className="px-3 py-1 rounded-full text-[11px] font-semibold bg-[#9BB9A2]/15 text-[#9BB9A2]">
              {pomodoroState.running
                ? '● Background Timer Active'
                : pomodoroState.elapsedFocusSeconds > 0
                ? `Paused · ${Math.floor(pomodoroState.elapsedFocusSeconds / 60)}m elapsed`
                : 'Idle'}
            </span>
          </div>

          {/* Center SVG Circular Dial */}
          <div className="flex flex-col items-center justify-center py-2">
            <div className="relative w-64 h-64 flex items-center justify-center">
              <svg className="w-64 h-64 -rotate-90" viewBox="0 0 250 250">
                <circle
                  cx="125"
                  cy="125"
                  r={radius}
                  fill="none"
                  stroke="#171E1B"
                  strokeWidth="12"
                />
                <circle
                  cx="125"
                  cy="125"
                  r={radius}
                  fill="none"
                  stroke={pomodoroState.mode === 'focus' ? '#9BB9A2' : '#D8B26E'}
                  strokeWidth="12"
                  strokeLinecap="round"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  className="transition-all duration-300"
                />
              </svg>

              <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-6">
                <span className="text-[11px] font-semibold uppercase tracking-widest text-[#9BB9A2]">
                  {pomodoroState.mode === 'focus'
                    ? pomodoroState.category
                    : pomodoroState.mode === 'short_break'
                    ? 'Short Recovery Break'
                    : 'Long Restorative Break'}
                </span>
                <div className="text-5xl font-bold font-mono tracking-tight text-[#E8EDE8] my-1.5">
                  {formatClock(pomodoroState.remainingSeconds)}
                </div>
                <span className="text-xs text-[#9AA79E]">
                  Session #{pomodoroState.sessionNumber} ·{' '}
                  {Math.round(progress * 100)}% complete
                </span>
              </div>
            </div>

            {/* Primary Controls + Quick Time Adjust */}
            <div className="flex flex-wrap items-center justify-center gap-2.5 mt-4">
              <button
                type="button"
                onClick={() => adjustRemainingMinutes(-5)}
                className="px-3 py-2 rounded-xl bg-[#2C3932] hover:bg-[#35453C] text-xs font-mono text-[#9AA79E] hover:text-[#E8EDE8]"
                title="Subtract 5 minutes"
              >
                -5m
              </button>

              <button
                type="button"
                onClick={togglePomodoro}
                className="px-7 py-3 rounded-2xl bg-[#9BB9A2] hover:bg-[#a9c5b0] text-[#171E1B] font-bold text-sm flex items-center gap-2 shadow-lg transition-transform active:scale-95"
              >
                {pomodoroState.running ? (
                  <>
                    <Pause className="w-4 h-4 fill-current" /> Pause Timer
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 fill-current" />{' '}
                    {pomodoroState.elapsedFocusSeconds > 0 ? 'Resume Focus' : 'Start Focus'}
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => adjustRemainingMinutes(5)}
                className="px-3 py-2 rounded-xl bg-[#2C3932] hover:bg-[#35453C] text-xs font-mono text-[#9AA79E] hover:text-[#E8EDE8]"
                title="Add 5 minutes"
              >
                +5m
              </button>

              <button
                type="button"
                onClick={resetPomodoro}
                className="p-2.5 rounded-xl bg-[#2C3932] hover:bg-[#35453C] text-[#9AA79E] hover:text-[#E8EDE8]"
                title="Reset timer"
              >
                <RotateCcw className="w-4 h-4" />
              </button>

              {pomodoroState.mode === 'focus' && (
                <button
                  type="button"
                  onClick={() => completePomodoroSession(undefined, sessionNotes)}
                  className="px-4 py-2.5 rounded-xl bg-[#6EBF8B]/20 border border-[#6EBF8B]/40 hover:bg-[#6EBF8B]/30 text-[#6EBF8B] text-xs font-semibold flex items-center gap-1.5"
                  title="Finish now and log study minutes to your Study Time"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  Finish &amp; Log{' '}
                  {pomodoroState.elapsedFocusSeconds >= 60
                    ? `${Math.round(pomodoroState.elapsedFocusSeconds / 60)}m`
                    : `${pomodoroState.focusMinutesPreset}m`}
                </button>
              )}
            </div>
          </div>

          {/* Pomodoro Focus Category Grid */}
          <div className="pt-4 border-t border-[#BDD3C1]/10 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[#E8EDE8]">
                Select Pomodoro Study Category
              </span>
              <span className="text-[11px] text-[#9AA79E]">
                Categorizes your Study Time charts
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {POMODORO_CATEGORIES.map((cat) => {
                const isSelected = pomodoroState.category === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => updatePomodoroConfig({ category: cat.id })}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      isSelected
                        ? 'bg-[#2C3932] border-[#9BB9A2] shadow-sm'
                        : 'bg-[#171E1B]/60 border-[#BDD3C1]/10 hover:bg-[#2C3932]/50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-[#E8EDE8]">
                        {cat.label}
                      </span>
                      <span
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: cat.badgeColor }}
                      />
                    </div>
                    <p className="text-[10px] text-[#9AA79E] mt-1 line-clamp-1">
                      {cat.desc}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right 5 Cols: Workspace Link, Duration Presets & 7-Day Study Chart */}
        <div className="lg:col-span-5 space-y-5">
          {/* Link to Study Module, Lecture, or Task */}
          <div className="sage-card p-5 space-y-3.5">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-[#E8EDE8] flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-[#9BB9A2]" />
                Link Session to Study Module or Task
              </h2>
              <span className="text-[10px] text-[#9BB9A2]">Auto-credits progress</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] text-[#9AA79E] mb-1">
                  Study Module
                </label>
                <select
                  value={pomodoroState.linkedModuleId}
                  onChange={(e) =>
                    updatePomodoroConfig({ linkedModuleId: e.target.value })
                  }
                  className="w-full sage-input px-3 py-2 text-xs"
                >
                  <option value="">General Study</option>
                  {studyModules.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.code} — {m.title}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] text-[#9AA79E] mb-1">
                  Lecture / Flashcard
                </label>
                <select
                  value={pomodoroState.linkedStudyItemId}
                  onChange={(e) =>
                    updatePomodoroConfig({ linkedStudyItemId: e.target.value })
                  }
                  className="w-full sage-input px-3 py-2 text-xs"
                >
                  <option value="">None selected</option>
                  {studyItems
                    .filter(
                      (s) =>
                        !pomodoroState.linkedModuleId ||
                        s.moduleId === pomodoroState.linkedModuleId
                    )
                    .map((s) => (
                      <option key={s.id} value={s.id}>
                        [{s.moduleCode}] {s.title}
                      </option>
                    ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-[11px] text-[#9AA79E] mb-1 flex items-center gap-1">
                <CheckSquare className="w-3 h-3 text-[#9BB9A2]" />
                Link to Open Task (increments actual minutes)
              </label>
              <select
                value={pomodoroState.linkedTaskId}
                onChange={(e) =>
                  updatePomodoroConfig({ linkedTaskId: e.target.value })
                }
                className="w-full sage-input px-3 py-2 text-xs"
              >
                <option value="">No task linked</option>
                {openTasks.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.title} ({t.estimatedMinutes}m · {t.priority})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] text-[#9AA79E] mb-1">
                Focus Intention / Session Note
              </label>
              <input
                type="text"
                value={pomodoroState.customLabel}
                onChange={(e) =>
                  updatePomodoroConfig({ customLabel: e.target.value })
                }
                placeholder="e.g., Master optic nerve lesions & complete 20 flashcards..."
                className="w-full sage-input px-3 py-2 text-xs"
              />
            </div>
          </div>

          {/* Timer Presets & Automation */}
          <div className="sage-card p-5 space-y-3.5">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-[#E8EDE8] flex items-center gap-2">
                <Sliders className="w-4 h-4 text-[#9BB9A2]" />
                Timer Presets &amp; Background Automation
              </h2>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {TIMER_PRESETS.map((p) => {
                const isActive =
                  pomodoroState.focusMinutesPreset === p.focus &&
                  pomodoroState.shortBreakMinutesPreset === p.short;
                return (
                  <button
                    key={p.label}
                    type="button"
                    onClick={() =>
                      updatePomodoroConfig({
                        focusMinutesPreset: p.focus,
                        shortBreakMinutesPreset: p.short,
                        longBreakMinutesPreset: p.long,
                      })
                    }
                    className={`py-2 px-2.5 rounded-xl text-xs font-medium border transition-colors ${
                      isActive
                        ? 'bg-[#9BB9A2] text-[#171E1B] border-[#9BB9A2] font-semibold'
                        : 'bg-[#171E1B]/70 border-[#BDD3C1]/10 text-[#9AA79E] hover:text-[#E8EDE8]'
                    }`}
                  >
                    {p.label}
                  </button>
                );
              })}
            </div>

            <div className="grid grid-cols-3 gap-2.5 pt-1">
              <div>
                <label className="block text-[10px] text-[#9AA79E] mb-1">
                  Focus (min)
                </label>
                <input
                  type="number"
                  min={1}
                  max={180}
                  value={pomodoroState.focusMinutesPreset}
                  onChange={(e) =>
                    updatePomodoroConfig({
                      focusMinutesPreset: Math.max(1, Math.min(180, Number(e.target.value) || 25)),
                    })
                  }
                  className="w-full sage-input px-2.5 py-1.5 text-xs font-mono"
                />
              </div>
              <div>
                <label className="block text-[10px] text-[#9AA79E] mb-1">
                  Short Break (m)
                </label>
                <input
                  type="number"
                  min={1}
                  max={60}
                  value={pomodoroState.shortBreakMinutesPreset}
                  onChange={(e) =>
                    updatePomodoroConfig({
                      shortBreakMinutesPreset: Math.max(
                        1,
                        Math.min(60, Number(e.target.value) || 5)
                      ),
                    })
                  }
                  className="w-full sage-input px-2.5 py-1.5 text-xs font-mono"
                />
              </div>
              <div>
                <label className="block text-[10px] text-[#9AA79E] mb-1">
                  Long Break (m)
                </label>
                <input
                  type="number"
                  min={1}
                  max={90}
                  value={pomodoroState.longBreakMinutesPreset}
                  onChange={(e) =>
                    updatePomodoroConfig({
                      longBreakMinutesPreset: Math.max(
                        1,
                        Math.min(90, Number(e.target.value) || 15)
                      ),
                    })
                  }
                  className="w-full sage-input px-2.5 py-1.5 text-xs font-mono"
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[#BDD3C1]/10 text-xs">
              <label className="flex items-center gap-2 cursor-pointer text-[#E8EDE8]">
                <input
                  type="checkbox"
                  checked={pomodoroState.autoStartBreaks}
                  onChange={(e) =>
                    updatePomodoroConfig({ autoStartBreaks: e.target.checked })
                  }
                  className="rounded accent-[#9BB9A2]"
                />
                <span>Auto-start breaks</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer text-[#E8EDE8]">
                <input
                  type="checkbox"
                  checked={pomodoroState.autoStartFocus}
                  onChange={(e) =>
                    updatePomodoroConfig({ autoStartFocus: e.target.checked })
                  }
                  className="rounded accent-[#9BB9A2]"
                />
                <span>Auto-start next Focus</span>
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Row: 7-Day Pomodoro Chart + Session Log */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* 7-Day Pomodoro Study Time Breakdown */}
        <div className="lg:col-span-6 sage-card p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-[#E8EDE8]">
                7-Day Study Time (100% Pomodoro-Driven)
              </h3>
              <p className="text-xs text-[#9AA79E]">
                Deep Study vs Active Recall minutes logged via Pomodoro
              </p>
            </div>
            <span className="text-xs font-mono font-semibold text-[#9BB9A2]">
              {Math.round((weekTotalMinutes / 60) * 10) / 10} hrs total
            </span>
          </div>

          <div className="h-52 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weekChartData} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
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
                <Bar
                  dataKey="deepStudyMins"
                  stackId="a"
                  fill="#9BB9A2"
                  radius={[0, 0, 0, 0]}
                  name="Deep Study / Review (min)"
                />
                <Bar
                  dataKey="recallMins"
                  stackId="a"
                  fill="#6EBF8B"
                  radius={[4, 4, 0, 0]}
                  name="Active Recall / Exam (min)"
                />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Category Totals Pills */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-2 border-t border-[#BDD3C1]/10">
            {categoryBreakdown.map((item) => (
              <div
                key={item.category}
                className="p-2.5 rounded-xl bg-[#171E1B]/60 border border-[#BDD3C1]/10 flex items-center justify-between text-xs"
              >
                <span className="text-[#9AA79E] truncate">{item.category}</span>
                <span className="font-mono font-semibold text-[#E8EDE8] ml-2">
                  {item.minutes}m
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Pomodoro Session History */}
        <div className="lg:col-span-6 sage-card p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-semibold text-[#E8EDE8]">
                Completed Pomodoro Sessions ({filteredSessions.length})
              </h3>
              <p className="text-xs text-[#9AA79E]">
                Every completed session adds directly to your Study Time
              </p>
            </div>

            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="sage-input px-2.5 py-1.5 text-xs"
            >
              <option value="ALL">All Categories</option>
              {POMODORO_CATEGORIES.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>

          {filteredSessions.length === 0 ? (
            <div className="py-12 text-center text-xs text-[#9AA79E] border border-dashed border-[#BDD3C1]/15 rounded-xl space-y-2">
              <p>No Pomodoro sessions logged yet.</p>
              <p className="text-[11px] text-[#65756B]">
                Start the focus timer on the left or click &ldquo;Finish &amp; Log&rdquo; to record
                your first session.
              </p>
            </div>
          ) : (
            <div className="space-y-2.5 max-h-[310px] overflow-y-auto pr-1">
              {filteredSessions.map((sess) => (
                <div
                  key={sess.id}
                  className="p-3.5 rounded-xl bg-[#1C2520]/80 border border-[#BDD3C1]/10 flex items-center justify-between gap-3"
                >
                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="px-2 py-0.5 rounded-md bg-[#9BB9A2]/20 text-[#9BB9A2] text-[10px] font-semibold">
                        {sess.category}
                      </span>
                      <span className="text-xs font-bold text-[#E8EDE8]">
                        {sess.durationMinutes} min
                      </span>
                      {sess.moduleCode && (
                        <span className="px-2 py-0.5 rounded bg-[#2C3932] text-[10px] font-mono text-[#D8B26E]">
                          {sess.moduleCode}
                        </span>
                      )}
                      <span className="text-[10px] text-[#65756B]">{sess.date}</span>
                    </div>

                    {(sess.taskTitle || sess.studyItemTitle || sess.notes) && (
                      <p className="text-xs text-[#9AA79E] truncate">
                        {sess.studyItemTitle || sess.taskTitle || sess.notes}
                      </p>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => deletePomodoroSession(sess.id, sess.firestoreLogId)}
                    className="p-1.5 rounded-lg text-[#65756B] hover:text-[#D97A6C] shrink-0"
                    title="Delete session"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Manual Study Session Modal */}
      {showManualLogModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={handleManualLogSubmit}
            className="w-full max-w-md rounded-2xl bg-[#222C27] border border-[#BDD3C1]/25 p-6 space-y-4"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-[#E8EDE8]">
                Log Pomodoro Study Session
              </h3>
              <button
                type="button"
                onClick={() => setShowManualLogModal(false)}
                className="text-xs text-[#9AA79E]"
              >
                Close
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-[#9AA79E] mb-1">
                  Duration (minutes)
                </label>
                <input
                  type="number"
                  min={1}
                  max={240}
                  required
                  value={manualMinutes}
                  onChange={(e) => setManualMinutes(Number(e.target.value))}
                  className="w-full sage-input px-3 py-2 text-xs"
                />
              </div>

              <div>
                <label className="block text-xs text-[#9AA79E] mb-1">Category</label>
                <select
                  value={pomodoroState.category}
                  onChange={(e) =>
                    updatePomodoroConfig({
                      category: e.target.value as PomodoroCategory,
                    })
                  }
                  className="w-full sage-input px-3 py-2 text-xs"
                >
                  {POMODORO_CATEGORIES.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs text-[#9AA79E] mb-1">
                Session Notes / Topic Covered
              </label>
              <input
                type="text"
                value={sessionNotes}
                onChange={(e) => setSessionNotes(e.target.value)}
                placeholder="What did you study in this Pomodoro?"
                className="w-full sage-input px-3 py-2 text-xs"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowManualLogModal(false)}
                className="px-4 py-2 rounded-xl bg-[#2C3932] text-xs text-[#9AA79E]"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-[#9BB9A2] text-[#171E1B] text-xs font-semibold"
              >
                Save to Study Time
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
