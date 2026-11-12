import React, { useState, useEffect, useMemo } from 'react';
import { LifeOSProvider, useLifeOS } from './context/LifeOSContext';
import { DashboardView } from './components/DashboardView';
import { CalendarTasksView } from './components/CalendarTasksView';
import { StudyView } from './components/StudyView';
import { LibraryView } from './components/LibraryView';
import { HealthView } from './components/HealthView';
import { FinanceView } from './components/FinanceView';
import { GoalsRankView } from './components/GoalsRankView';
import { AnalyticsView } from './components/AnalyticsView';
import { SpoonFeederPanel } from './components/SpoonFeederPanel';
import { SettingsView } from './components/SettingsView';
import { QuickAddModal } from './components/QuickAddModal';
import {
  LayoutGrid,
  Calendar,
  BookOpen,
  Library,
  HeartPulse,
  Wallet,
  Target,
  BarChart3,
  Sparkles,
  Settings,
  Search,
  Bell,
  Plus,
  Sun,
  Moon,
  LogOut,
  Menu,
  X,
} from 'lucide-react';

export type NavTab =
  | 'dashboard'
  | 'calendar'
  | 'study'
  | 'library'
  | 'health'
  | 'finance'
  | 'goals'
  | 'analytics'
  | 'spoon-feeder'
  | 'settings';

const NAV_ITEMS: { id: NavTab; label: string; icon: React.ComponentType<{ className?: string }> }[] =
  [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutGrid },
    { id: 'calendar', label: 'Calendar & Tasks', icon: Calendar },
    { id: 'study', label: 'Study', icon: BookOpen },
    { id: 'library', label: 'Library & Notes', icon: Library },
    { id: 'health', label: 'Health', icon: HeartPulse },
    { id: 'finance', label: 'Finance', icon: Wallet },
    { id: 'goals', label: 'Goals & Rank', icon: Target },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'spoon-feeder', label: 'Spoon Feeder AI', icon: Sparkles },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

