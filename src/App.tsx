/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  Calendar,
  BookOpen,
  Activity,
  Wallet,
  Library,
  Target,
  Award,
  BarChart3,
  Sparkles,
  Plus,
  Sun,
  Moon,
  LogOut,
  MoreHorizontal,
  ShieldCheck,
} from 'lucide-react';
import { LifeOSProvider, useLifeOS } from './context/LifeOSContext.tsx';
import { NavDestination } from './types.ts';
import { DashboardView } from './components/DashboardView.tsx';
import { CalendarTasksView } from './components/CalendarTasksView.tsx';
import { StudyView } from './components/StudyView.tsx';
import { HealthView } from './components/HealthView.tsx';
import { FinanceView } from './components/FinanceView.tsx';
import { LibraryView } from './components/LibraryView.tsx';
import { GoalsRankView } from './components/GoalsRankView.tsx';
import { AnalyticsView } from './components/AnalyticsView.tsx';
import { SpoonFeederPanel } from './components/SpoonFeederPanel.tsx';
import { QuickAddModal } from './components/QuickAddModal.tsx';
import { PWAInstallButton, OfflineIndicator } from './components/PWAInstallButton.tsx';

const NAV_ITEMS: { id: NavDestination; label: string; icon: React.FC<{ className?: string }> }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'calendar', label: 'Calendar & Tasks', icon: Calendar },
  { id: 'study', label: 'Study', icon: BookOpen },
  { id: 'health', label: 'Health & Fitness', icon: Activity },
  { id: 'finance', label: 'Finance', icon: Wallet },
  { id: 'library', label: 'Library', icon: Library },
  { id: 'goals', label: 'Goals & Habits', icon: Target },
  { id: 'rank', label: 'Rank & Rewards', icon: Award },
  { id: 'analytics', label: 'Analytics', icon: BarChart3 },
  { id: 'spoon_feeder', label: 'Spoon Feeder AI', icon: Sparkles },
];

