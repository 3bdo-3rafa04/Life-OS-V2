import React, { useState, useEffect, useMemo } from 'react';
import { LifeOSProvider, useLifeOS } from './context/LifeOSContext';
import { DashboardView } from './components/DashboardView';
import { CalendarTasksView } from './components/CalendarTasksView';
import { TasksView } from './components/TasksView';
import { PomodoroView } from './components/PomodoroView';
import { StudyView } from './components/StudyView';
import { LibraryView } from './components/LibraryView';
import { HealthView } from './components/HealthView';
import { FinanceView } from './components/FinanceView';
import { GoalsRankView } from './components/GoalsRankView';
import { AnalyticsView } from './components/AnalyticsView';
import { SpoonFeederPanel } from './components/SpoonFeederPanel';
import { SettingsView } from './components/SettingsView';
import { QuickAddModal } from './components/QuickAddModal';
import { SmartSchedulerPanel } from './components/SmartSchedulerPanel';
import { RpgGamificationWorld } from './components/RpgGamificationWorld';
import { PixelAvatarSprite } from './components/PixelStudyRoomCanvas';
import {
  Home,
  CalendarRange,
  BookOpen,
  HeartPulse,
  Compass,
  Library,
  BarChart3,
  Sparkles,
  Settings,
  Search,
  Bell,
  Plus,
  Sun,
  Moon,
  X,
  Play,
  Pause,
  CheckCircle2,
  PanelLeftClose,
  PanelLeftOpen,
  MoreHorizontal,
  CheckSquare,
  Calendar,
  Timer,
  Wand2,
  Target,
  Wallet,
  Trophy,
  Coins,
  Gamepad2,
} from 'lucide-react';

export type NavTab =
  | 'dashboard'
  | 'plan'
  | 'calendar'
  | 'tasks'
  | 'pomodoro'
  | 'study'
  | 'health'
  | 'life'
  | 'goals'
  | 'finance'
  | 'library'
  | 'insights'
  | 'analytics'
  | 'spoon-feeder'
  | 'settings';

type PrimaryModuleId =
  | 'dashboard'
  | 'plan'
  | 'study'
  | 'health'
  | 'life'
  | 'library'
  | 'insights'
  | 'spoon-feeder'
  | 'settings';

type PlanSubView = 'tasks' | 'calendar' | 'pomodoro' | 'scheduler';
type LifeSubView = 'goals' | 'finance';
type InsightsSubView = 'analytics' | 'rank';

interface SidebarGroup {
  groupLabel: string;
  items: {
    id: PrimaryModuleId;
    label: string;
    subtitle: string;
    icon: React.ComponentType<{ className?: string }>;
  }[];
}

const SIDEBAR_GROUPS: SidebarGroup[] = [
  {
    groupLabel: 'Daily Workspace',
    items: [
      { id: 'dashboard', label: 'Home', subtitle: 'Daily command center', icon: Home },
      { id: 'plan', label: 'Plan', subtitle: 'Tasks, calendar & focus', icon: CalendarRange },
      { id: 'study', label: 'Study', subtitle: 'Lectures, exams & recall', icon: BookOpen },
    ],
  },
  {
    groupLabel: 'Personal Domains',
    items: [
      { id: 'health', label: 'Health', subtitle: 'Fitness, PRs & nutrition', icon: HeartPulse },
      { id: 'life', label: 'Life & Finance', subtitle: 'Goals, habits & budgets', icon: Compass },
      { id: 'library', label: 'Library', subtitle: 'Notes, books & courses', icon: Library },
    ],
  },
  {
    groupLabel: 'Intelligence',
    items: [
      { id: 'insights', label: 'Insights', subtitle: 'Analytics, rank & review', icon: BarChart3 },
      {
        id: 'spoon-feeder',
        label: 'AI Assistant',
        subtitle: 'Spoon Feeder copilot',
        icon: Sparkles,
      },
      { id: 'settings', label: 'Settings', subtitle: 'Preferences & backup', icon: Settings },
    ],
  },
];

const CONTEXTUAL_AI_PROMPTS: Record<PrimaryModuleId, string[]> = {
  dashboard: [
    'Brief me on my top 3 priorities and due revisions today',
    'Generate a realistic time-blocked schedule for the rest of today',
    'What requires my immediate attention across study, tasks, and health?',
  ],
  plan: [
    'Generate a context-aware schedule for today respecting my energy profile',
    'I missed my morning session — adapt my schedule without overloading tomorrow',
    'Create a high-priority task and schedule a 45m focus block',
  ],
  study: [
    'Summarize an attached lecture PDF and generate active-recall flashcards',
    'Prioritize my unstudied lectures based on upcoming exam proximity',
    'Quiz me on my active study modules with 3 progressive questions',
  ],
  health: [
    'Log a high-protein meal (650 kcal, 45g protein) and 500ml water',
    'Analyze my weekly training load, recovery, and 7-day weight trend',
    'Schedule a conflict-free Push Day workout session on my calendar',
  ],
  life: [
    'Create a daily habit and link a new milestone goal',
    'Record an expense and summarize my monthly budget status',
    'Suggest 3 high-leverage habits to improve my daily consistency',
  ],
  library: [
    'Convert takeaways from my latest library note into study flashcards',
    'Summarize my in-progress books and courses',
    'Create a study note from my recent reading takeaways',
  ],
  insights: [
    'Audit my planned vs completed study hours over the past 7 days',
    'Help me complete my end-of-day reflection and tomorrow adjustment',
    'Show how many XP and coins I need for my next rank level',
  ],
  'spoon-feeder': [
    'Audit my entire workspace and tell me my top 3 priorities today',
    'Generate a context-aware schedule for today and tomorrow',
    'Summarize the attached lecture PDF and create active-recall flashcards',
  ],
  settings: [
    'Update my energy profile or add a permanent scheduling preference rule',
    'Review my daily calorie, protein, and hydration targets',
    'Explain how my persistent scheduling memory works',
  ],
};