const LifeOSShell: React.FC = () => {
  const {
    user,
    authReady,
    profile,
    tasks,
    events,
    studyItems,
    knowledgeItems,
    aiLogs,
    signIn,
    logOut,
  } = useLifeOS();

  const [activeTab, setActiveTab] = useState<NavTab>('dashboard');
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'light') {
      root.classList.add('light-theme');
    } else {
      root.classList.remove('light-theme');
    }
  }, [theme]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setShowSearchModal((prev) => !prev);
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'n') {
        e.preventDefault();
        setShowQuickAdd((prev) => !prev);
      } else if (e.key === 'Escape') {
        setShowQuickAdd(false);
        setShowSearchModal(false);
        setShowNotifications(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleToggleTheme = (newTheme: 'dark' | 'light') => {
    setTheme(newTheme);
  };

  // Real progress ring calculation
  const completedTasksCount = tasks.filter((t) => t.status === 'completed').length;
  const totalTasksCount = tasks.length;
  const dailyCompletionPct =
    totalTasksCount > 0 ? Math.round((completedTasksCount / totalTasksCount) * 100) : 0;

  // Due today count
  const todayStr = new Date().toISOString().split('T')[0];
  const dueTodayTasks = tasks.filter(
    (t) => t.status !== 'completed' && t.dueDate.startsWith(todayStr)
  );
  const pendingAiLogs = aiLogs.filter((l) => l.status === 'pending_approval');
  const dueRevisions = studyItems.filter((s) => s.status !== 'mastered');

  // Dynamic notifications from real state
  const notifications = useMemo(() => {
    const list: { id: string; title: string; subtitle: string; tab: NavTab; color: string }[] = [];
    for (const p of pendingAiLogs) {
      list.push({
        id: `ai-${p.id}`,
        title: `AI Approval Needed: ${p.toolName}`,
        subtitle: p.summary,
        tab: 'spoon-feeder',
        color: '#E5B567',
      });
    }
    for (const t of dueTodayTasks.slice(0, 4)) {
      list.push({
        id: `task-${t.id}`,
        title: `Task due today: ${t.title}`,
        subtitle: `${t.category} · ${t.estimatedMinutes}m · ${t.priority}`,
        tab: 'calendar',
        color: '#9BB9A2',
      });
    }
    for (const s of dueRevisions.slice(0, 3)) {
      list.push({
        id: `study-${s.id}`,
        title: `Study review pending: ${s.title}`,
        subtitle: `${s.itemType} · Stage R${s.repetitionCount}`,
        tab: 'study',
        color: '#D97777',
      });
    }
    return list;
  }, [pendingAiLogs, dueTodayTasks, dueRevisions]);

  // Global search results from real Firestore state
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

  if (!authReady) {
    return (
      <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] flex items-center justify-center">
        <div className="flex items-center gap-3">
          <div className="w-3 h-3 rounded-full bg-[#9BB9A2] animate-ping" />
          <span className="text-sm font-medium text-[var(--text-secondary)]">
            Loading Life OS workspace...
          </span>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-3xl p-8 shadow-2xl space-y-6 text-center">
          <div className="w-12 h-12 rounded-2xl bg-[#9BB9A2] text-[#0F1613] font-bold text-lg flex items-center justify-center mx-auto">
            LO
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-widest text-[var(--text-muted)]">
              PERSONAL OPERATING SYSTEM
            </p>
            <h1 className="text-2xl font-bold mt-1">Welcome to Life OS</h1>
            <p className="text-xs text-[var(--text-secondary)] mt-2 leading-relaxed">
              Unified workspace for Calendar, Tasks, Spaced Repetition Study, Health, Finance,
              Goals, and Spoon Feeder AI.
            </p>
          </div>
          <button
            onClick={signIn}
            className="w-full py-3 px-5 rounded-xl bg-[#9BB9A2] text-[#0F1613] font-semibold text-sm hover:opacity-90 transition-opacity"
          >
            Continue with Google
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] flex">
      {/* Sidebar (Desktop) */}
      <aside className="hidden lg:flex w-64 shrink-0 bg-[var(--bg-card)]/90 border-r border-[var(--border-subtle)] flex-col justify-between p-4 sticky top-0 h-screen">
        <div className="space-y-6">
          {/* Brand */}
          <div className="flex items-center gap-3 px-2 pt-1">
            <div className="w-9 h-9 rounded-xl bg-[#9BB9A2] text-[#0F1613] font-bold text-sm flex items-center justify-center">
              LO
            </div>
            <div>
              <div className="text-sm font-bold leading-tight">Life OS</div>
              <div className="text-[11px] text-[var(--text-muted)]">Personal system</div>
            </div>
          </div>

          {/* Nav Links */}
          <nav className="space-y-1">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all ${
                    isActive
                      ? 'bg-[var(--bg-secondary)] text-[var(--text-primary)] font-semibold border border-[#9BB9A2]/30'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]/50'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-[#9BB9A2]' : ''}`} />
                  <span>{item.label}</span>
                  {item.id === 'spoon-feeder' && pendingAiLogs.length > 0 && (
                    <span className="ml-auto px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-[#E5B567]/20 text-[#E5B567]">
                      {pendingAiLogs.length}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Bottom Progress Card */}
        <div className="space-y-3">
          <div className="p-3.5 rounded-2xl bg-[var(--bg-secondary)]/60 border border-[var(--border-subtle)] flex items-center gap-3">
            <div className="w-11 h-11 rounded-full border-2 border-[#9BB9A2] flex items-center justify-center text-xs font-bold shrink-0">
              {dailyCompletionPct}%
            </div>
            <div className="min-w-0">
              <div className="text-xs font-semibold truncate">
                {completedTasksCount} of {totalTasksCount} tasks done
              </div>
              <div className="text-[11px] text-[var(--text-muted)] truncate">
                Level {profile?.level ?? 1} · {profile?.streakDays ?? 0}d streak
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between px-2 text-xs text-[var(--text-muted)]">
            <span className="truncate max-w-[140px]">{profile?.displayName || user.email}</span>
            <button
              onClick={logOut}
              className="p-1.5 rounded-lg hover:bg-[var(--bg-secondary)] hover:text-[#D97777]"
              title="Sign out"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Column */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Bar */}
        <header className="sticky top-0 z-30 bg-[var(--bg-primary)]/85 backdrop-blur-md border-b border-[var(--border-subtle)] px-4 sm:px-8 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 flex-1 max-w-md">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-2 rounded-xl bg-[var(--bg-card)] border border-[var(--border-subtle)]"
            >
              <Menu className="w-4 h-4" />
            </button>

            {/* Search Trigger */}
            <button
              onClick={() => setShowSearchModal(true)}
              className="w-full flex items-center justify-between px-3.5 py-2 rounded-xl bg-[var(--bg-card)] border border-[var(--border-subtle)] text-xs text-[var(--text-muted)] hover:border-[#9BB9A2]/40 transition-colors"
            >
              <span className="flex items-center gap-2">
                <Search className="w-3.5 h-3.5" />
                Search tasks, lectures, notes...
              </span>
              <kbd className="px-1.5 py-0.5 rounded bg-[var(--bg-secondary)] text-[10px]">
                Ctrl K
              </kbd>
            </button>
          </div>

          {/* Right Actions */}
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setActiveTab('calendar')}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#E5B567]/15 text-[#E5B567] text-xs font-semibold"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-[#E5B567]" />
              {dueTodayTasks.length} due today
            </button>

            <button
              onClick={() => setShowQuickAdd(true)}
              className="px-3.5 py-2 rounded-xl bg-[var(--accent)] text-[#0F1613] text-xs font-semibold hover:opacity-90 flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>Quick add</span>
            </button>

            <button
              onClick={() => handleToggleTheme(theme === 'dark' ? 'light' : 'dark')}
              className="p-2 rounded-xl bg-[var(--bg-card)] border border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              title="Toggle theme"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            {/* Notifications Button */}
            <div className="relative">
              <button
                onClick={() => setShowNotifications((prev) => !prev)}
                className="p-2 rounded-xl bg-[var(--bg-card)] border border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] relative"
                title="Notifications"
              >
                <Bell className="w-4 h-4" />
                {notifications.length > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[#D97777] text-[#0F1613] text-[10px] font-bold flex items-center justify-center">
                    {notifications.length}
                  </span>
                )}
              </button>

              {showNotifications && (
                <div className="absolute right-0 mt-2 w-80 bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-2xl shadow-2xl p-4 z-50 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold">
                      Notifications ({notifications.length})
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
                            setActiveTab(n.tab);
                            setShowNotifications(false);
                          }}
                          className="w-full text-left p-2.5 rounded-xl bg-[var(--bg-secondary)]/50 hover:bg-[var(--bg-hover)] border border-[var(--border-subtle)] transition-colors"
                        >
                          <div className="flex items-center gap-2">
                            <span
                              className="w-2 h-2 rounded-full shrink-0"
                              style={{ backgroundColor: n.color }}
                            />
                            <span className="text-xs font-semibold truncate">{n.title}</span>
                          </div>
                          <p className="text-[11px] text-[var(--text-muted)] mt-0.5 truncate pl-4">
                            {n.subtitle}
                          </p>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Main Viewport */}
        <main className="flex-1 px-4 sm:px-8 pt-6 max-w-7xl w-full mx-auto">
          {activeTab === 'dashboard' && (
            <DashboardView
              onNavigate={(dest) => {
                if (dest === 'overview') setActiveTab('dashboard');
                else if (dest === 'tasks') setActiveTab('calendar');
                else if (dest === 'rank') setActiveTab('goals');
                else if (dest === 'spoon_feeder') setActiveTab('spoon-feeder');
                else setActiveTab(dest as NavTab);
              }}
              onOpenQuickAdd={() => setShowQuickAdd(true)}
              onOpenSpoonFeeder={() => setActiveTab('spoon-feeder')}
            />
          )}
          {activeTab === 'calendar' && <CalendarTasksView />}
          {activeTab === 'study' && <StudyView />}
          {activeTab === 'library' && <LibraryView />}
          {activeTab === 'health' && <HealthView />}
          {activeTab === 'finance' && <FinanceView />}
          {activeTab === 'goals' && <GoalsRankView />}
          {activeTab === 'analytics' && <AnalyticsView />}
          {activeTab === 'spoon-feeder' && <SpoonFeederPanel />}
          {activeTab === 'settings' && (
            <SettingsView theme={theme} onToggleTheme={handleToggleTheme} />
          )}
        </main>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        >
          <div
            className="w-64 h-full bg-[var(--bg-card)] p-4 flex flex-col justify-between"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold">Life OS</span>
                <button onClick={() => setMobileMenuOpen(false)}>
                  <X className="w-4 h-4" />
                </button>
              </div>
              <nav className="space-y-1">
                {NAV_ITEMS.map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        setActiveTab(item.id);
                        setMobileMenuOpen(false);
                      }}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium ${
                        activeTab === item.id
                          ? 'bg-[var(--bg-secondary)] text-[var(--text-primary)] font-semibold'
                          : 'text-[var(--text-secondary)]'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </nav>
            </div>
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
            className="bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-2xl max-w-2xl w-full p-5 shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 border-b border-[var(--border-subtle)] pb-3">
              <Search className="w-4 h-4 text-[#9BB9A2]" />
              <input
                type="text"
                autoFocus
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search across tasks, study items, library notes, and calendar events..."
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
              {/* Tasks */}
              <div>
                <div className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-1.5">
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
                          setActiveTab('calendar');
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

              {/* Study */}
              <div>
                <div className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-1.5">
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
                          setActiveTab('study');
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

              {/* Library */}
              <div>
                <div className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-1.5">
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
                          setActiveTab('library');
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
