import React, { useState } from 'react';
import { Target, Flame, Award, Plus, CheckCircle2, Coins } from 'lucide-react';
import { useLifeOS } from '../context/LifeOSContext.tsx';
import { GoalHabitRecord } from '../types.ts';

interface GoalsRankViewProps {
  mode: 'goals' | 'rank';
}

export const GoalsRankView: React.FC<GoalsRankViewProps> = ({ mode }) => {
  const {
    profile,
    goalsHabits,
    createGoalHabit,
    toggleHabitOrGoalCompletion,
    redeemReward,
  } = useLifeOS();

  const [recordType, setRecordType] = useState<GoalHabitRecord['recordType']>(
    mode === 'rank' ? 'reward' : 'habit'
  );
  const [title, setTitle] = useState('');
  const [whyReason, setWhyReason] = useState('');
  const [frequency, setFrequency] = useState<GoalHabitRecord['frequency']>('daily');
  const [xpReward, setXpReward] = useState(30);
  const [coinVal, setCoinVal] = useState(20);
  const [nextSmallAction, setNextSmallAction] = useState('');

  const handleAddRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    await createGoalHabit({
      recordType,
      title,
      whyReason,
      status: 'active',
      frequency,
      progressPercent: 0,
      streakCount: 0,
      completedToday: false,
      xpReward: Number(xpReward) || 25,
      coinCostOrReward: Number(coinVal) || 15,
      nextSmallAction: nextSmallAction || undefined,
    });
    setTitle('');
    setWhyReason('');
    setNextSmallAction('');
  };

  const goals = goalsHabits.filter((g) => g.recordType === 'goal');
  const habits = goalsHabits.filter((g) => g.recordType === 'habit');
  const quests = goalsHabits.filter((g) => g.recordType === 'quest');
  const rewards = goalsHabits.filter((g) => g.recordType === 'reward');

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">
            {mode === 'goals'
              ? 'Long-Term Goals, Projects & Non-Shaming Habit Tracker'
              : 'Rank, Weekly Quests & Rest-Respecting Rewards'}
          </h1>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {mode === 'goals'
              ? 'Connect daily habits and next small actions to long-term milestones without punitive streak shaming.'
              : 'Gamification rewards consistency, learning effort, and healthy recovery — never meaningless task volume.'}
          </p>
        </div>

        <div className="flex items-center gap-4 shrink-0">
          <div className="text-right">
            <div className="text-xs text-slate-500">Current Rank</div>
            <div className="text-sm font-bold font-mono tabular-nums text-slate-900 dark:text-slate-100">
              Level {profile?.level || 2} · {profile?.xp || 340} XP
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs text-slate-500">Available Coins</div>
            <div className="text-sm font-bold font-mono tabular-nums text-amber-600 dark:text-amber-400">
              {profile?.coins || 120} Coins
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left 7 Columns: Habits, Goals, Quests & Rewards */}
        <div className="lg:col-span-7 space-y-6">
          {/* Habits Section */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6">
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2 mb-4">
              <Flame className="w-4 h-4 text-amber-500" />
              Daily & Weekly Habits
            </h2>

            {habits.length === 0 ? (
              <p className="text-xs text-slate-500 py-4">No habits configured yet.</p>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
                {habits.map((h) => (
                  <div key={h.id} className="py-3 flex items-center justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <button
                        onClick={() => toggleHabitOrGoalCompletion(h)}
                        className={`mt-0.5 w-5 h-5 rounded-md border flex items-center justify-center transition-colors shrink-0 ${
                          h.completedToday
                            ? 'bg-emerald-600 border-emerald-600 text-white'
                            : 'border-slate-300 dark:border-slate-700'
                        }`}
                      >
                        {h.completedToday && <CheckCircle2 className="w-3.5 h-3.5" />}
                      </button>
                      <div>
                        <div className="text-sm font-medium text-slate-900 dark:text-slate-100">
                          {h.title}
                        </div>
                        <div className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                          <span className="capitalize">{h.frequency}</span>
                          <span aria-hidden="true"> · </span>
                          <span className="font-mono tabular-nums">Streak: {h.streakCount}d</span>
                          <span aria-hidden="true"> · </span>
                          <span className="font-mono tabular-nums">+{h.xpReward} XP / +{h.coinCostOrReward} Coins</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Long-Term Goals & Quests */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6">
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2 mb-4">
              <Target className="w-4 h-4 text-emerald-500" />
              Long-Term Goals & Active Quests
            </h2>

            <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
              {[...goals, ...quests].map((g) => (
                <div key={g.id} className="py-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                      {g.title}
                    </div>
                    <button
                      onClick={() => toggleHabitOrGoalCompletion(g)}
                      className="px-2.5 py-1 rounded border border-slate-200 dark:border-slate-800 text-xs font-mono hover:bg-slate-50 dark:hover:bg-slate-800"
                    >
                      +20% Milestone
                    </button>
                  </div>
                  {g.whyReason && (
                    <p className="text-xs text-slate-500 dark:text-slate-400">Why: {g.whyReason}</p>
                  )}
                  <div className="h-2 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                    <div
                      className="h-full bg-emerald-500"
                      style={{ width: `${g.progressPercent}%` }}
                    />
                  </div>
                  {g.nextSmallAction && (
                    <div className="text-xs text-emerald-600 dark:text-emerald-400">
                      Recommended Next Small Action: {g.nextSmallAction}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* User-Configured Rewards Store */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6">
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2 mb-4">
              <Award className="w-4 h-4 text-amber-500" />
              User-Configured Rewards & Recovery Store
            </h2>

            <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
              {rewards.map((rw) => {
                const canAfford = (profile?.coins || 0) >= rw.coinCostOrReward;
                return (
                  <div key={rw.id} className="py-3 flex items-center justify-between gap-4">
                    <div>
                      <div className="text-sm font-medium text-slate-900 dark:text-slate-100">
                        {rw.title}
                      </div>
                      {rw.whyReason && (
                        <div className="text-xs text-slate-500">{rw.whyReason}</div>
                      )}
                    </div>
                    <button
                      onClick={() => redeemReward(rw)}
                      disabled={!canAfford}
                      className="px-3 py-1.5 rounded-lg bg-amber-500/15 text-amber-700 dark:text-amber-300 text-xs font-mono font-semibold hover:bg-amber-500/25 disabled:opacity-40 flex items-center gap-1.5 whitespace-nowrap shrink-0"
                    >
                      <Coins className="w-3.5 h-3.5" /> Redeem ({rw.coinCostOrReward} Coins)
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right 5 Columns: Create Goal, Habit, Quest or Reward */}
        <div className="lg:col-span-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 h-fit">
          <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100 mb-4">
            Create Goal, Habit, Quest or Custom Reward
          </h2>

          <form onSubmit={handleAddRecord} className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <select
                value={recordType}
                onChange={(e) => setRecordType(e.target.value as GoalHabitRecord['recordType'])}
                className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-xs text-slate-900 dark:text-slate-100"
              >
                <option value="habit">Habit</option>
                <option value="goal">Long-Term Goal</option>
                <option value="quest">Weekly Quest</option>
                <option value="reward">Custom Coin Reward</option>
              </select>
              <select
                value={frequency}
                onChange={(e) => setFrequency(e.target.value as GoalHabitRecord['frequency'])}
                className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-xs text-slate-900 dark:text-slate-100"
              >
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="once">Milestone / One-Time</option>
              </select>
            </div>

            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Title (e.g., 30m Evening Walk, Cinema Night Reward)"
              className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-xs text-slate-900 dark:text-slate-100"
            />

            <input
              type="text"
              value={whyReason}
              onChange={(e) => setWhyReason(e.target.value)}
              placeholder="Why this matters..."
              className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-xs text-slate-900 dark:text-slate-100"
            />

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs text-slate-500 mb-1">XP Earned</label>
                <input
                  type="number"
                  value={xpReward}
                  onChange={(e) => setXpReward(Number(e.target.value))}
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-3 py-1.5 text-xs font-mono"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">Coin Reward / Cost</label>
                <input
                  type="number"
                  value={coinVal}
                  onChange={(e) => setCoinVal(Number(e.target.value))}
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-3 py-1.5 text-xs font-mono"
                />
              </div>
            </div>

            {recordType === 'goal' && (
              <input
                type="text"
                value={nextSmallAction}
                onChange={(e) => setNextSmallAction(e.target.value)}
                placeholder="Next small actionable step..."
                className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-xs text-slate-900 dark:text-slate-100"
              />
            )}

            <button
              type="submit"
              className="w-full py-2 rounded-lg bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-xs font-semibold flex items-center justify-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" /> Add to System
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