const LifeOSShell: React.FC = () => {
  const { user, authReady, profile, aiLogs, signIn, logOut } = useLifeOS();

  const [activeNav, setActiveNav] = useState<NavDestination>('dashboard');
  const [darkMode, setDarkMode] = useState(true);
  const [quickAddTab, setQuickAddTab] = useState<
    'task' | 'event' | 'expense' | 'workout' | 'note' | null
  >(null);
  const [spoonDrawerOpen, setSpoonDrawerOpen] = useState(false);
  const [mobileMoreOpen, setMobileMoreOpen] = useState(false);

  useEffect(() => {
    const root = document.documentElement;
    if (darkMode) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [darkMode]);

  if (!authReady) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-400 text-sm">
        Initializing Life OS Workspace...
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col justify-between bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
        {/* Clean 3-Zone Top Bar Contract */}
        <header className="flex items-center justify-between gap-8 px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          <a
            href="#top"
            className="text-lg font-bold tracking-tight text-slate-900 dark:text-slate-100 whitespace-nowrap shrink-0"
          >
            Life OS
          </a>

          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600 dark:text-slate-400">
            <a href="#modules" className="hover:text-slate-900 dark:hover:text-slate-100 transition-colors whitespace-nowrap shrink-0">
              Modules
            </a>
            <a href="#scheduling" className="hover:text-slate-900 dark:hover:text-slate-100 transition-colors whitespace-nowrap shrink-0">
              Scheduling
            </a>
            <a href="#study" className="hover:text-slate-900 dark:hover:text-slate-100 transition-colors whitespace-nowrap shrink-0">
              Study FSRS
            </a>
            <a href="#security" className="hover:text-slate-900 dark:hover:text-slate-100 transition-colors whitespace-nowrap shrink-0">
              Safeguards
            </a>
          </nav>

          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={signIn}
              className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 rounded-lg hover:bg-emerald-500 transition-colors whitespace-nowrap shrink-0"
            >
              Sign In with Google
            </button>
          </div>
        </header>

        <main className="max-w-5xl mx-auto px-6 py-16 space-y-12">
          <div className="max-w-2xl space-y-5">
            <div className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
              Private Single-Owner Operating System · Firestore Row-Level Security
            </div>
            <h1 className="text-3xl sm:text-5xl font-bold tracking-tight text-slate-900 dark:text-slate-100 leading-tight">
              One connected system for study, health, finances, and everyday life.
            </h1>
            <p className="text-base text-slate-600 dark:text-slate-300 leading-relaxed">
              Life OS connects your calendar, prayer-time-aware task scheduling, FSRS spaced-repetition lectures, body measurements, workouts, exact minor-unit finances, learning library, and Spoon Feeder AI into a single private workspace.
            </p>
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button
                onClick={signIn}
                className="px-6 py-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold transition-colors whitespace-nowrap shrink-0"
              >
                Launch Your Private Workspace
              </button>
              <PWAInstallButton />
            </div>
          </div>

          <div
            id="modules"
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 pt-6 border-t border-slate-200 dark:border-slate-800"
          >
            {[
              {
                title: '01. Prayer-Aware Scheduling',
                desc: 'Unified calendar and tasks with protected prayer anchors (MWL/ISNA), preparation buffers, and conflict detection.',
              },
              {
                title: '02. Study & FSRS Recall',
                desc: 'Academic modules, exam readiness forecasts, active-recall flashcards, and source-grounded AI synthesis.',
              },
              {
                title: '03. Fair 5-Dimension Rating',
                desc: 'Explainable daily ratings across Commitment, Completion, Consistency, Accuracy, and Wellbeing without punishing illness or blockers.',
              },
              {
                title: '04. Health & Fitness Pillars',
                desc: 'Body measurements, workout volume/RPE tracking synced to calendar, and estimated macronutrient meal logs.',
              },
              {
                title: '05. Exact Minor-Unit Finance',
                desc: 'Transactions, category budgets, and savings goals stored in exact integer cents with CSV export.',
              },
              {
                title: '06. Spoon Feeder AI Safeguards',
                desc: 'Autonomous operator with 4-tier permissions: Read, Routine Write, Consequential approval previews, and full undo logs.',
              },
            ].map((feat) => (
              <div
                key={feat.title}
                className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5"
              >
                <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  {feat.title}
                </h3>
                <p className="mt-2 text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  {feat.desc}
                </p>
              </div>
            ))}
          </div>
        </main>

        <footer className="px-6 py-6 border-t border-slate-200 dark:border-slate-800 text-xs text-slate-500 flex items-center justify-between">
          <span>Life OS Complete Product Implementation</span>
          <span className="flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" /> Private Owner-Only Access
          </span>
        </footer>
      </div>
    );
  }

  const currentNavObj = NAV_ITEMS.find((n) => n.id === activeNav) || NAV_ITEMS[0];
  const pendingApprovalCount = aiLogs.filter((l) => l.status === 'pending_approval').length;

  return (
    <div className="min-h-screen flex bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      <OfflineIndicator />

      {/* Desktop Left Sidebar (260px) */}
      <aside className="hidden lg:flex flex-col w-64 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shrink-0">
        <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <span className="text-base font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Life OS
          </span>
          <span className="text-xs font-mono tabular-nums text-emerald-600 dark:text-emerald-400">
            Lv.{profile?.level || 2} · {profile?.coins || 120}c
          </span>
        </div>

        {/* Persistent Quick-Add Action */}
        <div className="p-4">
          <button
            onClick={() => setQuickAddTab('task')}
            className="w-full py-2 px-3 rounded-lg bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-xs font-semibold flex items-center justify-center gap-1.5 hover:opacity-90 transition-opacity"
          >
            <Plus className="w-3.5 h-3.5" /> Quick Capture
          </button>
        </div>

        {/* 10 Top-Level Information Architecture Destinations */}
        <nav className="flex-1 px-3 space-y-1 overflow-y-auto">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = activeNav === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveNav(item.id)}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
                  active
                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-slate-100'
                }`}
              >
                <span className="flex items-center gap-2.5">
                  <Icon className="w-4 h-4 shrink-0" />
                  {item.label}
                </span>
                {item.id === 'spoon_feeder' && pendingApprovalCount > 0 && (
                  <span className="font-mono text-[11px] text-amber-600 dark:text-amber-400">
                    {pendingApprovalCount}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Bottom User & Theme Controls */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 space-y-3">
          <div className="flex items-center justify-between text-xs">
            <span className="truncate max-w-[140px] font-medium text-slate-700 dark:text-slate-300">
              {profile?.displayName || user.email}
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setDarkMode(!darkMode)}
                className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                title="Toggle Light / Dark Theme"
              >
                {darkMode ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
              </button>
              <button
                onClick={logOut}
                className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:text-rose-500"
                title="Sign Out"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 pb-16 lg:pb-0">
        {/* SaaS Top Header Bar (Breadcrumb on Left, Primary Actions on Right) */}
        <header className="flex items-center justify-between gap-8 px-6 py-3.5 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          <div className="text-sm font-semibold text-slate-900 dark:text-slate-100 whitespace-nowrap shrink-0">
            Life OS / {currentNavObj.label}
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <PWAInstallButton />
            <button
              onClick={() => setDarkMode(!darkMode)}
              className="lg:hidden p-2 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300"
              title="Toggle theme"
            >
              {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            <button
              onClick={() => setQuickAddTab('task')}
              className="px-3.5 py-1.5 rounded-lg bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-xs font-semibold hover:opacity-90 transition-opacity whitespace-nowrap shrink-0"
            >
              + Quick Add
            </button>
          </div>
        </header>

        {/* Active Module Viewport */}
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6">
          {activeNav === 'dashboard' && (
            <DashboardView
              onNavigate={setActiveNav}
              onOpenQuickAdd={(tab) => setQuickAddTab(tab || 'task')}
              onOpenSpoonFeeder={() => setActiveNav('spoon_feeder')}
            />
          )}
          {activeNav === 'calendar' && <CalendarTasksView />}
          {activeNav === 'study' && <StudyView />}
          {activeNav === 'health' && <HealthView />}
          {activeNav === 'finance' && <FinanceView />}
          {activeNav === 'library' && <LibraryView />}
          {activeNav === 'goals' && <GoalsRankView mode="goals" />}
          {activeNav === 'rank' && <GoalsRankView mode="rank" />}
          {activeNav === 'analytics' && <AnalyticsView />}
          {activeNav === 'spoon_feeder' && <SpoonFeederPanel isFullScreenPage />}
        </main>
      </div>

      {/* Floating Spoon Feeder AI Control (Accessible from every screen except full-screen AI page) */}
      {activeNav !== 'spoon_feeder' && (
        <div className="fixed bottom-20 lg:bottom-6 right-4 z-40">
          {spoonDrawerOpen ? (
            <SpoonFeederPanel onCloseDrawer={() => setSpoonDrawerOpen(false)} />
          ) : (
            <button
              onClick={() => setSpoonDrawerOpen(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-lg transition-transform hover:scale-105"
            >
              <Sparkles className="w-4 h-4" />
              <span>Spoon Feeder AI</span>
              {pendingApprovalCount > 0 && (
                <span className="ml-1 font-mono bg-white/20 px-1.5 py-0.5 rounded-full text-[10px]">
                  {pendingApprovalCount}
                </span>
              )}
            </button>
          )}
        </div>
      )}

      {/* Mobile Bottom Navigation (Home, Calendar, Study, Library, More) */}
      <nav className="lg:hidden fixed bottom-0 inset-x-0 z-30 h-14 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 grid grid-cols-5 items-center px-2">
        {[
          { id: 'dashboard' as NavDestination, label: 'Home', icon: LayoutDashboard },
          { id: 'calendar' as NavDestination, label: 'Calendar', icon: Calendar },
          { id: 'study' as NavDestination, label: 'Study', icon: BookOpen },
          { id: 'library' as NavDestination, label: 'Library', icon: Library },
        ].map((item) => {
          const Icon = item.icon;
          const active = activeNav === item.id;
          return (
            <button
              key={item.id}
              onClick={() => {
                setActiveNav(item.id);
                setMobileMoreOpen(false);
              }}
              className={`flex flex-col items-center justify-center py-1 text-[11px] font-medium ${
                active
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-slate-500 dark:text-slate-400'
              }`}
            >
              <Icon className="w-4 h-4 mb-0.5" />
              <span>{item.label}</span>
            </button>
          );
        })}

        <button
          onClick={() => setMobileMoreOpen(!mobileMoreOpen)}
          className="flex flex-col items-center justify-center py-1 text-[11px] font-medium text-slate-500 dark:text-slate-400"
        >
          <MoreHorizontal className="w-4 h-4 mb-0.5" />
          <span>More</span>
        </button>
      </nav>

      {/* Mobile "More" Secondary Modules Sheet */}
      {mobileMoreOpen && (
        <div className="lg:hidden fixed inset-0 z-40 bg-black/50 flex items-end pb-14">
          <div className="w-full rounded-t-xl bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 p-4 space-y-2">
            <div className="text-xs font-semibold text-slate-500 px-2">Secondary Modules</div>
            <div className="grid grid-cols-2 gap-2">
              {NAV_ITEMS.slice(3).map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      setActiveNav(item.id);
                      setMobileMoreOpen(false);
                    }}
                    className="flex items-center gap-2 p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 text-xs font-medium text-slate-800 dark:text-slate-200"
                  >
                    <Icon className="w-4 h-4 text-emerald-500" />
                    {item.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Universal Quick-Add Modal */}
      {quickAddTab && (
        <QuickAddModal
          initialTab={quickAddTab}
          onClose={() => setQuickAddTab(null)}
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
