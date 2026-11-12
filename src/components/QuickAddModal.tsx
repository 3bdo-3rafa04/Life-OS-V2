import React, { useState } from 'react';
import { X } from 'lucide-react';
import { useLifeOS } from '../context/LifeOSContext.tsx';

interface QuickAddModalProps {
  initialTab?: 'task' | 'event' | 'expense' | 'workout' | 'note';
  onClose: () => void;
}

export const QuickAddModal: React.FC<QuickAddModalProps> = ({
  initialTab = 'task',
  onClose,
}) => {
  const {
    todayDate,
    createTask,
    createCalendarEvent,
    createFinanceRecord,
    createHealthLog,
    createKnowledgeItem,
  } = useLifeOS();

  const [tab, setTab] = useState<'task' | 'event' | 'expense' | 'workout' | 'note'>(initialTab);
  const [title, setTitle] = useState('');
  const [secondaryVal, setSecondaryVal] = useState('30');
  const [notes, setNotes] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    if (tab === 'task') {
      await createTask({
        title,
        priority: 'high',
        status: 'todo',
        category: 'study',
        estimatedMinutes: Number(secondaryVal) || 30,
        dueDate: todayDate,
        notes,
      });
    } else if (tab === 'event') {
      await createCalendarEvent({
        title,
        eventType: 'fixed',
        date: todayDate,
        startTime: '14:00',
        endTime: '15:00',
        location: notes || 'Calendar Block',
        isProtectedAnchor: false,
      });
    } else if (tab === 'expense') {
      const minor = Math.max(0, Math.round((parseFloat(secondaryVal) || 0) * 100));
      await createFinanceRecord({
        recordType: 'expense',
        title,
        category: 'General',
        accountName: 'Main Checking',
        amountMinor: minor,
        date: todayDate,
        notes,
      });
    } else if (tab === 'workout') {
      await createHealthLog({
        logType: 'workout',
        date: todayDate,
        title,
        durationMinutes: Number(secondaryVal) || 45,
        volumeKg: 3500,
        rpe: 8,
        exercisesSummary: notes,
      });
    } else if (tab === 'note') {
      await createKnowledgeItem({
        itemType: 'note',
        title,
        status: 'completed',
        progressCurrent: 1,
        progressTotal: 1,
        progressUnit: 'note',
        takeaways: notes,
      });
    }

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-md rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
            Low-Friction Quick Capture
          </h3>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg mb-4">
          {(['task', 'event', 'expense', 'workout', 'note'] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={`flex-1 py-1.5 text-xs font-medium rounded-md capitalize transition-colors ${
                tab === t
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            type="text"
            required
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={
              tab === 'task'
                ? 'Task title...'
                : tab === 'expense'
                ? 'Expense merchant / item...'
                : tab === 'workout'
                ? 'Workout session name...'
                : 'Title...'
            }
            className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-xs text-slate-900 dark:text-slate-100"
          />

          {(tab === 'task' || tab === 'expense' || tab === 'workout') && (
            <div>
              <label className="block text-xs text-slate-500 mb-1">
                {tab === 'expense' ? 'Amount ($)' : 'Estimated Duration (Minutes)'}
              </label>
              <input
                type="number"
                step={tab === 'expense' ? '0.01' : '1'}
                value={secondaryVal}
                onChange={(e) => setSecondaryVal(e.target.value)}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-xs font-mono text-slate-900 dark:text-slate-100"
              />
            </div>
          )}

          <textarea
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Optional notes, takeaways, or location..."
            className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-3 text-xs text-slate-900 dark:text-slate-100"
          />

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-xs font-medium text-slate-600 dark:text-slate-300"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold"
            >
              Save {tab}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