const LifeOSShell: React.FC = () => {
  const {
    profile,
    tasks,
    events,
    studyItems,
    knowledgeItems,
    aiLogs,
    pomodoroState,
    togglePomodoro,
    completePomodoroSession,
    dismissPomodoroAlert,
    rpgState,
    rpgRankEval,
    rpgLevelInfo,
    isRpgWorldOpen,
    rpgWorldInitialTab,
    openRpgWorld,
    closeRpgWorld,
    levelUpBanner,
    dismissLevelUpBanner,
  } = useLifeOS();

  const [activeModule, setActiveModule] = useState<PrimaryModuleId>('dashboard');
  const [planSubView, setPlanSubView] = useState<PlanSubView>('tasks');
  const [lifeSubView, setLifeSubView] = useState<LifeSubView>('goals');
  const [insightsSubView, setInsightsSubView] = useState<InsightsSubView>('analytics');

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    try {
      const saved = localStorage.getItem('lifeos_theme_v1');
      if (saved === 'light' || saved === 'dark') return saved;
    } catch {
      // ignore
    }
    return 'dark';
  });

  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showAiDrawer, setShowAiDrawer] = useState(false);
  const [mobileMoreOpen, setMobileMoreOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Sync `.dark` class on <html> for Tailwind v4 `@custom-variant dark` and CSS variables
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
      root.classList.remove('light-theme');
    } else {
      root.classList.remove('dark');
      root.classList.add('light-theme');
    }
    try {
      localStorage.setItem('lifeos_theme_v1', theme);
    } catch {
      // ignore
    }
  }, [theme]);

  // Unified navigation router that maps every legacy and new destination cleanly
  const navigateTo = (dest: string) => {
    setMobileMoreOpen(false);
    if (dest === 'overview' || dest === 'dashboard' || dest === 'home') {
      setActiveModule('dashboard');
    } else if (dest === 'plan') {
      setActiveModule('plan');
    } else if (dest === 'tasks') {
      setActiveModule('plan');
      setPlanSubView('tasks');
    } else if (dest === 'calendar') {
      setActiveModule('plan');
      setPlanSubView('calendar');
    } else if (dest === 'pomodoro') {
      setActiveModule('plan');
      setPlanSubView('pomodoro');
    } else if (dest === 'scheduler' || dest === 'smart-schedule') {
      setActiveModule('plan');
      setPlanSubView('scheduler');
    } else if (dest === 'study') {
      setActiveModule('study');
    } else if (dest === 'health') {
      setActiveModule('health');
    } else if (dest === 'life') {
      setActiveModule('life');
    } else if (dest === 'goals') {
      setActiveModule('life');
      setLifeSubView('goals');
    } else if (dest === 'finance') {
      setActiveModule('life');
      setLifeSubView('finance');
    } else if (dest === 'library') {
      setActiveModule('library');
    } else if (dest === 'insights' || dest === 'analytics') {
      setActiveModule('insights');
      setInsightsSubView('analytics');
    } else if (dest === 'rank') {
      setActiveModule('insights');
      setInsightsSubView('rank');
    } else if (dest === 'spoon_feeder' || dest === 'spoon-feeder') {
      setActiveModule('spoon-feeder');
    } else if (dest === 'settings') {
      setActiveModule('settings');
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setShowSearchModal((prev) => !prev);
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'n') {
        e.preventDefault();
        setShowQuickAdd((prev) => !prev);
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'j') {
        e.preventDefault();
        setShowAiDrawer((prev) => !prev);
      } else if (e.key === 'Escape') {
        setShowQuickAdd(false);
        setShowSearchModal(false);
        setShowNotifications(false);
        setShowAiDrawer(false);
        setMobileMoreOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleToggleTheme = (newTheme: 'dark' | 'light') => {
    setTheme(newTheme);
  };

  const completedTasksCount = tasks.filter((t) => t.status === 'completed').length;
  const totalTasksCount = tasks.length;
  const openTasksCount = totalTasksCount - completedTasksCount;
  const dailyCompletionPct =
    totalTasksCount > 0 ? Math.round((completedTasksCount / totalTasksCount) * 100) : 0;

  const todayStr = new Date().toISOString().split('T')[0];
  const dueTodayTasks = tasks.filter(
    (t) => t.status !== 'completed' && t.dueDate.startsWith(todayStr)
  );
  const pendingAiLogs = aiLogs.filter((l) => l.status === 'pending_approval');
  const dueRevisions = studyItems.filter(
    (s) => s.status === 'review_due' || s.nextReviewDate <= todayStr
  );

  const notifications = useMemo(() => {
    const list: { id: string; title: string; subtitle: string; dest: string }[] = [];
    for (const p of pendingAiLogs) {
      list.push({
        id: `ai-${p.id}`,
        title: `AI Approval Needed: ${p.toolName}`,
        subtitle: p.summary,
        dest: 'spoon-feeder',
      });
    }
    for (const t of dueTodayTasks.slice(0, 4)) {
      list.push({
        id: `task-${t.id}`,
        title: `Task due today: ${t.title}`,
        subtitle: `${t.category} · ${t.estimatedMinutes}m · ${t.priority}`,
        dest: 'tasks',
      });
    }
    for (const s of dueRevisions.slice(0, 3)) {
      list.push({
        id: `study-${s.id}`,
        title: `Study review due: ${s.title}`,
        subtitle: `${s.itemType} · Stage R${s.repetitionCount}`,
        dest: 'study',
      });
    }
    return list;
  }, [pendingAiLogs, dueTodayTasks, dueRevisions]);

  const searchResults = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const matchedTasks = tasks
      .filter(
        (t) => !q || t.title.toLowerCase().includes(q) || t.category.toLowerCase().includes(q)
      )
      .slice(0, 5);
    const matchedStudy = studyItems
      .filter(
        (s) =>
          !q ||
          s.title.toLowerCase().includes(q) ||
          (s.notes || '').toLowerCase().includes(q)
      )
      .slice(0, 5);
    const matchedNotes = knowledgeItems
      .filter(
        (k) =>
          !q ||
          k.title.toLowerCase().includes(q) ||
          (k.takeaways || '').toLowerCase().includes(q)
      )
      .slice(0, 5);
    const matchedEvents = events
      .filter((ev) => !q || ev.title.toLowerCase().includes(q))
      .slice(0, 4);
    return { matchedTasks, matchedStudy, matchedNotes, matchedEvents };
  }, [searchQuery, tasks, studyItems, knowledgeItems, events]);

  const currentModuleMeta = useMemo(() => {
    for (const grp of SIDEBAR_GROUPS) {
      const found = grp.items.find((i) => i.id === activeModule);
      if (found) return { ...found, groupLabel: grp.groupLabel };
    }
    return {
      id: 'dashboard' as PrimaryModuleId,
      label: 'Home',
      subtitle: 'Daily command center',
      groupLabel: 'Daily Workspace',
      icon: Home,
    };
  }, [activeModule]);

  return (
    <div className="min-h-screen bg-[var(--bg-canvas)] text-[var(--text-primary)] flex flex-col lg:flex-row">
      {/* =====================================================================
          DESKTOP COLLAPSIBLE SIDEBAR
         ===================================================================== */}
      <aside
        className={`hidden lg:flex flex-col justify-between shrink-0 bg-[var(--bg-card)] border-r border-[var(--border-subtle)] sticky top-0 h-screen transition-all duration-150 ${
          sidebarCollapsed ? 'w-18 p-3' : 'w-60 p-4'
        }`}
      >
        <div className="space-y-6 overflow-y-auto pr-0.5">
          {/* Brand + Collapse Toggle */}
          <div className="flex items-center justify-between px-1 pt-0.5">
            <button
              onClick={() => navigateTo('dashboard')}
              className="flex items-center gap-2.5 text-left min-w-0"
            >
              <div className="w-8 h-8 rounded-xl bg-[var(--accent)] text-[#171E1B] font-bold text-xs flex items-center justify-center shrink-0">
                LO
              </div>
              {!sidebarCollapsed && (
                <span className="text-sm font-bold tracking-tight truncate whitespace-nowrap">
                  Life OS
                </span>
              )}
            </button>
            <button
              onClick={() => setSidebarCollapsed((prev) => !prev)}
              className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] transition-colors"
              title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {sidebarCollapsed ? (
                <PanelLeftOpen className="w-4 h-4" />
              ) : (
                <PanelLeftClose className="w-4 h-4" />
              )}
            </button>
          </div>

          {/* Grouped Navigation */}
          <div className="space-y-5">
            {SIDEBAR_GROUPS.map((group) => (
              <div key={group.groupLabel} className="space-y-1">
                {!sidebarCollapsed && (
                  <p className="px-2.5 text-[11px] font-medium text-[var(--text-muted)]">
                    {group.groupLabel}
                  </p>
                )}
                <nav className="space-y-0.5">
                  {group.items.map((item) => {
                    const Icon = item.icon;
                    const isActive = activeModule === item.id;
                    const badgeCount =
                      item.id === 'plan'
                        ? openTasksCount
                        : item.id === 'study'
                        ? dueRevisions.length
                        : item.id === 'spoon-feeder'
                        ? pendingAiLogs.length
                        : 0;

                    return (
                      <button
                        key={item.id}
                        onClick={() => navigateTo(item.id)}
                        title={sidebarCollapsed ? `${item.label} — ${item.subtitle}` : undefined}
                        className={`w-full flex items-center gap-3 px-2.5 py-2 rounded-xl text-xs transition-colors ${
                          isActive
                            ? 'bg-[var(--bg-secondary)] text-[var(--text-primary)] font-semibold'
                            : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)]/50'
                        } ${sidebarCollapsed ? 'justify-center' : ''}`}
                      >
                        <Icon
                          className={`w-4 h-4 shrink-0 ${
                            isActive ? 'text-[var(--accent)]' : 'text-[var(--text-muted)]'
                          }`}
                        />
                        {!sidebarCollapsed && (
                          <>
                            <span className="truncate whitespace-nowrap">{item.label}</span>
                            {badgeCount > 0 && (
                              <span className="ml-auto text-[11px] font-mono tabular-nums text-[var(--text-muted)]">
                                {badgeCount}
                              </span>
                            )}
                          </>
                        )}
                      </button>
                    );
                  })}
                </nav>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom User & Progress Summary */}
        <div className="space-y-2.5 pt-3 border-t border-[var(--border-subtle)]">
          {!sidebarCollapsed ? (
            <button
              onClick={() => openRpgWorld('study_room')}
              className="w-full text-left p-2.5 rounded-xl bg-[#172A32] hover:bg-[#294C45]/80 border border-[#D7B779]/35 flex items-center gap-2.5 transition-colors group"
              title="Click to open Full-Screen Pixel-Art RPG World & Study Room"
            >
              <div className="w-9 h-9 rounded-lg bg-[#0F1D23] border border-[#D7B779]/50 flex items-center justify-center shrink-0 overflow-hidden">
                <PixelAvatarSprite avatar={rpgState.avatar} size={32} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-1">
                  <span className="text-[11px] font-bold text-[#D7B779] truncate">
                    {rpgRankEval.rank} · Lv.{rpgLevelInfo.level}
                  </span>
                  <span className="text-[10px] font-mono text-[#E8DDC8]/80">
                    {dailyCompletionPct}%
                  </span>
                </div>
                <div className="text-[10px] text-[#E8DDC8]/75 truncate">
                  {profile?.coins ?? 0} coins · {profile?.streakDays ?? 0}d streak
                </div>
              </div>
            </button>
          ) : (
            <button
              onClick={() => openRpgWorld('study_room')}
              className="w-9 h-9 mx-auto rounded-lg bg-[#172A32] border border-[#D7B779]/60 flex items-center justify-center overflow-hidden"
              title={`${rpgRankEval.rank} · Lv.${rpgLevelInfo.level} — Click to enter Pixel RPG World`}
            >
              <PixelAvatarSprite avatar={rpgState.avatar} size={28} />
            </button>
          )}

          {!sidebarCollapsed && (
            <div className="flex items-center justify-between px-1 text-xs text-[var(--text-muted)]">
              <span className="truncate max-w-[180px]">
                {profile?.displayName || 'Personal Workspace'}
              </span>
              <span className="text-[10px] font-mono text-[#6EBF8B]">Local</span>
            </div>
          )}
        </div>
      </aside>

      {/* =====================================================================
          MAIN CONTENT COLUMN
         ===================================================================== */}
      <div className="flex-1 flex flex-col min-w-0 pb-16 lg:pb-0">
        {/* Clean Top Header Bar */}
        <header className="sticky top-0 z-30 bg-[var(--bg-canvas)]/90 backdrop-blur-md border-b border-[var(--border-subtle)] px-4 sm:px-8 py-3 flex items-center justify-between gap-4">
          {/* Left Zone: Breadcrumb & Module Title */}
          <div className="flex items-center gap-2 min-w-0">
            <span className="hidden sm:inline text-xs text-[var(--text-muted)] whitespace-nowrap">
              {currentModuleMeta.groupLabel}
            </span>
            <span className="hidden sm:inline text-xs text-[var(--text-muted)]">/</span>
            <span className="text-sm font-semibold text-[var(--text-primary)] truncate whitespace-nowrap">
              {currentModuleMeta.label}
            </span>
          </div>

          {/* Center Zone: Sub-navigation pills when inside unified hubs (Plan, Life, Insights) */}
          <div className="hidden md:flex items-center gap-1">
            {activeModule === 'plan' && (
              <div className="inline-flex items-center p-1 rounded-xl bg-[var(--bg-card)] border border-[var(--border-subtle)] text-xs">
                {(
                  [
                    { id: 'tasks', label: 'Tasks', icon: CheckSquare },
                    { id: 'calendar', label: 'Calendar', icon: Calendar },
                    { id: 'pomodoro', label: 'Pomodoro Focus', icon: Timer },
                    { id: 'scheduler', label: 'AI Schedule', icon: Wand2 },
                  ] as const
                ).map((tab) => {
                  const TabIcon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setPlanSubView(tab.id)}
                      className={`px-3 py-1 rounded-lg font-medium transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
                        planSubView === tab.id
                          ? 'bg-[var(--bg-secondary)] text-[var(--text-primary)] font-semibold'
                          : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                      }`}
                    >
                      <TabIcon className="w-3.5 h-3.5" />
                      <span>{tab.label}</span>
                    </button>
                  );
                })}
              </div>
            )}

            {activeModule === 'life' && (
              <div className="inline-flex items-center p-1 rounded-xl bg-[var(--bg-card)] border border-[var(--border-subtle)] text-xs">
                {(
                  [
                    { id: 'goals', label: 'Goals, Habits & Projects', icon: Target },
                    { id: 'finance', label: 'Finance & Budgets', icon: Wallet },
                  ] as const
                ).map((tab) => {
                  const TabIcon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setLifeSubView(tab.id)}
                      className={`px-3 py-1 rounded-lg font-medium transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
                        lifeSubView === tab.id
                          ? 'bg-[var(--bg-secondary)] text-[var(--text-primary)] font-semibold'
                          : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                      }`}
                    >
                      <TabIcon className="w-3.5 h-3.5" />
                      <span>{tab.label}</span>
                    </button>
                  );
                })}
              </div>
            )}

            {activeModule === 'insights' && (
              <div className="inline-flex items-center p-1 rounded-xl bg-[var(--bg-card)] border border-[var(--border-subtle)] text-xs">
                {(
                  [
                    { id: 'analytics', label: 'Analytics & Daily Review', icon: BarChart3 },
                    { id: 'rank', label: 'Rank, Quests & Rewards', icon: Trophy },
                  ] as const
                ).map((tab) => {
                  const TabIcon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setInsightsSubView(tab.id)}
                      className={`px-3 py-1 rounded-lg font-medium transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
                        insightsSubView === tab.id
                          ? 'bg-[var(--bg-secondary)] text-[var(--text-primary)] font-semibold'
                          : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                      }`}
                    >
                      <TabIcon className="w-3.5 h-3.5" />
                      <span>{tab.label}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Right Zone: Search, Active Timer, AI Copilot, Theme, Notifications, Quick Add */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setShowSearchModal(true)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[var(--bg-card)] border border-[var(--border-subtle)] text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors whitespace-nowrap"
              title="Search workspace (Ctrl + K)"
            >
              <Search className="w-3.5 h-3.5" />
              <span className="hidden xl:inline">Search...</span>
              <kbd className="hidden xl:inline px-1.5 py-0.5 rounded bg-[var(--bg-secondary)] text-[10px] font-mono">
                ⌘K
              </kbd>
            </button>

            {/* Compact Live Pomodoro Indicator */}
            <div className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-[var(--bg-card)] border border-[var(--border-subtle)] text-xs">
              <button
                onClick={togglePomodoro}
                className="p-0.5 rounded text-[var(--accent)] hover:opacity-80"
                title={pomodoroState.running ? 'Pause Pomodoro' : 'Start Pomodoro'}
              >
                {pomodoroState.running ? (
                  <Pause className="w-3.5 h-3.5" />
                ) : (
                  <Play className="w-3.5 h-3.5" />
                )}
              </button>
              <button
                onClick={() => navigateTo('pomodoro')}
                className="font-mono font-semibold text-xs tabular-nums"
                title="Open Pomodoro Focus Studio"
              >
                {String(Math.floor(pomodoroState.remainingSeconds / 60)).padStart(2, '0')}:
                {String(pomodoroState.remainingSeconds % 60).padStart(2, '0')}
              </button>
            </div>

            {/* Clickable Pixel-Art Rank & Coins Component -> Opens Full-Screen RPG World */}
            <button
              onClick={() => openRpgWorld('study_room')}
              className="flex items-center gap-2 px-2.5 py-1 rounded-xl bg-[#172A32] hover:bg-[#294C45] border border-[#D7B779]/50 text-[#E8DDC8] text-xs font-semibold transition-colors whitespace-nowrap"
              title="Open Pixel-Art RPG Gamification World & Study Room"
            >
              <div className="w-5 h-5 rounded bg-[#0F1D23] border border-[#D7B779]/40 flex items-center justify-center overflow-hidden shrink-0">
                <PixelAvatarSprite avatar={rpgState.avatar} size={18} />
              </div>
              <span className="text-[#D7B779] font-bold">{rpgRankEval.rank}</span>
              <span className="hidden sm:inline text-[11px] font-mono text-[#E8DDC8]/90">
                Lv.{rpgLevelInfo.level}
              </span>
              <span className="hidden md:inline-flex items-center gap-1 pl-1.5 border-l border-[#294C45] text-[11px] font-mono text-[#D7B779]">
                <Coins className="w-3 h-3" />
                {profile?.coins ?? 0}
              </span>
            </button>

            {/* Contextual AI Assistant Drawer Button */}
            <button
              onClick={() => setShowAiDrawer((prev) => !prev)}
              className="px-3 py-1.5 rounded-xl bg-[var(--bg-secondary)] text-[var(--text-primary)] text-xs font-medium hover:opacity-90 flex items-center gap-1.5 whitespace-nowrap"
              title="Open Contextual Spoon Feeder AI (Ctrl + J)"
            >
              <Sparkles className="w-3.5 h-3.5 text-[var(--accent)]" />
              <span className="hidden sm:inline">AI Assistant</span>
            </button>

            {/* Theme Toggle */}
            <button
              onClick={() => handleToggleTheme(theme === 'dark' ? 'light' : 'dark')}
              className="p-2 rounded-xl bg-[var(--bg-card)] border border-[var(--border-subtle)] text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              title="Switch Light / Dark theme"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            {/* Notifications */}
            <div className="relative">
              <button
                onClick={() => setShowNotifications((prev) => !prev)}
                className="p-2 rounded-xl bg-[var(--bg-card)] border border-[var(--border-subtle)] text-[var(--text-muted)] hover:text-[var(--text-primary)] relative"
                title="Notifications"
              >
                <Bell className="w-4 h-4" />
                {notifications.length > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[#D97777] text-white text-[10px] font-bold font-mono flex items-center justify-center">
                    {notifications.length}
                  </span>
                )}
              </button>

              {showNotifications && (
                <div className="absolute right-0 mt-2 w-80 sage-card shadow-xl p-4 z-50 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold">
                      Attention Needed ({notifications.length})
                    </span>
                    <button
                      onClick={() => setShowNotifications(false)}
                      className="text-[11px] text-[var(--text-muted)]"
                    >
                      Close
                    </button>
                  </div>
                  {notifications.length === 0 ? (
                    <p className="text-xs text-[var(--text-muted)] py-4 text-center">
                      All caught up! No overdue items or pending approvals.
                    </p>
                  ) : (
                    <div className="space-y-2 max-h-72 overflow-y-auto">
                      {notifications.map((n) => (
                        <button
                          key={n.id}
                          onClick={() => {
                            navigateTo(n.dest);
                            setShowNotifications(false);
                          }}
                          className="w-full text-left p-2.5 rounded-xl bg-[var(--bg-secondary)]/50 hover:bg-[var(--bg-hover)] border border-[var(--border-subtle)] transition-colors"
                        >
                          <div className="text-xs font-semibold truncate">{n.title}</div>
                          <p className="text-[11px] text-[var(--text-muted)] mt-0.5 truncate">
                            {n.subtitle}
                          </p>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Primary CTA: Quick Add */}
            <button
              onClick={() => setShowQuickAdd(true)}
              className="px-3.5 py-1.5 rounded-xl bg-[var(--accent)] text-[#171E1B] dark:text-[#171E1B] text-xs font-semibold hover:opacity-90 flex items-center gap-1.5 whitespace-nowrap shrink-0"
            >
              <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>Quick add</span>
            </button>
          </div>
        </header>

        {/* Mobile Sub-Navigation Bar for Unified Hubs (Plan, Life, Insights) */}
        {(activeModule === 'plan' || activeModule === 'life' || activeModule === 'insights') && (
          <div className="md:hidden px-4 pt-3 flex items-center gap-1.5 overflow-x-auto">
            {activeModule === 'plan' &&
              (
                [
                  { id: 'tasks', label: 'Tasks' },
                  { id: 'calendar', label: 'Calendar' },
                  { id: 'pomodoro', label: 'Pomodoro' },
                  { id: 'scheduler', label: 'AI Schedule' },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setPlanSubView(tab.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap shrink-0 ${
                    planSubView === tab.id
                      ? 'bg-[var(--accent)] text-[#171E1B] font-semibold'
                      : 'bg-[var(--bg-card)] text-[var(--text-muted)] border border-[var(--border-subtle)]'
                  }`}
                >
                  {tab.label}
                </button>
              ))}

            {activeModule === 'life' &&
              (
                [
                  { id: 'goals', label: 'Goals & Habits' },
                  { id: 'finance', label: 'Finance & Budgets' },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setLifeSubView(tab.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap shrink-0 ${
                    lifeSubView === tab.id
                      ? 'bg-[var(--accent)] text-[#171E1B] font-semibold'
                      : 'bg-[var(--bg-card)] text-[var(--text-muted)] border border-[var(--border-subtle)]'
                  }`}
                >
                  {tab.label}
                </button>
              ))}

            {activeModule === 'insights' &&
              (
                [
                  { id: 'analytics', label: 'Analytics & Review' },
                  { id: 'rank', label: 'Rank & Rewards' },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setInsightsSubView(tab.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap shrink-0 ${
                    insightsSubView === tab.id
                      ? 'bg-[var(--accent)] text-[#171E1B] font-semibold'
                      : 'bg-[var(--bg-card)] text-[var(--text-muted)] border border-[var(--border-subtle)]'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
          </div>
        )}

        {/* Live Pomodoro Completion Notification Banner */}
        {pomodoroState.liveAlert && (
          <div className="mx-4 sm:mx-8 mt-4 p-4 rounded-2xl sage-card border-[#6EBF8B] flex flex-col sm:flex-row sm:items-center justify-between gap-3 z-40">
            <div className="flex items-start sm:items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-[#6EBF8B]/20 text-[#6EBF8B] flex items-center justify-center shrink-0">
                <Bell className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[11px] font-semibold text-[#6EBF8B]">
                  Pomodoro Complete · {pomodoroState.liveAlert.timestamp}
                </span>
                <p className="text-sm font-bold text-[var(--text-primary)]">
                  {pomodoroState.liveAlert.title}
                </p>
                <p className="text-xs text-[var(--text-muted)]">
                  {pomodoroState.liveAlert.message}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => {
                  dismissPomodoroAlert();
                  togglePomodoro();
                }}
                className="px-3.5 py-2 rounded-xl bg-[var(--accent)] text-[#171E1B] text-xs font-semibold"
              >
                {pomodoroState.running ? 'Running' : 'Start Next Timer'}
              </button>
              <button
                onClick={() => {
                  dismissPomodoroAlert();
                  navigateTo('pomodoro');
                }}
                className="px-3 py-2 rounded-xl bg-[var(--bg-secondary)] text-[var(--text-primary)] text-xs font-medium"
              >
                Open Studio
              </button>
              <button
                onClick={dismissPomodoroAlert}
                className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                title="Dismiss notification"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* ===================================================================
            MAIN MODULE VIEWPORT
           =================================================================== */}
        <main className="flex-1 px-4 sm:px-8 pt-6 pb-10 max-w-7xl w-full mx-auto">
          {activeModule === 'dashboard' && (
            <DashboardView
              onNavigate={(dest) => navigateTo(dest)}
              onOpenQuickAdd={() => setShowQuickAdd(true)}
              onOpenSpoonFeeder={() => setShowAiDrawer(true)}
            />
          )}

          {activeModule === 'plan' && (
            <div className="space-y-4">
              {planSubView === 'tasks' && (
                <TasksView
                  onNavigateCalendar={() => {
                    setPlanSubView('calendar');
                  }}
                />
              )}
              {planSubView === 'calendar' && <CalendarTasksView mode="calendar" />}
              {planSubView === 'pomodoro' && <PomodoroView />}
              {planSubView === 'scheduler' && <SmartSchedulerPanel />}
            </div>
          )}

          {activeModule === 'study' && <StudyView />}

          {activeModule === 'health' && <HealthView />}

          {activeModule === 'life' && (
            <div className="space-y-4">
              {lifeSubView === 'goals' && <GoalsRankView />}
              {lifeSubView === 'finance' && <FinanceView />}
            </div>
          )}

          {activeModule === 'library' && <LibraryView />}

          {activeModule === 'insights' && (
            <div className="space-y-6">
              {insightsSubView === 'analytics' && <AnalyticsView />}
              {insightsSubView === 'rank' && (
                <div className="space-y-8">
                  <RpgGamificationWorld />
                  <GoalsRankView />
                </div>
              )}
            </div>
          )}

          {activeModule === 'spoon-feeder' && (
            <SpoonFeederPanel onNavigate={(dest) => navigateTo(dest)} />
          )}

          {activeModule === 'settings' && (
            <SettingsView theme={theme} onToggleTheme={handleToggleTheme} />
          )}
        </main>
      </div>

      {/* =====================================================================
          MOBILE BOTTOM NAVIGATION BAR
         ===================================================================== */}
      <nav className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-[var(--bg-card)]/95 backdrop-blur-md border-t border-[var(--border-subtle)] px-2 py-1.5 flex items-center justify-around">
        {(
          [
            { id: 'dashboard', label: 'Home', icon: Home },
            { id: 'plan', label: 'Plan', icon: CalendarRange },
            { id: 'study', label: 'Study', icon: BookOpen },
            { id: 'health', label: 'Health', icon: HeartPulse },
          ] as const
        ).map((item) => {
          const Icon = item.icon;
          const isActive = activeModule === item.id;
          return (
            <button
              key={item.id}
              onClick={() => navigateTo(item.id)}
              className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl text-[11px] font-medium transition-colors ${
                isActive ? 'text-[var(--accent)] font-semibold' : 'text-[var(--text-muted)]'
              }`}
            >
              <Icon className="w-4 h-4 mb-0.5" />
              <span>{item.label}</span>
            </button>
          );
        })}
        <button
          onClick={() => setMobileMoreOpen(true)}
          className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl text-[11px] font-medium transition-colors ${
            ['life', 'library', 'insights', 'spoon-feeder', 'settings'].includes(activeModule)
              ? 'text-[var(--accent)] font-semibold'
              : 'text-[var(--text-muted)]'
          }`}
        >
          <MoreHorizontal className="w-4 h-4 mb-0.5" />
          <span>More</span>
        </button>
      </nav>

      {/* Mobile "More" Sheet */}
      {mobileMoreOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm lg:hidden flex items-end"
          onClick={() => setMobileMoreOpen(false)}
        >
          <div
            className="w-full bg-[var(--bg-card)] border-t border-[var(--border-subtle)] rounded-t-2xl p-5 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold">All Life OS Modules</span>
              <button
                onClick={() => setMobileMoreOpen(false)}
                className="p-1 text-[var(--text-muted)]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              {SIDEBAR_GROUPS.flatMap((g) => g.items).map((item) => {
                const Icon = item.icon;
                const isActive = activeModule === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => navigateTo(item.id)}
                    className={`flex items-center gap-3 p-3 rounded-xl text-left text-xs border transition-colors ${
                      isActive
                        ? 'bg-[var(--bg-secondary)] border-[var(--accent)] font-semibold'
                        : 'bg-[var(--bg-canvas)] border-[var(--border-subtle)]'
                    }`}
                  >
                    <Icon className="w-4 h-4 text-[var(--accent)] shrink-0" />
                    <div className="min-w-0">
                      <div className="truncate">{item.label}</div>
                      <div className="text-[10px] text-[var(--text-muted)] truncate">
                        {item.subtitle}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Floating Background Pomodoro Mini-Player (When timer is running and not on Pomodoro view) */}
      {!(activeModule === 'plan' && planSubView === 'pomodoro') &&
        (pomodoroState.running || pomodoroState.elapsedFocusSeconds > 0) && (
          <div className="fixed bottom-16 lg:bottom-5 right-5 z-40 w-72 sage-card p-3.5 shadow-xl space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-[var(--accent)]">
                {pomodoroState.mode === 'focus'
                  ? pomodoroState.category
                  : pomodoroState.mode === 'short_break'
                  ? 'Short Break'
                  : 'Long Break'}
              </span>
              <button
                onClick={() => navigateTo('pomodoro')}
                className="text-[11px] text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              >
                Studio →
              </button>
            </div>

            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-xl font-bold font-mono tabular-nums">
                  {String(Math.floor(pomodoroState.remainingSeconds / 60)).padStart(2, '0')}:
                  {String(pomodoroState.remainingSeconds % 60).padStart(2, '0')}
                </div>
                <div className="text-[10px] text-[var(--text-muted)]">
                  Session #{pomodoroState.sessionNumber} ·{' '}
                  {Math.floor(pomodoroState.elapsedFocusSeconds / 60)}m focused
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={togglePomodoro}
                  className="px-3 py-1.5 rounded-lg bg-[var(--accent)] text-[#171E1B] text-xs font-semibold flex items-center gap-1"
                >
                  {pomodoroState.running ? (
                    <>
                      <Pause className="w-3 h-3" /> Pause
                    </>
                  ) : (
                    <>
                      <Play className="w-3 h-3" /> Resume
                    </>
                  )}
                </button>
                {pomodoroState.mode === 'focus' && (
                  <button
                    onClick={() => completePomodoroSession()}
                    className="p-1.5 rounded-lg bg-[var(--bg-secondary)] text-[#6EBF8B]"
                    title="Finish & Log Study Minutes"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

      {/* Contextual Spoon Feeder AI Slide-Over Drawer */}
      {showAiDrawer && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex justify-end"
          onClick={() => setShowAiDrawer(false)}
        >
          <div
            className="w-full max-w-xl h-full bg-[var(--bg-canvas)] border-l border-[var(--border-subtle)] p-5 overflow-y-auto shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-[var(--bg-secondary)] text-[var(--accent)] flex items-center justify-center">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-sm font-bold">
                    Spoon Feeder AI · {currentModuleMeta.label} Context
                  </h2>
                  <p className="text-[11px] text-[var(--text-muted)]">
                    Integrated assistant with read/write access &amp; PDF synthesis
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setShowAiDrawer(false);
                    navigateTo('spoon-feeder');
                  }}
                  className="px-2.5 py-1 rounded-lg bg-[var(--bg-card)] border border-[var(--border-subtle)] text-[11px] text-[var(--accent)]"
                >
                  Full workspace
                </button>
                <button
                  onClick={() => setShowAiDrawer(false)}
                  className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Contextual Module Suggestions */}
            <div className="p-3 rounded-xl bg-[var(--bg-card)] border border-[var(--border-subtle)] space-y-2">
              <p className="text-[11px] font-medium text-[var(--text-muted)]">
                Suggested actions for {currentModuleMeta.label}:
              </p>
              <div className="flex flex-wrap gap-1.5">
                {CONTEXTUAL_AI_PROMPTS[activeModule].map((prompt, idx) => (
                  <span
                    key={idx}
                    className="text-[11px] text-[var(--text-secondary)] bg-[var(--bg-secondary)]/60 px-2.5 py-1 rounded-lg"
                  >
                    &ldquo;{prompt}&rdquo;
                  </span>
                ))}
              </div>
            </div>

            <SpoonFeederPanel
              compact
              onNavigate={(dest) => {
                setShowAiDrawer(false);
                navigateTo(dest);
              }}
            />
          </div>
        </div>
      )}

      {/* Quick Add Modal */}
      {showQuickAdd && <QuickAddModal onClose={() => setShowQuickAdd(false)} />}

      {/* Global Search Modal (Ctrl + K) */}
      {showSearchModal && (
        <div
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-start justify-center pt-20 p-4"
          onClick={() => setShowSearchModal(false)}
        >
          <div
            className="sage-card max-w-2xl w-full p-5 shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 border-b border-[var(--border-subtle)] pb-3">
              <Search className="w-4 h-4 text-[var(--accent)]" />
              <input
                type="text"
                autoFocus
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search tasks, lectures, library notes, and calendar events..."
                className="w-full bg-transparent text-sm focus:outline-none"
              />
              <button
                onClick={() => setShowSearchModal(false)}
                className="text-xs text-[var(--text-muted)]"
              >
                Esc
              </button>
            </div>

            <div className="max-h-96 overflow-y-auto space-y-4">
              <div>
                <div className="text-xs font-semibold text-[var(--text-muted)] mb-1.5">
                  Tasks ({searchResults.matchedTasks.length})
                </div>
                {searchResults.matchedTasks.length === 0 ? (
                  <p className="text-xs text-[var(--text-muted)] pl-2">No matching tasks</p>
                ) : (
                  <div className="space-y-1">
                    {searchResults.matchedTasks.map((t) => (
                      <button
                        key={t.id}
                        onClick={() => {
                          navigateTo('tasks');
                          setShowSearchModal(false);
                        }}
                        className="w-full text-left px-3 py-2 rounded-xl hover:bg-[var(--bg-secondary)] flex items-center justify-between text-xs"
                      >
                        <span className="font-medium">{t.title}</span>
                        <span className="text-[var(--text-muted)]">
                          {t.category} · {t.status}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <div className="text-xs font-semibold text-[var(--text-muted)] mb-1.5">
                  Study Items ({searchResults.matchedStudy.length})
                </div>
                {searchResults.matchedStudy.length === 0 ? (
                  <p className="text-xs text-[var(--text-muted)] pl-2">No matching study items</p>
                ) : (
                  <div className="space-y-1">
                    {searchResults.matchedStudy.map((s) => (
                      <button
                        key={s.id}
                        onClick={() => {
                          navigateTo('study');
                          setShowSearchModal(false);
                        }}
                        className="w-full text-left px-3 py-2 rounded-xl hover:bg-[var(--bg-secondary)] flex items-center justify-between text-xs"
                      >
                        <span className="font-medium">{s.title}</span>
                        <span className="text-[var(--text-muted)]">
                          {s.itemType} · R{s.repetitionCount}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <div className="text-xs font-semibold text-[var(--text-muted)] mb-1.5">
                  Library &amp; Notes ({searchResults.matchedNotes.length})
                </div>
                {searchResults.matchedNotes.length === 0 ? (
                  <p className="text-xs text-[var(--text-muted)] pl-2">No matching library items</p>
                ) : (
                  <div className="space-y-1">
                    {searchResults.matchedNotes.map((k) => (
                      <button
                        key={k.id}
                        onClick={() => {
                          navigateTo('library');
                          setShowSearchModal(false);
                        }}
                        className="w-full text-left px-3 py-2 rounded-xl hover:bg-[var(--bg-secondary)] flex items-center justify-between text-xs"
                      >
                        <span className="font-medium">{k.title}</span>
                        <span className="text-[var(--text-muted)]">{k.itemType}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Global Level-Up Celebration Banner */}
      {levelUpBanner && (
        <div className="fixed bottom-20 lg:bottom-6 left-1/2 -translate-x-1/2 z-50 max-w-md w-[92%] bg-[#172A32] border-2 border-[#D7B779] rounded-2xl p-4 shadow-2xl text-[#E8DDC8] flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-[#D7B779]/20 border border-[#D7B779] flex items-center justify-center text-[#D7B779] shrink-0">
              <Gamepad2 className="w-6 h-6" />
            </div>
            <div>
              <div className="text-[10px] font-mono uppercase tracking-widest text-[#D7B779]">
                Level Up Unlocked!
              </div>
              <div className="text-sm font-bold">
                Reached Level {levelUpBanner.newLevel} · {levelUpBanner.rankTitle}
              </div>
              <div className="text-xs text-[#E8DDC8]/80">
                +{levelUpBanner.bonusCoins} Bonus Life Coins added to your wallet
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => {
                dismissLevelUpBanner();
                openRpgWorld('shop');
              }}
              className="px-3 py-1.5 rounded-lg bg-[#D7B779] text-[#172A32] text-xs font-bold"
            >
              Open RPG
            </button>
            <button
              onClick={dismissLevelUpBanner}
              className="p-1 text-[#E8DDC8]/60 hover:text-[#E8DDC8]"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Full-Screen Pixel-Art RPG Gamification World Modal */}
      {isRpgWorldOpen && (
        <RpgGamificationWorld
          isFullScreenModal
          initialTab={rpgWorldInitialTab}
          onCloseModal={closeRpgWorld}
        />
      )}
    </div>
  );
};

export default function App() {
  return (
    <LifeOSProvider>
      <LifeOSShell />
    </LifeOSProvider>
  );
}
