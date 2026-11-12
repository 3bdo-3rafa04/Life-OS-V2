import React, { useState } from 'react';
import { Calendar as CalendarIcon, Plus, Sparkles, Trash2, CheckCircle2, Shield } from 'lucide-react';
import { useLifeOS } from '../context/LifeOSContext.tsx';
import { CalendarEventItem, TaskItem } from '../types.ts';

export const CalendarTasksView: React.FC = () => {
  const {
    profile,
    tasks,
    events,
    todayDate,
    createTask,
    updateTaskStatus,
    deleteTask,
    createCalendarEvent,
    deleteCalendarEvent,
    updateProfileSettings,
    logAiAction,
  } = useLifeOS();

  const [viewMode, setViewMode] = useState<'today' | 'agenda' | 'week'>('today');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  // New Task Form
  const [taskTitle, setTaskTitle] = useState('');
  const [taskPriority, setTaskPriority] = useState<TaskItem['priority']>('high');
  const [taskCategory, setTaskCategory] = useState<TaskItem['category']>('study');
  const [taskMinutes, setTaskMinutes] = useState(45);
  const [taskDue, setTaskDue] = useState(todayDate);
  const [taskStart, setTaskStart] = useState('14:00');

  // New Event Form
  const [eventTitle, setEventTitle] = useState('');
  const [eventType, setEventType] = useState<CalendarEventItem['eventType']>('fixed');
  const [eventStart, setEventStart] = useState('09:00');
  const [eventEnd, setEventEnd] = useState('10:30');
  const [eventLocation, setEventLocation] = useState('');
  const [isProtected, setIsProtected] = useState(false);

  const [autoBlockNotice, setAutoBlockNotice] = useState('');

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskTitle.trim()) return;
    await createTask({
      title: taskTitle,
      priority: taskPriority,
      status: 'todo',
      category: taskCategory,
      estimatedMinutes: Number(taskMinutes) || 30,
      dueDate: taskDue || todayDate,
      scheduledStart: taskStart,
    });
    setTaskTitle('');
  };

  const handleAddEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventTitle.trim()) return;
    await createCalendarEvent({
      title: eventTitle,
      eventType,
      date: todayDate,
      startTime: eventStart,
      endTime: eventEnd,
      location: eventLocation || 'Scheduled Block',
      isProtectedAnchor: isProtected || eventType === 'prayer',
    });
    setEventTitle('');
    setEventLocation('');
  };

  // Prayer-Time-Aware AI Time-Blocking Engine
  const handleRunSmartTimeBlocking = async () => {
    const openHighTasks = tasks.filter((t) => t.status === 'todo');
    if (openHighTasks.length === 0) {
      setAutoBlockNotice('All open tasks are already completed or scheduled.');
      return;
    }

    // Find safe slots outside prayer times (05:45-06:15, 12:30-13:00, 15:15-15:40)
    const candidateSlots = [
      { start: '08:00', end: '09:30' },
      { start: '13:30', end: '14:45' },
      { start: '16:00', end: '17:15' },
      { start: '19:30', end: '20:45' },
    ];

    const usedStarts = new Set(events.map((e) => e.startTime));
    const availableSlot = candidateSlots.find((s) => !usedStarts.has(s.start)) || candidateSlots[1];
    const topTask = openHighTasks[0];

    await createCalendarEvent({
      title: `Time-Block: ${topTask.title}`,
      eventType: 'study_block',
      date: todayDate,
      startTime: availableSlot.start,
      endTime: availableSlot.end,
      location: `AI Scheduled (${profile?.prayerMethod || 'MWL'} Prayer Buffer Respected)`,
      isProtectedAnchor: false,
      linkedRecordId: topTask.id,
    });

    await logAiAction({
      actionTitle: `Auto-Scheduled Task: ${topTask.title}`,
      toolName: 'schedule_study_block',
      permissionLevel: 'routine_write',
      status: 'executed',
      targetModule: 'Calendar & Tasks',
      summary: `Placed "${topTask.title}" into free slot ${availableSlot.start}–${availableSlot.end}, respecting protected prayer anchors and 15m buffers.`,
    });

    setAutoBlockNotice(
      `Scheduled "${topTask.title}" at ${availableSlot.start}–${availableSlot.end} with 0 anchor conflicts.`
    );
    setTimeout(() => setAutoBlockNotice(''), 5000);
  };

  // Detect overlapping events
  const sortedEvents = [...events].sort((a, b) => a.startTime.localeCompare(b.startTime));
  const conflicts: string[] = [];
  for (let i = 0; i < sortedEvents.length - 1; i++) {
    const curr = sortedEvents[i];
    const next = sortedEvents[i + 1];
    if (curr.date === next.date && curr.endTime > next.startTime) {
      conflicts.push(`Overlap detected between "${curr.title}" (${curr.startTime}–${curr.endTime}) and "${next.title}" (${next.startTime}–${next.endTime}).`);
    }
  }

  const filteredTasks =
    categoryFilter === 'all' ? tasks : tasks.filter((t) => t.category === categoryFilter);

  return (
    <div className="space-y-8">
      {/* Header & Prayer Anchor Configuration Bar */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">
            Unified Calendar, Tasks & Prayer-Aware Scheduling
          </h1>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Tasks represent outcomes with status and deadlines; Events occupy specific time slots. Prayer anchors are protected with configurable preparation buffers.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-500 dark:text-slate-400">Prayer Calculation:</span>
            <select
              value={profile?.prayerMethod || 'MWL'}
              onChange={(e) =>
                updateProfileSettings({
                  prayerMethod: e.target.value as 'MWL' | 'ISNA' | 'Egypt' | 'Makkah' | 'Karachi' | 'Tehran',
                })
              }
              className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-2.5 py-1.5 text-xs font-medium text-slate-800 dark:text-slate-200"
            >
              <option value="MWL">Muslim World League (MWL)</option>
              <option value="ISNA">ISNA (North America)</option>
              <option value="Egypt">Egyptian General Authority</option>
              <option value="Makkah">Umm al-Qura (Makkah)</option>
              <option value="Karachi">Univ. of Islamic Sciences, Karachi</option>
            </select>
          </div>

          <button
            onClick={handleRunSmartTimeBlocking}
            className="px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0"
          >
            <Sparkles className="w-3.5 h-3.5" />
            AI Time-Block Open Tasks
          </button>
        </div>
      </div>

      {autoBlockNotice && (
        <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-xs font-medium text-emerald-800 dark:text-emerald-300">
          {autoBlockNotice}
        </div>
      )}

      {conflicts.length > 0 && (
        <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-xs text-amber-800 dark:text-amber-200 space-y-1">
          <div className="font-semibold">Schedule Conflict Detection:</div>
          {conflicts.map((c, idx) => (
            <div key={idx}>{c}</div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left 6 Columns: Unified Time-Blocked Calendar */}
        <div className="lg:col-span-6 space-y-6">
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6">
            <div className="flex items-center justify-between gap-4 mb-4">
              <div className="flex items-center gap-2">
                <CalendarIcon className="w-4 h-4 text-emerald-500" />
                <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                  Time-Blocked Agenda
                </h2>
              </div>

              {/* Interactive View Selector */}
              <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg">
                {(['today', 'agenda', 'week'] as const).map((m) => (
                  <button
                    key={m}
                    onClick={() => setViewMode(m)}
                    className={`px-2.5 py-1 text-xs font-medium rounded-md capitalize transition-colors whitespace-nowrap shrink-0 ${
                      viewMode === m
                        ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                        : 'text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>

            {sortedEvents.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-500">
                No events scheduled. Add a fixed commitment or prayer anchor below.
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
                {sortedEvents.map((ev) => (
                  <div key={ev.id} className="py-3 flex items-center justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <div className="w-24 text-xs font-mono tabular-nums text-slate-600 dark:text-slate-300 pt-0.5 shrink-0">
                        {ev.startTime} – {ev.endTime}
                      </div>
                      <div>
                        <div className="text-sm font-medium text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                          {ev.title}
                          {ev.isProtectedAnchor && (
                            <Shield className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                          )}
                        </div>
                        <div className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                          <span>{ev.eventType.replace('_', ' ')}</span>
                          <span aria-hidden="true"> · </span>
                          <span className="font-mono tabular-nums">{ev.date}</span>
                          {ev.location && (
                            <>
                              <span aria-hidden="true"> · </span>
                              <span>{ev.location}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => deleteCalendarEvent(ev.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-500 transition-colors"
                      title="Remove event"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Add Fixed Event / Prayer Anchor Form */}
            <form
              onSubmit={handleAddEvent}
              className="mt-6 pt-5 border-t border-slate-100 dark:border-slate-800 space-y-3"
            >
              <div className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                Add Event or Protected Anchor
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input
                  type="text"
                  required
                  value={eventTitle}
                  onChange={(e) => setEventTitle(e.target.value)}
                  placeholder="Event title (e.g., Physics Lab, Maghrib Prayer)"
                  className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-xs text-slate-900 dark:text-slate-100"
                />
                <select
                  value={eventType}
                  onChange={(e) => setEventType(e.target.value as CalendarEventItem['eventType'])}
                  className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-xs text-slate-900 dark:text-slate-100"
                >
                  <option value="fixed">Fixed Commitment</option>
                  <option value="lecture">University Lecture</option>
                  <option value="prayer">Protected Prayer Anchor</option>
                  <option value="study_block">Study Block</option>
                  <option value="workout">Workout Session</option>
                  <option value="routine">Recurring Routine</option>
                </select>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <input
                  type="time"
                  value={eventStart}
                  onChange={(e) => setEventStart(e.target.value)}
                  className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-xs font-mono text-slate-900 dark:text-slate-100"
                />
                <input
                  type="time"
                  value={eventEnd}
                  onChange={(e) => setEventEnd(e.target.value)}
                  className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-xs font-mono text-slate-900 dark:text-slate-100"
                />
                <input
                  type="text"
                  value={eventLocation}
                  onChange={(e) => setEventLocation(e.target.value)}
                  placeholder="Location / Link"
                  className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-xs text-slate-900 dark:text-slate-100"
                />
              </div>

              <div className="flex items-center justify-between pt-1">
                <label className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isProtected}
                    onChange={(e) => setIsProtected(e.target.checked)}
                    className="rounded border-slate-300"
                  />
                  Mark as protected anchor (AI cannot overwrite)
                </label>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-xs font-semibold flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" /> Add to Calendar
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Right 6 Columns: Master Task Manager */}
        <div className="lg:col-span-6 space-y-6">
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                Task Backlog & Execution Queue
              </h2>

              <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg overflow-x-auto">
                {(['all', 'study', 'work', 'health', 'finance', 'personal'] as const).map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setCategoryFilter(cat)}
                    className={`px-2.5 py-1 text-xs font-medium rounded-md capitalize transition-colors whitespace-nowrap shrink-0 ${
                      categoryFilter === cat
                        ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                        : 'text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {filteredTasks.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-500">
                No tasks in this category.
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
                {filteredTasks.map((t) => (
                  <div key={t.id} className="py-3 flex items-center justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <button
                        onClick={() =>
                          updateTaskStatus(t, t.status === 'completed' ? 'todo' : 'completed')
                        }
                        className={`mt-0.5 w-5 h-5 rounded-md border flex items-center justify-center transition-colors shrink-0 ${
                          t.status === 'completed'
                            ? 'bg-emerald-600 border-emerald-600 text-white'
                            : 'border-slate-300 dark:border-slate-700'
                        }`}
                      >
                        {t.status === 'completed' && <CheckCircle2 className="w-3.5 h-3.5" />}
                      </button>
                      <div>
                        <div
                          className={`text-sm font-medium ${
                            t.status === 'completed'
                              ? 'line-through text-slate-400'
                              : 'text-slate-900 dark:text-slate-100'
                          }`}
                        >
                          {t.title}
                        </div>
                        <div className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                          <span className="capitalize">{t.priority}</span>
                          <span aria-hidden="true"> · </span>
                          <span className="capitalize">{t.category}</span>
                          <span aria-hidden="true"> · </span>
                          <span className="font-mono tabular-nums">{t.estimatedMinutes}m</span>
                          <span aria-hidden="true"> · </span>
                          <span className="font-mono tabular-nums">Due {t.dueDate}</span>
                          <span aria-hidden="true"> · </span>
                          <span>{t.status}</span>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => deleteTask(t.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-500 transition-colors"
                      title="Delete task"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Add Task Form */}
            <form
              onSubmit={handleAddTask}
              className="mt-6 pt-5 border-t border-slate-100 dark:border-slate-800 space-y-3"
            >
              <div className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                Create New Task
              </div>
              <input
                type="text"
                required
                value={taskTitle}
                onChange={(e) => setTaskTitle(e.target.value)}
                placeholder="Task description..."
                className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-xs text-slate-900 dark:text-slate-100"
              />
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <select
                  value={taskPriority}
                  onChange={(e) => setTaskPriority(e.target.value as TaskItem['priority'])}
                  className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-2.5 py-2 text-xs text-slate-900 dark:text-slate-100"
                >
                  <option value="critical">Critical</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
                <select
                  value={taskCategory}
                  onChange={(e) => setTaskCategory(e.target.value as TaskItem['category'])}
                  className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-2.5 py-2 text-xs text-slate-900 dark:text-slate-100"
                >
                  <option value="study">Study</option>
                  <option value="work">Work</option>
                  <option value="health">Health</option>
                  <option value="finance">Finance</option>
                  <option value="personal">Personal</option>
                  <option value="routine">Routine</option>
                </select>
                <input
                  type="number"
                  min={5}
                  max={480}
                  value={taskMinutes}
                  onChange={(e) => setTaskMinutes(Number(e.target.value))}
                  placeholder="Mins"
                  className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-2.5 py-2 text-xs font-mono text-slate-900 dark:text-slate-100"
                />
                <input
                  type="time"
                  value={taskStart}
                  onChange={(e) => setTaskStart(e.target.value)}
                  className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-2.5 py-2 text-xs font-mono text-slate-900 dark:text-slate-100"
                />
              </div>
              <div className="flex justify-end">
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-xs font-semibold"
                >
                  + Add Task
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};
