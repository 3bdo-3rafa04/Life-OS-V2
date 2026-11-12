import React, { useState, useMemo } from 'react';
import { useLifeOS } from '../context/LifeOSContext';
import { TaskItem } from '../types';

interface QuickAddModalProps {
  onClose: () => void;
}

export const QuickAddModal: React.FC<QuickAddModalProps> = ({ onClose }) => {
  const {
    createTask,
    createCalendarEvent,
    createKnowledgeItem,
    createFinanceRecord,
    createHealthLog,
  } = useLifeOS();

  const [type, setType] = useState<'Task' | 'Event' | 'Note' | 'Expense' | 'Food' | 'Workout'>(
    'Task'
  );
  const [rawInput, setRawInput] = useState('');
  const [saving, setSaving] = useState(false);

  const parsed = useMemo(() => {
    const text = rawInput.trim();
    const minMatch = text.match(/(\d+)\s*(?:min|mins|m)\b/i);
    const durationMinutes = minMatch ? parseInt(minMatch[1], 10) : 45;

    const amountMatch = text.match(/\$?\b(\d+(?:\.\d{1,2})?)\b/);
    const amount = amountMatch ? parseFloat(amountMatch[1]) : 25;

    const priorityMatch = text.match(/#(low|medium|high|critical)/i);
    const priority = (priorityMatch ? priorityMatch[1].toLowerCase() : 'high') as
      | 'low'
      | 'medium'
      | 'high'
      | 'critical';

    const isTomorrow = /\btomorrow\b/i.test(text);
    const dateObj = new Date();
    if (isTomorrow) dateObj.setDate(dateObj.getDate() + 1);
    const dateStr = dateObj.toISOString().split('T')[0];

    const parts = text.split('·').map((s) => s.trim());
    const cleanTitle =
      parts[0]
        ?.replace(/#(low|medium|high|critical)/gi, '')
        .replace(/\btomorrow\b/gi, '')
        .trim() || 'Untitled Entry';

    const rawCat = (
      parts[2]?.replace(/#(low|medium|high|critical)/gi, '').trim() || 'study'
    ).toLowerCase();
    const category: TaskItem['category'] =
      rawCat === 'work' ||
      rawCat === 'health' ||
      rawCat === 'finance' ||
      rawCat === 'personal' ||
      rawCat === 'routine'
        ? rawCat
        : 'study';

    return {
      cleanTitle,
      category,
      durationMinutes,
      priority,
      dateStr,
      isTomorrow,
      amount,
    };
  }, [rawInput]);

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!rawInput.trim() || saving) return;
    setSaving(true);
    try {
      if (type === 'Task') {
        await createTask({
          title: parsed.cleanTitle,
          notes: rawInput,
          category: parsed.category,
          priority: parsed.priority,
          status: 'todo',
          dueDate: parsed.dateStr,
          estimatedMinutes: parsed.durationMinutes,
        });
      } else if (type === 'Event') {
        await createCalendarEvent({
          title: parsed.cleanTitle,
          eventType: 'study_block',
          date: parsed.dateStr,
          startTime: '10:00',
          endTime: '11:00',
          location: parsed.category,
          isProtectedAnchor: false,
        });
      } else if (type === 'Note') {
        await createKnowledgeItem({
          title: parsed.cleanTitle,
          itemType: 'note',
          authorOrSource: parsed.category,
          status: 'in_progress',
          progressCurrent: 0,
          progressTotal: 1,
          progressUnit: 'note',
          rating: 5,
          tags: parsed.category,
          takeaways: rawInput,
        });
      } else if (type === 'Expense') {
        await createFinanceRecord({
          title: parsed.cleanTitle,
          recordType: 'expense',
          category: parsed.category,
          accountName: 'Main Account',
          amountMinor: Math.round(parsed.amount * 100),
          date: parsed.dateStr,
          isRecurring: false,
          notes: rawInput,
        });
      } else if (type === 'Food') {
        await createHealthLog({
          logType: 'meal',
          date: parsed.dateStr,
          title: parsed.cleanTitle,
          calories: Math.round(parsed.amount * 10),
          proteinGrams: 30,
          carbsGrams: 40,
          fatGrams: 15,
          notes: rawInput,
        });
      } else if (type === 'Workout') {
        await createHealthLog({
          logType: 'workout',
          date: parsed.dateStr,
          title: parsed.cleanTitle,
          durationMinutes: parsed.durationMinutes,
          calories: 320,
          notes: rawInput,
        });
      }
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-5"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-widest text-[var(--text-muted)]">
              QUICK ADD · CTRL + N
            </p>
            <h2 className="text-xl font-bold mt-0.5">Capture anything in one line</h2>
          </div>
          <span className="px-2.5 py-1 rounded-lg bg-[var(--bg-secondary)] text-xs text-[var(--text-muted)]">
            Esc to close
          </span>
        </div>

        {/* Type Selector */}
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
          {(['Task', 'Event', 'Note', 'Expense', 'Food', 'Workout'] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setType(t)}
              className={`py-2 px-3 rounded-xl text-xs font-medium border transition-all ${
                type === t
                  ? 'bg-[#9BB9A2]/20 border-[#9BB9A2]/50 text-[var(--text-primary)] font-semibold'
                  : 'bg-[var(--bg-secondary)]/50 border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {/* Input */}
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-xs text-[var(--text-muted)] mb-1.5">
              Natural language input
            </label>
            <input
              type="text"
              autoFocus
              value={rawInput}
              onChange={(e) => setRawInput(e.target.value)}
              placeholder="e.g., Study Cardiology tomorrow · 45 min · study #high"
              className="w-full px-4 py-3 rounded-xl bg-[var(--bg-secondary)] border border-[#9BB9A2]/40 text-sm text-[var(--text-primary)] focus:outline-none focus:border-[#9BB9A2]"
            />
          </div>

          {/* Parsed Chips */}
          {rawInput.trim() && (
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="text-[var(--text-muted)]">Parsed:</span>
              <span className="px-2.5 py-1 rounded-full bg-[#9BB9A2]/15 text-[#9BB9A2] font-medium">
                Type: {type}
              </span>
              <span className="px-2.5 py-1 rounded-full bg-[#9BB9A2]/15 text-[#9BB9A2] font-medium">
                When: {parsed.isTomorrow ? 'Tomorrow' : 'Today'} ({parsed.dateStr})
              </span>
              <span className="px-2.5 py-1 rounded-full bg-[#9BB9A2]/15 text-[#9BB9A2] font-medium">
                Duration: {parsed.durationMinutes}m
              </span>
              <span className="px-2.5 py-1 rounded-full bg-[#9BB9A2]/15 text-[#9BB9A2] font-medium capitalize">
                Category: {parsed.category}
              </span>
              <span className="px-2.5 py-1 rounded-full bg-[#E5B567]/15 text-[#E5B567] font-medium capitalize">
                Priority: {parsed.priority}
              </span>
            </div>
          )}

          {/* Footer */}
          <div className="pt-3 border-t border-[var(--border-subtle)] flex items-center justify-between">
            <span className="text-xs text-[var(--text-muted)]">
              Tip: use <code className="text-[var(--text-secondary)]">·</code> to separate fields or{' '}
              <code className="text-[var(--text-secondary)]">#high</code> for priority
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl bg-[var(--bg-secondary)] text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving || !rawInput.trim()}
                className="px-4 py-2 rounded-xl bg-[var(--accent)] text-[#0F1613] text-xs font-semibold hover:opacity-90 disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save · Enter ↵'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
