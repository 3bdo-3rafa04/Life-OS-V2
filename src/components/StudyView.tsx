import React, { useState, useMemo } from 'react';
import { useLifeOS } from '../context/LifeOSContext.tsx';
import { StudyItemRecord } from '../types.ts';
import {
  FileText,
  Plus,
  X,
  Trash2,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  Tooltip,
} from 'recharts';

interface StudyViewProps {
  subPage?: string;
  onSubPageChange?: (sub: string) => void;
}

export const StudyView: React.FC<StudyViewProps> = ({
  subPage = 'modules',
  onSubPageChange,
}) => {
  const {
    studyModules,
    studyItems,
    todayDate,
    createStudyModule,
    deleteStudyModule,
    createStudyItem,
    deleteStudyItem,
    recordStudyFeedback,
    createCalendarEvent,
  } = useLifeOS();

  const [activeTab, setActiveTab] = useState<
    'modules' | 'schedule_import' | 'exams' | 'flashcards' | 'analytics'
  >(
    (subPage as 'modules' | 'schedule_import' | 'exams' | 'flashcards' | 'analytics') ||
      'modules'
  );

  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [aiSynthesisText, setAiSynthesisText] = useState<string | null>(null);
  const [synthesizing, setSynthesizing] = useState(false);

  // Modals
  const [showNewModuleModal, setShowNewModuleModal] = useState(false);
  const [showNewItemModal, setShowNewItemModal] = useState(false);
  const [showRecallModal, setShowRecallModal] = useState(false);
  const [recallIndex, setRecallIndex] = useState(0);
  const [cardAnswerRevealed, setCardAnswerRevealed] = useState(false);

  // New Module Form
  const [modCode, setModCode] = useState('');
  const [modTitle, setModTitle] = useState('');
  const [modTerm, setModTerm] = useState('Current Term');
  const [modExamDate, setModExamDate] = useState(todayDate);
  const [modTotalLectures, setModTotalLectures] = useState(12);

  // New Lecture / Flashcard Form
  const [itemModuleId, setItemModuleId] = useState('');
  const [itemType, setItemType] = useState<StudyItemRecord['itemType']>('lecture');
  const [itemTitle, setItemTitle] = useState('');
  const [itemMinutes, setItemMinutes] = useState(45);
  const [itemNotes, setItemNotes] = useState('');
  const [itemFront, setItemFront] = useState('');
  const [itemBack, setItemBack] = useState('');

  // Schedule Import state
  const [importText, setImportText] = useState('');
  const [importModuleId, setImportModuleId] = useState('');
  const [importing, setImporting] = useState(false);
  const [importSuccessMsg, setImportSuccessMsg] = useState<string | null>(null);

  const switchTab = (
    tab: 'modules' | 'schedule_import' | 'exams' | 'flashcards' | 'analytics'
  ) => {
    setActiveTab(tab);
    if (onSubPageChange) onSubPageChange(tab);
  };

  const lectures = studyItems.filter((s) => s.itemType === 'lecture');
  const flashcards = studyItems.filter((s) => s.itemType === 'flashcard');
  const dueItems = studyItems.filter(
    (s) => s.status === 'review_due' || s.nextReviewDate <= todayDate
  );

  const selectedItem =
    studyItems.find((s) => s.id === selectedItemId) || lectures[0] || studyItems[0] || null;

  const totalPlannedLectures = studyModules.reduce((acc, m) => acc + (m.totalLectures || 0), 0);
  const totalCompletedLectures = studyModules.reduce(
    (acc, m) => acc + (m.completedLectures || 0),
    0
  );
  const coveragePct =
    totalPlannedLectures > 0
      ? Math.round((totalCompletedLectures / totalPlannedLectures) * 100)
      : lectures.length > 0
      ? Math.round(
          (lectures.filter((l) => l.status !== 'unstudied').length / lectures.length) * 100
        )
      : 0;

  const avgConfidence =
    studyItems.length > 0
      ? (
          studyItems.reduce((acc, s) => acc + (s.confidenceRating || 3), 0) / studyItems.length
        ).toFixed(1)
      : '0.0';

  // Next upcoming exam
  const nextExamInfo = useMemo(() => {
    if (studyModules.length === 0) return null;
    const sorted = [...studyModules].sort((a, b) => a.examDate.localeCompare(b.examDate));
    const next = sorted[0];
    const diffMs = new Date(next.examDate).getTime() - new Date(todayDate).getTime();
    const days = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
    return { module: next, days };
  }, [studyModules, todayDate]);

  // 14-day review forecast computed from studyItems.nextReviewDate
  const forecastData = useMemo(() => {
    const arr: { day: string; due: number }[] = [];
    for (let i = 0; i < 14; i++) {
      const d = new Date();
      d.setDate(d.getDate() + i);
      const iso = d.toISOString().split('T')[0];
      const count = studyItems.filter((s) => s.nextReviewDate === iso).length;
      arr.push({ day: iso.slice(8, 10), due: count });
    }
    return arr;
  }, [studyItems]);

  const handleCreateModule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!modTitle.trim()) return;
    await createStudyModule({
      code: modCode.trim() || 'MOD101',
      title: modTitle.trim(),
      term: modTerm.trim() || 'Current Term',
      examDate: modExamDate || todayDate,
      totalLectures: modTotalLectures,
      completedLectures: 0,
    });
    setModCode('');
    setModTitle('');
    setShowNewModuleModal(false);
  };

  const handleCreateItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemTitle.trim()) return;
    const targetMod =
      studyModules.find((m) => m.id === itemModuleId) || studyModules[0];

    await createStudyItem({
      moduleId: targetMod?.id || '',
      moduleCode: targetMod?.code || 'GEN',
      title: itemTitle.trim(),
      itemType,
      status: 'unstudied',
      importance: 'high',
      estimatedMinutes: itemMinutes,
      confidenceRating: 3,
      repetitionCount: 0,
      nextReviewDate: todayDate,
      notes: itemNotes.trim() || undefined,
      frontPrompt: itemFront.trim() || undefined,
      backAnswer: itemBack.trim() || undefined,
    });
    setItemTitle('');
    setItemNotes('');
    setItemFront('');
    setItemBack('');
    setShowNewItemModal(false);
  };

  const handleSynthesizeSelected = async () => {
    if (!selectedItem) return;
    setSynthesizing(true);
    try {
      const res = await fetch('/api/ai/study-synthesis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          moduleCode: selectedItem.moduleCode,
          lectureTitle: selectedItem.title,
          rawContent:
            selectedItem.notes ||
            selectedItem.backAnswer ||
            `Study topic: ${selectedItem.title} in module ${selectedItem.moduleCode}`,
        }),
      });
      const data = await res.json();
      setAiSynthesisText(data.sourceSummary || data.result || 'Synthesized summary.');

      if (Array.isArray(data.flashcards)) {
        for (const fc of data.flashcards) {
          await createStudyItem({
            moduleId: selectedItem.moduleId,
            moduleCode: selectedItem.moduleCode,
            title: fc.frontPrompt.slice(0, 120),
            itemType: 'flashcard',
            status: 'review_due',
            importance: 'high',
            estimatedMinutes: 5,
            confidenceRating: 3,
            repetitionCount: 0,
            nextReviewDate: todayDate,
            frontPrompt: fc.frontPrompt,
            backAnswer: fc.backAnswer,
          });
        }
      }
    } finally {
      setSynthesizing(false);
    }
  };

  const handleImportScheduleLines = async () => {
    const lines = importText
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);
    if (lines.length === 0) return;
    setImporting(true);
    try {
      const targetMod =
        studyModules.find((m) => m.id === importModuleId) || studyModules[0];
      let modId = targetMod?.id || '';
      const modCodeStr = targetMod?.code || 'MOD';

      if (!modId) {
        modId = await createStudyModule({
          code: 'IMP101',
          title: 'Imported Study Module',
          term: 'Current Term',
          examDate: todayDate,
          totalLectures: lines.length,
          completedLectures: 0,
        });
      }

      for (const line of lines) {
        await createStudyItem({
          moduleId: modId,
          moduleCode: modCodeStr,
          title: line.slice(0, 180),
          itemType: 'lecture',
          status: 'unstudied',
          importance: 'high',
          estimatedMinutes: 45,
          confidenceRating: 3,
          repetitionCount: 0,
          nextReviewDate: todayDate,
        });
      }
      setImportSuccessMsg(`Imported ${lines.length} lectures into your Study workspace.`);
      setImportText('');
    } finally {
      setImporting(false);
    }
  };

  const recallDeck = flashcards.length > 0 ? flashcards : studyItems;
  const currentRecallCard = recallDeck[recallIndex % Math.max(1, recallDeck.length)] || null;

  return (
    <div className="space-y-5">
      {/* Header + Sub-page Tabs */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-[#E8EDE8]">Study</h1>
          <p className="text-xs text-[#9AA79E] mt-1">
            {studyModules.length} active modules · {lectures.length} lectures ·{' '}
            {flashcards.length} flashcards
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex items-center p-1 rounded-xl bg-[#222C27] border border-[#BDD3C1]/15 text-xs">
            {(
              [
                { id: 'modules', label: 'Modules' },
                { id: 'schedule_import', label: 'Schedule import' },
                { id: 'exams', label: 'Exams' },
                { id: 'flashcards', label: 'Flashcards' },
                { id: 'analytics', label: 'Analytics' },
              ] as const
            ).map((t) => (
              <button
                key={t.id}
                onClick={() => switchTab(t.id)}
                className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
                  activeTab === t.id
                    ? 'bg-[#9BB9A2] text-[#171E1B] font-semibold'
                    : 'text-[#9AA79E] hover:text-[#E8EDE8]'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          <button
            onClick={() => setShowNewModuleModal(true)}
            className="px-3.5 py-2 rounded-xl bg-[#2C3932] hover:bg-[#35453C] text-[#E8EDE8] text-xs font-medium"
          >
            + Module
          </button>
          <button
            onClick={() => setShowNewItemModal(true)}
            className="px-4 py-2 rounded-xl bg-[#9BB9A2] hover:bg-[#a9c5b0] text-[#171E1B] text-xs font-semibold transition-colors"
          >
            + Lecture / Card
          </button>
        </div>
      </div>

      {/* TAB 1: MODULES */}
      {activeTab === 'modules' && (
        <div className="space-y-5">
          {/* 4 KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="sage-card p-4">
              <p className="text-xs text-[#9AA79E]">Coverage</p>
              <p className="text-2xl font-bold text-[#E8EDE8] mt-1">{coveragePct}%</p>
              <p className="text-xs text-[#9BB9A2] mt-1">
                {totalCompletedLectures} of {totalPlannedLectures || lectures.length} lectures
              </p>
            </div>
            <div className="sage-card p-4">
              <p className="text-xs text-[#9AA79E]">Avg recall confidence</p>
              <p className="text-2xl font-bold text-[#E8EDE8] mt-1">{avgConfidence} / 5</p>
              <p className="text-xs text-[#9BB9A2] mt-1">Across {studyItems.length} items</p>
            </div>
            <div className="sage-card p-4">
              <p className="text-xs text-[#9AA79E]">Revisions due</p>
              <p className="text-2xl font-bold text-[#E8EDE8] mt-1">{dueItems.length}</p>
              <p className="text-xs text-[#D8B26E] mt-1">Spaced-repetition queue</p>
            </div>
            <div className="sage-card p-4">
              <p className="text-xs text-[#9AA79E]">Next exam</p>
              <p className="text-2xl font-bold text-[#E8EDE8] mt-1">
                {nextExamInfo ? `${nextExamInfo.days} d` : '—'}
              </p>
              <p className="text-xs text-[#9AA79E] mt-1">
                {nextExamInfo
                  ? `${nextExamInfo.module.code} · ${nextExamInfo.module.examDate}`
                  : 'Add a module with an exam date'}
              </p>
            </div>
          </div>

          {/* Active Modules Grid */}
          {studyModules.length > 0 ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {studyModules.map((mod) => {
                const modItems = studyItems.filter((s) => s.moduleId === mod.id);
                const pct =
                  mod.totalLectures > 0
                    ? Math.round((mod.completedLectures / mod.totalLectures) * 100)
                    : 0;
                return (
                  <div key={mod.id} className="sage-card p-5 space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <h2 className="text-base font-semibold text-[#E8EDE8]">
                          {mod.code} · {mod.title}
                        </h2>
                        <p className="text-xs text-[#9AA79E] mt-0.5">
                          {mod.totalLectures} lectures · Exam {mod.examDate} · {mod.term}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-[#9BB9A2]/20 text-[#9BB9A2]">
                          {pct}%
                        </span>
                        <button
                          onClick={() => deleteStudyModule(mod.id)}
                          className="text-[#65756B] hover:text-[#D97A6C]"
                          title="Delete module"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <div className="w-full h-2 rounded-full bg-[#171E1B] overflow-hidden">
                      <div
                        className="h-full rounded-full bg-[#9BB9A2]"
                        style={{ width: `${Math.min(100, pct)}%` }}
                      />
                    </div>

                    <div className="flex items-center justify-between text-xs text-[#9AA79E]">
                      <span>
                        {mod.completedLectures} / {mod.totalLectures} done
                      </span>
                      <span>{modItems.length} items</span>
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                      <button
                        onClick={() => {
                          setItemModuleId(mod.id);
                          setShowNewItemModal(true);
                        }}
                        className="px-3.5 py-1.5 rounded-lg bg-[#9BB9A2] text-[#171E1B] text-xs font-semibold"
                      >
                        + Add lecture
                      </button>
                      <button
                        onClick={() => setShowRecallModal(true)}
                        className="px-3 py-1.5 rounded-lg bg-[#2C3932] text-[#E8EDE8] text-xs"
                      >
                        Practice recall
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="sage-card p-8 text-center space-y-3">
              <p className="text-sm font-semibold text-[#E8EDE8]">No study modules created yet</p>
              <p className="text-xs text-[#9AA79E]">
                Create your first academic module to track lectures, spaced repetition, and exam
                readiness.
              </p>
              <button
                onClick={() => setShowNewModuleModal(true)}
                className="px-4 py-2 rounded-xl bg-[#9BB9A2] text-[#171E1B] text-xs font-semibold"
              >
                + Create first module
              </button>
            </div>
          )}

          {/* Split Lecture List + Detail Inspector */}
          {studyItems.length > 0 && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
              <div className="lg:col-span-5 sage-card p-4 space-y-2">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xs font-semibold text-[#E8EDE8]">
                    Study items ({studyItems.length})
                  </h3>
                  <button
                    onClick={() => setShowNewItemModal(true)}
                    className="text-[11px] text-[#9BB9A2] hover:underline"
                  >
                    + New
                  </button>
                </div>

                {studyItems.map((item, idx) => {
                  const isSelected = selectedItem?.id === item.id;
                  return (
                    <div
                      key={item.id}
                      onClick={() => {
                        setSelectedItemId(item.id);
                        setAiSynthesisText(null);
                      }}
                      className={`p-3 rounded-xl flex items-center justify-between cursor-pointer transition-all ${
                        isSelected
                          ? 'bg-[#2C3932] border border-[#9BB9A2]/50'
                          : 'bg-[#1C2520]/60 border border-[#BDD3C1]/8 hover:bg-[#2C3932]/50'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="text-xs font-mono font-bold text-[#9BB9A2]">
                          {String(idx + 1).padStart(2, '0')}
                        </span>
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-[#E8EDE8] truncate">
                            {item.title}
                          </p>
                          <p className="text-[10px] text-[#9AA79E]">
                            {item.moduleCode} · {item.itemType} · {item.estimatedMinutes}m
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#9BB9A2]/20 text-[#9BB9A2] capitalize">
                          {item.status.replace('_', ' ')}
                        </span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteStudyItem(item.id);
                          }}
                          className="text-[#65756B] hover:text-[#D97A6C]"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {selectedItem && (
                <div className="lg:col-span-7 sage-card p-5 space-y-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="text-base font-semibold text-[#E8EDE8]">
                        {selectedItem.title}
                      </h3>
                      <p className="text-xs text-[#9AA79E] mt-0.5">
                        Module: {selectedItem.moduleCode} · Next review:{' '}
                        {selectedItem.nextReviewDate} · Reps: {selectedItem.repetitionCount}
                      </p>
                    </div>
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-semibold bg-[#9BB9A2]/20 text-[#9BB9A2] uppercase">
                      {selectedItem.itemType}
                    </span>
                  </div>

                  <div className="p-4 rounded-xl bg-[#2C3932]/75 border border-[#BDD3C1]/15 space-y-2.5">
                    <span className="text-xs font-semibold text-[#E8EDE8]">
                      Source notes &amp; AI synthesis
                    </span>
                    <p className="text-xs text-[#E8EDE8]/90 leading-relaxed whitespace-pre-wrap">
                      {selectedItem.notes ||
                        selectedItem.backAnswer ||
                        'No notes added yet. Click "Synthesize & create flashcards" to generate study points.'}
                    </p>

                    {aiSynthesisText && (
                      <div className="mt-3 pt-3 border-t border-[#BDD3C1]/15 text-xs text-[#9BB9A2]">
                        {aiSynthesisText}
                      </div>
                    )}

                    <div className="flex flex-wrap items-center gap-2 pt-2">
                      <button
                        onClick={handleSynthesizeSelected}
                        disabled={synthesizing}
                        className="px-3.5 py-1.5 rounded-lg bg-[#9BB9A2] text-[#171E1B] text-xs font-semibold"
                      >
                        {synthesizing
                          ? 'Synthesizing...'
                          : 'Synthesize & create flashcards'}
                      </button>
                    </div>
                  </div>

                  {/* Spaced Repetition Rating */}
                  <div className="pt-2 border-t border-[#BDD3C1]/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="text-xs text-[#9AA79E]">
                      <p className="font-semibold text-[#E8EDE8] mb-0.5">
                        Rate recall to schedule next FSRS review
                      </p>
                      <p>
                        Current confidence: {selectedItem.confidenceRating}/5 · Stability:{' '}
                        {selectedItem.stabilityDays || 1}d
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {(
                        [
                          { label: 'Again', rating: 1 },
                          { label: 'Hard', rating: 2 },
                          { label: 'Good', rating: 4 },
                          { label: 'Easy', rating: 5 },
                        ] as const
                      ).map((r) => (
                        <button
                          key={r.label}
                          onClick={() =>
                            recordStudyFeedback(
                              selectedItem,
                              r.rating,
                              selectedItem.estimatedMinutes || 30
                            )
                          }
                          className={`px-3 py-1.5 rounded-lg text-xs font-medium ${
                            r.label === 'Good'
                              ? 'bg-[#9BB9A2] text-[#171E1B] font-semibold'
                              : 'bg-[#2C3932] text-[#E8EDE8] hover:bg-[#35453C]'
                          }`}
                        >
                          {r.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: SCHEDULE IMPORT */}
      {activeTab === 'schedule_import' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          <div className="lg:col-span-5 sage-card p-5 space-y-4">
            <div>
              <h2 className="text-sm font-semibold text-[#E8EDE8]">
                1. Paste or import lecture list
              </h2>
              <p className="text-xs text-[#9AA79E] mt-0.5">
                Enter one lecture topic per line to batch-create study items
              </p>
            </div>

            {studyModules.length > 0 && (
              <div>
                <label className="block text-xs text-[#9AA79E] mb-1">Target Module</label>
                <select
                  value={importModuleId}
                  onChange={(e) => setImportModuleId(e.target.value)}
                  className="w-full sage-input px-3 py-2 text-xs"
                >
                  {studyModules.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.code} — {m.title}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <textarea
              rows={7}
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
              placeholder={'Lecture 01: Introduction\nLecture 02: Core Mechanisms\nLecture 03: Clinical Applications'}
              className="w-full sage-input p-3.5 text-xs"
            />

            {importSuccessMsg && (
              <p className="text-xs text-[#9BB9A2]">{importSuccessMsg}</p>
            )}

            <button
              onClick={handleImportScheduleLines}
              disabled={importing || !importText.trim()}
              className="w-full py-2.5 rounded-xl bg-[#9BB9A2] text-[#171E1B] text-xs font-semibold disabled:opacity-50"
            >
              {importing ? 'Importing...' : 'Confirm & create lectures'}
            </button>
          </div>

          <div className="lg:col-span-7 sage-card p-5">
            <h2 className="text-sm font-semibold text-[#E8EDE8] mb-3">
              2. Preview lines to import
            </h2>
            {importText.trim() ? (
              <div className="space-y-2">
                {importText
                  .split('\n')
                  .map((l) => l.trim())
                  .filter(Boolean)
                  .map((line, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-xl bg-[#2C3932]/75 flex items-center justify-between text-xs"
                    >
                      <span className="text-[#E8EDE8] font-medium">{line}</span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] bg-[#9BB9A2]/20 text-[#9BB9A2]">
                        Ready
                      </span>
                    </div>
                  ))}
              </div>
            ) : (
              <div className="py-12 text-center text-xs text-[#65756B]">
                <FileText className="w-7 h-7 text-[#9BB9A2] mx-auto mb-2 opacity-60" />
                Paste lecture titles on the left to preview extracted items before saving.
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: EXAMS */}
      {activeTab === 'exams' && (
        <div className="space-y-5">
          {studyModules.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {studyModules.map((mod) => {
                const pct =
                  mod.totalLectures > 0
                    ? Math.round((mod.completedLectures / mod.totalLectures) * 100)
                    : 0;
                const diffDays = Math.max(
                  0,
                  Math.ceil(
                    (new Date(mod.examDate).getTime() - new Date(todayDate).getTime()) /
                      (1000 * 60 * 60 * 24)
                  )
                );
                return (
                  <div key={mod.id} className="sage-card p-5 space-y-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="text-sm font-semibold text-[#E8EDE8]">
                          {mod.code} — {mod.title}
                        </h3>
                        <p className="text-[11px] text-[#9AA79E] mt-0.5">
                          Exam date: {mod.examDate}
                        </p>
                      </div>
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-[#9BB9A2]/20 text-[#9BB9A2]">
                        {diffDays} days
                      </span>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 rounded-full border-4 border-[#9BB9A2] flex flex-col items-center justify-center shrink-0">
                        <span className="text-sm font-bold text-[#E8EDE8]">{pct}%</span>
                        <span className="text-[9px] text-[#9AA79E]">Ready</span>
                      </div>
                      <div className="text-xs space-y-1 text-[#9AA79E]">
                        <p>
                          Coverage:{' '}
                          <span className="text-[#E8EDE8]">
                            {mod.completedLectures} / {mod.totalLectures} lectures
                          </span>
                        </p>
                        <p>
                          Term: <span className="text-[#E8EDE8]">{mod.term}</span>
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="sage-card p-8 text-center text-xs text-[#9AA79E]">
              Add a module with an exam date to track exam readiness and countdowns.
            </div>
          )}
        </div>
      )}

      {/* TAB 4: FLASHCARDS */}
      {activeTab === 'flashcards' && (
        <div className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="sage-card p-4">
              <p className="text-xs text-[#9AA79E]">Due today</p>
              <p className="text-2xl font-bold text-[#E8EDE8] mt-1">{dueItems.length}</p>
            </div>
            <div className="sage-card p-4">
              <p className="text-xs text-[#9AA79E]">Flashcards</p>
              <p className="text-2xl font-bold text-[#E8EDE8] mt-1">{flashcards.length}</p>
            </div>
            <div className="sage-card p-4">
              <p className="text-xs text-[#9AA79E]">Mastered</p>
              <p className="text-2xl font-bold text-[#E8EDE8] mt-1">
                {studyItems.filter((s) => s.status === 'mastered').length}
              </p>
            </div>
            <div className="sage-card p-4">
              <p className="text-xs text-[#9AA79E]">Total study items</p>
              <p className="text-2xl font-bold text-[#E8EDE8] mt-1">{studyItems.length}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            <div className="lg:col-span-6 sage-card p-5 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-[#E8EDE8]">Flashcard queue</h3>
                {studyItems.length > 0 && (
                  <button
                    onClick={() => setShowRecallModal(true)}
                    className="px-3 py-1 rounded-lg bg-[#9BB9A2] text-[#171E1B] text-xs font-semibold"
                  >
                    Start active recall
                  </button>
                )}
              </div>

              {flashcards.length > 0 ? (
                flashcards.map((fc) => (
                  <div
                    key={fc.id}
                    onClick={() => setShowRecallModal(true)}
                    className="p-3.5 rounded-xl bg-[#2C3932]/80 border border-[#BDD3C1]/12 hover:border-[#9BB9A2]/40 flex items-center justify-between cursor-pointer"
                  >
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-[#E8EDE8] truncate">
                        {fc.frontPrompt || fc.title}
                      </p>
                      <p className="text-[11px] text-[#9AA79E]">
                        {fc.moduleCode} · Next review: {fc.nextReviewDate}
                      </p>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteStudyItem(fc.id);
                      }}
                      className="text-[#65756B] hover:text-[#D97A6C] ml-2"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))
              ) : (
                <p className="text-xs text-[#9AA79E] py-6 text-center">
                  No flashcards yet. Click &ldquo;+ Lecture / Card&rdquo; or synthesize a lecture to
                  generate cards.
                </p>
              )}
            </div>

            <div className="lg:col-span-6 sage-card p-5">
              <h3 className="text-sm font-semibold text-[#E8EDE8] mb-3">
                14-day review forecast
              </h3>
              <div className="h-44">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={forecastData}>
                    <XAxis
                      dataKey="day"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: '#65756B', fontSize: 10 }}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#171E1B',
                        borderColor: 'rgba(189,211,193,0.2)',
                        borderRadius: '8px',
                        fontSize: '11px',
                      }}
                    />
                    <Bar dataKey="due" fill="#9BB9A2" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: ANALYTICS */}
      {activeTab === 'analytics' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          <div className="lg:col-span-6 sage-card p-5 space-y-3">
            <h3 className="text-sm font-semibold text-[#E8EDE8]">
              Low-confidence topics (Confidence ≤ 3)
            </h3>
            {studyItems.filter((s) => s.confidenceRating <= 3).length > 0 ? (
              studyItems
                .filter((s) => s.confidenceRating <= 3)
                .map((w) => (
                  <div
                    key={w.id}
                    className="p-3 rounded-xl bg-[#2C3932]/75 flex items-center justify-between gap-2 text-xs"
                  >
                    <div>
                      <p className="font-semibold text-[#E8EDE8]">{w.title}</p>
                      <p className="text-[11px] text-[#D8B26E]">
                        Confidence {w.confidenceRating} / 5 · {w.moduleCode}
                      </p>
                    </div>
                    <button
                      onClick={async () => {
                        await createCalendarEvent({
                          title: `Revision: ${w.title}`,
                          eventType: 'study_block',
                          date: todayDate,
                          startTime: '16:00',
                          endTime: '16:45',
                          isProtectedAnchor: false,
                        });
                      }}
                      className="px-3 py-1.5 rounded-lg bg-[#9BB9A2] text-[#171E1B] text-[11px] font-semibold shrink-0"
                    >
                      Schedule 45m
                    </button>
                  </div>
                ))
            ) : (
              <p className="text-xs text-[#9AA79E] py-4">
                No weak topics flagged right now.
              </p>
            )}
          </div>

          <div className="lg:col-span-6 sage-card p-5 space-y-3">
            <h3 className="text-sm font-semibold text-[#E8EDE8]">Study summary</h3>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between py-2 border-b border-[#BDD3C1]/10">
                <span className="text-[#9AA79E]">Active modules</span>
                <span className="text-[#E8EDE8] font-semibold">{studyModules.length}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-[#BDD3C1]/10">
                <span className="text-[#9AA79E]">Lectures tracked</span>
                <span className="text-[#E8EDE8] font-semibold">{lectures.length}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-[#BDD3C1]/10">
                <span className="text-[#9AA79E]">Flashcards tracked</span>
                <span className="text-[#E8EDE8] font-semibold">{flashcards.length}</span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-[#9AA79E]">Average confidence rating</span>
                <span className="text-[#9BB9A2] font-semibold">{avgConfidence} / 5</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* New Module Modal */}
      {showNewModuleModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={handleCreateModule}
            className="w-full max-w-md rounded-2xl bg-[#222C27] border border-[#BDD3C1]/25 p-6 space-y-4"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-[#E8EDE8]">New Study Module</h3>
              <button
                type="button"
                onClick={() => setShowNewModuleModal(false)}
                className="text-[#9AA79E]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs text-[#9AA79E] mb-1">Code</label>
                <input
                  type="text"
                  required
                  value={modCode}
                  onChange={(e) => setModCode(e.target.value)}
                  placeholder="OPHTH"
                  className="w-full sage-input px-3 py-2 text-xs"
                />
              </div>
              <div className="col-span-2">
                <label className="block text-xs text-[#9AA79E] mb-1">Title</label>
                <input
                  type="text"
                  required
                  value={modTitle}
                  onChange={(e) => setModTitle(e.target.value)}
                  placeholder="Module title..."
                  className="w-full sage-input px-3 py-2 text-xs"
                />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs text-[#9AA79E] mb-1">Term</label>
                <input
                  type="text"
                  value={modTerm}
                  onChange={(e) => setModTerm(e.target.value)}
                  className="w-full sage-input px-3 py-2 text-xs"
                />
              </div>
              <div>
                <label className="block text-xs text-[#9AA79E] mb-1">Exam Date</label>
                <input
                  type="date"
                  value={modExamDate}
                  onChange={(e) => setModExamDate(e.target.value)}
                  className="w-full sage-input px-3 py-2 text-xs"
                />
              </div>
              <div>
                <label className="block text-xs text-[#9AA79E] mb-1">Total Lectures</label>
                <input
                  type="number"
                  min={1}
                  max={500}
                  value={modTotalLectures}
                  onChange={(e) => setModTotalLectures(Number(e.target.value))}
                  className="w-full sage-input px-3 py-2 text-xs"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowNewModuleModal(false)}
                className="px-4 py-2 rounded-xl bg-[#2C3932] text-xs text-[#9AA79E]"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-[#9BB9A2] text-[#171E1B] text-xs font-semibold"
              >
                Create module
              </button>
            </div>
          </form>
        </div>
      )}

      {/* New Study Item Modal */}
      {showNewItemModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={handleCreateItem}
            className="w-full max-w-md rounded-2xl bg-[#222C27] border border-[#BDD3C1]/25 p-6 space-y-4"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-[#E8EDE8]">
                Add Lecture or Flashcard
              </h3>
              <button
                type="button"
                onClick={() => setShowNewItemModal(false)}
                className="text-[#9AA79E]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-[#9AA79E] mb-1">Type</label>
                <select
                  value={itemType}
                  onChange={(e) =>
                    setItemType(e.target.value as StudyItemRecord['itemType'])
                  }
                  className="w-full sage-input px-3 py-2 text-xs"
                >
                  <option value="lecture">Lecture</option>
                  <option value="flashcard">Flashcard</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-[#9AA79E] mb-1">Est. Minutes</label>
                <input
                  type="number"
                  min={1}
                  max={600}
                  value={itemMinutes}
                  onChange={(e) => setItemMinutes(Number(e.target.value))}
                  className="w-full sage-input px-3 py-2 text-xs"
                />
              </div>
            </div>
            {studyModules.length > 0 && (
              <div>
                <label className="block text-xs text-[#9AA79E] mb-1">Module</label>
                <select
                  value={itemModuleId}
                  onChange={(e) => setItemModuleId(e.target.value)}
                  className="w-full sage-input px-3 py-2 text-xs"
                >
                  {studyModules.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.code} — {m.title}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <div>
              <label className="block text-xs text-[#9AA79E] mb-1">Title / Prompt</label>
              <input
                type="text"
                required
                value={itemTitle}
                onChange={(e) => setItemTitle(e.target.value)}
                placeholder="Topic title or flashcard question..."
                className="w-full sage-input px-3 py-2 text-xs"
              />
            </div>
            {itemType === 'flashcard' ? (
              <div>
                <label className="block text-xs text-[#9AA79E] mb-1">Back Answer</label>
                <textarea
                  rows={3}
                  value={itemBack}
                  onChange={(e) => setItemBack(e.target.value)}
                  placeholder="Grounded answer..."
                  className="w-full sage-input p-3 text-xs"
                />
              </div>
            ) : (
              <div>
                <label className="block text-xs text-[#9AA79E] mb-1">
                  Lecture Notes (for AI synthesis)
                </label>
                <textarea
                  rows={3}
                  value={itemNotes}
                  onChange={(e) => setItemNotes(e.target.value)}
                  placeholder="Paste lecture notes or key takeaways..."
                  className="w-full sage-input p-3 text-xs"
                />
              </div>
            )}
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowNewItemModal(false)}
                className="px-4 py-2 rounded-xl bg-[#2C3932] text-xs text-[#9AA79E]"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-[#9BB9A2] text-[#171E1B] text-xs font-semibold"
              >
                Save item
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Active Recall Session Modal */}
      {showRecallModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-xl rounded-2xl bg-[#222C27] border border-[#BDD3C1]/25 p-6 space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-[#E8EDE8]">Active recall session</h2>
                <p className="text-xs text-[#9AA79E]">
                  {recallDeck.length > 0
                    ? `Item ${(recallIndex % recallDeck.length) + 1} of ${recallDeck.length}`
                    : 'No items in deck'}
                </p>
              </div>
              <button
                onClick={() => setShowRecallModal(false)}
                className="p-1.5 rounded-lg text-[#9AA79E] hover:text-[#E8EDE8]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {currentRecallCard ? (
              <div className="rounded-2xl bg-[#1C2520] border border-[#BDD3C1]/15 p-5 space-y-4">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-[#9BB9A2]/20 text-[#9BB9A2]">
                  {currentRecallCard.moduleCode} · {currentRecallCard.itemType.toUpperCase()}
                </span>
                <h3 className="text-sm font-semibold text-[#E8EDE8]">
                  {currentRecallCard.frontPrompt || currentRecallCard.title}
                </h3>

                {cardAnswerRevealed ? (
                  <div className="p-4 rounded-xl bg-[#2C3932] border border-[#9BB9A2]/30 space-y-2 text-xs text-[#E8EDE8]">
                    <p className="text-[10px] font-semibold uppercase text-[#9BB9A2]">ANSWER</p>
                    <p>
                      {currentRecallCard.backAnswer ||
                        currentRecallCard.notes ||
                        'Review completed.'}
                    </p>
                  </div>
                ) : (
                  <button
                    onClick={() => setCardAnswerRevealed(true)}
                    className="w-full py-6 rounded-xl bg-[#2C3932]/60 border border-dashed border-[#BDD3C1]/25 text-xs text-[#9BB9A2] font-semibold"
                  >
                    Click to reveal answer
                  </button>
                )}

                <div className="grid grid-cols-4 gap-2 pt-2">
                  {(
                    [
                      { label: 'Again', rating: 1 },
                      { label: 'Hard', rating: 2 },
                      { label: 'Good', rating: 4 },
                      { label: 'Easy', rating: 5 },
                    ] as const
                  ).map((b) => (
                    <button
                      key={b.label}
                      onClick={async () => {
                        await recordStudyFeedback(currentRecallCard, b.rating, 15);
                        setCardAnswerRevealed(false);
                        setRecallIndex((i) => i + 1);
                      }}
                      className={`py-2 rounded-xl text-xs font-semibold ${
                        b.label === 'Good'
                          ? 'bg-[#9BB9A2] text-[#171E1B]'
                          : 'bg-[#2C3932] text-[#E8EDE8]'
                      }`}
                    >
                      {b.label}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-xs text-[#9AA79E] text-center py-6">
                Add flashcards or lectures first to start an active recall session.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
