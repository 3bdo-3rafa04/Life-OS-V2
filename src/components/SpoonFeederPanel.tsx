import React, { useState, useRef, useEffect } from 'react';
import { useLifeOS } from '../context/LifeOSContext';
import { AiActionLogRecord, TaskItem } from '../types';
import {
  Sparkles,
  Send,
  Check,
  X,
  RotateCcw,
  Trash2,
  Bot,
  User,
  SlidersHorizontal,
  MessageSquarePlus,
  Cpu,
} from 'lucide-react';

type RolePersonaId = 'operator' | 'study_tutor' | 'schedule_architect' | 'finance_health_coach';
type ModelTierId = 'general' | 'fast' | 'interactive' | 'deep';

interface RolePersonaOption {
  id: RolePersonaId;
  label: string;
  tagline: string;
  defaultInstruction: string;
  quickPrompts: string[];
}

const ROLE_PERSONAS: RolePersonaOption[] = [
  {
    id: 'operator',
    label: 'Workspace Operator',
    tagline: 'Executes tasks, study blocks, health logs & finance proposals',
    defaultInstruction:
      'Act as the autonomous Life OS Workspace Operator. Execute routine actions immediately and stage consequential actions for approval.',
    quickPrompts: [
      'Create a high priority study task for 45 minutes today',
      'Schedule a study block at 16:00 today',
      'Rebalance my schedule for today around prayer times',
    ],
  },
  {
    id: 'study_tutor',
    label: 'Socratic Study Tutor',
    tagline: 'Quizzes active recall, explains mechanisms & schedules revisions',
    defaultInstruction:
      'Act as a Socratic academic tutor. Test my active recall step-by-step, separate source-grounded facts from extra intuition, and schedule study blocks when needed.',
    quickPrompts: [
      'Quiz me on my active study modules with 3 progressive questions',
      'Help me break down a difficult lecture topic into flashcards',
      'Create a 60 minute active recall task for tomorrow',
    ],
  },
  {
    id: 'schedule_architect',
    label: 'Schedule Architect',
    tagline: 'Time-blocks around energy peaks & protected prayer anchors',
    defaultInstruction:
      'Act as a realistic Schedule & Energy Architect. Protect all 5 daily prayer anchors and buffers, avoid overloading my day, and time-block high-focus work.',
    quickPrompts: [
      'Design a realistic study and workout schedule for the rest of today',
      'How should I sequence my open tasks based on priority?',
      'Rebalance my schedule to protect deep focus windows',
    ],
  },
  {
    id: 'finance_health_coach',
    label: 'Finance & Health Coach',
    tagline: 'Tracks macros, workouts, recovery & mindful budgeting',
    defaultInstruction:
      'Act as a supportive Finance & Wellbeing Coach. Help me hit calorie/protein/hydration targets, log workouts, and propose mindful budget or expense records.',
    quickPrompts: [
      'Log a 45 minute upper body workout session today',
      'Log a high-protein meal with 650 kcal and 45g protein',
      'Propose a $35 expense for study textbooks',
    ],
  },
];

const MODEL_TIERS: { id: ModelTierId; label: string; badge: string; desc: string }[] = [
  {
    id: 'general',
    label: 'General (gemini-3.8-flash)',
    badge: 'gemini-3.8-flash',
    desc: 'Balanced speed & multi-turn tool calling',
  },
  {
    id: 'fast',
    label: 'Fast (gemini-3.1-flash-lite)',
    badge: 'gemini-3.1-flash-lite',
    desc: 'Ultra-low latency for quick commands',
  },
  {
    id: 'interactive',
    label: 'Interactive (Thinking Med)',
    badge: 'gemini-3.8-flash · Med',
    desc: 'Enhanced multi-step interactive planning',
  },
  {
    id: 'deep',
    label: 'Deep Reasoning (Thinking High)',
    badge: 'gemini-3.8-flash · High',
    desc: 'Maximum reasoning depth for complex schedules & tutoring',
  },
];

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  timestamp: string;
  personaLabel?: string;
  modelBadge?: string;
  actionsExecuted?: string[];
}

