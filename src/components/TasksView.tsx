import React, { useState, useEffect, useMemo } from 'react';
import { useLifeOS } from '../context/LifeOSContext';
import { TaskItem } from '../types';
import {
  Plus,
  Play,
  Pause,
  Check,
  Clock,
  Calendar as CalendarIcon,
  AlertCircle,
  ArrowRight,
  Trash2,
  X,
  Search,
  SlidersHorizontal,
  RotateCcw,
} from 'lucide-react';

interface TasksViewProps {
  onNavigateCalendar?: () => void;
}

export const TasksView: React.FC<TasksViewProps> = ({ onNavigateCalendar }) => {
  const {
    tasks,
    goalsHabits,
    studyModules,
    todayDate,
    createTask,
    updateTask,
    updateTaskStatus,
    deleteTask,
    createCalendarEvent,
  } = useLifeOS();

  // Workflow view mode
  const [viewMode, setViewMode] = useState<'board' | 'focus' | 'list'>('board');

  // Filtering & Triage State
  const [categoryFilter, setCategoryFilter] = useState<'all' | TaskItem['category']>('all');
  const [dueWindowFilter, setDueWindowFilter] = useState<'all' | 'today' | 'overdue' | 'upcoming'>(
    'all'
  );
  const [priorityFilter, setPriorityFilter] = useState<'all' | TaskItem['priority']>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Inline Fast Capture Bar State
  const [quickTitle, setQuickTitle] = useState('');
  const [quickCategory, setQuickCategory] = useState<TaskItem['category']>('study');
  const [quickPriority, setQuickPriority] = useState<TaskItem['priority']>('high');
  const [quickMinutes, setQuickMinutes] = useState(45);
  const [quickDueDate, setQuickDueDate] = useState(todayDate);
  const [quickScheduledStart, setQuickScheduledStart] = useState('');
  const [quickGoalId, setQuickGoalId] = useState('');
  const [showAdvancedCapture, setShowAdvancedCapture] = useState(false);

  // Active Focus Session State
  const [focusedTaskId, setFocusedTaskId] = useState<string | null>(null);
  const [timerRunning, setTimerRunning] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  // Task Inspector / Edit Modal State
  const [editingTask, setEditingTask] = useState<TaskItem | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [editCategory, setEditCategory] = useState<TaskItem['category']>('study');
  const [editPriority, setEditPriority] = useState<TaskItem['priority']>('high');
  const [editStatus, setEditStatus] = useState<TaskItem['status']>('todo');
  const [editStatusReason, setEditStatusReason] = useState('');
  const [editEstimatedMins, setEditEstimatedMins] = useState(45);
  const [editActualMins, setEditActualMins] = useState(0);
  const [editDueDate, setEditDueDate] = useState(todayDate);
  const [editScheduledStart, setEditScheduledStart] = useState('');
  const [editLinkedGoalId, setEditLinkedGoalId] = useState('');
  const [editLinkedModuleId, setEditLinkedModuleId] = useState('');

  const [calendarToast, setCalendarToast] = useState<string | null>(null);

  const goals = goalsHabits.filter((g) => g.recordType === 'goal');

  // Sync focus task if none selected
  const activeFocusTask = useMemo(() => {
    if (focusedTaskId) {
      const found = tasks.find((t) => t.id === focusedTaskId);
      if (found) return found;
    }
    return (
      tasks.find((t) => t.status === 'in_progress') ||
      tasks.find((t) => t.status === 'todo' && t.priority === 'critical') ||
      tasks.find((t) => t.status === 'todo' && t.priority === 'high') ||
      tasks.find((t) => t.status === 'todo') ||
      null
    );
  }, [tasks, focusedTaskId]);

  useEffect(() => {
    if (!timerRunning) return;
    const interval = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [timerRunning]);

  const openTaskEditor = (task: TaskItem) => {
    setEditingTask(task);
    setEditTitle(task.title);
    setEditNotes(task.notes || '');
    setEditCategory(task.category);
    setEditPriority(task.priority);
    setEditStatus(task.status);
    setEditStatusReason(task.statusReason || '');
    setEditEstimatedMins(task.estimatedMinutes || 45);
    setEditActualMins(task.actualMinutes || 0);
    setEditDueDate(task.dueDate || todayDate);
    setEditScheduledStart(task.scheduledStart || '');
    setEditLinkedGoalId(task.linkedGoalId || '');
    setEditLinkedModuleId(task.linkedModuleId || '');
  };

  const handleSaveTaskEdits = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTask || !editTitle.trim()) return;
    await updateTask(editingTask, {
      title: editTitle.trim(),
      notes: editNotes.trim(),
      category: editCategory,
      priority: editPriority,
      status: editStatus,
      statusReason: editStatusReason.trim(),
      estimatedMinutes: Number(editEstimatedMins) || 30,
      actualMinutes: Number(editActualMins) || 0,
      dueDate: editDueDate || todayDate,
      scheduledStart: editScheduledStart.trim(),
      linkedGoalId: editLinkedGoalId,
      linkedModuleId: editLinkedModuleId,
    });
    setEditingTask(null);
  };

  const handleInlineCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickTitle.trim()) return;
    await createTask({
      title: quickTitle.trim(),
      category: quickCategory,
      priority: quickPriority,
      status: 'todo',
      estimatedMinutes: Math.max(5, Number(quickMinutes) || 45),
      dueDate: quickDueDate || todayDate,
      scheduledStart: quickScheduledStart || undefined,
      linkedGoalId: quickGoalId || undefined,
    });

    if (quickScheduledStart) {
      const [h, m] = quickScheduledStart.split(':').map(Number);
      const endMinTotal = h * 60 + m + (Number(quickMinutes) || 45);
      const endH = String(Math.min(23, Math.floor(endMinTotal / 60))).padStart(2, '0');
      const endM = String(endMinTotal % 60).padStart(2, '0');
      await createCalendarEvent({
        title: quickTitle.trim(),
        eventType: quickCategory === 'study' ? 'study_block' : 'fixed',
        date: quickDueDate || todayDate,
        startTime: quickScheduledStart,
        endTime: `${endH}:${endM}`,
        isProtectedAnchor: false,
      });
    }

    setQuickTitle('');
    setQuickScheduledStart('');
  };

  const handleStartFocusOnTask = async (task: TaskItem) => {
    if (task.status !== 'in_progress') {
      await updateTaskStatus(task, 'in_progress');
    }
    setFocusedTaskId(task.id);
    setElapsedSeconds((task.actualMinutes || 0) * 60);
    setTimerRunning(true);
    setViewMode('focus');
  };

  const handleCompleteFocusedTask = async () => {
    if (!activeFocusTask) return;
    setTimerRunning(false);
    const loggedMinutes = Math.max(
      1,
      Math.round(elapsedSeconds / 60) || activeFocusTask.estimatedMinutes
    );
    await updateTask(activeFocusTask, {
      status: 'completed',
      actualMinutes: loggedMinutes,
    });
    setElapsedSeconds(0);
    setFocusedTaskId(null);
  };

  const handleDeferTask = async (task: TaskItem, days = 1) => {
    const base = new Date(task.dueDate || todayDate);
    base.setDate(base.getDate() + days);
    const nextDate = base.toISOString().split('T')[0];
    await updateTask(task, {
      dueDate: nextDate,
      status: 'deferred',
    });
  };

  const handleScheduleToCalendar = async (task: TaskItem) => {
    const start = task.scheduledStart || '10:00';
    const [h, m] = start.split(':').map(Number);
    const totalEnd = (isNaN(h) ? 10 : h) * 60 + (isNaN(m) ? 0 : m) + (task.estimatedMinutes || 45);
    const endH = String(Math.min(23, Math.floor(totalEnd / 60))).padStart(2, '0');
    const endM = String(totalEnd % 60).padStart(2, '0');

    await createCalendarEvent({
      title: task.title,
      eventType: task.category === 'study' ? 'study_block' : 'fixed',
      date: task.dueDate || todayDate,
      startTime: start,
      endTime: `${endH}:${endM}`,
      isProtectedAnchor: false,
      linkedRecordId: task.id,
    });

    setCalendarToast(`Scheduled "${task.title}" on ${task.dueDate} (${start}–${endH}:${endM})`);
    setTimeout(() => setCalendarToast(null), 3500);
  };

  // Filtered Tasks
  const filteredTasks = useMemo(() => {
    return tasks
      .filter((t) => {
        if (categoryFilter !== 'all' && t.category !== categoryFilter) return false;
        if (priorityFilter !== 'all' && t.priority !== priorityFilter) return false;
        if (dueWindowFilter === 'today' && t.dueDate !== todayDate) return false;
        if (
          dueWindowFilter === 'overdue' &&
          !(t.dueDate < todayDate && t.status !== 'completed')
        ) {
          return false;
        }
        if (dueWindowFilter === 'upcoming' && !(t.dueDate > todayDate)) return false;
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchTitle = t.title.toLowerCase().includes(q);
          const matchNotes = (t.notes || '').toLowerCase().includes(q);
          if (!matchTitle && !matchNotes) return false;
        }
        return true;
      })
      .sort((a, b) => {
        const pWeight: Record<TaskItem['priority'], number> = {
          critical: 0,
          high: 1,
          medium: 2,
          low: 3,
        };
        if (pWeight[a.priority] !== pWeight[b.priority]) {
          return pWeight[a.priority] - pWeight[b.priority];
        }
        return a.dueDate.localeCompare(b.dueDate);
      });
  }, [tasks, categoryFilter, priorityFilter, dueWindowFilter, searchQuery, todayDate]);

  // Metrics
  const openTasks = tasks.filter((t) => t.status !== 'completed' && t.status !== 'dropped');
  const dueTodayTasks = openTasks.filter((t) => t.dueDate === todayDate);
  const overdueTasks = openTasks.filter((t) => t.dueDate < todayDate);
  const completedTasks = tasks.filter((t) => t.status === 'completed');
  const plannedMinutesToday = dueTodayTasks.reduce((s, t) => s + (t.estimatedMinutes || 0), 0);

  // Kanban Columns
  const colTodo = filteredTasks.filter((t) => t.status === 'todo' || t.status === 'deferred');
  const colInProgress = filteredTasks.filter((t) => t.status === 'in_progress');
  const colBlocked = filteredTasks.filter((t) => t.status === 'blocked');
  const colCompleted = filteredTasks.filter((t) => t.status === 'completed');

  const formatTimer = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const rem = sec % 60;
    return `${String(mins).padStart(2, '0')}:${String(rem).padStart(2, '0')}`;
  };

  return (
    <div className="space-y-6 pb-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="text-xs font-medium text-[var(--text-muted)]">
            Task Workflow · Triage · Deep Focus Execution
          </p>
          <h1 className="text-2xl font-bold tracking-tight mt-0.5">Tasks</h1>
        </div>

        {/* Mode Switcher */}
        <div className="flex items-center gap-2">
          {calendarToast && (
            <div className="px-3 py-1.5 rounded-xl bg-[#6EBF8B]/20 text-[#6EBF8B] text-xs font-medium">
              {calendarToast}
            </div>
          )}
          <div className="flex items-center bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-xl p-1">
            {(
              [
                { id: 'board', label: 'Workflow Board' },
                { id: 'focus', label: 'Focus Queue' },
                { id: 'list', label: 'List & Triage' },
              ] as const
            ).map((m) => (
              <button
                key={m.id}
                onClick={() => setViewMode(m.id)}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
                  viewMode === m.id
                    ? 'bg-[var(--bg-secondary)] text-[var(--text-primary)] font-semibold'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
          {onNavigateCalendar && (
            <button
              onClick={onNavigateCalendar}
              className="px-3.5 py-2 rounded-xl bg-[var(--bg-card)] border border-[var(--border-subtle)] hover:bg-[var(--bg-hover)] text-xs font-medium flex items-center gap-1.5 whitespace-nowrap"
            >
              <CalendarIcon className="w-3.5 h-3.5 text-[#9BB9A2]" />
              Calendar
            </button>
          )}
        </div>
      </div>

      {/* 4 KPI Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-2xl p-4">
          <p className="text-xs text-[var(--text-muted)]">Open Queue</p>
          <div className="text-2xl font-bold tabular-nums mt-1">{openTasks.length}</div>
          <p className="text-xs text-[var(--text-secondary)] mt-1 tabular-nums">
            {colInProgress.length} actively in progress
          </p>
        </div>
        <div className="bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-2xl p-4">
          <p className="text-xs text-[var(--text-muted)]">Due Today ({todayDate})</p>
          <div className="text-2xl font-bold tabular-nums mt-1">{dueTodayTasks.length}</div>
          <p className="text-xs text-[#9BB9A2] mt-1 tabular-nums">
            {(plannedMinutesToday / 60).toFixed(1)} hrs estimated load
          </p>
        </div>
        <div className="bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-2xl p-4">
          <p className="text-xs text-[var(--text-muted)]">Overdue / Blocked</p>
          <div className="text-2xl font-bold tabular-nums mt-1">
            {overdueTasks.length} / {colBlocked.length}
          </div>
          <p className="text-xs text-[var(--text-secondary)] mt-1">
            {overdueTasks.length === 0 ? 'Zero overdue backlog' : 'Needs reschedule or triage'}
          </p>
        </div>
        <div className="bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-2xl p-4">
          <p className="text-xs text-[var(--text-muted)]">Completed</p>
          <div className="text-2xl font-bold tabular-nums mt-1">{completedTasks.length}</div>
          <p className="text-xs text-[#6EBF8B] mt-1 tabular-nums">
            {tasks.length > 0 ? Math.round((completedTasks.length / tasks.length) * 100) : 0}%
            completion rate
          </p>
        </div>
      </div>

      {/* Inline Fast Task Capture Bar */}
      <form
        onSubmit={handleInlineCreate}
        className="bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-2xl p-4 space-y-3"
      >
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-2.5">
          <div className="flex-1 flex items-center gap-2.5 px-3.5 py-2 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-subtle)] focus-within:border-[#9BB9A2]">
            <Plus className="w-4 h-4 text-[#9BB9A2] shrink-0" />
            <input
              type="text"
              value={quickTitle}
              onChange={(e) => setQuickTitle(e.target.value)}
              placeholder="Add a new task... (Press Enter to save immediately)"
              className="w-full bg-transparent text-xs text-[var(--text-primary)] focus:outline-none"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={quickCategory}
              onChange={(e) => setQuickCategory(e.target.value as TaskItem['category'])}
              className="px-3 py-2 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-subtle)] text-xs"
              title="Category"
            >
              <option value="study">Study</option>
              <option value="work">Work</option>
              <option value="health">Health</option>
              <option value="finance">Finance</option>
              <option value="personal">Personal</option>
              <option value="routine">Routine</option>
            </select>

            <select
              value={quickPriority}
              onChange={(e) => setQuickPriority(e.target.value as TaskItem['priority'])}
              className="px-3 py-2 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-subtle)] text-xs"
              title="Priority"
            >
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>

            <div className="flex items-center gap-1 px-2.5 py-2 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-subtle)] text-xs">
              <Clock className="w-3.5 h-3.5 text-[var(--text-muted)]" />
              <input
                type="number"
                min={5}
                max={480}
                step={5}
                value={quickMinutes}
                onChange={(e) => setQuickMinutes(Number(e.target.value))}
                className="w-12 bg-transparent text-center font-mono tabular-nums focus:outline-none"
                title="Estimated minutes"
              />
              <span className="text-[var(--text-muted)]">m</span>
            </div>

            <input
              type="date"
              value={quickDueDate}
              onChange={(e) => setQuickDueDate(e.target.value)}
              className="px-2.5 py-2 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-subtle)] text-xs font-mono"
              title="Due date"
            />

            <button
              type="button"
              onClick={() => setShowAdvancedCapture((prev) => !prev)}
              className={`p-2 rounded-xl border text-xs transition-colors ${
                showAdvancedCapture
                  ? 'bg-[#9BB9A2]/20 border-[#9BB9A2] text-[#9BB9A2]'
                  : 'bg-[var(--bg-secondary)] border-[var(--border-subtle)] text-[var(--text-secondary)]'
              }`}
              title="Link to Goal or Auto-Schedule Time Block"
            >
              <SlidersHorizontal className="w-4 h-4" />
            </button>

            <button
              type="submit"
              disabled={!quickTitle.trim()}
              className="px-4 py-2 rounded-xl bg-[var(--accent)] text-[#0F1613] text-xs font-semibold hover:opacity-90 disabled:opacity-50 whitespace-nowrap"
            >
              Add Task
            </button>
          </div>
        </div>

        {/* Optional Time-Block & Goal Link Row */}
        {showAdvancedCapture && (
          <div className="pt-2 border-t border-[var(--border-subtle)] flex flex-wrap items-center gap-4 text-xs">
            <div className="flex items-center gap-2">
              <span className="text-[var(--text-muted)]">Auto-block on Calendar at:</span>
              <input
                type="time"
                value={quickScheduledStart}
                onChange={(e) => setQuickScheduledStart(e.target.value)}
                className="px-2.5 py-1 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-subtle)] font-mono"
              />
            </div>

            {goals.length > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-[var(--text-muted)]">Link to Goal:</span>
                <select
                  value={quickGoalId}
                  onChange={(e) => setQuickGoalId(e.target.value)}
                  className="px-2.5 py-1 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-subtle)]"
                >
                  <option value="">None</option>
                  {goals.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.title}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        )}
      </form>

      {/* Filter & Search Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {/* Category Segmented Control */}
          <div className="flex items-center p-1 rounded-xl bg-[var(--bg-card)] border border-[var(--border-subtle)] text-xs">
            {(
              [
                { id: 'all', label: 'All' },
                { id: 'study', label: 'Study' },
                { id: 'work', label: 'Work' },
                { id: 'health', label: 'Health' },
                { id: 'finance', label: 'Finance' },
                { id: 'personal', label: 'Personal' },
                { id: 'routine', label: 'Routine' },
              ] as const
            ).map((cat) => (
              <button
                key={cat.id}
                onClick={() => setCategoryFilter(cat.id)}
                className={`px-3 py-1 rounded-lg font-medium transition-colors whitespace-nowrap ${
                  categoryFilter === cat.id
                    ? 'bg-[var(--bg-secondary)] text-[var(--text-primary)] font-semibold'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Due Window Filter */}
          <div className="flex items-center p-1 rounded-xl bg-[var(--bg-card)] border border-[var(--border-subtle)] text-xs">
            {(
              [
                { id: 'all', label: 'Any Date' },
                { id: 'today', label: 'Due Today' },
                { id: 'overdue', label: 'Overdue' },
                { id: 'upcoming', label: 'Upcoming' },
              ] as const
            ).map((dw) => (
              <button
                key={dw.id}
                onClick={() => setDueWindowFilter(dw.id)}
                className={`px-2.5 py-1 rounded-lg font-medium transition-colors whitespace-nowrap ${
                  dueWindowFilter === dw.id
                    ? 'bg-[var(--bg-secondary)] text-[var(--text-primary)] font-semibold'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                {dw.label}
              </button>
            ))}
          </div>
        </div>

        {/* Search & Priority Filter */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[var(--bg-card)] border border-[var(--border-subtle)] text-xs">
            <Search className="w-3.5 h-3.5 text-[var(--text-muted)]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter tasks..."
              className="bg-transparent focus:outline-none w-36"
            />
          </div>

          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value as 'all' | TaskItem['priority'])}
            className="px-3 py-1.5 rounded-xl bg-[var(--bg-card)] border border-[var(--border-subtle)] text-xs"
          >
            <option value="all">All Priorities</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>
      </div>

      {/* MODE 1: 4-COLUMN WORKFLOW BOARD */}
      {viewMode === 'board' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Column 1: To Do & Deferred */}
          <div className="bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-2xl p-4 flex flex-col gap-3">
            <div className="flex items-center justify-between pb-2 border-b border-[var(--border-subtle)]">
              <span className="text-xs font-bold">To Do</span>
              <span className="text-xs font-mono tabular-nums text-[var(--text-muted)]">
                {colTodo.length}
              </span>
            </div>

            <div className="space-y-2.5">
              {colTodo.length === 0 ? (
                <p className="text-xs text-[var(--text-muted)] py-8 text-center">
                  No tasks waiting in queue
                </p>
              ) : (
                colTodo.map((t) => {
                  const isOverdue = t.dueDate < todayDate;
                  return (
                    <div
                      key={t.id}
                      onClick={() => openTaskEditor(t)}
                      className="p-3.5 rounded-xl bg-[var(--bg-secondary)]/60 border border-[var(--border-subtle)] hover:border-[#9BB9A2]/40 cursor-pointer transition-colors space-y-2"
                    >
                      <div className="flex items-center justify-between text-[11px] text-[var(--text-muted)]">
                        <span className="capitalize">
                          {t.category} · {t.priority}
                        </span>
                        <span className="font-mono tabular-nums">{t.estimatedMinutes}m</span>
                      </div>

                      <p className="text-xs font-semibold text-[var(--text-primary)] leading-snug">
                        {t.title}
                      </p>

                      <div className="flex items-center justify-between pt-2 border-t border-[var(--border-subtle)] text-[11px]">
                        <span
                          className={`font-mono tabular-nums ${
                            isOverdue ? 'text-[#D97777] font-semibold' : 'text-[var(--text-muted)]'
                          }`}
                        >
                          {isOverdue ? `Overdue · ${t.dueDate}` : t.dueDate}
                        </span>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleScheduleToCalendar(t);
                            }}
                            className="text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                            title="Block on Calendar"
                          >
                            +Cal
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleStartFocusOnTask(t);
                            }}
                            className="text-[#9BB9A2] font-semibold hover:underline flex items-center gap-0.5"
                          >
                            Focus <ArrowRight className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Column 2: In Progress */}
          <div className="bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-2xl p-4 flex flex-col gap-3">
            <div className="flex items-center justify-between pb-2 border-b border-[var(--border-subtle)]">
              <span className="text-xs font-bold text-[#9BB9A2]">In Progress</span>
              <span className="text-xs font-mono tabular-nums text-[#9BB9A2]">
                {colInProgress.length}
              </span>
            </div>

            <div className="space-y-2.5">
              {colInProgress.length === 0 ? (
                <p className="text-xs text-[var(--text-muted)] py-8 text-center">
                  Click &ldquo;Focus&rdquo; on any task to start working
                </p>
              ) : (
                colInProgress.map((t) => (
                  <div
                    key={t.id}
                    onClick={() => openTaskEditor(t)}
                    className="p-3.5 rounded-xl bg-[var(--bg-secondary)] border border-[#9BB9A2]/40 cursor-pointer space-y-2"
                  >
                    <div className="flex items-center justify-between text-[11px] text-[#9BB9A2]">
                      <span className="capitalize font-medium">
                        {t.category} · {t.priority}
                      </span>
                      <span className="font-mono tabular-nums">{t.estimatedMinutes}m est</span>
                    </div>

                    <p className="text-xs font-semibold text-[var(--text-primary)] leading-snug">
                      {t.title}
                    </p>

                    <div className="flex items-center justify-between pt-2 border-t border-[var(--border-subtle)] text-[11px]">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          updateTaskStatus(t, 'blocked', 'Waiting on dependency or clarification');
                        }}
                        className="text-[#E5B567] hover:underline"
                      >
                        Flag Blocker
                      </button>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleStartFocusOnTask(t);
                          }}
                          className="text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                        >
                          Timer
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            updateTaskStatus(t, 'completed');
                          }}
                          className="text-[#6EBF8B] font-semibold hover:underline"
                        >
                          Done ✓
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Column 3: Blocked */}
          <div className="bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-2xl p-4 flex flex-col gap-3">
            <div className="flex items-center justify-between pb-2 border-b border-[var(--border-subtle)]">
              <span className="text-xs font-bold text-[#E5B567]">Blocked</span>
              <span className="text-xs font-mono tabular-nums text-[#E5B567]">
                {colBlocked.length}
              </span>
            </div>

            <div className="space-y-2.5">
              {colBlocked.length === 0 ? (
                <p className="text-xs text-[var(--text-muted)] py-8 text-center">
                  Zero blocked tasks
                </p>
              ) : (
                colBlocked.map((t) => (
                  <div
                    key={t.id}
                    onClick={() => openTaskEditor(t)}
                    className="p-3.5 rounded-xl bg-[var(--bg-secondary)]/60 border border-[#E5B567]/40 cursor-pointer space-y-2"
                  >
                    <div className="flex items-center justify-between text-[11px] text-[#E5B567]">
                      <span className="flex items-center gap-1 font-medium">
                        <AlertCircle className="w-3 h-3" /> Blocked
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          updateTaskStatus(t, 'todo', '');
                        }}
                        className="text-[#9BB9A2] hover:underline"
                      >
                        Unblock →
                      </button>
                    </div>

                    <p className="text-xs font-semibold text-[var(--text-primary)]">{t.title}</p>
                    {t.statusReason && (
                      <p className="text-[11px] text-[var(--text-muted)]">{t.statusReason}</p>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Column 4: Completed */}
          <div className="bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-2xl p-4 flex flex-col gap-3">
            <div className="flex items-center justify-between pb-2 border-b border-[var(--border-subtle)]">
              <span className="text-xs font-bold text-[#6EBF8B]">Completed</span>
              <span className="text-xs font-mono tabular-nums text-[#6EBF8B]">
                {colCompleted.length}
              </span>
            </div>

            <div className="space-y-2">
              {colCompleted.length === 0 ? (
                <p className="text-xs text-[var(--text-muted)] py-8 text-center">
                  Complete tasks to earn XP &amp; Coins
                </p>
              ) : (
                colCompleted.slice(0, 12).map((t) => (
                  <div
                    key={t.id}
                    onClick={() => openTaskEditor(t)}
                    className="p-3 rounded-xl bg-[var(--bg-secondary)]/30 border border-[var(--border-subtle)] flex items-center justify-between gap-2 cursor-pointer"
                  >
                    <span className="text-xs text-[var(--text-muted)] line-through truncate">
                      {t.title}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        updateTaskStatus(t, 'todo');
                      }}
                      className="text-[var(--text-muted)] hover:text-[var(--text-primary)] shrink-0"
                      title="Reopen task"
                    >
                      <RotateCcw className="w-3 h-3" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODE 2: FOCUS QUEUE & EXECUTION ENGINE */}
      {viewMode === 'focus' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Active Focus Timer & Execution Workspace */}
          <div className="lg:col-span-7 bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-2xl p-6 flex flex-col justify-between space-y-6">
            {activeFocusTask ? (
              <>
                <div className="space-y-4">
                  <div className="flex items-center justify-between text-xs text-[var(--text-muted)]">
                    <span className="capitalize">
                      Active Task · {activeFocusTask.category} · {activeFocusTask.priority} priority
                    </span>
                    <span className="font-mono tabular-nums">
                      Due {activeFocusTask.dueDate} · Est. {activeFocusTask.estimatedMinutes}m
                    </span>
                  </div>

                  <h2 className="text-xl font-bold">{activeFocusTask.title}</h2>

                  {/* Timer Display */}
                  <div className="p-6 rounded-2xl bg-[var(--bg-secondary)]/60 border border-[var(--border-subtle)] flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div>
                      <p className="text-xs text-[var(--text-muted)]">Elapsed Focus Session</p>
                      <div className="text-4xl font-bold font-mono tabular-nums text-[#9BB9A2] mt-1">
                        {formatTimer(elapsedSeconds)}
                      </div>
                    </div>

                    <div className="flex items-center gap-2.5">
                      <button
                        type="button"
                        onClick={() => setTimerRunning((prev) => !prev)}
                        className="px-4 py-2.5 rounded-xl bg-[var(--bg-card)] border border-[var(--border-subtle)] text-xs font-semibold flex items-center gap-1.5 hover:border-[#9BB9A2]"
                      >
                        {timerRunning ? (
                          <>
                            <Pause className="w-3.5 h-3.5" /> Pause
                          </>
                        ) : (
                          <>
                            <Play className="w-3.5 h-3.5" /> Start Timer
                          </>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={handleCompleteFocusedTask}
                        className="px-4 py-2.5 rounded-xl bg-[#6EBF8B] text-[#0F1613] text-xs font-bold flex items-center gap-1.5 hover:opacity-90"
                      >
                        <Check className="w-4 h-4 stroke-[2.5]" /> Complete &amp; Log Time
                      </button>
                    </div>
                  </div>

                  {/* Working Scratchpad / Notes for Focused Task */}
                  <div>
                    <label className="block text-xs text-[var(--text-muted)] mb-1.5">
                      Task working notes &amp; checklists (auto-saved on blur)
                    </label>
                    <textarea
                      rows={5}
                      defaultValue={activeFocusTask.notes || ''}
                      key={activeFocusTask.id}
                      onBlur={(e) => {
                        if (e.target.value !== (activeFocusTask.notes || '')) {
                          updateTask(activeFocusTask, { notes: e.target.value });
                        }
                      }}
                      placeholder="Write sub-steps, key links, or session notes here..."
                      className="w-full px-4 py-3 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-subtle)] text-xs focus:outline-none focus:border-[#9BB9A2]"
                    />
                  </div>
                </div>

                <div className="pt-4 border-t border-[var(--border-subtle)] flex flex-wrap items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => handleScheduleToCalendar(activeFocusTask)}
                      className="text-[#9BB9A2] hover:underline"
                    >
                      + Block on Calendar
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeferTask(activeFocusTask, 1)}
                      className="text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                    >
                      Defer to Tomorrow →
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => openTaskEditor(activeFocusTask)}
                    className="text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                  >
                    Full Task Details
                  </button>
                </div>
              </>
            ) : (
              <div className="py-16 text-center space-y-3">
                <p className="text-sm font-semibold text-[var(--text-secondary)]">
                  No open tasks in your focus queue
                </p>
                <p className="text-xs text-[var(--text-muted)]">
                  Use the quick capture bar above to add a task and begin a focused session.
                </p>
              </div>
            )}
          </div>

          {/* Up Next Priority Queue */}
          <div className="lg:col-span-5 bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold">Up Next Queue ({openTasks.length})</h3>
                <p className="text-xs text-[var(--text-muted)]">
                  Sorted by priority &amp; due date · click to load into Focus Engine
                </p>
              </div>
            </div>

            {openTasks.length === 0 ? (
              <p className="text-xs text-[var(--text-muted)] py-8 text-center">
                Your open queue is clear.
              </p>
            ) : (
              <div className="space-y-2.5 max-h-[420px] overflow-y-auto pr-1">
                {openTasks.map((t) => {
                  const isCurrent = activeFocusTask?.id === t.id;
                  return (
                    <div
                      key={t.id}
                      onClick={() => {
                        setFocusedTaskId(t.id);
                        setElapsedSeconds((t.actualMinutes || 0) * 60);
                      }}
                      className={`p-3.5 rounded-xl border cursor-pointer transition-all flex items-center justify-between gap-3 ${
                        isCurrent
                          ? 'bg-[#9BB9A2]/15 border-[#9BB9A2]'
                          : 'bg-[var(--bg-secondary)]/40 border-[var(--border-subtle)] hover:border-[#9BB9A2]/40'
                      }`}
                    >
                      <div className="min-w-0">
                        <p className="text-xs font-semibold truncate">{t.title}</p>
                        <p className="text-[11px] text-[var(--text-muted)] mt-0.5 capitalize">
                          {t.category} · {t.priority} · Due {t.dueDate}
                        </p>
                      </div>
                      <span className="text-xs font-mono tabular-nums text-[#9BB9A2] shrink-0">
                        {t.estimatedMinutes}m
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODE 3: HIGH-DENSITY LIST & TRIAGE TABLE */}
      {viewMode === 'list' && (
        <div className="bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold">Task Triage Table</h2>
              <p className="text-xs text-[var(--text-muted)]">
                {filteredTasks.length} tasks matching current filters
              </p>
            </div>
          </div>

          {filteredTasks.length === 0 ? (
            <div className="py-12 text-center space-y-2">
              <p className="text-xs text-[var(--text-muted)]">
                No tasks match your active filter criteria.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-[var(--border-subtle)] text-[11px] text-[var(--text-muted)]">
                    <th className="py-2.5 px-3">Done</th>
                    <th className="py-2.5 px-3">Task</th>
                    <th className="py-2.5 px-3">Category</th>
                    <th className="py-2.5 px-3">Priority</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3">Due Date</th>
                    <th className="py-2.5 px-3 text-right">Est / Actual</th>
                    <th className="py-2.5 px-3 text-right">Workflow Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-subtle)]">
                  {filteredTasks.map((t) => {
                    const isDone = t.status === 'completed';
                    const isOverdue = !isDone && t.dueDate < todayDate;
                    return (
                      <tr
                        key={t.id}
                        onClick={() => openTaskEditor(t)}
                        className="hover:bg-[var(--bg-hover)]/40 cursor-pointer transition-colors"
                      >
                        <td
                          className="py-3 px-3"
                          onClick={(e) => {
                            e.stopPropagation();
                            updateTaskStatus(t, isDone ? 'todo' : 'completed');
                          }}
                        >
                          <button
                            type="button"
                            className={`w-4 h-4 rounded flex items-center justify-center border ${
                              isDone
                                ? 'bg-[#6EBF8B] border-[#6EBF8B] text-[#0F1613]'
                                : 'border-[var(--text-muted)] hover:border-[#9BB9A2]'
                            }`}
                          >
                            {isDone && <Check className="w-3 h-3 stroke-[3]" />}
                          </button>
                        </td>
                        <td
                          className={`py-3 px-3 font-medium ${
                            isDone ? 'line-through text-[var(--text-muted)]' : ''
                          }`}
                        >
                          {t.title}
                        </td>
                        <td className="py-3 px-3 capitalize text-[var(--text-secondary)]">
                          {t.category}
                        </td>
                        <td className="py-3 px-3 capitalize">
                          <span
                            className={
                              t.priority === 'critical'
                                ? 'text-[#D97777] font-semibold'
                                : t.priority === 'high'
                                ? 'text-[#E5B567] font-semibold'
                                : 'text-[var(--text-secondary)]'
                            }
                          >
                            {t.priority}
                          </span>
                        </td>
                        <td className="py-3 px-3 capitalize text-[var(--text-secondary)]">
                          {t.status.replace('_', ' ')}
                        </td>
                        <td
                          className={`py-3 px-3 font-mono tabular-nums ${
                            isOverdue
                              ? 'text-[#D97777] font-semibold'
                              : 'text-[var(--text-secondary)]'
                          }`}
                        >
                          {t.dueDate}
                        </td>
                        <td className="py-3 px-3 text-right font-mono tabular-nums text-[var(--text-secondary)]">
                          {t.estimatedMinutes}m
                          {t.actualMinutes ? ` / ${t.actualMinutes}m` : ''}
                        </td>
                        <td
                          className="py-3 px-3 text-right space-x-2 whitespace-nowrap"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {!isDone && (
                            <>
                              <button
                                type="button"
                                onClick={() => handleStartFocusOnTask(t)}
                                className="text-[#9BB9A2] hover:underline font-medium"
                              >
                                Focus
                              </button>
                              <button
                                type="button"
                                onClick={() => handleScheduleToCalendar(t)}
                                className="text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                              >
                                +Cal
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeferTask(t, 1)}
                                className="text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                                title="Defer +1 day"
                              >
                                +1d
                              </button>
                            </>
                          )}
                          <button
                            type="button"
                            onClick={() => deleteTask(t.id)}
                            className="text-[var(--text-muted)] hover:text-[#D97777] inline-flex items-center"
                            title="Delete task"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Full Task Inspector & Editor Modal */}
      {editingTask && (
        <div
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setEditingTask(null)}
        >
          <form
            onSubmit={handleSaveTaskEdits}
            onClick={(e) => e.stopPropagation()}
            className="bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold">Edit Task &amp; Workflow</h3>
              <button
                type="button"
                onClick={() => setEditingTask(null)}
                className="text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <label className="block text-xs text-[var(--text-muted)] mb-1">Task Title</label>
              <input
                type="text"
                required
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-subtle)] text-xs"
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs text-[var(--text-muted)] mb-1">Category</label>
                <select
                  value={editCategory}
                  onChange={(e) => setEditCategory(e.target.value as TaskItem['category'])}
                  className="w-full px-2.5 py-2 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-subtle)] text-xs"
                >
                  <option value="study">Study</option>
                  <option value="work">Work</option>
                  <option value="health">Health</option>
                  <option value="finance">Finance</option>
                  <option value="personal">Personal</option>
                  <option value="routine">Routine</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-[var(--text-muted)] mb-1">Priority</label>
                <select
                  value={editPriority}
                  onChange={(e) => setEditPriority(e.target.value as TaskItem['priority'])}
                  className="w-full px-2.5 py-2 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-subtle)] text-xs"
                >
                  <option value="critical">Critical</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-[var(--text-muted)] mb-1">Status</label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value as TaskItem['status'])}
                  className="w-full px-2.5 py-2 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-subtle)] text-xs"
                >
                  <option value="todo">To do</option>
                  <option value="in_progress">In progress</option>
                  <option value="blocked">Blocked</option>
                  <option value="deferred">Deferred</option>
                  <option value="completed">Completed</option>
                  <option value="dropped">Dropped</option>
                </select>
              </div>
            </div>

            {editStatus === 'blocked' && (
              <div>
                <label className="block text-xs text-[#E5B567] mb-1">
                  Blocker Reason / Dependency
                </label>
                <input
                  type="text"
                  value={editStatusReason}
                  onChange={(e) => setEditStatusReason(e.target.value)}
                  placeholder="What is blocking this task?"
                  className="w-full px-3.5 py-2 rounded-xl bg-[var(--bg-secondary)] border border-[#E5B567]/40 text-xs"
                />
              </div>
            )}

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-xs text-[var(--text-muted)] mb-1">Due Date</label>
                <input
                  type="date"
                  value={editDueDate}
                  onChange={(e) => setEditDueDate(e.target.value)}
                  className="w-full px-2.5 py-2 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-subtle)] text-xs font-mono"
                />
              </div>
              <div>
                <label className="block text-xs text-[var(--text-muted)] mb-1">Start Time</label>
                <input
                  type="time"
                  value={editScheduledStart}
                  onChange={(e) => setEditScheduledStart(e.target.value)}
                  className="w-full px-2.5 py-2 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-subtle)] text-xs font-mono"
                />
              </div>
              <div>
                <label className="block text-xs text-[var(--text-muted)] mb-1">Est. Mins</label>
                <input
                  type="number"
                  min={1}
                  max={1440}
                  value={editEstimatedMins}
                  onChange={(e) => setEditEstimatedMins(Number(e.target.value))}
                  className="w-full px-2.5 py-2 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-subtle)] text-xs font-mono"
                />
              </div>
              <div>
                <label className="block text-xs text-[var(--text-muted)] mb-1">Actual Mins</label>
                <input
                  type="number"
                  min={0}
                  max={1440}
                  value={editActualMins}
                  onChange={(e) => setEditActualMins(Number(e.target.value))}
                  className="w-full px-2.5 py-2 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-subtle)] text-xs font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-[var(--text-muted)] mb-1">Link to Goal</label>
                <select
                  value={editLinkedGoalId}
                  onChange={(e) => setEditLinkedGoalId(e.target.value)}
                  className="w-full px-2.5 py-2 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-subtle)] text-xs"
                >
                  <option value="">None</option>
                  {goals.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.title}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-[var(--text-muted)] mb-1">
                  Link to Study Module
                </label>
                <select
                  value={editLinkedModuleId}
                  onChange={(e) => setEditLinkedModuleId(e.target.value)}
                  className="w-full px-2.5 py-2 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-subtle)] text-xs"
                >
                  <option value="">None</option>
                  {studyModules.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.code} — {m.title}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs text-[var(--text-muted)] mb-1">Notes</label>
              <textarea
                rows={3}
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
                placeholder="Sub-steps, acceptance criteria, or reference links..."
                className="w-full px-3.5 py-2 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-subtle)] text-xs"
              />
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-[var(--border-subtle)]">
              <button
                type="button"
                onClick={async () => {
                  await deleteTask(editingTask.id);
                  setEditingTask(null);
                }}
                className="text-xs text-[#D97777] hover:underline flex items-center gap-1"
              >
                <Trash2 className="w-3.5 h-3.5" /> Delete Task
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setEditingTask(null)}
                  className="px-4 py-2 rounded-xl bg-[var(--bg-secondary)] text-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-[var(--accent)] text-[#0F1613] text-xs font-semibold"
                >
                  Save Changes
                </button>
              </div>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
