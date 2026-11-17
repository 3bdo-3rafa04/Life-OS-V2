import React, { useState } from 'react';
import { useLifeOS } from '../context/LifeOSContext';
import { PixelAvatarSprite } from './PixelStudyRoomCanvas';
import { Plus, Trash2, Check, Trophy, Flame, Coins, Gift, Sparkles, Gamepad2 } from 'lucide-react';

export const GoalsRankView: React.FC = () => {
  const {
    profile,
    goalsHabits,
    tasks,
    rpgState,
    rpgRankEval,
    rpgLevelInfo,
    openRpgWorld,
    createGoalHabit,
    toggleHabitOrGoalCompletion,
    redeemReward,
    deleteGoalHabit,
  } = useLifeOS();

  const [subTab, setSubTab] = useState<'Goals' | 'Projects' | 'Habits'>('Goals');

  // Form states
  const [showAddGoalModal, setShowAddGoalModal] = useState(false);
  const [goalTitle, setGoalTitle] = useState('');
  const [goalWhy, setGoalWhy] = useState('Study');
  const [goalProgress, setGoalProgress] = useState('0');
  const [goalXp, setGoalXp] = useState('100');

  const [showAddHabitModal, setShowAddHabitModal] = useState(false);
  const [habitTitle, setHabitTitle] = useState('');
  const [habitWhy, setHabitWhy] = useState('Health');
  const [habitFrequency, setHabitFrequency] = useState<'daily' | 'weekly'>('daily');
  const [habitXp, setHabitXp] = useState('25');

  const [showAddQuestModal, setShowAddQuestModal] = useState(false);
  const [questTitle, setQuestTitle] = useState('');
  const [questWhy, setQuestWhy] = useState('Productivity');
  const [questXp, setQuestXp] = useState('50');

  const [showAddRewardModal, setShowAddRewardModal] = useState(false);
  const [rewardTitle, setRewardTitle] = useState('');
  const [rewardCost, setRewardCost] = useState('200');

  const goals = goalsHabits.filter((g) => g.recordType === 'goal');
  const habits = goalsHabits.filter((g) => g.recordType === 'habit');
  const quests = goalsHabits.filter((g) => g.recordType === 'quest');
  const rewards = goalsHabits.filter((g) => g.recordType === 'reward');

  const level = rpgLevelInfo.level;
  const xp = profile?.xp ?? 0;
  const coins = profile?.coins ?? 0;
  const streakDays = profile?.streakDays ?? 0;
  const nextLevelXp = rpgLevelInfo.xpRequiredForNextLevel;
  const currentLevelProgress = rpgLevelInfo.progressPercent;

  const handleCreateGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!goalTitle.trim()) return;
    await createGoalHabit({
      title: goalTitle.trim(),
      recordType: 'goal',
      whyReason: goalWhy,
      status: 'active',
      frequency: 'once',
      progressPercent: Math.min(100, Math.max(0, Number(goalProgress) || 0)),
      streakCount: 0,
      xpReward: Math.max(10, Number(goalXp) || 100),
      coinCostOrReward: 25,
      completedToday: false,
    });
    setGoalTitle('');
    setGoalProgress('0');
    setShowAddGoalModal(false);
  };

  const handleCreateHabit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!habitTitle.trim()) return;
    await createGoalHabit({
      title: habitTitle.trim(),
      recordType: 'habit',
      whyReason: habitWhy,
      status: 'active',
      frequency: habitFrequency,
      progressPercent: 0,
      streakCount: 0,
      xpReward: Math.max(5, Number(habitXp) || 25),
      coinCostOrReward: 10,
      completedToday: false,
    });
    setHabitTitle('');
    setShowAddHabitModal(false);
  };

  const handleCreateQuest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!questTitle.trim()) return;
    await createGoalHabit({
      title: questTitle.trim(),
      recordType: 'quest',
      whyReason: questWhy,
      status: 'active',
      frequency: 'daily',
      progressPercent: 0,
      streakCount: 0,
      xpReward: Math.max(10, Number(questXp) || 50),
      coinCostOrReward: 15,
      completedToday: false,
    });
    setQuestTitle('');
    setShowAddQuestModal(false);
  };

  const handleCreateReward = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rewardTitle.trim()) return;
    await createGoalHabit({
      title: rewardTitle.trim(),
      recordType: 'reward',
      whyReason: 'Guilt-free reward',
      status: 'active',
      frequency: 'once',
      progressPercent: 0,
      streakCount: 0,
      xpReward: 0,
      coinCostOrReward: Math.max(10, Number(rewardCost) || 200),
      completedToday: false,
    });
    setRewardTitle('');
    setShowAddRewardModal(false);
  };

  const completedGoalsCount = goals.filter(
    (g) => g.progressPercent >= 100 || g.status === 'completed' || g.completedToday
  ).length;

  return (
    <div className="space-y-6 pb-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-widest text-[var(--text-muted)]">
            GOALS · PROJECTS · HABITS · RANK
          </p>
          <h1 className="text-2xl font-bold tracking-tight mt-0.5">Direction &amp; momentum</h1>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-xl p-1">
            {(['Goals', 'Projects', 'Habits'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setSubTab(t)}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  subTab === t
                    ? 'bg-[var(--bg-secondary)] text-[var(--text-primary)] font-semibold'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
          <button
            onClick={() => {
              if (subTab === 'Habits') setShowAddHabitModal(true);
              else setShowAddGoalModal(true);
            }}
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-[var(--accent)] text-[#0F1613] hover:opacity-90 transition-opacity flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            {subTab === 'Habits' ? 'New habit' : 'New goal'}
          </button>
        </div>
      </div>

      {subTab === 'Goals' && (
        <div className="space-y-6">
          {/* Active Goals Grid */}
          <div className="bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-2xl p-6">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-base font-bold">Active goals ({goals.length})</h2>
                <p className="text-xs text-[var(--text-muted)] mt-0.5">
                  {completedGoalsCount} completed · linked to tasks and milestones
                </p>
              </div>
              <button
                onClick={() => setShowAddGoalModal(true)}
                className="px-3 py-1.5 rounded-lg bg-[var(--bg-secondary)] hover:bg-[var(--bg-hover)] text-xs font-medium text-[var(--text-primary)]"
              >
                + Add goal
              </button>
            </div>

            {goals.length === 0 ? (
              <div className="py-10 text-center border border-dashed border-[var(--border-subtle)] rounded-xl">
                <p className="text-sm font-semibold text-[var(--text-secondary)]">No goals created yet</p>
                <p className="text-xs text-[var(--text-muted)] mt-1">
                  Create your first study, health, finance, or life goal to track milestones and earn XP.
                </p>
                <button
                  onClick={() => setShowAddGoalModal(true)}
                  className="mt-4 px-4 py-2 rounded-xl text-xs font-semibold bg-[var(--accent)] text-[#0F1613]"
                >
                  + Create first goal
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {goals.map((g) => {
                  const pct = Math.min(100, Math.max(0, g.progressPercent));
                  const linkedTasksCount = tasks.filter(
                    (t) =>
                      t.linkedGoalId === g.id ||
                      t.category.toLowerCase() === (g.whyReason || '').toLowerCase()
                  ).length;

                  return (
                    <div
                      key={g.id}
                      className="bg-[var(--bg-secondary)]/50 border border-[var(--border-subtle)] rounded-xl p-5 flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="px-2.5 py-0.5 rounded-md text-[10px] font-semibold bg-[#9BB9A2]/15 text-[#9BB9A2]">
                            {g.whyReason || 'Goal'}
                          </span>
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] text-[var(--text-muted)]">+{g.xpReward} XP</span>
                            <button
                              onClick={() => deleteGoalHabit(g.id)}
                              className="text-[var(--text-muted)] hover:text-[#D97777]"
                              title="Delete goal"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                        <h3 className="text-base font-bold mb-4">{g.title}</h3>

                        <div className="flex items-center justify-between text-xs mb-1.5">
                          <span className="text-[var(--text-muted)]">Progress</span>
                          <span className="font-bold text-[#9BB9A2]">{pct}%</span>
                        </div>
                        <div className="w-full h-1.5 rounded-full bg-[var(--bg-card)] overflow-hidden mb-4">
                          <div
                            className="h-full rounded-full bg-[#9BB9A2] transition-all"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>

                      <div className="pt-3 border-t border-[var(--border-subtle)] flex items-center justify-between text-[11px] text-[var(--text-muted)]">
                        <span>{linkedTasksCount} related tasks</span>
                        <button
                          onClick={() => toggleHabitOrGoalCompletion(g)}
                          className={`px-2.5 py-1 rounded-lg font-semibold transition-colors ${
                            g.completedToday || g.status === 'completed'
                              ? 'bg-[#6EBF8B]/20 text-[#6EBF8B]'
                              : 'bg-[var(--bg-card)] text-[var(--text-primary)] hover:bg-[var(--bg-hover)]'
                          }`}
                        >
                          {g.completedToday || g.status === 'completed' ? 'Completed ✓' : 'Advance'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Rank & Gamification Row */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* Level & Pixel-Art RPG World Card (Clickable Rank Component) */}
            <div
              onClick={() => openRpgWorld('study_room')}
              className="lg:col-span-4 bg-[#172A32] border-2 border-[#D7B779]/50 hover:border-[#D7B779] rounded-2xl p-6 flex flex-col justify-between cursor-pointer transition-all group text-[#E8DDC8]"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-semibold text-[#D7B779] uppercase tracking-wider flex items-center gap-1.5">
                    <Gamepad2 className="w-4 h-4" />
                    Rank &amp; RPG World
                  </span>
                  <span
                    className="px-2.5 py-0.5 rounded-md text-[11px] font-bold border"
                    style={{
                      backgroundColor: `${rpgRankEval.badgeColor}20`,
                      color: rpgRankEval.badgeColor,
                      borderColor: `${rpgRankEval.badgeColor}60`,
                    }}
                  >
                    {rpgRankEval.rank}
                  </span>
                </div>

                <div className="flex items-center gap-3.5 mb-3">
                  <div className="w-14 h-14 rounded-xl bg-[#0F1D23] border-2 border-[#D7B779] flex items-center justify-center shrink-0">
                    <PixelAvatarSprite avatar={rpgState.avatar} size={48} />
                  </div>
                  <div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl font-bold text-[#E8DDC8]">Level {level}</span>
                      <span className="text-xs font-mono text-[#D7B779]">
                        {xp.toLocaleString()} XP
                      </span>
                    </div>
                    <p className="text-[11px] text-[#E8DDC8]/75 mt-0.5">
                      {rpgRankEval.nextRank
                        ? `Next Rank: ${rpgRankEval.nextRank} (${rpgRankEval.progressPercent}%)`
                        : 'Highest Rank Achieved!'}
                    </p>
                  </div>
                </div>

                <div className="w-full h-2.5 rounded-md bg-[#0F1D23] border border-[#294C45] overflow-hidden mb-1.5">
                  <div
                    className="h-full bg-gradient-to-r from-[#294C45] via-[#6EBF8B] to-[#D7B779] transition-all"
                    style={{ width: `${currentLevelProgress}%` }}
                  />
                </div>
                <p className="text-[11px] text-[#E8DDC8]/70 font-mono">
                  {rpgLevelInfo.currentLevelXp} / {nextLevelXp} XP to Level {level + 1}
                </p>
              </div>

              <div className="space-y-3 pt-4 mt-4 border-t border-[#294C45]">
                <div className="grid grid-cols-3 gap-2">
                  <div className="p-2.5 rounded-xl bg-[#0F1D23]/80 border border-[#294C45] text-center">
                    <div className="flex items-center justify-center gap-1 text-[#B97862] font-bold text-sm font-mono">
                      <Flame className="w-3.5 h-3.5" />
                      {streakDays}d
                    </div>
                    <div className="text-[10px] text-[#E8DDC8]/65 mt-0.5">Streak</div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-[#0F1D23]/80 border border-[#294C45] text-center">
                    <div className="flex items-center justify-center gap-1 text-[#D7B779] font-bold text-sm font-mono">
                      <Coins className="w-3.5 h-3.5" />
                      {coins}
                    </div>
                    <div className="text-[10px] text-[#E8DDC8]/65 mt-0.5">Life Coins</div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-[#0F1D23]/80 border border-[#294C45] text-center">
                    <div className="flex items-center justify-center gap-1 text-[#6EBF8B] font-bold text-sm font-mono">
                      <Trophy className="w-3.5 h-3.5" />
                      {rpgState.ownedItemIds.length}
                    </div>
                    <div className="text-[10px] text-[#E8DDC8]/65 mt-0.5">RPG Items</div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    openRpgWorld('study_room');
                  }}
                  className="w-full py-2.5 px-4 rounded-xl bg-[#D7B779] text-[#172A32] font-bold text-xs flex items-center justify-center gap-2 hover:opacity-95 transition-opacity"
                >
                  <Gamepad2 className="w-4 h-4" />
                  Enter Pixel-Art RPG World &amp; Study Room
                </button>
              </div>
            </div>

            {/* Daily Quests */}
            <div className="lg:col-span-4 bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-2xl p-6 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-base font-bold flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-[#E5B567]" />
                      Daily quests
                    </h3>
                    <p className="text-xs text-[var(--text-muted)]">Bonus XP for high-leverage actions</p>
                  </div>
                  <button
                    onClick={() => setShowAddQuestModal(true)}
                    className="px-2.5 py-1 rounded-lg bg-[var(--bg-secondary)] text-xs font-medium hover:bg-[var(--bg-hover)]"
                  >
                    + Quest
                  </button>
                </div>

                {quests.length === 0 ? (
                  <div className="py-8 text-center text-xs text-[var(--text-muted)] border border-dashed border-[var(--border-subtle)] rounded-xl">
                    No quests active. Add a daily quest to earn bonus XP and coins.
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {quests.map((q) => (
                      <div
                        key={q.id}
                        className="flex items-center justify-between p-3 rounded-xl bg-[var(--bg-secondary)]/40 border border-[var(--border-subtle)]"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <button
                            onClick={() => toggleHabitOrGoalCompletion(q)}
                            className={`w-5 h-5 rounded-md flex items-center justify-center border transition-colors ${
                              q.completedToday
                                ? 'bg-[#6EBF8B] border-[#6EBF8B] text-[#0F1613]'
                                : 'border-[var(--text-muted)] hover:border-[var(--accent)]'
                            }`}
                          >
                            {q.completedToday && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                          </button>
                          <div className="min-w-0">
                            <p
                              className={`text-xs font-medium truncate ${
                                q.completedToday ? 'line-through text-[var(--text-muted)]' : ''
                              }`}
                            >
                              {q.title}
                            </p>
                            <span className="text-[10px] text-[#9BB9A2]">+{q.xpReward} XP</span>
                          </div>
                        </div>
                        <button
                          onClick={() => deleteGoalHabit(q.id)}
                          className="text-[var(--text-muted)] hover:text-[#D97777] p-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Reward Shop */}
            <div className="lg:col-span-4 bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-2xl p-6 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-base font-bold flex items-center gap-2">
                      <Gift className="w-4 h-4 text-[#9BB9A2]" />
                      Reward shop
                    </h3>
                    <p className="text-xs text-[var(--text-muted)]">{coins} coins available to spend</p>
                  </div>
                  <button
                    onClick={() => setShowAddRewardModal(true)}
                    className="px-2.5 py-1 rounded-lg bg-[var(--bg-secondary)] text-xs font-medium hover:bg-[var(--bg-hover)]"
                  >
                    + Reward
                  </button>
                </div>

                {rewards.length === 0 ? (
                  <div className="py-8 text-center text-xs text-[var(--text-muted)] border border-dashed border-[var(--border-subtle)] rounded-xl">
                    No custom rewards defined yet. Add guilt-free rewards to redeem with your earned coins.
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {rewards.map((r) => {
                      const canAfford = coins >= r.coinCostOrReward;
                      return (
                        <div
                          key={r.id}
                          className="flex items-center justify-between p-3 rounded-xl bg-[var(--bg-secondary)]/40 border border-[var(--border-subtle)]"
                        >
                          <div className="min-w-0 pr-2">
                            <p className="text-xs font-medium truncate">{r.title}</p>
                            <span className="text-[10px] text-[#E5B567]">
                              {r.coinCostOrReward} coins · Redeemed {r.streakCount}x
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              onClick={() => redeemReward(r)}
                              disabled={!canAfford}
                              className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all ${
                                canAfford
                                  ? 'bg-[#9BB9A2] text-[#0F1613] hover:opacity-90'
                                  : 'bg-[var(--bg-secondary)] text-[var(--text-muted)] opacity-50 cursor-not-allowed'
                              }`}
                            >
                              Redeem
                            </button>
                            <button
                              onClick={() => deleteGoalHabit(r.id)}
                              className="text-[var(--text-muted)] hover:text-[#D97777] p-1"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
              <div className="pt-3 mt-3 border-t border-[var(--border-subtle)]">
                <button
                  type="button"
                  onClick={() => openRpgWorld('shop')}
                  className="w-full py-2 px-3 rounded-xl bg-[#172A32] text-[#D7B779] border border-[#D7B779]/40 text-xs font-semibold hover:bg-[#294C45] transition-colors"
                >
                  Browse 30+ Pixel-Art Study Room Items →
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {subTab === 'Projects' && (
        <div className="bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-2xl p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-base font-bold">Projects &amp; Category Milestones</h2>
              <p className="text-xs text-[var(--text-muted)]">
                Grouped automatically from your live goals and tasks
              </p>
            </div>
          </div>

          {goals.length === 0 && tasks.length === 0 ? (
            <div className="py-12 text-center text-xs text-[var(--text-muted)] border border-dashed border-[var(--border-subtle)] rounded-xl">
              Add goals or tasks to see project breakdowns and progress bars across categories.
            </div>
          ) : (
            <div className="space-y-4">
              {Array.from(
                new Set([
                  ...goals.map((g) => g.whyReason || 'General'),
                  ...tasks.map((t) => t.category),
                ])
              ).map((category) => {
                const catTasks = tasks.filter(
                  (t) => t.category.toLowerCase() === category.toLowerCase()
                );
                const catDone = catTasks.filter((t) => t.status === 'completed').length;
                const catGoals = goals.filter(
                  (g) => (g.whyReason || 'General').toLowerCase() === category.toLowerCase()
                );
                const pct =
                  catTasks.length > 0
                    ? Math.round((catDone / catTasks.length) * 100)
                    : catGoals.length > 0
                    ? Math.round(
                        catGoals.reduce((acc, g) => acc + Math.min(100, g.progressPercent), 0) /
                          catGoals.length
                      )
                    : 0;

                return (
                  <div
                    key={category}
                    className="p-4 rounded-xl bg-[var(--bg-secondary)]/40 border border-[var(--border-subtle)]"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-bold capitalize">{category}</span>
                        <span className="text-xs text-[var(--text-muted)]">
                          {catGoals.length} goals · {catDone}/{catTasks.length} tasks done
                        </span>
                      </div>
                      <span className="text-xs font-bold text-[#9BB9A2]">{pct}%</span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-[var(--bg-card)] overflow-hidden">
                      <div
                        className="h-full rounded-full bg-[#9BB9A2] transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {subTab === 'Habits' && (
        <div className="bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-2xl p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-base font-bold">Habit tracker ({habits.length})</h2>
              <p className="text-xs text-[var(--text-muted)]">
                Daily &amp; weekly rituals · checking off a habit awards XP and increments your streak
              </p>
            </div>
            <button
              onClick={() => setShowAddHabitModal(true)}
              className="px-3.5 py-1.5 rounded-xl bg-[var(--accent)] text-[#0F1613] text-xs font-semibold"
            >
              + New habit
            </button>
          </div>

          {habits.length === 0 ? (
            <div className="py-12 text-center border border-dashed border-[var(--border-subtle)] rounded-xl">
              <p className="text-sm font-semibold text-[var(--text-secondary)]">No habits tracked yet</p>
              <p className="text-xs text-[var(--text-muted)] mt-1">
                Create daily or weekly habits to build consistent streaks and earn XP.
              </p>
              <button
                onClick={() => setShowAddHabitModal(true)}
                className="mt-4 px-4 py-2 rounded-xl text-xs font-semibold bg-[var(--accent)] text-[#0F1613]"
              >
                + Add first habit
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {habits.map((h) => (
                <div
                  key={h.id}
                  className="flex items-center justify-between p-4 rounded-xl bg-[var(--bg-secondary)]/40 border border-[var(--border-subtle)]"
                >
                  <div className="flex items-center gap-3.5">
                    <button
                      onClick={() => toggleHabitOrGoalCompletion(h)}
                      className={`w-6 h-6 rounded-lg flex items-center justify-center border transition-all ${
                        h.completedToday
                          ? 'bg-[#6EBF8B] border-[#6EBF8B] text-[#0F1613]'
                          : 'border-[var(--text-muted)] hover:border-[var(--accent)]'
                      }`}
                    >
                      {h.completedToday && <Check className="w-4 h-4 stroke-[3]" />}
                    </button>
                    <div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-sm font-semibold ${
                            h.completedToday ? 'line-through text-[var(--text-muted)]' : ''
                          }`}
                        >
                          {h.title}
                        </span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-[var(--bg-card)] text-[var(--text-muted)]">
                          {h.whyReason || 'Habit'} · {h.frequency}
                        </span>
                      </div>
                      <p className="text-xs text-[var(--text-muted)] mt-0.5">
                        Streak: <strong className="text-[#E5B567]">{h.streakCount}d</strong> · +{h.xpReward} XP
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => deleteGoalHabit(h.id)}
                    className="text-[var(--text-muted)] hover:text-[#D97777] p-1.5"
                    title="Delete habit"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Add Goal Modal */}
      {showAddGoalModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={handleCreateGoal}
            className="bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-2xl max-w-md w-full p-6 space-y-4"
          >
            <h3 className="text-base font-bold">Create New Goal</h3>
            <div>
              <label className="block text-xs text-[var(--text-muted)] mb-1">Goal title</label>
              <input
                type="text"
                required
                value={goalTitle}
                onChange={(e) => setGoalTitle(e.target.value)}
                placeholder="e.g., Complete 40 Cardiology Lectures"
                className="w-full px-3 py-2 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-subtle)] text-sm"
              />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs text-[var(--text-muted)] mb-1">Category</label>
                <select
                  value={goalWhy}
                  onChange={(e) => setGoalWhy(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-subtle)] text-sm"
                >
                  <option value="Study">Study</option>
                  <option value="Health">Health</option>
                  <option value="Finance">Finance</option>
                  <option value="Personal">Personal</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-[var(--text-muted)] mb-1">Initial %</label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={goalProgress}
                  onChange={(e) => setGoalProgress(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-subtle)] text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-[var(--text-muted)] mb-1">XP Reward</label>
                <input
                  type="number"
                  min={10}
                  value={goalXp}
                  onChange={(e) => setGoalXp(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-subtle)] text-sm"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowAddGoalModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-medium bg-[var(--bg-secondary)]"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-[var(--accent)] text-[#0F1613]"
              >
                Save Goal
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Add Habit Modal */}
      {showAddHabitModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={handleCreateHabit}
            className="bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-2xl max-w-md w-full p-6 space-y-4"
          >
            <h3 className="text-base font-bold">Create New Habit</h3>
            <div>
              <label className="block text-xs text-[var(--text-muted)] mb-1">Habit title</label>
              <input
                type="text"
                required
                value={habitTitle}
                onChange={(e) => setHabitTitle(e.target.value)}
                placeholder="e.g., Morning active recall (30 cards)"
                className="w-full px-3 py-2 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-subtle)] text-sm"
              />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs text-[var(--text-muted)] mb-1">Category</label>
                <select
                  value={habitWhy}
                  onChange={(e) => setHabitWhy(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-subtle)] text-sm"
                >
                  <option value="Health">Health</option>
                  <option value="Study">Study</option>
                  <option value="Routine">Routine</option>
                  <option value="Finance">Finance</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-[var(--text-muted)] mb-1">Frequency</label>
                <select
                  value={habitFrequency}
                  onChange={(e) => setHabitFrequency(e.target.value as 'daily' | 'weekly')}
                  className="w-full px-3 py-2 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-subtle)] text-sm"
                >
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-[var(--text-muted)] mb-1">XP Reward</label>
                <input
                  type="number"
                  min={5}
                  value={habitXp}
                  onChange={(e) => setHabitXp(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-subtle)] text-sm"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowAddHabitModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-medium bg-[var(--bg-secondary)]"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-[var(--accent)] text-[#0F1613]"
              >
                Save Habit
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Add Quest Modal */}
      {showAddQuestModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={handleCreateQuest}
            className="bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-2xl max-w-md w-full p-6 space-y-4"
          >
            <h3 className="text-base font-bold">Add Daily Quest</h3>
            <div>
              <label className="block text-xs text-[var(--text-muted)] mb-1">Quest description</label>
              <input
                type="text"
                required
                value={questTitle}
                onChange={(e) => setQuestTitle(e.target.value)}
                placeholder="e.g., Clear all overdue spaced repetition cards"
                className="w-full px-3 py-2 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-subtle)] text-sm"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-[var(--text-muted)] mb-1">Focus Area</label>
                <input
                  type="text"
                  value={questWhy}
                  onChange={(e) => setQuestWhy(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-subtle)] text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-[var(--text-muted)] mb-1">XP Reward</label>
                <input
                  type="number"
                  min={10}
                  value={questXp}
                  onChange={(e) => setQuestXp(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-subtle)] text-sm"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowAddQuestModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-medium bg-[var(--bg-secondary)]"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-[var(--accent)] text-[#0F1613]"
              >
                Add Quest
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Add Reward Modal */}
      {showAddRewardModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={handleCreateReward}
            className="bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-2xl max-w-md w-full p-6 space-y-4"
          >
            <h3 className="text-base font-bold">Add Custom Reward</h3>
            <div>
              <label className="block text-xs text-[var(--text-muted)] mb-1">Reward title</label>
              <input
                type="text"
                required
                value={rewardTitle}
                onChange={(e) => setRewardTitle(e.target.value)}
                placeholder="e.g., Specialty coffee + 1 hour gaming"
                className="w-full px-3 py-2 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-subtle)] text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-[var(--text-muted)] mb-1">Coin cost</label>
              <input
                type="number"
                min={10}
                value={rewardCost}
                onChange={(e) => setRewardCost(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-subtle)] text-sm"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowAddRewardModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-medium bg-[var(--bg-secondary)]"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-[var(--accent)] text-[#0F1613]"
              >
                Save Reward
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