export const SpoonFeederPanel: React.FC = () => {
  const {
    profile,
    tasks,
    events,
    studyModules,
    studyItems,
    healthLogs,
    aiLogs,
    todayDate,
    createTask,
    createCalendarEvent,
    createHealthLog,
    logAiAction,
    resolveAiProposal,
    deleteAiLog,
  } = useLifeOS();

  const [rolePersona, setRolePersona] = useState<RolePersonaId>('operator');
  const [modelTier, setModelTier] = useState<ModelTierId>('general');
  const [showSystemConfig, setShowSystemConfig] = useState(false);
  const [customSystemInstruction, setCustomSystemInstruction] = useState('');

  const activePersona =
    ROLE_PERSONAS.find((p) => p.id === rolePersona) || ROLE_PERSONAS[0];
  const activeModel = MODEL_TIERS.find((m) => m.id === modelTier) || MODEL_TIERS[0];

  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome-msg',
      role: 'assistant',
      text: 'Spoon Feeder AI multi-turn chat is ready. I remember our conversation history across turns and can adapt my role persona—ask me a question, start a Socratic study session, or tell me to create tasks, schedule study blocks, log health entries, or propose expenses.',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      personaLabel: ROLE_PERSONAS[0].label,
      modelBadge: MODEL_TIERS[0].badge,
    },
  ]);

  const threadEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    threadEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const normalizeCategory = (raw: unknown): TaskItem['category'] => {
    const val = String(raw || 'study').toLowerCase();
    if (
      val === 'study' ||
      val === 'work' ||
      val === 'health' ||
      val === 'finance' ||
      val === 'personal' ||
      val === 'routine'
    ) {
      return val;
    }
    return 'study';
  };

  const handleClearThread = () => {
    setMessages([
      {
        id: `welcome-${Date.now()}`,
        role: 'assistant',
        text: `Started a fresh multi-turn conversation as ${activePersona.label} (${activeModel.badge}). How can I help you next?`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        personaLabel: activePersona.label,
        modelBadge: activeModel.badge,
      },
    ]);
  };

  const handleSend = async (customPrompt?: string) => {
    const textToSend = (customPrompt ?? input).trim();
    if (!textToSend || loading) return;

    const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      text: textToSend,
      timestamp: nowTime,
    };

    // Capture conversation history prior to this turn for multi-turn continuity
    const historyPayload = messages
      .filter((m) => m.id !== 'welcome-msg' && !m.id.startsWith('welcome-'))
      .map((m) => ({
        role: m.role === 'user' ? 'user' : 'model',
        text: m.text,
      }));

    setMessages((prev) => [...prev, userMsg]);
    if (!customPrompt) setInput('');
    setLoading(true);

    try {
      const contextSnapshot = {
        todayDate,
        pendingTasksCount: tasks.filter((t) => t.status !== 'completed').length,
        pendingTasks: tasks
          .filter((t) => t.status !== 'completed')
          .slice(0, 8)
          .map((t) => ({ title: t.title, priority: t.priority, dueDate: t.dueDate })),
        todayEventsCount: events.length,
        studyModules: studyModules.map((m) => ({ code: m.code, title: m.title })),
        dueFlashcards: studyItems.filter((s) => s.itemType === 'flashcard').length,
        recentHealthLogs: healthLogs.slice(0, 3).map((h) => ({ type: h.logType, title: h.title })),
        currency: profile?.currency || 'USD',
        autoApproveRoutine: profile?.aiRoutineAutoApprove ?? true,
      };

      const res = await fetch('/api/ai/spoon-feeder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: textToSend,
          message: textToSend,
          history: historyPayload,
          rolePersona,
          modelTier,
          customSystemInstruction:
            customSystemInstruction.trim() || activePersona.defaultInstruction,
          contextSnapshot,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to reach Spoon Feeder AI');
      }

      const data = await res.json();
      const calls: { name: string; args: Record<string, unknown> }[] =
        data.toolCalls || data.functionCalls || [];

      const executedSummaries: string[] = [];

      for (const call of calls) {
        const name = call.name;
        const args = call.args || {};

        if (name === 'create_task' || name === 'createTask') {
          const title = String(args.title || 'New Task');
          const category = normalizeCategory(args.category);
          const priority = (['low', 'medium', 'high', 'critical'].includes(String(args.priority))
            ? String(args.priority)
            : 'medium') as TaskItem['priority'];
          const estimatedMinutes = Number(args.estimatedMinutes) || 30;
          const dueDate = String(args.dueDate || todayDate);

          await createTask({
            title,
            notes: `Created by Spoon Feeder AI (${activePersona.label})`,
            category,
            priority,
            status: 'todo',
            dueDate,
            estimatedMinutes,
          });

          await logAiAction({
            actionTitle: `Created task: ${title}`,
            toolName: 'create_task',
            permissionLevel: 'routine_write',
            status: 'executed',
            targetModule: 'tasks',
            summary: `Created task "${title}" (${estimatedMinutes}m, ${priority})`,
            payloadJson: JSON.stringify(args),
          });
          executedSummaries.push(`Task: ${title}`);
        } else if (name === 'schedule_study_block' || name === 'scheduleStudyBlock') {
          const title = String(args.title || 'Focused Study Session');
          const date = String(args.date || todayDate);
          const startTime = String(args.startTime || '16:00');
          const endTime = String(args.endTime || '17:00');

          await createCalendarEvent({
            title,
            eventType: 'study_block',
            date,
            startTime,
            endTime,
            location: 'Study Desk',
            isProtectedAnchor: false,
          });

          await logAiAction({
            actionTitle: `Scheduled study block: ${title}`,
            toolName: 'schedule_study_block',
            permissionLevel: 'routine_write',
            status: 'executed',
            targetModule: 'calendar',
            summary: `Scheduled "${title}" on ${date} (${startTime}–${endTime})`,
            payloadJson: JSON.stringify(args),
          });
          executedSummaries.push(`Scheduled: ${title} (${startTime})`);
        } else if (name === 'log_health_entry' || name === 'logHealthEntry') {
          const rawType = String(args.logType || 'workout');
          const logType: 'measurement' | 'workout' | 'meal' =
            rawType === 'meal'
              ? 'meal'
              : rawType === 'measurement' || rawType === 'weight'
              ? 'measurement'
              : 'workout';
          const title = String(args.title || args.label || 'Health entry');

          await createHealthLog({
            logType,
            date: todayDate,
            title,
            calories: Number(args.calories) || 0,
            proteinGrams: Number(args.proteinGrams) || 0,
            durationMinutes: Number(args.durationMinutes) || 0,
            weightKg: Number(args.weightKg) || undefined,
          });

          await logAiAction({
            actionTitle: `Logged ${logType}: ${title}`,
            toolName: 'log_health_entry',
            permissionLevel: 'routine_write',
            status: 'executed',
            targetModule: 'health',
            summary: `Logged ${logType}: "${title}"`,
            payloadJson: JSON.stringify(args),
          });
          executedSummaries.push(`Health: ${title}`);
        } else if (name === 'propose_finance_record' || name === 'proposeFinanceRecord') {
          const title = String(args.title || 'Transaction');
          const amountMajor = Number(args.amountMajor ?? args.amount ?? 0);
          const recordType = String(args.recordType || args.transactionType || 'expense');

          await logAiAction({
            actionTitle: `Propose ${recordType}: ${title}`,
            toolName: 'propose_finance_record',
            permissionLevel: 'consequential',
            status: 'pending_approval',
            targetModule: 'finance',
            summary: `Proposed ${recordType}: "${title}" (${profile?.currency || 'USD'} ${amountMajor})`,
            payloadJson: JSON.stringify({
              ...args,
              title,
              amountMajor,
              recordType,
              date: args.date || todayDate,
            }),
          });
          executedSummaries.push(`Preview staged: ${title}`);
        } else if (name === 'rebalance_day_schedule' || name === 'rebalanceDaySchedule') {
          const reason = String(args.reason || 'Schedule optimization');
          const proposedChangesSummary = String(
            args.summary ||
              args.proposedChangesSummary ||
              'Shift flexible study blocks after fixed commitments'
          );

          await logAiAction({
            actionTitle: 'Rebalance day schedule',
            toolName: 'rebalance_day_schedule',
            permissionLevel: 'consequential',
            status: 'pending_approval',
            targetModule: 'calendar',
            summary: `Rebalance proposal: ${proposedChangesSummary}`,
            payloadJson: JSON.stringify({
              reason,
              proposedChangesSummary,
              newBlockTitle: 'Rebalanced Deep Focus Block',
              date: todayDate,
              startTime: '19:30',
              endTime: '20:30',
            }),
          });
          executedSummaries.push('Preview staged: Schedule Rebalance');
        }
      }

      const replyText =
        data.reply ||
        (executedSummaries.length > 0
          ? `Done: ${executedSummaries.join(' · ')}.`
          : 'I processed your request.');

      setMessages((prev) => [
        ...prev,
        {
          id: `ai-${Date.now()}`,
          role: 'assistant',
          text: replyText,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          personaLabel: activePersona.label,
          modelBadge: data.usedModel || activeModel.badge,
          actionsExecuted: executedSummaries.length > 0 ? executedSummaries : undefined,
        },
      ]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          role: 'assistant',
          text:
            err instanceof Error
              ? `Error: ${err.message}`
              : 'Unable to process AI command right now.',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          personaLabel: activePersona.label,
          modelBadge: activeModel.badge,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const pendingProposals: AiActionLogRecord[] = aiLogs.filter(
    (l) => l.status === 'pending_approval'
  );
  const turnCount = Math.floor(messages.filter((m) => m.role === 'user').length);

  return (
    <div className="space-y-6 pb-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-widest text-[var(--text-muted)]">
            SPOON FEEDER AI · MULTI-TURN GEMINI CHAT · REVERSIBLE ACTION ENGINE
          </p>
          <h1 className="text-2xl font-bold tracking-tight mt-0.5">
            Conversational workspace assistant
          </h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="px-3 py-1.5 rounded-xl bg-[var(--bg-card)] border border-[var(--border-subtle)] text-xs text-[var(--text-secondary)]">
            Memory: <strong className="text-[#9BB9A2]">{turnCount} turns</strong> · Routine:{' '}
            <strong className="text-[#6EBF8B]">Auto-apply</strong> · Consequential:{' '}
            <strong className="text-[#E5B567]">Preview</strong>
          </span>
        </div>
      </div>

      {/* Role Persona Bar */}
      <div className="bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-2xl p-4 space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Role Selector Pills */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)] mr-1">
              Chatbot Role:
            </span>
            {ROLE_PERSONAS.map((persona) => {
              const isSelected = persona.id === rolePersona;
              return (
                <button
                  key={persona.id}
                  type="button"
                  onClick={() => setRolePersona(persona.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-all ${
                    isSelected
                      ? 'bg-[#9BB9A2]/20 border-[#9BB9A2] text-[var(--text-primary)] font-semibold'
                      : 'bg-[var(--bg-secondary)]/50 border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  {persona.label}
                </button>
              );
            })}
          </div>

          {/* Model Tier Selector & System Instruction Toggle */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded-xl px-2.5 py-1.5">
              <Cpu className="w-3.5 h-3.5 text-[#9BB9A2]" />
              <select
                value={modelTier}
                onChange={(e) => setModelTier(e.target.value as ModelTierId)}
                className="bg-transparent text-xs font-medium text-[var(--text-primary)] focus:outline-none"
                title="Select Gemini reasoning model tier"
              >
                {MODEL_TIERS.map((m) => (
                  <option key={m.id} value={m.id} className="bg-[#222C27] text-[#F0F4F1]">
                    {m.label}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              onClick={() => setShowSystemConfig((prev) => !prev)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium border flex items-center gap-1.5 transition-colors ${
                showSystemConfig
                  ? 'bg-[#9BB9A2]/20 border-[#9BB9A2] text-[#9BB9A2]'
                  : 'bg-[var(--bg-secondary)] border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              System Instruction
            </button>

            <button
              type="button"
              onClick={handleClearThread}
              className="px-3 py-1.5 rounded-xl text-xs font-medium bg-[var(--bg-secondary)] border border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] flex items-center gap-1.5"
              title="Start new multi-turn conversation"
            >
              <MessageSquarePlus className="w-3.5 h-3.5" />
              New Chat
            </button>
          </div>
        </div>

        {/* Collapsible System Instruction Drawer */}
        {showSystemConfig && (
          <div className="pt-3 border-t border-[var(--border-subtle)] space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-[#9BB9A2]">
                Active Role Directive ({activePersona.label})
              </span>
              <span className="text-[11px] text-[var(--text-muted)]">{activeModel.desc}</span>
            </div>
            <textarea
              rows={2}
              value={customSystemInstruction}
              onChange={(e) => setCustomSystemInstruction(e.target.value)}
              placeholder={activePersona.defaultInstruction}
              className="w-full px-3.5 py-2 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-subtle)] text-xs text-[var(--text-primary)] focus:outline-none focus:border-[#9BB9A2]"
            />
            <p className="text-[11px] text-[var(--text-muted)]">
              Leave blank to use the default <strong>{activePersona.label}</strong> system
              instruction, or enter custom instructions to specialize how Gemini responds in this
              thread.
            </p>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Multi-Turn Chat Column */}
        <div className="lg:col-span-7 bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-2xl flex flex-col h-[640px]">
          {/* Chat Header */}
          <div className="p-4 border-b border-[var(--border-subtle)] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-[#9BB9A2]/20 text-[#9BB9A2] flex items-center justify-center">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-bold">{activePersona.label}</h2>
                  <span className="px-2 py-0.5 rounded-md bg-[var(--bg-secondary)] text-[10px] font-mono text-[#9BB9A2]">
                    {activeModel.badge}
                  </span>
                </div>
                <p className="text-[11px] text-[var(--text-muted)]">{activePersona.tagline}</p>
              </div>
            </div>

            {/* Persona Quick Starter Prompts */}
            <div className="flex flex-wrap items-center gap-1.5">
              {activePersona.quickPrompts.map((qp, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSend(qp)}
                  disabled={loading}
                  className="px-2.5 py-1 rounded-lg bg-[var(--bg-secondary)] hover:bg-[var(--bg-hover)] text-[11px] text-[var(--text-secondary)] truncate max-w-[170px]"
                  title={qp}
                >
                  {qp}
                </button>
              ))}
            </div>
          </div>

          {/* Scrollable Messages Thread */}
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            {messages.map((m) => (
              <div
                key={m.id}
                className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'}`}
              >
                <div className="flex items-center gap-1.5 mb-1 px-1">
                  {m.role === 'assistant' ? (
                    <>
                      <Bot className="w-3.5 h-3.5 text-[#9BB9A2]" />
                      <span className="text-[10px] font-semibold text-[var(--text-secondary)]">
                        {m.personaLabel || 'Spoon Feeder AI'}
                      </span>
                      {m.modelBadge && (
                        <span className="text-[10px] font-mono text-[var(--text-muted)]">
                          · {m.modelBadge}
                        </span>
                      )}
                    </>
                  ) : (
                    <>
                      <span className="text-[10px] font-semibold text-[var(--text-secondary)]">
                        You
                      </span>
                      <User className="w-3 h-3 text-[#9BB9A2]" />
                    </>
                  )}
                  <span className="text-[10px] text-[var(--text-muted)]">· {m.timestamp}</span>
                </div>

                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-3 text-xs leading-relaxed ${
                    m.role === 'user'
                      ? 'bg-[#9BB9A2] text-[#0F1613] font-medium'
                      : 'bg-[var(--bg-secondary)] text-[var(--text-primary)] border border-[var(--border-subtle)]'
                  }`}
                >
                  <p className="whitespace-pre-wrap">{m.text}</p>

                  {m.actionsExecuted && m.actionsExecuted.length > 0 && (
                    <div className="mt-2.5 pt-2 border-t border-[var(--border-subtle)] flex flex-wrap gap-1.5">
                      {m.actionsExecuted.map((act, i) => (
                        <span
                          key={i}
                          className="px-2 py-0.5 rounded-md bg-[#6EBF8B]/15 text-[#6EBF8B] text-[10px] font-semibold"
                        >
                          ✓ {act}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex items-center gap-2 text-xs text-[var(--text-muted)] pl-1">
                <div className="w-2 h-2 rounded-full bg-[#9BB9A2] animate-ping" />
                {activePersona.label} ({activeModel.badge}) is thinking...
              </div>
            )}
            <div ref={threadEndRef} />
          </div>

          {/* Input Bar */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="p-4 border-t border-[var(--border-subtle)] flex items-center gap-2"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={`Message ${activePersona.label} (multi-turn memory active)...`}
              className="flex-1 px-4 py-2.5 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-subtle)] text-xs focus:outline-none focus:border-[var(--accent)]"
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="px-4 py-2.5 rounded-xl bg-[var(--accent)] text-[#0F1613] font-semibold text-xs hover:opacity-90 disabled:opacity-50 flex items-center gap-1.5"
            >
              <Send className="w-3.5 h-3.5" />
              Send
            </button>
          </form>
        </div>

        {/* Right Column: Action Log & Pending Approvals */}
        <div className="lg:col-span-5 space-y-5">
          {/* Pending Approvals Card */}
          {pendingProposals.length > 0 && (
            <div className="bg-[var(--bg-card)] border border-[#E5B567]/40 rounded-2xl p-5 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-[#E5B567]">
                  PREVIEW — nothing saved yet ({pendingProposals.length})
                </h3>
                <span className="text-[10px] text-[var(--text-muted)]">Requires confirmation</span>
              </div>
              {pendingProposals.map((log) => (
                <div
                  key={log.id}
                  className="p-3.5 rounded-xl bg-[var(--bg-secondary)]/60 border border-[var(--border-subtle)] space-y-2.5"
                >
                  <div className="flex items-center justify-between text-[10px] text-[var(--text-muted)]">
                    <span className="font-semibold text-[#E5B567] uppercase">{log.toolName}</span>
                    <span>{log.targetModule}</span>
                  </div>
                  <p className="text-xs font-semibold">{log.summary}</p>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => resolveAiProposal(log, 'approved')}
                      className="px-3 py-1.5 rounded-lg bg-[#6EBF8B] text-[#0F1613] text-[11px] font-semibold flex items-center gap-1"
                    >
                      <Check className="w-3.5 h-3.5" /> Approve &amp; apply
                    </button>
                    <button
                      onClick={() => resolveAiProposal(log, 'rejected')}
                      className="px-3 py-1.5 rounded-lg bg-[var(--bg-card)] text-[11px] text-[var(--text-muted)] hover:text-[#D97777] flex items-center gap-1"
                    >
                      <X className="w-3.5 h-3.5" /> Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Action Log Card */}
          <div className="bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold">Action log · reversible</h3>
                <p className="text-[11px] text-[var(--text-muted)]">
                  Every AI write is audited in Firestore ({aiLogs.length} total)
                </p>
              </div>
            </div>

            {aiLogs.length === 0 ? (
              <div className="py-12 text-center text-xs text-[var(--text-muted)] border border-dashed border-[var(--border-subtle)] rounded-xl">
                No AI actions recorded yet. Send a command in the chat to see real-time audit logs.
              </div>
            ) : (
              <div className="space-y-2.5 max-h-[480px] overflow-y-auto pr-1">
                {aiLogs.map((log) => (
                  <div
                    key={log.id}
                    className="p-3.5 rounded-xl bg-[var(--bg-secondary)]/40 border border-[var(--border-subtle)] flex items-start justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                            log.status === 'executed' || log.status === 'approved'
                              ? 'bg-[#6EBF8B]/15 text-[#6EBF8B]'
                              : log.status === 'pending_approval'
                              ? 'bg-[#E5B567]/15 text-[#E5B567]'
                              : 'bg-[var(--bg-card)] text-[var(--text-muted)]'
                          }`}
                        >
                          {log.status.replace('_', ' ')}
                        </span>
                        <span className="text-[10px] text-[var(--text-muted)]">
                          {log.toolName} · {log.targetModule}
                        </span>
                      </div>
                      <p className="text-xs font-medium">{log.summary}</p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {(log.status === 'executed' || log.status === 'approved') && (
                        <button
                          onClick={() => resolveAiProposal(log, 'undone')}
                          className="p-1.5 rounded-lg bg-[var(--bg-card)] hover:bg-[var(--bg-hover)] text-[var(--text-secondary)] text-[11px] flex items-center gap-1"
                          title="Mark undone"
                        >
                          <RotateCcw className="w-3 h-3" />
                        </button>
                      )}
                      <button
                        onClick={() => deleteAiLog(log.id)}
                        className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[#D97777]"
                        title="Delete log"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
