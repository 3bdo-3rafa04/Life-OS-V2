import React, { useState } from 'react';
import { useLifeOS } from '../context/LifeOSContext';
import {
  ProposedScheduleBlock,
  EnergyLevel,
  parseTimeToMinutes,
  formatMinutesToTime,
  addDaysToDateStr,
} from '../services/schedulingEngine';
import {
  Sparkles,
  Clock,
  Check,
  X,
  RotateCcw,
  Calendar,
  Zap,
  AlertTriangle,
  Brain,
  SlidersHorizontal,
  Plus,
  Trash2,
  CheckCircle2,
  SkipForward,
  ArrowRight,
  BookOpen,
  ShieldCheck,
  MessageSquare,
} from 'lucide-react';

interface SmartSchedulerPanelProps {
  compact?: boolean;
  onClose?: () => void;
}

export const SmartSchedulerPanel: React.FC<SmartSchedulerPanelProps> = ({
  compact = false,
  onClose,
}) => {
  const {
    todayDate,
    currentTimeStr,
    timezone,
    persistentMemory,
    activeScheduleProposal,
    generateSmartSchedule,
    adaptSmartSchedule,
    approveProposedScheduleBlock,
    approveAllProposedScheduleBlocks,
    modifyProposedScheduleBlock,
    recordActivityFeedback,
    updateEnergyProfile,
    addOrUpdateLearnedRule,
    confirmLearnedRule,
    deleteLearnedRule,
  } = useLifeOS();

  const [horizonDays, setHorizonDays] = useState<1 | 3 | 7>(1);
  const [generating, setGenerating] = useState(false);
  const [adaptInput, setAdaptInput] = useState('');
  const [adaptMessage, setAdaptMessage] = useState<string[] | null>(null);
  const [activeSubTab, setActiveSubTab] = useState<'schedule' | 'exams' | 'memory'>('schedule');
  const [selectedDayFilter, setSelectedDayFilter] = useState<string>('all');

  // New learned rule form
  const [newRuleText, setNewRuleText] = useState('');
  const [newRuleStart, setNewRuleStart] = useState('09:00');
  const [newRuleEnd, setNewRuleEnd] = useState('13:00');
  const [newRuleType, setNewRuleType] = useState<'university_schedule' | 'blocked_window'>('university_schedule');

  // Post-Session Feedback Modal State (Part 7)
  const [feedbackBlock, setFeedbackBlock] = useState<ProposedScheduleBlock | null>(null);
  const [fbCompleted, setFbCompleted] = useState(true);
  const [fbActualMinutes, setFbActualMinutes] = useState(45);
  const [fbDifficulty, setFbDifficulty] = useState<'too_easy' | 'accurate' | 'too_hard'>('accurate');
  const [fbEnergy, setFbEnergy] = useState<EnergyLevel>('high');
  const [fbConvenient, setFbConvenient] = useState(true);
  const [fbNotes, setFbNotes] = useState('');

  const handleGenerate = async (days: 1 | 3 | 7 = horizonDays) => {
    setHorizonDays(days);
    setGenerating(true);
    setAdaptMessage(null);
    try {
      await generateSmartSchedule({ targetDays: days });
      setSelectedDayFilter('all');
    } finally {
      setGenerating(false);
    }
  };

  const handleAdapt = async (customUtterance?: string) => {
    const text = (customUtterance ?? adaptInput).trim();
    if (!text) return;
    setGenerating(true);
    try {
      const res = await adaptSmartSchedule(text);
      setAdaptMessage(res.changesExplained);
      if (!customUtterance) setAdaptInput('');
    } finally {
      setGenerating(false);
    }
  };

  const openFeedbackModal = (block: ProposedScheduleBlock, completedDefault = true) => {
    setFeedbackBlock(block);
    setFbCompleted(completedDefault);
    setFbActualMinutes(block.durationMinutes);
    setFbDifficulty('accurate');
    setFbEnergy(block.slotEnergyLevel);
    setFbConvenient(true);
    setFbNotes('');
  };

  const handleSubmitFeedback = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!feedbackBlock) return;
    await recordActivityFeedback({
      blockId: feedbackBlock.id,
      activityId: feedbackBlock.sourceId,
      sourceType: feedbackBlock.sourceType,
      sourceId: feedbackBlock.sourceId,
      title: feedbackBlock.title,
      moduleId: feedbackBlock.moduleId,
      completed: fbCompleted,
      estimatedMinutes: feedbackBlock.durationMinutes,
      actualMinutes: fbCompleted ? fbActualMinutes : 0,
      difficultyAccuracy: fbDifficulty,
      userEnergyDuringSession: fbEnergy,
      timeSlotConvenient: fbConvenient,
      scheduledStartTime: feedbackBlock.startTime,
      notes: fbNotes.trim() || undefined,
    });
    setFeedbackBlock(null);
  };

  const handleAddRule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRuleText.trim()) return;
    await addOrUpdateLearnedRule({
      id: `rule_${Date.now()}`,
      ruleText: `${newRuleText.trim()} (${newRuleStart}–${newRuleEnd})`,
      ruleType: newRuleType,
      startTime: newRuleStart,
      endTime: newRuleEnd,
      daysOfWeek: [0, 1, 2, 3, 4],
      confirmed: true,
      isTemporary: false,
      createdAt: new Date().toISOString(),
    });
    setNewRuleText('');
  };

  const proposal = activeScheduleProposal;
  const blocks = proposal?.proposedBlocks || [];
  const uniqueDates = Array.from(new Set(blocks.map((b) => b.dateStr))).sort();
  const filteredBlocks =
    selectedDayFilter === 'all'
      ? blocks
      : blocks.filter((b) => b.dateStr === selectedDayFilter);

  const unconfirmedRules =
    persistentMemory.behavioralMemory.learnedRules.filter((r) => !r.confirmed) || [];

  const getEnergyBadgeClass = (level: EnergyLevel) => {
    if (level === 'high') return 'bg-[#D97777]/15 text-[#D97777] border-[#D97777]/30';
    if (level === 'medium') return 'bg-[#E5B567]/15 text-[#E5B567] border-[#E5B567]/30';
    return 'bg-[#6EBF8B]/15 text-[#6EBF8B] border-[#6EBF8B]/30';
  };

  const getPriorityBadgeClass = (prio: string) => {
    if (prio === 'critical') return 'bg-[#D97777]/20 text-[#D97777]';
    if (prio === 'high') return 'bg-[#E5B567]/20 text-[#E5B567]';
    if (prio === 'medium') return 'bg-[#9BB9A2]/20 text-[#9BB9A2]';
    return 'bg-[var(--bg-secondary)] text-[var(--text-muted)]';
  };

  return (
    <div className="bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-2xl p-5 space-y-5">
      {/* Top Header & Server Time Anchor */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-[var(--border-subtle)] pb-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-md bg-[#9BB9A2]/15 text-[#9BB9A2] text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
              <Sparkles className="w-3 h-3" />
              Context-Aware Scheduling Engine
            </span>
            <span className="px-2.5 py-0.5 rounded-md bg-[var(--bg-secondary)] border border-[var(--border-subtle)] text-[11px] font-mono text-[var(--text-secondary)] flex items-center gap-1.5">
              <Clock className="w-3 h-3 text-[#6EBF8B]" />
              Server Time: <strong className="text-[var(--text-primary)]">{todayDate} {currentTimeStr}</strong> ({timezone})
            </span>
            {proposal?.constraintCheck?.valid && (
              <span className="px-2.5 py-0.5 rounded-md bg-[#6EBF8B]/15 text-[#6EBF8B] text-[10px] font-semibold flex items-center gap-1">
                <ShieldCheck className="w-3 h-3" />
                Zero Past / Zero Overlap Verified
              </span>
            )}
          </div>
          <h2 className="text-lg font-bold mt-1.5">
            Exam-Aware, Energy-Matched &amp; Prerequisite-Ordered Planner
          </h2>
          <p className="text-xs text-[var(--text-muted)]">
            Never schedules in the past (before {currentTimeStr}), respects university lectures &amp; prayer buffers, enforces Lecture 1 → 2 → 3 → 4 order, and learns from your feedback.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Sub-navigation tabs */}
          <div className="flex items-center bg-[var(--bg-secondary)] p-1 rounded-xl border border-[var(--border-subtle)] text-xs">
            <button
              type="button"
              onClick={() => setActiveSubTab('schedule')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-colors ${
                activeSubTab === 'schedule'
                  ? 'bg-[#9BB9A2] text-[#0F1613]'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              Schedule ({blocks.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveSubTab('exams')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-colors ${
                activeSubTab === 'exams'
                  ? 'bg-[#9BB9A2] text-[#0F1613]'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              Exam Readiness ({proposal?.examReports?.length || 0})
            </button>
            <button
              type="button"
              onClick={() => setActiveSubTab('memory')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-colors flex items-center gap-1 ${
                activeSubTab === 'memory'
                  ? 'bg-[#9BB9A2] text-[#0F1613]'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              <Brain className="w-3.5 h-3.5" />
              Memory &amp; Energy ({persistentMemory.behavioralMemory.learnedRules.length})
            </button>
          </div>

          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl bg-[var(--bg-secondary)] text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Pending Learned Rule Confirmation Banner (Part 3: Ask before storing uncertain/temporary preferences permanently) */}
      {unconfirmedRules.length > 0 && (
        <div className="p-3.5 rounded-xl bg-[#E5B567]/10 border border-[#E5B567]/40 space-y-2">
          <div className="text-xs font-bold text-[#E5B567] flex items-center gap-1.5">
            <Brain className="w-4 h-4" />
            Confirm Learned Scheduling Preference ({unconfirmedRules.length})
          </div>
          {unconfirmedRules.map((rule) => (
            <div key={rule.id} className="flex flex-wrap items-center justify-between gap-2 text-xs">
              <span>
                Should Life OS permanently remember: <strong>&ldquo;{rule.ruleText}&rdquo;</strong>?
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => confirmLearnedRule(rule.id)}
                  className="px-2.5 py-1 rounded-lg bg-[#6EBF8B] text-[#0F1613] font-semibold text-[11px]"
                >
                  Confirm Permanent
                </button>
                <button
                  type="button"
                  onClick={() => deleteLearnedRule(rule.id)}
                  className="px-2.5 py-1 rounded-lg bg-[var(--bg-secondary)] text-[var(--text-muted)] hover:text-[#D97777] text-[11px]"
                >
                  Discard
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Generation Controls & Adaptive Rescheduling Bar (Parts 4 & 5) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-center bg-[var(--bg-secondary)]/50 p-3.5 rounded-xl border border-[var(--border-subtle)]">
        <div className="lg:col-span-5 flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={generating}
            onClick={() => handleGenerate(1)}
            className={`px-3 py-2 rounded-xl text-xs font-semibold border transition-all flex items-center gap-1.5 ${
              horizonDays === 1 && proposal
                ? 'bg-[#9BB9A2] text-[#0F1613] border-[#9BB9A2]'
                : 'bg-[var(--bg-card)] border-[var(--border-subtle)] text-[var(--text-primary)] hover:border-[#9BB9A2]'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            Generate Daily Plan
          </button>
          <button
            type="button"
            disabled={generating}
            onClick={() => handleGenerate(3)}
            className={`px-3 py-2 rounded-xl text-xs font-semibold border transition-all ${
              horizonDays === 3 && proposal
                ? 'bg-[#9BB9A2] text-[#0F1613] border-[#9BB9A2]'
                : 'bg-[var(--bg-card)] border-[var(--border-subtle)] text-[var(--text-primary)] hover:border-[#9BB9A2]'
            }`}
          >
            3-Day Plan
          </button>
          <button
            type="button"
            disabled={generating}
            onClick={() => handleGenerate(7)}
            className={`px-3 py-2 rounded-xl text-xs font-semibold border transition-all ${
              horizonDays === 7 && proposal
                ? 'bg-[#9BB9A2] text-[#0F1613] border-[#9BB9A2]'
                : 'bg-[var(--bg-card)] border-[var(--border-subtle)] text-[var(--text-primary)] hover:border-[#9BB9A2]'
            }`}
          >
            Weekly Plan (7d)
          </button>
          {proposal && (
            <button
              type="button"
              disabled={generating}
              onClick={() => handleGenerate(horizonDays)}
              className="p-2 rounded-xl bg-[var(--bg-card)] border border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[#9BB9A2]"
              title="Regenerate schedule with fresh server time"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Adaptive Rescheduling Quick Bar */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleAdapt();
          }}
          className="lg:col-span-7 flex items-center gap-2"
        >
          <input
            type="text"
            value={adaptInput}
            onChange={(e) => setAdaptInput(e.target.value)}
            placeholder='Adapt schedule: e.g. "I missed my morning session", "I only have 2 hours today", "I am exhausted today"...'
            className="flex-1 px-3.5 py-2 rounded-xl bg-[var(--bg-card)] border border-[var(--border-subtle)] text-xs focus:outline-none focus:border-[#9BB9A2]"
          />
          <button
            type="submit"
            disabled={generating || !adaptInput.trim()}
            className="px-3.5 py-2 rounded-xl bg-[#9BB9A2]/20 border border-[#9BB9A2]/40 text-[#9BB9A2] text-xs font-semibold hover:bg-[#9BB9A2] hover:text-[#0F1613] transition-colors disabled:opacity-50 shrink-0"
          >
            Adapt Plan
          </button>
        </form>
      </div>

      {/* Quick One-Click Adaptive Scenarios */}
      <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
        <span className="text-[var(--text-muted)] font-semibold mr-1">Quick Adapt:</span>
        {[
          'I missed my morning study session',
          'Today I have only two hours available',
          'I am exhausted today',
          'My exam has been moved to next week',
        ].map((preset) => (
          <button
            key={preset}
            type="button"
            onClick={() => handleAdapt(preset)}
            className="px-2.5 py-1 rounded-lg bg-[var(--bg-secondary)] hover:bg-[var(--bg-hover)] text-[var(--text-secondary)] border border-[var(--border-subtle)]"
          >
            &ldquo;{preset}&rdquo;
          </button>
        ))}
      </div>

      {/* Adaptation Explanation Banner */}
      {adaptMessage && adaptMessage.length > 0 && (
        <div className="p-3.5 rounded-xl bg-[#9BB9A2]/10 border border-[#9BB9A2]/30 space-y-1">
          <div className="text-xs font-bold text-[#9BB9A2]">Adaptive Rescheduling Applied</div>
          {adaptMessage.map((line, idx) => (
            <p key={idx} className="text-xs text-[var(--text-secondary)]">
              • {line}
            </p>
          ))}
        </div>
      )}

      {/* Warnings Banner (Exam Workload or Capacity Conflicts) */}
      {proposal && proposal.warnings.length > 0 && (
        <div className="p-3.5 rounded-xl bg-[#D97777]/10 border border-[#D97777]/40 space-y-1.5">
          <div className="text-xs font-bold text-[#D97777] flex items-center gap-1.5">
            <AlertTriangle className="w-4 h-4" />
            Workload &amp; Deadline Warnings ({proposal.warnings.length})
          </div>
          {proposal.warnings.map((w, i) => (
            <p key={i} className="text-xs text-[var(--text-primary)]">
              • {w}
            </p>
          ))}
        </div>
      )}

      {/* SUB-TAB 1: SCHEDULE VIEW */}
      {activeSubTab === 'schedule' && (
        <div className="space-y-4">
          {!proposal ? (
            <div className="py-10 text-center border border-dashed border-[var(--border-subtle)] rounded-2xl space-y-3">
              <p className="text-xs text-[var(--text-muted)] max-w-md mx-auto">
                Click <strong>Generate Daily Plan</strong> or <strong>Weekly Plan (7d)</strong> above to run the 10-step Context-Aware Scheduling Engine.
              </p>
              <button
                type="button"
                onClick={() => handleGenerate(1)}
                className="px-4 py-2 rounded-xl bg-[#9BB9A2] text-[#0F1613] text-xs font-semibold"
              >
                Generate Context-Aware Schedule Now
              </button>
            </div>
          ) : (
            <>
              {/* Energy Distribution & Capacity Bar */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 text-xs">
                <div className="p-3 rounded-xl bg-[var(--bg-secondary)]/60 border border-[var(--border-subtle)]">
                  <div className="text-[10px] text-[var(--text-muted)]">Active Study</div>
                  <div className="font-bold text-sm mt-0.5">
                    {proposal.energyDistribution.totalScheduledStudyMinutes}m
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-[var(--bg-secondary)]/60 border border-[var(--border-subtle)]">
                  <div className="text-[10px] text-[#D97777]">High Energy (Deep)</div>
                  <div className="font-bold text-sm mt-0.5">
                    {proposal.energyDistribution.highMinutes}m
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-[var(--bg-secondary)]/60 border border-[var(--border-subtle)]">
                  <div className="text-[10px] text-[#E5B567]">Medium Energy (Recall/MCQ)</div>
                  <div className="font-bold text-sm mt-0.5">
                    {proposal.energyDistribution.mediumMinutes}m
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-[var(--bg-secondary)]/60 border border-[var(--border-subtle)]">
                  <div className="text-[10px] text-[#6EBF8B]">Low Energy &amp; Breaks</div>
                  <div className="font-bold text-sm mt-0.5">
                    {proposal.energyDistribution.lowMinutes}m + {proposal.energyDistribution.breakMinutes}m breaks
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-[var(--bg-secondary)]/60 border border-[var(--border-subtle)]">
                  <div className="text-[10px] text-[var(--text-muted)]">Capacity Used</div>
                  <div className="font-bold text-sm mt-0.5 text-[#9BB9A2]">
                    {proposal.energyDistribution.utilizationPct}% (Leaves Buffer)
                  </div>
                </div>
              </div>

              {/* Day Filter & Approve All Button */}
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setSelectedDayFilter('all')}
                    className={`px-3 py-1 rounded-lg text-xs font-medium ${
                      selectedDayFilter === 'all'
                        ? 'bg-[#9BB9A2]/20 text-[#9BB9A2] border border-[#9BB9A2]'
                        : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)]'
                    }`}
                  >
                    All Days ({blocks.length})
                  </button>
                  {uniqueDates.map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setSelectedDayFilter(d)}
                      className={`px-3 py-1 rounded-lg text-xs font-medium ${
                        selectedDayFilter === d
                          ? 'bg-[#9BB9A2]/20 text-[#9BB9A2] border border-[#9BB9A2]'
                          : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)]'
                      }`}
                    >
                      {d === todayDate ? `Today (${d})` : d}
                    </button>
                  ))}
                </div>

                {blocks.some((b) => b.status === 'proposed') && (
                  <button
                    type="button"
                    onClick={approveAllProposedScheduleBlocks}
                    className="px-4 py-2 rounded-xl bg-[#6EBF8B] text-[#0F1613] text-xs font-bold hover:opacity-90 flex items-center gap-1.5"
                  >
                    <Check className="w-4 h-4" />
                    Approve &amp; Save Schedule to Calendar (
                    {blocks.filter((b) => b.status === 'proposed').length})
                  </button>
                )}
              </div>

              {/* Proposed Schedule Blocks List (Part 6) */}
              {filteredBlocks.length === 0 ? (
                <div className="py-8 text-center text-xs text-[var(--text-muted)] border border-dashed border-[var(--border-subtle)] rounded-xl">
                  No study activities fit the remaining valid windows for this selection. Try generating a 3-Day or 7-Day plan to distribute workload across future slots.
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredBlocks.map((block) => (
                    <div
                      key={block.id}
                      className={`p-4 rounded-xl border transition-all space-y-2.5 ${
                        block.status === 'completed'
                          ? 'bg-[#6EBF8B]/10 border-[#6EBF8B]/40'
                          : block.status === 'skipped'
                            ? 'bg-[var(--bg-secondary)]/30 border-[var(--border-subtle)] opacity-60'
                            : block.status === 'approved'
                              ? 'bg-[var(--bg-secondary)]/70 border-[#9BB9A2]/50'
                              : 'bg-[var(--bg-secondary)]/50 border-[var(--border-subtle)]'
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="px-2.5 py-1 rounded-lg bg-[var(--bg-card)] border border-[var(--border-subtle)] font-mono text-xs font-bold text-[#9BB9A2]">
                            {block.dateStr} · {block.startTime} – {block.endTime} ({block.durationMinutes}m)
                          </span>
                          <span className="px-2 py-0.5 rounded-md bg-[var(--bg-card)] text-[11px] font-semibold text-[var(--text-secondary)]">
                            {block.subject}
                          </span>
                          {block.lectureNumber !== undefined && (
                            <span className="px-2 py-0.5 rounded-md bg-[#9BB9A2]/15 text-[#9BB9A2] text-[10px] font-bold">
                              Lecture #{block.lectureNumber}
                            </span>
                          )}
                          <span
                            className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase ${getPriorityBadgeClass(
                              block.priority
                            )}`}
                          >
                            {block.priority}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded-md border text-[10px] font-semibold uppercase flex items-center gap-1 ${getEnergyBadgeClass(
                              block.energyRequirement
                            )}`}
                          >
                            <Zap className="w-2.5 h-2.5" />
                            {block.energyRequirement} Energy
                          </span>
                          {block.examDeadline && (
                            <span className="text-[10px] text-[var(--text-muted)]">
                              Exam/Due: <strong>{block.examDeadline}</strong>
                            </span>
                          )}
                        </div>

                        <span
                          className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                            block.status === 'approved'
                              ? 'bg-[#9BB9A2]/20 text-[#9BB9A2]'
                              : block.status === 'completed'
                                ? 'bg-[#6EBF8B]/20 text-[#6EBF8B]'
                                : block.status === 'skipped'
                                  ? 'bg-[#D97777]/20 text-[#D97777]'
                                  : 'bg-[#E5B567]/20 text-[#E5B567]'
                          }`}
                        >
                          {block.status}
                        </span>
                      </div>

                      <div>
                        <h4 className="text-sm font-bold">{block.title}</h4>
                        <p className="text-[11px] text-[var(--text-secondary)] mt-0.5">
                          <strong>Why this slot:</strong> {block.schedulingReason}
                        </p>
                      </div>

                      {/* Interactive Block Controls (Part 6) */}
                      <div className="pt-2 border-t border-[var(--border-subtle)] flex flex-wrap items-center justify-between gap-2">
                        <div className="flex flex-wrap items-center gap-1.5">
                          {/* Move +30m */}
                          <button
                            type="button"
                            onClick={() => {
                              const nextStart = formatMinutesToTime(
                                Math.min(22 * 60, parseTimeToMinutes(block.startTime) + 30)
                              );
                              modifyProposedScheduleBlock(block.id, { startTime: nextStart });
                            }}
                            className="px-2.5 py-1 rounded-lg bg-[var(--bg-card)] hover:bg-[var(--bg-hover)] text-[11px] text-[var(--text-secondary)] border border-[var(--border-subtle)]"
                            title="Shift start time +30 minutes"
                          >
                            Move +30m
                          </button>

                          {/* Move to Next Day */}
                          <button
                            type="button"
                            onClick={() => {
                              const nextDay = addDaysToDateStr(block.dateStr, 1);
                              modifyProposedScheduleBlock(block.id, {
                                dateStr: nextDay,
                                startTime: '09:00',
                              });
                            }}
                            className="px-2.5 py-1 rounded-lg bg-[var(--bg-card)] hover:bg-[var(--bg-hover)] text-[11px] text-[var(--text-secondary)] border border-[var(--border-subtle)] flex items-center gap-1"
                            title="Move activity to tomorrow"
                          >
                            <ArrowRight className="w-3 h-3" /> Next Day
                          </button>

                          {/* Adjust Duration (-15m / +15m) */}
                          <button
                            type="button"
                            onClick={() =>
                              modifyProposedScheduleBlock(block.id, {
                                durationMinutes: Math.max(20, block.durationMinutes - 15),
                              })
                            }
                            className="px-2 py-1 rounded-lg bg-[var(--bg-card)] hover:bg-[var(--bg-hover)] text-[11px] text-[var(--text-secondary)] border border-[var(--border-subtle)]"
                          >
                            -15m
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              modifyProposedScheduleBlock(block.id, {
                                durationMinutes: Math.min(120, block.durationMinutes + 15),
                              })
                            }
                            className="px-2 py-1 rounded-lg bg-[var(--bg-card)] hover:bg-[var(--bg-hover)] text-[11px] text-[var(--text-secondary)] border border-[var(--border-subtle)]"
                          >
                            +15m
                          </button>
                        </div>

                        <div className="flex flex-wrap items-center gap-1.5">
                          {block.status === 'proposed' && (
                            <button
                              type="button"
                              onClick={() => approveProposedScheduleBlock(block.id)}
                              className="px-3 py-1 rounded-lg bg-[#9BB9A2] text-[#0F1613] text-[11px] font-semibold flex items-center gap-1"
                            >
                              <Check className="w-3 h-3" /> Approve Block
                            </button>
                          )}

                          {block.status !== 'completed' && (
                            <button
                              type="button"
                              onClick={() => openFeedbackModal(block, true)}
                              className="px-3 py-1 rounded-lg bg-[#6EBF8B]/20 text-[#6EBF8B] border border-[#6EBF8B]/40 text-[11px] font-semibold flex items-center gap-1"
                            >
                              <CheckCircle2 className="w-3 h-3" /> Mark Complete &amp; Feedback
                            </button>
                          )}

                          {block.status !== 'skipped' && block.status !== 'completed' && (
                            <button
                              type="button"
                              onClick={() => openFeedbackModal(block, false)}
                              className="px-2.5 py-1 rounded-lg bg-[var(--bg-card)] text-[var(--text-muted)] hover:text-[#D97777] text-[11px] flex items-center gap-1"
                            >
                              <SkipForward className="w-3 h-3" /> Skip / Reschedule
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Unscheduled / Deferred Tasks Section (Part 2 & Part 6) */}
              {proposal.unscheduledTasks.length > 0 && (
                <div className="pt-4 border-t border-[var(--border-subtle)] space-y-2.5">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[#E5B567]">
                    Unscheduled / Deferred Activities ({proposal.unscheduledTasks.length}) — Conflict Explanations
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                    {proposal.unscheduledTasks.map((u, idx) => (
                      <div
                        key={idx}
                        className="p-3 rounded-xl bg-[var(--bg-secondary)]/40 border border-[var(--border-subtle)] space-y-1 text-xs"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold">{u.candidate.title}</span>
                          <span className="text-[10px] px-2 py-0.5 rounded bg-[var(--bg-card)] text-[var(--text-muted)]">
                            {u.candidate.estimatedMinutes}m · {u.candidate.priority}
                          </span>
                        </div>
                        <p className="text-[11px] text-[var(--text-secondary)]">
                          <strong>Conflict:</strong> {u.reason}
                        </p>
                        <p className="text-[11px] text-[#9BB9A2]">
                          <strong>Recommendation:</strong> {u.recommendedAction}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* SUB-TAB 2: EXAM READINESS & LECTURE SEQUENCE REPORTS (Part 1.D & 1.E) */}
      {activeSubTab === 'exams' && (
        <div className="space-y-4">
          {!proposal || proposal.examReports.length === 0 ? (
            <div className="py-8 text-center text-xs text-[var(--text-muted)] border border-dashed border-[var(--border-subtle)] rounded-xl">
              Add Study Modules with exam dates and lectures in the Study section, then click Generate Schedule to inspect multi-stage exam preparation reports.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {proposal.examReports.map((rep) => (
                <div
                  key={rep.moduleId}
                  className={`p-4 rounded-xl border space-y-3 ${
                    rep.isAtRisk
                      ? 'bg-[#D97777]/10 border-[#D97777]/40'
                      : 'bg-[var(--bg-secondary)]/50 border-[var(--border-subtle)]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#9BB9A2] flex items-center gap-1">
                        <BookOpen className="w-3 h-3" />
                        Exam Countdown: {rep.daysRemaining} Day(s) Left
                      </span>
                      <h3 className="text-sm font-bold mt-0.5">{rep.moduleName}</h3>
                    </div>
                    <span className="px-2.5 py-1 rounded-lg bg-[var(--bg-card)] text-xs font-mono">
                      {rep.examDate}
                    </span>
                  </div>

                  <div className="grid grid-cols-4 gap-2 text-center text-xs">
                    <div className="p-2 rounded-lg bg-[var(--bg-card)]">
                      <div className="text-[10px] text-[var(--text-muted)]">Total Lec</div>
                      <div className="font-bold">{rep.totalLectures}</div>
                    </div>
                    <div className="p-2 rounded-lg bg-[var(--bg-card)]">
                      <div className="text-[10px] text-[#D97777]">Unstudied</div>
                      <div className="font-bold text-[#D97777]">{rep.unstudiedLectures}</div>
                    </div>
                    <div className="p-2 rounded-lg bg-[var(--bg-card)]">
                      <div className="text-[10px] text-[#E5B567]">Need Rev</div>
                      <div className="font-bold text-[#E5B567]">{rep.needsRevisionLectures}</div>
                    </div>
                    <div className="p-2 rounded-lg bg-[var(--bg-card)]">
                      <div className="text-[10px] text-[#6EBF8B]">Completed</div>
                      <div className="font-bold text-[#6EBF8B]">{rep.completedLectures}</div>
                    </div>
                  </div>

                  <div className="text-xs space-y-1 bg-[var(--bg-card)] p-3 rounded-lg">
                    <div className="flex justify-between">
                      <span className="text-[var(--text-muted)]">Remaining Study + Revision + MCQs:</span>
                      <strong>{Math.round((rep.totalRequiredMinutes / 60) * 10) / 10} hrs ({rep.totalRequiredMinutes}m)</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[var(--text-muted)]">Allocated in Current Plan:</span>
                      <strong className="text-[#9BB9A2]">{rep.scheduledMinutesInPlan}m</strong>
                    </div>
                    <div className="text-[11px] text-[var(--text-secondary)] pt-1">
                      Stages: First-Time Study ({rep.preparationStagesSummary.firstTimeStudyMinutes}m) · Active Recall/MCQs ({rep.preparationStagesSummary.mcqPracticeMinutes}m) · Spaced Revision ({rep.preparationStagesSummary.spacedRevisionMinutes}m)
                    </div>
                  </div>

                  {rep.warningMessage && (
                    <p className="text-xs text-[#D97777] font-medium">
                      ⚠️ {rep.warningMessage}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* SUB-TAB 3: PERSISTENT INTELLIGENT MEMORY & ENERGY PROFILE INSPECTOR (Part 1.C & Part 3) */}
      {activeSubTab === 'memory' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Left: Personal Energy Profile & Sleep/Wake Configuration */}
          <div className="lg:col-span-6 p-4 rounded-xl bg-[var(--bg-secondary)]/50 border border-[var(--border-subtle)] space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#9BB9A2] flex items-center gap-1.5">
                <SlidersHorizontal className="w-3.5 h-3.5" />
                User Profile &amp; Energy Memory
              </h3>
              <span className="text-[11px] text-[var(--text-muted)]">
                Duration Pace Multiplier:{' '}
                <strong className="text-[#6EBF8B]">
                  {persistentMemory.behavioralMemory.durationMultiplier}x
                </strong>
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
              <div>
                <label className="block text-[10px] text-[var(--text-muted)] mb-1">Timezone</label>
                <input
                  type="text"
                  value={persistentMemory.userProfile.timezone}
                  onChange={(e) => updateEnergyProfile({ timezone: e.target.value })}
                  className="w-full px-2.5 py-1.5 rounded-lg bg-[var(--bg-card)] border border-[var(--border-subtle)] text-xs"
                />
              </div>
              <div>
                <label className="block text-[10px] text-[var(--text-muted)] mb-1">Wake-up Time</label>
                <input
                  type="time"
                  value={persistentMemory.userProfile.wakeTime}
                  onChange={(e) => updateEnergyProfile({ wakeTime: e.target.value })}
                  className="w-full px-2.5 py-1.5 rounded-lg bg-[var(--bg-card)] border border-[var(--border-subtle)] text-xs"
                />
              </div>
              <div>
                <label className="block text-[10px] text-[var(--text-muted)] mb-1">Sleep Time</label>
                <input
                  type="time"
                  value={persistentMemory.userProfile.sleepTime}
                  onChange={(e) => updateEnergyProfile({ sleepTime: e.target.value })}
                  className="w-full px-2.5 py-1.5 rounded-lg bg-[var(--bg-card)] border border-[var(--border-subtle)] text-xs"
                />
              </div>
              <div>
                <label className="block text-[10px] text-[var(--text-muted)] mb-1">Morning Energy</label>
                <select
                  value={persistentMemory.userProfile.morningEnergy}
                  onChange={(e) =>
                    updateEnergyProfile({ morningEnergy: e.target.value as EnergyLevel })
                  }
                  className="w-full px-2.5 py-1.5 rounded-lg bg-[var(--bg-card)] border border-[var(--border-subtle)] text-xs"
                >
                  <option value="high">High (Deep Study)</option>
                  <option value="medium">Medium (Review/MCQ)</option>
                  <option value="low">Low (Light Reading)</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] text-[var(--text-muted)] mb-1">Afternoon Energy</label>
                <select
                  value={persistentMemory.userProfile.afternoonEnergy}
                  onChange={(e) =>
                    updateEnergyProfile({ afternoonEnergy: e.target.value as EnergyLevel })
                  }
                  className="w-full px-2.5 py-1.5 rounded-lg bg-[var(--bg-card)] border border-[var(--border-subtle)] text-xs"
                >
                  <option value="high">High (Deep Study)</option>
                  <option value="medium">Medium (Review/MCQ)</option>
                  <option value="low">Low (Light Reading)</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] text-[var(--text-muted)] mb-1">Evening Energy</label>
                <select
                  value={persistentMemory.userProfile.eveningEnergy}
                  onChange={(e) =>
                    updateEnergyProfile({ eveningEnergy: e.target.value as EnergyLevel })
                  }
                  className="w-full px-2.5 py-1.5 rounded-lg bg-[var(--bg-card)] border border-[var(--border-subtle)] text-xs"
                >
                  <option value="high">High (Deep Study)</option>
                  <option value="medium">Medium (Review/MCQ)</option>
                  <option value="low">Low (Light Reading)</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 text-xs pt-2 border-t border-[var(--border-subtle)]">
              <div>
                <label className="block text-[10px] text-[var(--text-muted)] mb-1">
                  Max Daily Study (min)
                </label>
                <input
                  type="number"
                  min={60}
                  max={600}
                  step={30}
                  value={persistentMemory.userProfile.maxDailyStudyMinutes}
                  onChange={(e) =>
                    updateEnergyProfile({ maxDailyStudyMinutes: Number(e.target.value) || 360 })
                  }
                  className="w-full px-2.5 py-1.5 rounded-lg bg-[var(--bg-card)] border border-[var(--border-subtle)] text-xs"
                />
              </div>
              <div>
                <label className="block text-[10px] text-[var(--text-muted)] mb-1">
                  Short Break (min)
                </label>
                <input
                  type="number"
                  min={5}
                  max={30}
                  value={persistentMemory.userProfile.shortBreakMinutes}
                  onChange={(e) =>
                    updateEnergyProfile({ shortBreakMinutes: Number(e.target.value) || 10 })
                  }
                  className="w-full px-2.5 py-1.5 rounded-lg bg-[var(--bg-card)] border border-[var(--border-subtle)] text-xs"
                />
              </div>
              <div>
                <label className="block text-[10px] text-[var(--text-muted)] mb-1">
                  Long Break (min)
                </label>
                <input
                  type="number"
                  min={15}
                  max={60}
                  value={persistentMemory.userProfile.longBreakMinutes}
                  onChange={(e) =>
                    updateEnergyProfile({ longBreakMinutes: Number(e.target.value) || 25 })
                  }
                  className="w-full px-2.5 py-1.5 rounded-lg bg-[var(--bg-card)] border border-[var(--border-subtle)] text-xs"
                />
              </div>
            </div>
          </div>

          {/* Right: Learned Constraints & Behavioral Memory Rules (Inspect, Edit, Add, Delete) */}
          <div className="lg:col-span-6 p-4 rounded-xl bg-[var(--bg-secondary)]/50 border border-[var(--border-subtle)] space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#9BB9A2] flex items-center gap-1.5">
                <Brain className="w-3.5 h-3.5" />
                Learned Availability &amp; Behavioral Rules ({persistentMemory.behavioralMemory.learnedRules.length})
              </h3>
              <span className="text-[10px] text-[var(--text-muted)]">
                Missed sessions tracked: {persistentMemory.behavioralMemory.missedSessionsCount}
              </span>
            </div>

            <form onSubmit={handleAddRule} className="grid grid-cols-1 sm:grid-cols-12 gap-2 text-xs">
              <input
                type="text"
                value={newRuleText}
                onChange={(e) => setNewRuleText(e.target.value)}
                placeholder="e.g. University Lectures (Sun-Thu)"
                className="sm:col-span-5 px-2.5 py-1.5 rounded-lg bg-[var(--bg-card)] border border-[var(--border-subtle)]"
              />
              <input
                type="time"
                value={newRuleStart}
                onChange={(e) => setNewRuleStart(e.target.value)}
                className="sm:col-span-2 px-2 py-1.5 rounded-lg bg-[var(--bg-card)] border border-[var(--border-subtle)]"
              />
              <input
                type="time"
                value={newRuleEnd}
                onChange={(e) => setNewRuleEnd(e.target.value)}
                className="sm:col-span-2 px-2 py-1.5 rounded-lg bg-[var(--bg-card)] border border-[var(--border-subtle)]"
              />
              <select
                value={newRuleType}
                onChange={(e) =>
                  setNewRuleType(e.target.value as 'university_schedule' | 'blocked_window')
                }
                className="sm:col-span-2 px-2 py-1.5 rounded-lg bg-[var(--bg-card)] border border-[var(--border-subtle)]"
              >
                <option value="university_schedule">University</option>
                <option value="blocked_window">Blocked</option>
              </select>
              <button
                type="submit"
                className="sm:col-span-1 px-2.5 py-1.5 rounded-lg bg-[#9BB9A2] text-[#0F1613] font-bold flex items-center justify-center"
                title="Add Rule"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </form>

            {persistentMemory.behavioralMemory.learnedRules.length === 0 ? (
              <div className="py-6 text-center text-xs text-[var(--text-muted)] border border-dashed border-[var(--border-subtle)] rounded-xl">
                No custom rules stored yet. Add your university lecture hours above or tell Spoon Feeder AI: &ldquo;I cannot study from 9 AM to 1 PM because I have university lectures.&rdquo;
              </div>
            ) : (
              <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                {persistentMemory.behavioralMemory.learnedRules.map((rule) => (
                  <div
                    key={rule.id}
                    className="p-2.5 rounded-lg bg-[var(--bg-card)] border border-[var(--border-subtle)] flex items-center justify-between gap-2 text-xs"
                  >
                    <div className="min-w-0">
                      <div className="font-semibold truncate">{rule.ruleText}</div>
                      <div className="text-[10px] text-[var(--text-muted)]">
                        {rule.ruleType} {rule.startTime && rule.endTime ? `· ${rule.startTime}–${rule.endTime}` : ''} ·{' '}
                        {rule.confirmed ? (
                          <span className="text-[#6EBF8B]">Confirmed Permanent</span>
                        ) : (
                          <span className="text-[#E5B567]">Awaiting Confirmation</span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {!rule.confirmed && (
                        <button
                          type="button"
                          onClick={() => confirmLearnedRule(rule.id)}
                          className="p-1.5 rounded bg-[#6EBF8B]/20 text-[#6EBF8B]"
                          title="Confirm Rule"
                        >
                          <Check className="w-3 h-3" />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => deleteLearnedRule(rule.id)}
                        className="p-1.5 rounded text-[var(--text-muted)] hover:text-[#D97777]"
                        title="Delete Rule"
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
      )}

      {/* POST-SESSION FEEDBACK MODAL (Part 7: Learning from User Feedback) */}
      {feedbackBlock && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-2xl max-w-md w-full p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold flex items-center gap-1.5">
                <MessageSquare className="w-4 h-4 text-[#9BB9A2]" />
                Activity Feedback &amp; Memory Calibration
              </h3>
              <button
                type="button"
                onClick={() => setFeedbackBlock(null)}
                className="p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-[var(--text-secondary)]">
              Activity: <strong>{feedbackBlock.title}</strong> ({feedbackBlock.startTime}–{feedbackBlock.endTime}, Est. {feedbackBlock.durationMinutes}m)
            </p>

            <form onSubmit={handleSubmitFeedback} className="space-y-3 text-xs">
              <div>
                <label className="block text-[11px] font-semibold mb-1">
                  1. Did you complete this activity?
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setFbCompleted(true)}
                    className={`py-2 rounded-xl font-semibold border ${
                      fbCompleted
                        ? 'bg-[#6EBF8B]/20 border-[#6EBF8B] text-[#6EBF8B]'
                        : 'bg-[var(--bg-secondary)] border-[var(--border-subtle)] text-[var(--text-secondary)]'
                    }`}
                  >
                    Yes, Completed
                  </button>
                  <button
                    type="button"
                    onClick={() => setFbCompleted(false)}
                    className={`py-2 rounded-xl font-semibold border ${
                      !fbCompleted
                        ? 'bg-[#D97777]/20 border-[#D97777] text-[#D97777]'
                        : 'bg-[var(--bg-secondary)] border-[var(--border-subtle)] text-[var(--text-secondary)]'
                    }`}
                  >
                    No, Missed / Skipped
                  </button>
                </div>
              </div>

              {fbCompleted && (
                <div>
                  <label className="block text-[11px] font-semibold mb-1">
                    2. How long did it actually take (minutes)?
                  </label>
                  <input
                    type="number"
                    min={5}
                    max={300}
                    value={fbActualMinutes}
                    onChange={(e) => setFbActualMinutes(Number(e.target.value) || 45)}
                    className="w-full px-3 py-2 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-subtle)]"
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-semibold mb-1">
                    3. Difficulty Accuracy
                  </label>
                  <select
                    value={fbDifficulty}
                    onChange={(e) =>
                      setFbDifficulty(e.target.value as 'too_easy' | 'accurate' | 'too_hard')
                    }
                    className="w-full px-2.5 py-2 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-subtle)]"
                  >
                    <option value="too_easy">Easier than expected</option>
                    <option value="accurate">Accurate difficulty</option>
                    <option value="too_hard">Harder than expected</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold mb-1">
                    4. Your Energy Level
                  </label>
                  <select
                    value={fbEnergy}
                    onChange={(e) => setFbEnergy(e.target.value as EnergyLevel)}
                    className="w-full px-2.5 py-2 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-subtle)]"
                  >
                    <option value="high">High Energy</option>
                    <option value="medium">Medium Energy</option>
                    <option value="low">Low Energy</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-between pt-1">
                <span>5. Was this time slot ({feedbackBlock.startTime}) convenient?</span>
                <input
                  type="checkbox"
                  checked={fbConvenient}
                  onChange={(e) => setFbConvenient(e.target.checked)}
                  className="accent-[#9BB9A2]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setFeedbackBlock(null)}
                  className="px-3.5 py-2 rounded-xl bg-[var(--bg-secondary)] text-[var(--text-secondary)]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-[#9BB9A2] text-[#0F1613] font-bold"
                >
                  Save Feedback &amp; Calibrate AI
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
