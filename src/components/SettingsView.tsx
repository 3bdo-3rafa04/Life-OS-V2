import React, { useState, useEffect } from 'react';
import { useLifeOS } from '../context/LifeOSContext';
import { UserProfile } from '../types';
import { Trash2, Download, Check } from 'lucide-react';

interface SettingsViewProps {
  theme: 'dark' | 'light';
  onToggleTheme: (t: 'dark' | 'light') => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({ theme, onToggleTheme }) => {
  const {
    profile,
    tasks,
    events,
    studyModules,
    studyItems,
    healthLogs,
    financeRecords,
    knowledgeItems,
    goalsHabits,
    dailyReviews,
    updateProfileSettings,
    clearAllWorkspaceData,
  } = useLifeOS();

  const [displayName, setDisplayName] = useState(profile?.displayName || '');
  const [currency, setCurrency] = useState(profile?.currency || 'USD');
  const [city, setCity] = useState(profile?.city || 'Cairo');
  const [prayerMethod, setPrayerMethod] = useState<NonNullable<UserProfile['prayerMethod']>>(
    profile?.prayerMethod || 'Egypt'
  );
  const [prayerBufferMinutes, setPrayerBufferMinutes] = useState(
    profile?.prayerBufferMinutes ?? 15
  );
  const [calorieTarget, setCalorieTarget] = useState(profile?.calorieTarget ?? 2300);
  const [proteinTargetGrams, setProteinTargetGrams] = useState(
    profile?.proteinTargetGrams ?? 150
  );
  const [waterTargetMl, setWaterTargetMl] = useState(profile?.waterTargetMl ?? 3000);
  const [aiRoutineAutoApprove, setAiRoutineAutoApprove] = useState(
    profile?.aiRoutineAutoApprove ?? true
  );

  const [savedToast, setSavedToast] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [resetting, setResetting] = useState(false);

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.displayName || '');
      setCurrency(profile.currency || 'USD');
      setCity(profile.city || 'Cairo');
      setPrayerMethod(profile.prayerMethod || 'Egypt');
      setPrayerBufferMinutes(profile.prayerBufferMinutes ?? 15);
      setCalorieTarget(profile.calorieTarget ?? 2300);
      setProteinTargetGrams(profile.proteinTargetGrams ?? 150);
      setWaterTargetMl(profile.waterTargetMl ?? 3000);
      setAiRoutineAutoApprove(profile.aiRoutineAutoApprove ?? true);
    }
  }, [profile]);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    await updateProfileSettings({
      displayName: displayName.trim() || 'User',
      currency,
      city: city.trim() || 'Cairo',
      prayerMethod,
      prayerBufferMinutes: Number(prayerBufferMinutes) || 15,
      calorieTarget: Number(calorieTarget) || 2300,
      proteinTargetGrams: Number(proteinTargetGrams) || 150,
      waterTargetMl: Number(waterTargetMl) || 3000,
      aiRoutineAutoApprove,
    });
    setSavedToast(true);
    setTimeout(() => setSavedToast(false), 3000);
  };

  const handleExportJSON = () => {
    const dump = {
      exportedAt: new Date().toISOString(),
      profile,
      tasks,
      events,
      studyModules,
      studyItems,
      healthLogs,
      financeRecords,
      knowledgeItems,
      goalsHabits,
      dailyReviews,
    };
    const blob = new Blob([JSON.stringify(dump, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `life-os-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleClearAll = async () => {
    setResetting(true);
    try {
      await clearAllWorkspaceData();
      setConfirmReset(false);
    } finally {
      setResetting(false);
    }
  };

  const totalRecordsCount =
    tasks.length +
    events.length +
    studyModules.length +
    studyItems.length +
    healthLogs.length +
    financeRecords.length +
    knowledgeItems.length +
    goalsHabits.length +
    dailyReviews.length;

  return (
    <div className="space-y-6 pb-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-widest text-[var(--text-muted)]">
            SETTINGS · APPEARANCE · PRAYER · AI · DATA
          </p>
          <h1 className="text-2xl font-bold tracking-tight mt-0.5">Make Life OS yours</h1>
        </div>
        {savedToast && (
          <div className="px-4 py-2 rounded-xl bg-[#6EBF8B]/20 text-[#6EBF8B] text-xs font-semibold flex items-center gap-1.5">
            <Check className="w-4 h-4" /> Settings saved to Firestore
          </div>
        )}
      </div>

      <form onSubmit={handleSaveSettings} className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column */}
        <div className="lg:col-span-6 space-y-6">
          {/* Profile & Regional */}
          <div className="bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-2xl p-6 space-y-4">
            <h2 className="text-base font-bold">Profile &amp; Regional</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-[var(--text-muted)] mb-1">Display name</label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-subtle)] text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-[var(--text-muted)] mb-1">Base currency</label>
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-subtle)] text-sm"
                >
                  <option value="USD">USD ($)</option>
                  <option value="EGP">EGP (E£)</option>
                  <option value="EUR">EUR (€)</option>
                  <option value="GBP">GBP (£)</option>
                  <option value="SAR">SAR (﷼)</option>
                  <option value="AED">AED (د.إ)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Appearance */}
          <div className="bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-2xl p-6 space-y-4">
            <h2 className="text-base font-bold">Appearance</h2>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => onToggleTheme('dark')}
                className={`p-4 rounded-xl border text-left transition-all ${
                  theme === 'dark'
                    ? 'bg-[#222C27] border-[#9BB9A2] text-[#F0F4F1]'
                    : 'bg-[var(--bg-secondary)] border-[var(--border-subtle)] text-[var(--text-secondary)]'
                }`}
              >
                <div className="text-sm font-bold">Sage Dark Glass</div>
                <div className="text-[11px] opacity-75 mt-0.5">#171E1B · Warm Sage</div>
              </button>
              <button
                type="button"
                onClick={() => onToggleTheme('light')}
                className={`p-4 rounded-xl border text-left transition-all ${
                  theme === 'light'
                    ? 'bg-white border-[#4F7A5A] text-[#17201C]'
                    : 'bg-[var(--bg-secondary)] border-[var(--border-subtle)] text-[var(--text-secondary)]'
                }`}
              >
                <div className="text-sm font-bold">Warm Ivory Light</div>
                <div className="text-[11px] opacity-75 mt-0.5">#F7F7F2 · Crisp Sage</div>
              </button>
            </div>
          </div>

          {/* Health Targets */}
          <div className="bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-2xl p-6 space-y-4">
            <h2 className="text-base font-bold">Daily Health Targets</h2>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs text-[var(--text-muted)] mb-1">Calories (kcal)</label>
                <input
                  type="number"
                  value={calorieTarget}
                  onChange={(e) => setCalorieTarget(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-subtle)] text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-[var(--text-muted)] mb-1">Protein (g)</label>
                <input
                  type="number"
                  value={proteinTargetGrams}
                  onChange={(e) => setProteinTargetGrams(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-subtle)] text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-[var(--text-muted)] mb-1">Water (ml)</label>
                <input
                  type="number"
                  value={waterTargetMl}
                  onChange={(e) => setWaterTargetMl(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-subtle)] text-sm"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div className="lg:col-span-6 space-y-6">
          {/* Prayer Time Anchors */}
          <div className="bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-2xl p-6 space-y-4">
            <h2 className="text-base font-bold">Prayer Time Schedule Anchors</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs text-[var(--text-muted)] mb-1">City</label>
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-subtle)] text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-[var(--text-muted)] mb-1">Method</label>
                <select
                  value={prayerMethod}
                  onChange={(e) =>
                    setPrayerMethod(e.target.value as NonNullable<UserProfile['prayerMethod']>)
                  }
                  className="w-full px-3 py-2 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-subtle)] text-sm"
                >
                  <option value="Egypt">Egyptian General Authority</option>
                  <option value="MWL">Muslim World League</option>
                  <option value="Makkah">Umm al-Qura (Makkah)</option>
                  <option value="ISNA">ISNA (North America)</option>
                  <option value="Karachi">Karachi</option>
                  <option value="Tehran">Tehran</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-[var(--text-muted)] mb-1">Buffer (min)</label>
                <input
                  type="number"
                  min={5}
                  max={45}
                  value={prayerBufferMinutes}
                  onChange={(e) => setPrayerBufferMinutes(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-subtle)] text-sm"
                />
              </div>
            </div>
          </div>

          {/* Spoon Feeder AI Rules */}
          <div className="bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-2xl p-6 space-y-4">
            <h2 className="text-base font-bold">Spoon Feeder AI Permissions</h2>
            <label className="flex items-center justify-between p-3.5 rounded-xl bg-[var(--bg-secondary)]/50 border border-[var(--border-subtle)] cursor-pointer">
              <div>
                <div className="text-xs font-semibold">Auto-apply routine actions</div>
                <div className="text-[11px] text-[var(--text-muted)]">
                  Tasks, study blocks, and health logs save immediately; finance and full-day
                  rebalances still require preview approval.
                </div>
              </div>
              <input
                type="checkbox"
                checked={aiRoutineAutoApprove}
                onChange={(e) => setAiRoutineAutoApprove(e.target.checked)}
                className="w-4 h-4 accent-[#9BB9A2]"
              />
            </label>
          </div>

          {/* Data & Security */}
          <div className="bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold">Data &amp; Security</h2>
                <p className="text-xs text-[var(--text-muted)]">
                  {totalRecordsCount} live records stored in your isolated Firestore workspace
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={handleExportJSON}
                className="px-4 py-2 rounded-xl bg-[var(--bg-secondary)] hover:bg-[var(--bg-hover)] text-xs font-semibold flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" /> Export Full JSON Backup
              </button>

              {!confirmReset ? (
                <button
                  type="button"
                  onClick={() => setConfirmReset(true)}
                  className="px-4 py-2 rounded-xl bg-[#D97777]/15 text-[#D97777] hover:bg-[#D97777]/25 text-xs font-semibold flex items-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Clear all workspace data
                </button>
              ) : (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={resetting}
                    onClick={handleClearAll}
                    className="px-3 py-2 rounded-xl bg-[#D97777] text-[#0F1613] text-xs font-bold"
                  >
                    {resetting ? 'Clearing...' : 'Confirm Wipe All Data'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmReset(false)}
                    className="px-3 py-2 rounded-xl bg-[var(--bg-secondary)] text-xs"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              className="px-6 py-2.5 rounded-xl bg-[var(--accent)] text-[#0F1613] text-xs font-semibold hover:opacity-90"
            >
              Save All Settings
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};
