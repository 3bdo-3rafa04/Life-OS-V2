import React, { useState, useMemo, useRef } from 'react';
import { useLifeOS } from '../context/LifeOSContext.tsx';
import { TaskItem, CalendarEventItem } from '../types.ts';
import { SmartSchedulerPanel } from './SmartSchedulerPanel.tsx';
import {
  parseTimeToMinutes,
  formatMinutesToTime,
  roundUpToNext5Minutes,
  addDaysToDateStr,
} from '../services/schedulingEngine.ts';
import { parseSchedulePdfClientFallback } from '../services/localFreeAiFallback.ts';
import {
  Plus,
  X,
  Trash2,
  Calendar as CalendarIcon,
  Sparkles,
  Upload,
  FileText,
} from 'lucide-react';

interface CalendarTasksViewProps {
  mode?: 'calendar' | 'tasks';
  subPage?: string;
  onSubPageChange?: (sub: string) => void;
}

export const CalendarTasksView: React.FC<CalendarTasksViewProps> = ({
  mode = 'calendar',
  subPage = mode === 'calendar' ? 'week' : 'board',
  onSubPageChange,
}) => {
  const {
    tasks,
    events,
    studyModules,
    todayDate,
    currentTimeStr,
    createTask,
    updateTaskStatus,
    deleteTask,
    createCalendarEvent,
    deleteCalendarEvent,
    createStudyModule,
    createStudyItem,
  } = useLifeOS();

  const [calView, setCalView] = useState<'day' | 'week' | 'month' | 'agenda'>(
    subPage === 'day_month' ? 'day' : subPage === 'agenda' ? 'agenda' : 'week'
  );
  const [taskCategoryFilter, setTaskCategoryFilter] = useState<
    'all' | 'study' | 'work' | 'personal' | 'health' | 'finance'
  >('all');

  const [showSmartScheduler, setShowSmartScheduler] = useState(true);
  const [showNewEventModal, setShowNewEventModal] = useState(false);
  const [showImportScheduleModal, setShowImportScheduleModal] = useState(false);
  const [selectedTaskDetail, setSelectedTaskDetail] = useState<TaskItem | null>(null);
  const [showNewTaskModal, setShowNewTaskModal] = useState(false);

  // Calendar Schedule PDF Import state
  const calSchedulePdfInputRef = useRef<HTMLInputElement | null>(null);
  const [calPdfParsing, setCalPdfParsing] = useState(false);
  const [calPdfImporting, setCalPdfImporting] = useState(false);
  const [calPdfFileName, setCalPdfFileName] = useState<string | null>(null);
  const [calPdfSummary, setCalPdfSummary] = useState<string | null>(null);
  const [calParsedEvents, setCalParsedEvents] = useState<
    {
      title: string;
      eventType: 'lecture' | 'exam' | 'study_block' | 'fixed';
      date: string;
      startTime: string;
      endTime: string;
      location?: string;
    }[]
  >([]);
  const [calParsedLectures, setCalParsedLectures] = useState<
    {
      lectureNumber: number;
      title: string;
      estimatedMinutes: number;
      difficulty: 'HIGH' | 'MEDIUM' | 'LOW';
    }[]
  >([]);

  // New Event Form State
  const [evTitle, setEvTitle] = useState('');
  const [evDate, setEvDate] = useState(todayDate);
  const [evStartTime, setEvStartTime] = useState('09:00');
  const [evEndTime, setEvEndTime] = useState('10:30');
  const [evType, setEvType] = useState<CalendarEventItem['eventType']>('study_block');
  const [evLocation, setEvLocation] = useState('');
  const [evProtected, setEvProtected] = useState(false);

  // New Task Form State
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskCategory, setNewTaskCategory] = useState<TaskItem['category']>('study');
  const [newTaskPriority, setNewTaskPriority] = useState<TaskItem['priority']>('high');
  const [newTaskMinutes, setNewTaskMinutes] = useState(45);
  const [newTaskDue, setNewTaskDue] = useState(todayDate);

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!evTitle.trim()) return;
    await createCalendarEvent({
      title: evTitle.trim(),
      eventType: evType,
      date: evDate,
      startTime: evStartTime || '09:00',
      endTime: evEndTime || '10:00',
      location: evLocation.trim() || undefined,
      isProtectedAnchor: evProtected,
    });
    setEvTitle('');
    setEvLocation('');
    setShowNewEventModal(false);
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;
    await createTask({
      title: newTaskTitle.trim(),
      priority: newTaskPriority,
      status: 'todo',
      category: newTaskCategory,
      estimatedMinutes: newTaskMinutes,
      dueDate: newTaskDue || todayDate,
    });
    setNewTaskTitle('');
    setShowNewTaskModal(false);
  };

  const handleCalSchedulePdfSelect = async (file: File) => {
    setCalPdfParsing(true);
    setCalPdfFileName(file.name);
    setCalPdfSummary(`Extracting timetable & schedule from "${file.name}"...`);

    try {
      const isText = /\.(txt|md|csv|ics)$/i.test(file.name);
      const attachmentPayload = await new Promise<{
        fileName: string;
        mimeType: string;
        base64Data?: string;
        textContent?: string;
      }>((resolve, reject) => {
        const reader = new FileReader();
        reader.onerror = () => reject(new Error('Failed to read PDF file'));
        if (isText) {
          reader.onload = () =>
            resolve({
              fileName: file.name,
              mimeType: file.type || 'text/plain',
              textContent: String(reader.result || ''),
            });
          reader.readAsText(file);
        } else {
          reader.onload = () => {
            const str = String(reader.result || '');
            const idx = str.indexOf(',');
            resolve({
              fileName: file.name,
              mimeType: file.type || 'application/pdf',
              base64Data: idx >= 0 ? str.slice(idx + 1) : str,
            });
          };
          reader.readAsDataURL(file);
        }
      });

      let data: any;
      try {
        const res = await fetch('/api/ai/parse-schedule-pdf', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            attachment: attachmentPayload,
            moduleCode: studyModules[0]?.code || 'MOD101',
            todayDate,
          }),
        });
        if (!res.ok) throw new Error('Fallback to local PDF parser');
        data = await res.json();
      } catch {
        data = parseSchedulePdfClientFallback({
          attachment: attachmentPayload,
          moduleCode: studyModules[0]?.code || 'MOD101',
          todayDate,
        });
      }

      setCalParsedEvents(Array.isArray(data.calendarEvents) ? data.calendarEvents : []);
      setCalParsedLectures(Array.isArray(data.lectures) ? data.lectures : []);
      setCalPdfSummary(
        data.summary ||
          `Extracted ${(data.calendarEvents || []).length} calendar events and ${
            (data.lectures || []).length
          } lectures.`
      );
    } catch (err) {
      setCalPdfSummary(
        err instanceof Error ? `Error: ${err.message}` : 'Failed to parse schedule PDF.'
      );
    } finally {
      setCalPdfParsing(false);
    }
  };

  const handleConfirmCalPdfImport = async () => {
    setCalPdfImporting(true);
    try {
      for (const ev of calParsedEvents) {
        await createCalendarEvent({
          title: ev.title.slice(0, 140),
          eventType: ev.eventType || 'lecture',
          date: ev.date || todayDate,
          startTime: ev.startTime || '09:00',
          endTime: ev.endTime || '10:00',
          location: ev.location || 'University / Study Desk',
          isProtectedAnchor: ev.eventType === 'exam' || ev.eventType === 'fixed',
        });
      }

      if (calParsedLectures.length > 0) {
        let modId = studyModules[0]?.id || '';
        const modCode = studyModules[0]?.code || 'IMP101';
        if (!modId) {
          modId = await createStudyModule({
            code: modCode,
            title: calPdfFileName ? calPdfFileName.replace(/\.pdf$/i, '') : 'Imported Schedule',
            term: 'Current Term',
            examDate: todayDate,
            totalLectures: calParsedLectures.length,
            completedLectures: 0,
          });
        }
        for (const lec of calParsedLectures) {
          await createStudyItem({
            moduleId: modId,
            moduleCode: modCode,
            title: lec.title.slice(0, 180),
            itemType: 'lecture',
            status: 'unstudied',
            importance:
              lec.difficulty === 'LOW'
                ? 'low'
                : lec.difficulty === 'MEDIUM'
                ? 'medium'
                : 'high',
            estimatedMinutes: lec.estimatedMinutes || 45,
            confidenceRating: 3,
            repetitionCount: 0,
            nextReviewDate: todayDate,
          });
        }
      }

      setShowImportScheduleModal(false);
      setCalParsedEvents([]);
      setCalParsedLectures([]);
      setCalPdfFileName(null);
      setCalPdfSummary(null);
    } finally {
      setCalPdfImporting(false);
    }
  };

  const handleScheduleTaskToCalendar = async (task: TaskItem) => {
    let targetDate = task.dueDate && task.dueDate >= todayDate ? task.dueDate : todayDate;
    const nowMin = parseTimeToMinutes(currentTimeStr || '13:00');
    const duration = Math.max(25, Math.min(120, task.estimatedMinutes || 45));
    let startMin = task.scheduledStart
      ? parseTimeToMinutes(task.scheduledStart)
      : roundUpToNext5Minutes(nowMin + 15);

    // Never schedule in the past on today's date
    if (targetDate === todayDate && startMin < nowMin + 5) {
      startMin = roundUpToNext5Minutes(nowMin + 15);
    }

    // Shift past any overlapping events on targetDate
    const dayEvents = events
      .filter((e) => e.date === targetDate)
      .map((e) => ({
        s: parseTimeToMinutes(e.startTime),
        e: parseTimeToMinutes(e.endTime) + 10,
      }))
      .sort((a, b) => a.s - b.s);

    for (const b of dayEvents) {
      if (startMin < b.e && startMin + duration > b.s) {
        startMin = roundUpToNext5Minutes(b.e);
      }
    }

    if (startMin + duration > 23 * 60) {
      targetDate = addDaysToDateStr(targetDate, 1);
      startMin = 9 * 60;
    }

    await createCalendarEvent({
      title: task.title,
      eventType: task.category === 'study' ? 'study_block' : 'fixed',
      date: targetDate,
      startTime: formatMinutesToTime(startMin),
      endTime: formatMinutesToTime(startMin + duration),
      isProtectedAnchor: false,
      linkedRecordId: task.id,
    });
  };

  const filteredTasks = tasks.filter((t) =>
    taskCategoryFilter === 'all' ? true : t.category === taskCategoryFilter
  );

  const todoTasks = filteredTasks.filter((t) => t.status === 'todo');
  const inProgressTasks = filteredTasks.filter((t) => t.status === 'in_progress');
  const blockedTasks = filteredTasks.filter((t) => t.status === 'blocked');
  const completedTasks = filteredTasks.filter((t) => t.status === 'completed');

  const dueTodayCount = tasks.filter(
    (t) => t.status !== 'completed' && t.dueDate === todayDate
  ).length;
  const overdueCount = tasks.filter(
    (t) => t.status !== 'completed' && t.dueDate < todayDate
  ).length;

  // Build 7-day week dates centered around today
  const weekDays = useMemo(() => {
    const result: { date: string; label: string; isToday: boolean }[] = [];
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    for (let offset = -3; offset <= 3; offset++) {
      const d = new Date();
      d.setDate(d.getDate() + offset);
      const iso = d.toISOString().split('T')[0];
      result.push({
        date: iso,
        label: `${dayNames[d.getDay()]} ${d.getDate()}`,
        isToday: iso === todayDate,
      });
    }
    return result;
  }, [todayDate]);

  // Real overlap/conflict check across events
  const conflicts = useMemo(() => {
    const found: { a: CalendarEventItem; b: CalendarEventItem }[] = [];
    for (let i = 0; i < events.length; i++) {
      for (let j = i + 1; j < events.length; j++) {
        const a = events[i];
        const b = events[j];
        if (a.date === b.date && a.startTime < b.endTime && b.startTime < a.endTime) {
          found.push({ a, b });
        }
      }
    }
    return found;
  }, [events]);

  // TASKS SECTION
  if (mode === 'tasks') {
    return (
      <div className="space-y-5">
        {/* Tasks Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-[#E8EDE8]">Tasks</h1>
            <p className="text-xs text-[#9AA79E] mt-1">
              {tasks.filter((t) => t.status !== 'completed').length} open · {dueTodayCount} due
              today · {overdueCount} overdue
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex items-center p-1 rounded-xl bg-[#222C27] border border-[#BDD3C1]/15 text-xs">
              {(
                [
                  { id: 'all', label: 'All' },
                  { id: 'study', label: 'Study' },
                  { id: 'work', label: 'Work' },
                  { id: 'personal', label: 'Personal' },
                  { id: 'health', label: 'Health' },
                  { id: 'finance', label: 'Finance' },
                ] as const
              ).map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setTaskCategoryFilter(cat.id)}
                  className={`px-3 py-1 rounded-lg font-medium transition-colors ${
                    taskCategoryFilter === cat.id
                      ? 'bg-[#9BB9A2] text-[#171E1B] font-semibold'
                      : 'text-[#9AA79E] hover:text-[#E8EDE8]'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            <button
              onClick={() => setShowNewTaskModal(true)}
              className="px-4 py-2 rounded-xl bg-[#9BB9A2] hover:bg-[#a9c5b0] text-[#171E1B] text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              <Plus className="w-3.5 h-3.5 stroke-[2.5]" /> New task
            </button>
          </div>
        </div>

        {/* 4-Column Kanban Board */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* To do */}
          <div className="sage-card p-4 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[#E8EDE8]">To do</span>
              <span className="px-2 py-0.5 rounded-full text-[11px] bg-[#2C3932] text-[#9AA79E]">
                {todoTasks.length}
              </span>
            </div>

            <div className="space-y-2.5">
              {todoTasks.length > 0 ? (
                todoTasks.map((t) => (
                  <div
                    key={t.id}
                    onClick={() => setSelectedTaskDetail(t)}
                    className="p-3.5 rounded-xl bg-[#2C3932]/85 border border-[#BDD3C1]/12 hover:border-[#9BB9A2]/40 cursor-pointer transition-all"
                  >
                    <div className="flex items-center justify-between text-[10px] mb-1.5">
                      <span className="px-2 py-0.5 rounded-md bg-[#9BB9A2]/20 text-[#9BB9A2] font-semibold uppercase">
                        {t.category}
                      </span>
                      <span className="text-[#9AA79E] capitalize">
                        {t.priority} · {t.estimatedMinutes}m
                      </span>
                    </div>
                    <p className="text-xs font-semibold text-[#E8EDE8]">{t.title}</p>
                    <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-[#BDD3C1]/10 text-[11px] text-[#65756B]">
                      <span>Due {t.dueDate}</span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          updateTaskStatus(t, 'in_progress');
                        }}
                        className="text-[#9BB9A2] hover:underline"
                      >
                        Start →
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-xs text-[#65756B] py-4 text-center">No tasks in To do</p>
              )}
            </div>
          </div>

          {/* In progress */}
          <div className="sage-card p-4 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[#E8EDE8]">In progress</span>
              <span className="px-2 py-0.5 rounded-full text-[11px] bg-[#2C3932] text-[#9AA79E]">
                {inProgressTasks.length}
              </span>
            </div>

            <div className="space-y-2.5">
              {inProgressTasks.length > 0 ? (
                inProgressTasks.map((t) => (
                  <div
                    key={t.id}
                    onClick={() => setSelectedTaskDetail(t)}
                    className="p-3.5 rounded-xl bg-[#2C3932]/85 border border-[#9BB9A2]/35 cursor-pointer transition-all"
                  >
                    <div className="flex items-center justify-between text-[10px] mb-1.5">
                      <span className="px-2 py-0.5 rounded-md bg-[#9BB9A2]/25 text-[#9BB9A2] font-semibold uppercase">
                        {t.category}
                      </span>
                      <span className="text-[#9BB9A2] font-medium">
                        Active · {t.estimatedMinutes}m
                      </span>
                    </div>
                    <p className="text-xs font-semibold text-[#E8EDE8]">{t.title}</p>
                    <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-[#BDD3C1]/10">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          updateTaskStatus(t, 'blocked', 'Waiting on dependency');
                        }}
                        className="text-[11px] text-[#D8B26E] hover:underline"
                      >
                        Mark blocked
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          updateTaskStatus(t, 'completed');
                        }}
                        className="text-[11px] text-[#9BB9A2] font-semibold hover:underline"
                      >
                        Complete ✓
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-xs text-[#65756B] py-4 text-center">Nothing in progress</p>
              )}
            </div>
          </div>

          {/* Blocked */}
          <div className="sage-card p-4 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[#E8EDE8]">Blocked</span>
              <span className="px-2 py-0.5 rounded-full text-[11px] bg-[#2C3932] text-[#D8B26E]">
                {blockedTasks.length}
              </span>
            </div>

            <div className="space-y-2.5">
              {blockedTasks.length > 0 ? (
                blockedTasks.map((t) => (
                  <div
                    key={t.id}
                    onClick={() => setSelectedTaskDetail(t)}
                    className="p-3.5 rounded-xl bg-[#2C3932]/85 border border-[#D8B26E]/35 cursor-pointer"
                  >
                    <div className="flex items-center justify-between text-[10px] mb-1.5">
                      <span className="px-2 py-0.5 rounded-md bg-[#D8B26E]/20 text-[#D8B26E] font-semibold uppercase">
                        Blocked
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          updateTaskStatus(t, 'todo');
                        }}
                        className="text-[#9BB9A2] hover:underline"
                      >
                        Unblock
                      </button>
                    </div>
                    <p className="text-xs font-semibold text-[#E8EDE8]">{t.title}</p>
                    {t.statusReason && (
                      <p className="text-[11px] text-[#9AA79E] mt-1">{t.statusReason}</p>
                    )}
                  </div>
                ))
              ) : (
                <p className="text-xs text-[#65756B] py-4 text-center">No blocked tasks</p>
              )}
            </div>
          </div>

          {/* Done */}
          <div className="sage-card p-4 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[#E8EDE8]">Done</span>
              <span className="px-2 py-0.5 rounded-full text-[11px] bg-[#2C3932] text-[#9BB9A2]">
                {completedTasks.length}
              </span>
            </div>

            <div className="space-y-2">
              {completedTasks.length > 0 ? (
                completedTasks.map((t) => (
                  <div
                    key={t.id}
                    onClick={() => setSelectedTaskDetail(t)}
                    className="p-3 rounded-xl bg-[#1C2520] border border-[#BDD3C1]/10 text-xs text-[#65756B] line-through cursor-pointer"
                  >
                    {t.title}
                  </div>
                ))
              ) : (
                <p className="text-xs text-[#65756B] py-4 text-center">No completed tasks yet</p>
              )}
            </div>
          </div>
        </div>

        {/* All tasks — list view */}
        <div className="sage-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-[#E8EDE8]">All tasks — list view</h2>
            <span className="text-xs text-[#65756B]">{filteredTasks.length} items</span>
          </div>

          {filteredTasks.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-[#BDD3C1]/10 text-[10px] uppercase tracking-wider text-[#65756B]">
                    <th className="py-2.5 px-3">Task</th>
                    <th className="py-2.5 px-3">Category</th>
                    <th className="py-2.5 px-3">Priority</th>
                    <th className="py-2.5 px-3">Due</th>
                    <th className="py-2.5 px-3">Est.</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#BDD3C1]/8">
                  {filteredTasks.map((t) => (
                    <tr
                      key={t.id}
                      onClick={() => setSelectedTaskDetail(t)}
                      className="hover:bg-[#2C3932]/40 cursor-pointer transition-colors"
                    >
                      <td className="py-3 px-3 font-medium text-[#E8EDE8]">{t.title}</td>
                      <td className="py-3 px-3 text-[#9AA79E] capitalize">{t.category}</td>
                      <td className="py-3 px-3">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-semibold capitalize ${
                            t.priority === 'high' || t.priority === 'critical'
                              ? 'bg-[#D8B26E]/20 text-[#D8B26E]'
                              : 'bg-[#2C3932] text-[#9AA79E]'
                          }`}
                        >
                          {t.priority}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-[#9AA79E]">{t.dueDate}</td>
                      <td className="py-3 px-3 text-[#9AA79E] font-mono">
                        {t.estimatedMinutes}m
                      </td>
                      <td className="py-3 px-3">
                        <span className="text-[#9BB9A2] capitalize">
                          {t.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteTask(t.id);
                          }}
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
          ) : (
            <div className="py-8 text-center space-y-2">
              <p className="text-xs text-[#9AA79E]">Your task list is empty.</p>
              <button
                onClick={() => setShowNewTaskModal(true)}
                className="px-4 py-2 rounded-xl bg-[#9BB9A2] text-[#171E1B] text-xs font-semibold"
              >
                + Create your first task
              </button>
            </div>
          )}
        </div>

        {/* New Task Modal */}
        {showNewTaskModal && (
          <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
            <form
              onSubmit={handleCreateTask}
              className="w-full max-w-md rounded-2xl bg-[#222C27] border border-[#BDD3C1]/25 p-6 space-y-4"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-base font-semibold text-[#E8EDE8]">New Task</h3>
                <button
                  type="button"
                  onClick={() => setShowNewTaskModal(false)}
                  className="text-[#9AA79E] hover:text-[#E8EDE8]"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div>
                <label className="block text-xs text-[#9AA79E] mb-1">Title</label>
                <input
                  type="text"
                  required
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  placeholder="Enter task title..."
                  className="w-full sage-input px-3.5 py-2 text-xs"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-[#9AA79E] mb-1">Category</label>
                  <select
                    value={newTaskCategory}
                    onChange={(e) =>
                      setNewTaskCategory(e.target.value as TaskItem['category'])
                    }
                    className="w-full sage-input px-2.5 py-2 text-xs"
                  >
                    <option value="study">Study</option>
                    <option value="work">Work</option>
                    <option value="health">Health</option>
                    <option value="personal">Personal</option>
                    <option value="finance">Finance</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-[#9AA79E] mb-1">Priority</label>
                  <select
                    value={newTaskPriority}
                    onChange={(e) =>
                      setNewTaskPriority(e.target.value as TaskItem['priority'])
                    }
                    className="w-full sage-input px-2.5 py-2 text-xs"
                  >
                    <option value="critical">Critical</option>
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-[#9AA79E] mb-1">Due date</label>
                  <input
                    type="date"
                    value={newTaskDue}
                    onChange={(e) => setNewTaskDue(e.target.value)}
                    className="w-full sage-input px-2.5 py-2 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs text-[#9AA79E] mb-1">Est. (min)</label>
                  <input
                    type="number"
                    min={1}
                    max={1440}
                    value={newTaskMinutes}
                    onChange={(e) => setNewTaskMinutes(Number(e.target.value))}
                    className="w-full sage-input px-2.5 py-2 text-xs"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNewTaskModal(false)}
                  className="px-4 py-2 rounded-xl bg-[#2C3932] text-xs text-[#9AA79E]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-[#9BB9A2] text-[#171E1B] text-xs font-semibold"
                >
                  Save task
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    );
  }

  // CALENDAR SECTION
  return (
    <div className="space-y-5">
      {/* Calendar Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-[#E8EDE8]">Calendar</h1>
          <p className="text-xs text-[#9AA79E] mt-1">
            {events.length} scheduled events · Prayer anchors protected ·{' '}
            {conflicts.length === 0 ? (
              <span className="text-[#9BB9A2]">0 conflicts</span>
            ) : (
              <span className="text-[#D97A6C] font-medium">
                {conflicts.length} overlap detected
              </span>
            )}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setCalView('week')}
            className="px-3 py-1.5 rounded-xl bg-[#2C3932] text-xs text-[#E8EDE8] font-medium"
          >
            Today
          </button>

          <div className="inline-flex items-center p-1 rounded-xl bg-[#222C27] border border-[#BDD3C1]/15 text-xs">
            {(
              [
                { id: 'day', label: 'Day' },
                { id: 'week', label: 'Week' },
                { id: 'month', label: 'Month' },
                { id: 'agenda', label: 'Agenda' },
              ] as const
            ).map((v) => (
              <button
                key={v.id}
                onClick={() => {
                  setCalView(v.id);
                  if (onSubPageChange) {
                    onSubPageChange(
                      v.id === 'week' ? 'week' : v.id === 'agenda' ? 'agenda' : 'day_month'
                    );
                  }
                }}
                className={`px-3 py-1 rounded-lg font-medium transition-colors ${
                  calView === v.id
                    ? 'bg-[#9BB9A2] text-[#171E1B] font-semibold'
                    : 'text-[#9AA79E] hover:text-[#E8EDE8]'
                }`}
              >
                {v.label}
              </button>
            ))}
          </div>

          <button
            onClick={() => setShowSmartScheduler((prev) => !prev)}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 border transition-colors ${
              showSmartScheduler
                ? 'bg-[#9BB9A2]/20 border-[#9BB9A2] text-[#9BB9A2]'
                : 'bg-[#222C27] border-[#BDD3C1]/15 text-[#9AA79E] hover:text-[#E8EDE8]'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            {showSmartScheduler ? 'Hide Smart AI Scheduler' : 'Open Smart AI Scheduler & Memory'}
          </button>

          <button
            onClick={() => setShowImportScheduleModal(true)}
            className="px-3.5 py-2 rounded-xl bg-[#2C3932] hover:bg-[#35453C] border border-[#9BB9A2]/30 text-[#E8EDE8] text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            <Upload className="w-3.5 h-3.5 text-[#9BB9A2]" /> Import Schedule PDF
          </button>

          <button
            onClick={() => setShowNewEventModal(true)}
            className="px-4 py-2 rounded-xl bg-[#9BB9A2] hover:bg-[#a9c5b0] text-[#171E1B] text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" /> New event
          </button>
        </div>
      </div>

      {/* Context-Aware Smart Scheduling Engine & Persistent Memory Panel */}
      {showSmartScheduler && (
        <SmartSchedulerPanel onClose={() => setShowSmartScheduler(false)} />
      )}

      {calView === 'week' ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* 7-Day Week Grid */}
          <div className="lg:col-span-9 sage-card p-4 overflow-x-auto">
            <div className="min-w-[680px] space-y-2">
              <div className="grid grid-cols-7 gap-2 mb-3 text-center text-xs font-medium">
                {weekDays.map((d) => (
                  <div
                    key={d.date}
                    className={`py-2 rounded-xl ${
                      d.isToday
                        ? 'bg-[#9BB9A2] text-[#171E1B] font-semibold'
                        : 'text-[#9AA79E] bg-[#1C2520]/60'
                    }`}
                  >
                    {d.label}
                  </div>
                ))}
              </div>

              {/*Protected Prayer Anchor Banner*/}
              <div className="py-1.5 px-3 rounded-lg bg-[#352F23] border border-[#D8B26E]/30 text-[#D8B26E] text-[11px] font-medium flex items-center justify-between">
                <span>Daily Prayer Anchors Protected (Fajr · Dhuhr · Asr · Maghrib · Isha)</span>
                <span className="font-mono text-[10px]">+15m buffer</span>
              </div>

              {/* Day Columns with Real Events */}
              <div className="grid grid-cols-7 gap-2 min-h-[340px]">
                {weekDays.map((d) => {
                  const dayEvents = events
                    .filter((e) => e.date === d.date)
                    .sort((a, b) => a.startTime.localeCompare(b.startTime));

                  return (
                    <div
                      key={d.date}
                      className="rounded-xl bg-[#1C2520]/50 border border-[#BDD3C1]/8 p-2 space-y-2"
                    >
                      {dayEvents.length > 0 ? (
                        dayEvents.map((ev) => (
                          <div
                            key={ev.id}
                            className={`p-2 rounded-lg text-[11px] group relative ${
                              ev.eventType === 'prayer' || ev.isProtectedAnchor
                                ? 'bg-[#352F23] border border-[#D8B26E]/35 text-[#D8B26E]'
                                : ev.eventType === 'study_block' || ev.eventType === 'lecture'
                                ? 'bg-[#2C3932] border border-[#9BB9A2]/35 text-[#E8EDE8]'
                                : 'bg-[#25312B] border border-[#BDD3C1]/15 text-[#E8EDE8]'
                            }`}
                          >
                            <p className="font-semibold truncate pr-4">{ev.title}</p>
                            <p className="text-[10px] opacity-80 font-mono">
                              {ev.startTime}–{ev.endTime}
                            </p>
                            <button
                              onClick={() => deleteCalendarEvent(ev.id)}
                              className="opacity-0 group-hover:opacity-100 absolute top-1.5 right-1.5 text-[#9AA79E] hover:text-[#D97A6C]"
                              title="Delete event"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        ))
                      ) : (
                        <p className="text-[10px] text-[#65756B] text-center pt-6">No events</p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right 3-Col Sidebar: Unscheduled Tasks + Summary */}
          <div className="lg:col-span-3 space-y-4">
            <div className="sage-card p-4">
              <h3 className="text-xs font-semibold text-[#E8EDE8]">Unscheduled tasks</h3>
              <p className="text-[11px] text-[#65756B] mt-0.5 mb-3">
                Click + to block time on your calendar
              </p>

              {todoTasks.length > 0 ? (
                <div className="space-y-2">
                  {todoTasks.slice(0, 6).map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between px-3 py-2 rounded-xl bg-[#2C3932]/80 border border-[#BDD3C1]/12 text-xs"
                    >
                      <span className="text-[#E8EDE8] truncate">{item.title}</span>
                      <button
                        onClick={() => handleScheduleTaskToCalendar(item)}
                        className="text-[11px] text-[#9BB9A2] font-semibold hover:underline shrink-0 ml-2"
                      >
                        + Block
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-[#65756B]">All open tasks are scheduled.</p>
              )}
            </div>

            <div className="sage-card p-4 space-y-2 text-xs">
              <h3 className="text-xs font-semibold text-[#E8EDE8] mb-2">Calendar summary</h3>
              <div className="flex justify-between">
                <span className="text-[#9AA79E]">Total events</span>
                <span className="text-[#E8EDE8] font-semibold">{events.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#9AA79E]">Study blocks</span>
                <span className="text-[#E8EDE8] font-semibold">
                  {
                    events.filter(
                      (e) => e.eventType === 'study_block' || e.eventType === 'lecture'
                    ).length
                  }
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#9AA79E]">Protected anchors</span>
                <span className="text-[#9BB9A2] font-semibold">
                  {events.filter((e) => e.isProtectedAnchor || e.eventType === 'prayer').length}
                </span>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Day / Month / Agenda View */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          <div className="lg:col-span-6 sage-card p-5 space-y-3">
            <h2 className="text-sm font-semibold text-[#E8EDE8]">
              Today&apos;s schedule ({todayDate})
            </h2>
            {events.filter((e) => e.date === todayDate).length > 0 ? (
              events
                .filter((e) => e.date === todayDate)
                .sort((a, b) => a.startTime.localeCompare(b.startTime))
                .map((ev) => (
                  <div
                    key={ev.id}
                    className="flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-[#2C3932]/80 text-xs"
                  >
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-[#9BB9A2]">
                        {ev.startTime}–{ev.endTime}
                      </span>
                      <span className="font-medium text-[#E8EDE8]">{ev.title}</span>
                    </div>
                    <button
                      onClick={() => deleteCalendarEvent(ev.id)}
                      className="text-[#65756B] hover:text-[#D97A6C]"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))
            ) : (
              <p className="text-xs text-[#9AA79E] py-4">No events scheduled for today.</p>
            )}
          </div>

          <div className="lg:col-span-6 sage-card p-5 space-y-3">
            <h2 className="text-sm font-semibold text-[#E8EDE8]">Upcoming agenda</h2>
            {events.length > 0 ? (
              events
                .slice()
                .sort((a, b) =>
                  `${a.date} ${a.startTime}`.localeCompare(`${b.date} ${b.startTime}`)
                )
                .map((ev) => (
                  <div
                    key={ev.id}
                    className="flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-[#1C2520] border border-[#BDD3C1]/10 text-xs"
                  >
                    <div>
                      <p className="font-semibold text-[#E8EDE8]">{ev.title}</p>
                      <p className="text-[11px] text-[#9AA79E]">
                        {ev.date} · {ev.startTime}–{ev.endTime}
                      </p>
                    </div>
                    <button
                      onClick={() => deleteCalendarEvent(ev.id)}
                      className="text-[#65756B] hover:text-[#D97A6C]"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))
            ) : (
              <p className="text-xs text-[#9AA79E] py-4">Your agenda is currently empty.</p>
            )}
          </div>
        </div>
      )}

      {/* New Event Modal */}
      {showNewEventModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={handleCreateEvent}
            className="w-full max-w-md rounded-2xl bg-[#222C27] border border-[#BDD3C1]/25 p-6 space-y-4"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-[#E8EDE8]">New event</h3>
              <button
                type="button"
                onClick={() => setShowNewEventModal(false)}
                className="text-[#9AA79E] hover:text-[#E8EDE8]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <label className="block text-xs text-[#9AA79E] mb-1">Title</label>
              <input
                type="text"
                required
                value={evTitle}
                onChange={(e) => setEvTitle(e.target.value)}
                placeholder="Event title..."
                className="w-full sage-input px-3.5 py-2 text-xs"
              />
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block text-xs text-[#9AA79E] mb-1">Date</label>
                <input
                  type="date"
                  value={evDate}
                  onChange={(e) => setEvDate(e.target.value)}
                  className="w-full sage-input px-2.5 py-2 text-xs"
                />
              </div>
              <div>
                <label className="block text-xs text-[#9AA79E] mb-1">Start</label>
                <input
                  type="time"
                  value={evStartTime}
                  onChange={(e) => setEvStartTime(e.target.value)}
                  className="w-full sage-input px-2.5 py-2 text-xs"
                />
              </div>
              <div>
                <label className="block text-xs text-[#9AA79E] mb-1">End</label>
                <input
                  type="time"
                  value={evEndTime}
                  onChange={(e) => setEvEndTime(e.target.value)}
                  className="w-full sage-input px-2.5 py-2 text-xs"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs text-[#9AA79E] mb-1.5">Category</label>
              <div className="grid grid-cols-4 gap-2">
                {(
                  [
                    { id: 'study_block', label: 'Study' },
                    { id: 'fixed', label: 'Work' },
                    { id: 'workout', label: 'Workout' },
                    { id: 'prayer', label: 'Prayer' },
                  ] as const
                ).map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setEvType(cat.id)}
                    className={`py-1.5 rounded-lg text-xs font-medium ${
                      evType === cat.id
                        ? 'bg-[#9BB9A2] text-[#171E1B] font-semibold'
                        : 'bg-[#2C3932] text-[#9AA79E]'
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs text-[#9AA79E] mb-1">Location (optional)</label>
              <input
                type="text"
                value={evLocation}
                onChange={(e) => setEvLocation(e.target.value)}
                placeholder="e.g. Study Desk, Hall A"
                className="w-full sage-input px-3.5 py-2 text-xs"
              />
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-[#2C3932]/70 border border-[#BDD3C1]/12">
              <span className="text-xs text-[#E8EDE8]">Protect from AI rescheduling</span>
              <button
                type="button"
                onClick={() => setEvProtected((p) => !p)}
                className={`px-3 py-1 rounded-full text-[11px] font-semibold ${
                  evProtected
                    ? 'bg-[#9BB9A2] text-[#171E1B]'
                    : 'bg-[#171E1B] text-[#9AA79E]'
                }`}
              >
                {evProtected ? 'ON' : 'OFF'}
              </button>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowNewEventModal(false)}
                className="px-4 py-2 rounded-xl bg-[#2C3932] text-xs text-[#9AA79E]"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-[#9BB9A2] text-[#171E1B] text-xs font-semibold"
              >
                Create event
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Task Detail Modal */}
      {selectedTaskDetail && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl bg-[#222C27] border border-[#BDD3C1]/25 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-[#9BB9A2]/20 text-[#9BB9A2] uppercase">
                {selectedTaskDetail.category} · {selectedTaskDetail.priority}
              </span>
              <button
                onClick={() => setSelectedTaskDetail(null)}
                className="text-[#9AA79E] hover:text-[#E8EDE8]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <h3 className="text-base font-semibold text-[#E8EDE8]">
              {selectedTaskDetail.title}
            </h3>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between py-2 px-3 rounded-xl bg-[#2C3932]/70">
                <span className="text-[#9AA79E]">Status</span>
                <span className="text-[#9BB9A2] font-semibold capitalize">
                  {selectedTaskDetail.status.replace('_', ' ')}
                </span>
              </div>
              <div className="flex justify-between py-2 px-3 rounded-xl bg-[#2C3932]/70">
                <span className="text-[#9AA79E]">Estimated duration</span>
                <span className="text-[#E8EDE8] font-semibold">
                  {selectedTaskDetail.estimatedMinutes} min
                </span>
              </div>
              <div className="flex justify-between py-2 px-3 rounded-xl bg-[#2C3932]/70">
                <span className="text-[#9AA79E]">Due date</span>
                <span className="text-[#E8EDE8] font-semibold">
                  {selectedTaskDetail.dueDate}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <button
                onClick={async () => {
                  await deleteTask(selectedTaskDetail.id);
                  setSelectedTaskDetail(null);
                }}
                className="text-xs text-[#D97A6C] hover:underline flex items-center gap-1"
              >
                <Trash2 className="w-3.5 h-3.5" /> Delete
              </button>
              <div className="flex gap-2">
                <button
                  onClick={() => setSelectedTaskDetail(null)}
                  className="px-4 py-2 rounded-xl bg-[#2C3932] text-xs text-[#9AA79E]"
                >
                  Close
                </button>
                <button
                  onClick={async () => {
                    await updateTaskStatus(selectedTaskDetail, 'completed');
                    setSelectedTaskDetail(null);
                  }}
                  className="px-4 py-2 rounded-xl bg-[#9BB9A2] text-[#171E1B] text-xs font-semibold"
                >
                  Mark complete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Import Schedule PDF Modal */}
      {showImportScheduleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-[#222C27] border border-[#BDD3C1]/20 p-5 space-y-4">
            <input
              ref={calSchedulePdfInputRef}
              type="file"
              accept=".pdf,application/pdf,.txt,.md,.csv,.ics"
              onChange={(e) => {
                const f = e.target.files?.[0];
                e.target.value = '';
                if (f) handleCalSchedulePdfSelect(f);
              }}
              className="hidden"
            />
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-[#E8EDE8]">
                  Import Schedule / Timetable PDF
                </h3>
                <p className="text-xs text-[#9AA79E]">
                  Upload a university timetable, syllabus, or schedule PDF (.pdf, .txt, .csv, .ics)
                </p>
              </div>
              <button
                onClick={() => setShowImportScheduleModal(false)}
                className="text-[#9AA79E] hover:text-[#E8EDE8]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const dropped = e.dataTransfer.files?.[0];
                if (dropped) handleCalSchedulePdfSelect(dropped);
              }}
              onClick={() => calSchedulePdfInputRef.current?.click()}
              className="p-5 rounded-xl border border-dashed border-[#9BB9A2]/40 bg-[#2C3932]/50 hover:bg-[#2C3932]/80 cursor-pointer text-center space-y-2 transition-all"
            >
              <div className="w-10 h-10 rounded-xl bg-[#9BB9A2]/15 text-[#9BB9A2] flex items-center justify-center mx-auto">
                <FileText className="w-5 h-5" />
              </div>
              <p className="text-xs font-semibold text-[#E8EDE8]">
                {calPdfParsing
                  ? `Extracting schedule from "${calPdfFileName}"...`
                  : calPdfFileName
                  ? `Loaded: ${calPdfFileName}`
                  : 'Click or drop your Schedule PDF here'}
              </p>
              <p className="text-[11px] text-[#9AA79E]">
                Accepts <strong className="text-[#9BB9A2]">.pdf</strong>, .txt, .csv, .ics
              </p>
            </div>

            {calPdfSummary && (
              <div className="p-3 rounded-xl bg-[#9BB9A2]/15 border border-[#9BB9A2]/30 text-xs text-[#E8EDE8]">
                {calPdfSummary}
              </div>
            )}

            {(calParsedEvents.length > 0 || calParsedLectures.length > 0) && (
              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {calParsedEvents.map((ev, idx) => (
                  <div
                    key={`ev-${idx}`}
                    className="p-2.5 rounded-xl bg-[#2C3932]/80 flex items-center justify-between text-xs"
                  >
                    <div>
                      <p className="font-semibold text-[#E8EDE8]">{ev.title}</p>
                      <p className="text-[10px] text-[#9AA79E]">
                        {ev.date} · {ev.startTime}–{ev.endTime} ({ev.eventType})
                      </p>
                    </div>
                    <span className="px-2 py-0.5 rounded-full text-[10px] bg-[#9BB9A2]/20 text-[#9BB9A2]">
                      Calendar
                    </span>
                  </div>
                ))}
                {calParsedLectures.map((lec, idx) => (
                  <div
                    key={`lec-${idx}`}
                    className="p-2.5 rounded-xl bg-[#2C3932]/60 flex items-center justify-between text-xs"
                  >
                    <div>
                      <p className="font-medium text-[#E8EDE8]">{lec.title}</p>
                      <p className="text-[10px] text-[#9AA79E]">
                        Est. {lec.estimatedMinutes}m · {lec.difficulty}
                      </p>
                    </div>
                    <span className="px-2 py-0.5 rounded-full text-[10px] bg-[#9BB9A2]/15 text-[#9BB9A2]">
                      Study Lecture
                    </span>
                  </div>
                ))}
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowImportScheduleModal(false)}
                className="px-4 py-2 rounded-xl bg-[#2C3932] text-xs text-[#9AA79E]"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={
                  calPdfParsing ||
                  calPdfImporting ||
                  (calParsedEvents.length === 0 && calParsedLectures.length === 0)
                }
                onClick={handleConfirmCalPdfImport}
                className="px-4 py-2 rounded-xl bg-[#9BB9A2] text-[#171E1B] text-xs font-semibold disabled:opacity-50"
              >
                {calPdfImporting ? 'Importing...' : 'Confirm & Import Schedule'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
