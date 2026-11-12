import React, { useState } from 'react';
import {
  Sparkles,
  Send,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  RotateCcw,
  Maximize2,
  Minimize2,
  X,
} from 'lucide-react';
import { useLifeOS } from '../context/LifeOSContext.tsx';

interface SpoonFeederPanelProps {
  isFullScreenPage?: boolean;
  onCloseDrawer?: () => void;
}

export const SpoonFeederPanel: React.FC<SpoonFeederPanelProps> = ({
  isFullScreenPage = false,
  onCloseDrawer,
}) => {
  const {
    profile,
    tasks,
    events,
    studyModules,
    studyItems,
    aiLogs,
    todayDate,
    updateProfileSettings,
    createTask,
    createCalendarEvent,
    createHealthLog,
    logAiAction,
    resolveAiProposal,
  } = useLifeOS();

  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [expandedDrawer, setExpandedDrawer] = useState(false);
  const [messages, setMessages] = useState<
    { role: 'user' | 'assistant'; text: string; timestamp: string }[]
  >([
    {
      role: 'assistant',
      text: 'Spoon Feeder AI online. I can schedule study sessions around your prayer anchors, create tasks, log workouts/meals, or propose budget and schedule rebalances with your approval.',
      timestamp: 'Now',
    },
  ]);

  const handleSendPrompt = async (customPrompt?: string) => {
    const textToSend = (customPrompt ?? input).trim();
    if (!textToSend || sending) return;
    if (!customPrompt) setInput('');

    setMessages((prev) => [
      ...prev,
      { role: 'user', text: textToSend, timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) },
    ]);
    setSending(true);

    try {
      const res = await fetch('/api/ai/spoon-feeder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: textToSend,
          contextSnapshot: {
            todayDate,
            prayerMethod: profile?.prayerMethod || 'MWL',
            tasks: tasks.slice(0, 10),
            events: events.slice(0, 10),
            studyModules,
            dueRevisions: studyItems.filter((s) => s.nextReviewDate <= todayDate),
          },
        }),
      });
      const data = await res.json();

      if (data.error) {
        setMessages((prev) => [
          ...prev,
          { role: 'assistant', text: `Error: ${data.error}`, timestamp: 'Now' },
        ]);
      } else {
        // Process any structured tool calls according to Autonomy & Permission Policy
        const toolCalls = data.toolCalls || [];
        const executedSummaries: string[] = [];

        for (const tc of toolCalls) {
          const args = tc.args || {};
          if (tc.permissionLevel === 'routine_write' && profile?.aiRoutineAutoApprove !== false) {
            if (tc.name === 'create_task') {
              await createTask({
                title: args.title || 'AI Created Task',
                priority: args.priority || 'high',
                status: 'todo',
                category: args.category || 'study',
                estimatedMinutes: Number(args.estimatedMinutes) || 45,
                dueDate: args.dueDate || todayDate,
                scheduledStart: args.scheduledStart,
              });
              await logAiAction({
                actionTitle: `Created Task: ${args.title}`,
                toolName: 'create_task',
                permissionLevel: 'routine_write',
                status: 'executed',
                targetModule: 'Calendar & Tasks',
                summary: `Routine write auto-executed: Added task "${args.title}" (${args.estimatedMinutes || 45}m).`,
                payloadJson: JSON.stringify(args),
              });
              executedSummaries.push(`Executed [Routine Write]: Created task "${args.title}".`);
            } else if (tc.name === 'schedule_study_block') {
              await createCalendarEvent({
                title: args.title || 'Study Revision Block',
                eventType: 'study_block',
                date: args.date || todayDate,
                startTime: args.startTime || '14:00',
                endTime: args.endTime || '15:00',
                location: args.location || 'Study Desk',
                isProtectedAnchor: false,
              });
              await logAiAction({
                actionTitle: `Scheduled Study Block: ${args.title}`,
                toolName: 'schedule_study_block',
                permissionLevel: 'routine_write',
                status: 'executed',
                targetModule: 'Calendar & Study',
                summary: `Scheduled "${args.title}" at ${args.startTime}–${args.endTime}.`,
                payloadJson: JSON.stringify(args),
              });
              executedSummaries.push(`Executed [Routine Write]: Scheduled "${args.title}" (${args.startTime}–${args.endTime}).`);
            } else if (tc.name === 'log_health_entry') {
              await createHealthLog({
                logType: args.logType || 'workout',
                date: todayDate,
                title: args.title || 'Health Entry',
                calories: args.calories,
                proteinGrams: args.proteinGrams,
                durationMinutes: args.durationMinutes,
                volumeKg: args.volumeKg,
                weightKg: args.weightKg,
              });
              await logAiAction({
                actionTitle: `Logged Health Entry: ${args.title}`,
                toolName: 'log_health_entry',
                permissionLevel: 'routine_write',
                status: 'executed',
                targetModule: 'Health & Fitness',
                summary: `Logged ${args.logType}: "${args.title}".`,
                payloadJson: JSON.stringify(args),
              });
              executedSummaries.push(`Executed [Routine Write]: Logged ${args.logType} "${args.title}".`);
            }
          } else {
            // Consequential or approval-gated action -> queue for explicit user confirmation
            await logAiAction({
              actionTitle: `Proposed: ${tc.name.replace(/_/g, ' ')}`,
              toolName: tc.name,
              permissionLevel: 'consequential',
              status: 'pending_approval',
              targetModule: tc.name.includes('finance') ? 'Finance' : 'Calendar & Schedule',
              summary:
                args.summary ||
                `Proposed ${args.recordType || 'action'}: ${args.title || ''} ($${args.amountMajor || ''}) — awaiting your approval.`,
              payloadJson: JSON.stringify(args),
            });
            executedSummaries.push(
              `Queued [Consequential Action]: "${tc.name}" requires your explicit confirmation in the Approval Queue.`
            );
          }
        }

        const combinedReply = [data.reply, ...executedSummaries].filter(Boolean).join('\n\n');
        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            text: combinedReply || 'Action processed.',
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          },
        ]);
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          text: 'Network error communicating with Spoon Feeder AI.',
          timestamp: 'Now',
        },
      ]);
    } finally {
      setSending(false);
    }
  };

  const pendingLogs = aiLogs.filter((l) => l.status === 'pending_approval');

  return (
    <div
      className={`flex flex-col bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden ${
        isFullScreenPage
          ? 'min-h-[75vh]'
          : expandedDrawer
          ? 'fixed inset-4 z-50 shadow-2xl'
          : 'h-[600px] w-full max-w-md shadow-2xl'
      }`}
    >
      {/* Top Bar */}
      <div className="px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 bg-slate-50/70 dark:bg-slate-950/60">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-emerald-500" />
          <div>
            <div className="text-sm font-bold text-slate-900 dark:text-slate-100">
              Spoon Feeder AI Operator
            </div>
            <div className="text-xs text-slate-500">
              Permission-gated autonomous assistant
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <label className="hidden sm:flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400 cursor-pointer mr-2">
            <input
              type="checkbox"
              checked={profile?.aiRoutineAutoApprove !== false}
              onChange={(e) =>
                updateProfileSettings({ aiRoutineAutoApprove: e.target.checked })
              }
            />
            Auto-run Routine Writes
          </label>
          {!isFullScreenPage && (
            <button
              onClick={() => setExpandedDrawer(!expandedDrawer)}
              className="p-1.5 text-slate-500 hover:text-slate-900 dark:hover:text-slate-100"
              title="Toggle Fullscreen"
            >
              {expandedDrawer ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
          )}
          {onCloseDrawer && (
            <button
              onClick={onCloseDrawer}
              className="p-1.5 text-slate-500 hover:text-slate-900 dark:hover:text-slate-100"
              title="Close panel"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Body Split: Chat on Left, Safeguard Approval & Audit Log on Right (when full-screen or expanded) */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 overflow-hidden">
        <div
          className={`${
            isFullScreenPage || expandedDrawer ? 'lg:col-span-7' : 'lg:col-span-12'
          } flex flex-col h-full border-r border-slate-100 dark:border-slate-800 overflow-hidden`}
        >
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((m, idx) => (
              <div
                key={idx}
                className={`flex flex-col ${
                  m.role === 'user' ? 'items-end' : 'items-start'
                }`}
              >
                <div
                  className={`max-w-[85%] rounded-xl px-4 py-2.5 text-xs leading-relaxed whitespace-pre-wrap ${
                    m.role === 'user'
                      ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200'
                  }`}
                >
                  {m.text}
                </div>
                <span className="mt-1 text-[10px] font-mono text-slate-400">{m.timestamp}</span>
              </div>
            ))}

            {/* Inline Pending Approvals inside compact drawer */}
            {!isFullScreenPage && !expandedDrawer && pendingLogs.length > 0 && (
              <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 space-y-2">
                <div className="text-xs font-semibold text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5" /> Consequential Action Requires Confirmation
                </div>
                {pendingLogs.map((pl) => (
                  <div key={pl.id} className="text-xs space-y-1.5 pt-1 border-t border-amber-500/20">
                    <div className="font-medium text-slate-900 dark:text-slate-100">
                      {pl.actionTitle}
                    </div>
                    <p className="text-slate-600 dark:text-slate-300">{pl.summary}</p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => resolveAiProposal(pl, 'approved')}
                        className="px-2.5 py-1 rounded bg-emerald-600 text-white font-semibold"
                      >
                        Approve & Execute
                      </button>
                      <button
                        onClick={() => resolveAiProposal(pl, 'rejected')}
                        className="px-2.5 py-1 rounded border border-slate-300 dark:border-slate-700"
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Prompt Suggestions */}
          <div className="px-4 py-2 border-t border-slate-100 dark:border-slate-800 flex items-center gap-1.5 overflow-x-auto">
            {[
              'Schedule a 45m CS304 revision block at 14:00 today',
              'Create a high-priority task to review Distributed Systems notes',
              'Propose logging a $18.50 lunch expense in Dining',
            ].map((suggestion) => (
              <button
                key={suggestion}
                onClick={() => handleSendPrompt(suggestion)}
                className="px-2.5 py-1 rounded-md bg-slate-100 dark:bg-slate-800 text-[11px] text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 whitespace-nowrap shrink-0"
              >
                {suggestion}
              </button>
            ))}
          </div>

          {/* Input Bar */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendPrompt();
            }}
            className="p-3 border-t border-slate-200 dark:border-slate-800 flex items-center gap-2"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask Spoon Feeder AI to plan, log, or summarize..."
              className="flex-1 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-xs text-slate-900 dark:text-slate-100"
            />
            <button
              type="submit"
              disabled={sending}
              className="px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1 disabled:opacity-50"
            >
              <Send className="w-3.5 h-3.5" />
              {sending ? '...' : 'Send'}
            </button>
          </form>
        </div>

        {/* Right 5 Columns: Permission Matrix & Audit History (Visible in Fullscreen / Expanded Mode) */}
        {(isFullScreenPage || expandedDrawer) && (
          <div className="lg:col-span-5 p-5 overflow-y-auto space-y-6 bg-slate-50/40 dark:bg-slate-950/30">
            <div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-500" />
                Autonomy & Permission Safeguards
              </h3>
              <p className="mt-1 text-xs text-slate-500">
                Read and routine writes log automatically; consequential changes (deadlines, budgets, finance records) require explicit confirmation.
              </p>
            </div>

            <div className="space-y-3">
              <div className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Action Audit Log & Approval Queue ({aiLogs.length})
              </div>

              {aiLogs.map((log) => (
                <div
                  key={log.id}
                  className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3.5 space-y-2 text-xs"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-slate-900 dark:text-slate-100">
                      {log.actionTitle}
                    </span>
                    <span className="font-mono text-[11px] text-slate-500">
                      {log.permissionLevel} · {log.status}
                    </span>
                  </div>
                  <p className="text-slate-600 dark:text-slate-300">{log.summary}</p>

                  {log.status === 'pending_approval' && (
                    <div className="flex items-center gap-2 pt-1">
                      <button
                        onClick={() => resolveAiProposal(log, 'approved')}
                        className="px-3 py-1 rounded bg-emerald-600 text-white font-semibold flex items-center gap-1"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" /> Approve
                      </button>
                      <button
                        onClick={() => resolveAiProposal(log, 'rejected')}
                        className="px-3 py-1 rounded border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 flex items-center gap-1"
                      >
                        <XCircle className="w-3.5 h-3.5" /> Reject
                      </button>
                    </div>
                  )}

                  {log.status === 'executed' && (
                    <div className="flex justify-end">
                      <button
                        onClick={() => resolveAiProposal(log, 'undone')}
                        className="text-[11px] text-slate-500 hover:text-amber-600 flex items-center gap-1"
                      >
                        <RotateCcw className="w-3 h-3" /> Undo Action
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
