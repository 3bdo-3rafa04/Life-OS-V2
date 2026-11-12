import React, { useState } from 'react';
import { BookOpen, Sparkles, Plus, Brain, CheckCircle2, HelpCircle } from 'lucide-react';
import { useLifeOS } from '../context/LifeOSContext.tsx';
import { StudyItemRecord } from '../types.ts';

export const StudyView: React.FC = () => {
  const {
    studyModules,
    studyItems,
    todayDate,
    createStudyModule,
    createStudyItem,
    recordStudyFeedback,
  } = useLifeOS();

  // New Module State
  const [modCode, setModCode] = useState('');
  const [modTitle, setModTitle] = useState('');
  const [modExamDate, setModExamDate] = useState('2026-12-18');
  const [modTotalLectures, setModTotalLectures] = useState(12);

  // New Lecture / Study Item State
  const [selectedModId, setSelectedModId] = useState('');
  const [lectureTitle, setLectureTitle] = useState('');
  const [lectureMinutes, setLectureMinutes] = useState(45);
  const [rawNotesToSynthesize, setRawNotesToSynthesize] = useState('');
  const [synthesizing, setSynthesizing] = useState(false);
  const [synthesisOutput, setSynthesisOutput] = useState<{
    sourceSummary: string;
    additionalExplanation: string;
    estimatedMinutes: number;
    flashcards: { frontPrompt: string; backAnswer: string }[];
  } | null>(null);

  // Active Recall Flashcard Quiz State
  const [activeCard, setActiveCard] = useState<StudyItemRecord | null>(null);
  const [revealAnswer, setRevealAnswer] = useState(false);

  const handleAddModule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!modCode.trim() || !modTitle.trim()) return;
    const id = await createStudyModule({
      code: modCode.toUpperCase(),
      title: modTitle,
      term: 'Current Term',
      examDate: modExamDate,
      targetGrade: 'A',
      totalLectures: Number(modTotalLectures) || 12,
      completedLectures: 0,
    });
    if (id) setSelectedModId(id);
    setModCode('');
    setModTitle('');
  };

  const handleAddLecture = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetModId = selectedModId || studyModules[0]?.id;
    if (!targetModId || !lectureTitle.trim()) return;
    const modObj = studyModules.find((m) => m.id === targetModId);

    await createStudyItem({
      moduleId: targetModId,
      moduleCode: modObj?.code || 'MOD',
      title: lectureTitle,
      itemType: 'lecture',
      status: 'unstudied',
      importance: 'high',
      estimatedMinutes: Number(lectureMinutes) || 45,
      confidenceRating: 3,
      stabilityDays: 1,
      repetitionCount: 0,
      nextReviewDate: todayDate,
      notes: rawNotesToSynthesize || undefined,
    });
    setLectureTitle('');
  };

  const handleRunAiStudySynthesis = async () => {
    if (!rawNotesToSynthesize.trim()) return;
    setSynthesizing(true);
    try {
      const targetMod = studyModules.find((m) => m.id === (selectedModId || studyModules[0]?.id));
      const res = await fetch('/api/ai/study-synthesis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          moduleCode: targetMod?.code || 'ACADEMIC',
          lectureTitle: lectureTitle || 'Uploaded Lecture Notes',
          rawContent: rawNotesToSynthesize,
        }),
      });
      const data = await res.json();
      if (data.sourceSummary) {
        setSynthesisOutput(data);
      }
    } catch {
      // Handled gracefully
    } finally {
      setSynthesizing(false);
    }
  };

  const handleSaveGeneratedFlashcards = async () => {
    if (!synthesisOutput) return;
    const targetModId = selectedModId || studyModules[0]?.id;
    if (!targetModId) return;
    const modObj = studyModules.find((m) => m.id === targetModId);

    for (const fc of synthesisOutput.flashcards) {
      await createStudyItem({
        moduleId: targetModId,
        moduleCode: modObj?.code || 'MOD',
        title: `Flashcard: ${fc.frontPrompt.slice(0, 60)}`,
        itemType: 'flashcard',
        status: 'review_due',
        importance: 'high',
        estimatedMinutes: 10,
        confidenceRating: 3,
        stabilityDays: 1,
        repetitionCount: 0,
        nextReviewDate: todayDate,
        frontPrompt: fc.frontPrompt,
        backAnswer: fc.backAnswer,
        sourceRef: lectureTitle || 'Source-Grounded Extraction',
      });
    }
    setSynthesisOutput(null);
    setRawNotesToSynthesize('');
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">
            Academic Study Planner & FSRS Spaced Repetition
          </h1>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Coordinate lectures, active-recall flashcards, and exam countdowns. Spoon Feeder AI clearly separates source-grounded summaries from additional intuition.
          </p>
        </div>
      </div>

      {/* Academic Modules & Exam Readiness Forecast */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {studyModules.map((mod) => {
          const pct =
            mod.totalLectures > 0
              ? Math.round((mod.completedLectures / mod.totalLectures) * 100)
              : 0;
          const daysUntilExam = Math.max(
            0,
            Math.ceil(
              (new Date(mod.examDate).getTime() - new Date(todayDate).getTime()) /
                (1000 * 60 * 60 * 24)
            )
          );
          const remainingLectures = Math.max(0, mod.totalLectures - mod.completedLectures);
          const workloadFits = daysUntilExam >= remainingLectures;

          return (
            <div
              key={mod.id}
              className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                  <span className="font-mono font-semibold text-emerald-600 dark:text-emerald-400">
                    {mod.code}
                  </span>
                  <span className="font-mono tabular-nums">
                    Exam: {mod.examDate} ({daysUntilExam}d left)
                  </span>
                </div>
                <h3 className="mt-1.5 text-base font-semibold text-slate-900 dark:text-slate-100">
                  {mod.title}
                </h3>
                <div className="mt-3 flex justify-between text-xs text-slate-500 font-mono tabular-nums">
                  <span>
                    Coverage: {mod.completedLectures}/{mod.totalLectures} lectures
                  </span>
                  <span>{pct}%</span>
                </div>
                <div className="mt-1.5 h-2 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                  <div className="h-full bg-emerald-500" style={{ width: `${pct}%` }} />
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400">
                Forecast:{' '}
                <span
                  className={
                    workloadFits
                      ? 'text-emerald-600 dark:text-emerald-400 font-medium'
                      : 'text-amber-600 dark:text-amber-400 font-medium'
                  }
                >
                  {workloadFits
                    ? 'Remaining workload fits available calendar days'
                    : 'Tight schedule — prioritize daily revisions'}
                </span>
              </div>
            </div>
          );
        })}

        {/* Add Module Card */}
        <form
          onSubmit={handleAddModule}
          className="rounded-xl border border-dashed border-slate-300 dark:border-slate-800 bg-white/50 dark:bg-slate-900/40 p-5 space-y-3"
        >
          <div className="text-xs font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
            <Plus className="w-3.5 h-3.5" /> Add Academic Module & Exam Date
          </div>
          <div className="grid grid-cols-2 gap-2">
            <input
              type="text"
              required
              value={modCode}
              onChange={(e) => setModCode(e.target.value)}
              placeholder="Code (e.g. MATH202)"
              className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-2.5 py-1.5 text-xs text-slate-900 dark:text-slate-100"
            />
            <input
              type="date"
              required
              value={modExamDate}
              onChange={(e) => setModExamDate(e.target.value)}
              className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-2.5 py-1.5 text-xs font-mono text-slate-900 dark:text-slate-100"
            />
          </div>
          <input
            type="text"
            required
            value={modTitle}
            onChange={(e) => setModTitle(e.target.value)}
            placeholder="Module Title (e.g. Linear Algebra & Optimization)"
            className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-2.5 py-1.5 text-xs text-slate-900 dark:text-slate-100"
          />
          <div className="flex items-center justify-between">
            <input
              type="number"
              min={1}
              max={100}
              value={modTotalLectures}
              onChange={(e) => setModTotalLectures(Number(e.target.value))}
              className="w-24 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-2.5 py-1.5 text-xs font-mono text-slate-900 dark:text-slate-100"
              title="Total Lectures"
            />
            <button
              type="submit"
              className="px-3 py-1.5 rounded-lg bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-xs font-semibold"
            >
              Create Module
            </button>
          </div>
        </form>
      </div>

      {/* Row 2: Spaced-Repetition Queue (FSRS) + AI Study Material Synthesizer */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left 7 Columns: FSRS Revision & Lecture Queue */}
        <div className="lg:col-span-7 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Brain className="w-4 h-4 text-emerald-500" />
                Spaced-Repetition & Lecture Queue
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Rate your recall confidence (1–5) after studying to dynamically calculate the next FSRS review interval.
              </p>
            </div>
          </div>

          {studyItems.length === 0 ? (
            <p className="py-8 text-center text-xs text-slate-500">
              No lectures or flashcards yet. Add a lecture or synthesize study material on the right.
            </p>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
              {studyItems.map((item) => {
                const isDue = item.nextReviewDate <= todayDate;
                return (
                  <div key={item.id} className="py-4 space-y-2">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <div className="text-sm font-medium text-slate-900 dark:text-slate-100">
                          [{item.moduleCode}] {item.title}
                        </div>
                        <div className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                          <span className="capitalize">{item.itemType}</span>
                          <span aria-hidden="true"> · </span>
                          <span
                            className={
                              isDue
                                ? 'text-amber-600 dark:text-amber-400 font-medium'
                                : 'text-emerald-600 dark:text-emerald-400'
                            }
                          >
                            Next Review: {item.nextReviewDate}
                          </span>
                          <span aria-hidden="true"> · </span>
                          <span className="font-mono tabular-nums">
                            Stability: {item.stabilityDays || 1}d ({item.repetitionCount} reps)
                          </span>
                          {item.sourceRef && (
                            <>
                              <span aria-hidden="true"> · </span>
                              <span>Source: {item.sourceRef}</span>
                            </>
                          )}
                        </div>
                      </div>

                      {item.frontPrompt && (
                        <button
                          onClick={() => {
                            setActiveCard(item);
                            setRevealAnswer(false);
                          }}
                          className="px-3 py-1 rounded-lg border border-slate-200 dark:border-slate-800 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-1 self-start sm:self-center shrink-0"
                        >
                          <HelpCircle className="w-3.5 h-3.5 text-emerald-500" />
                          Active Recall Quiz
                        </button>
                      )}
                    </div>

                    {item.notes && (
                      <p className="text-xs text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-950/60 p-2.5 rounded-lg">
                        {item.notes}
                      </p>
                    )}

                    {/* Quick Recall Rating Buttons */}
                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      <span className="text-xs text-slate-500 dark:text-slate-400 mr-1">
                        Log Recall Quality:
                      </span>
                      {[
                        { r: 1, label: '1 · Forgot (1d)' },
                        { r: 2, label: '2 · Hard (1.2x)' },
                        { r: 3, label: '3 · Good (2.2x)' },
                        { r: 4, label: '4 · Strong (3.2x)' },
                        { r: 5, label: '5 · Mastered (4.5x)' },
                      ].map((btn) => (
                        <button
                          key={btn.r}
                          onClick={() => recordStudyFeedback(item, btn.r, item.estimatedMinutes)}
                          className="px-2.5 py-1 rounded border border-slate-200 dark:border-slate-800 text-xs font-mono text-slate-700 dark:text-slate-300 hover:bg-emerald-600 hover:text-white hover:border-emerald-600 transition-colors"
                        >
                          {btn.label}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right 5 Columns: Add Lecture & Source-Grounded AI Synthesizer */}
        <div className="lg:col-span-5 space-y-6">
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6">
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-emerald-500" />
              Add Lecture & AI Source-Grounded Synthesis
            </h2>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Paste syllabus topics or lecture notes to extract flashcards and schedule revisions.
            </p>

            <form onSubmit={handleAddLecture} className="mt-4 space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <select
                  value={selectedModId}
                  onChange={(e) => setSelectedModId(e.target.value)}
                  className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-xs text-slate-900 dark:text-slate-100"
                >
                  {studyModules.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.code} — {m.title}
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  min={10}
                  max={240}
                  value={lectureMinutes}
                  onChange={(e) => setLectureMinutes(Number(e.target.value))}
                  placeholder="Est. Minutes"
                  className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-xs font-mono text-slate-900 dark:text-slate-100"
                />
              </div>

              <input
                type="text"
                required
                value={lectureTitle}
                onChange={(e) => setLectureTitle(e.target.value)}
                placeholder="Lecture Title (e.g., Lecture 6: Paxos & Multi-Paxos)"
                className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-xs text-slate-900 dark:text-slate-100"
              />

              <textarea
                rows={4}
                value={rawNotesToSynthesize}
                onChange={(e) => setRawNotesToSynthesize(e.target.value)}
                placeholder="Paste lecture transcript, PDF excerpt, or study notes here..."
                className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-3 text-xs text-slate-900 dark:text-slate-100"
              />

              <div className="flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={handleRunAiStudySynthesis}
                  disabled={synthesizing || !rawNotesToSynthesize.trim()}
                  className="px-3 py-2 rounded-lg border border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 text-xs font-semibold flex items-center gap-1.5 hover:bg-emerald-500/20 disabled:opacity-50"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  {synthesizing ? 'Extracting...' : 'AI Summarize & Generate Flashcards'}
                </button>

                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-xs font-semibold"
                >
                  Save Lecture
                </button>
              </div>
            </form>

            {/* AI Synthesis Preview (Source-Grounded vs Additional Intuition) */}
            {synthesisOutput && (
              <div className="mt-6 pt-5 border-t border-slate-200 dark:border-slate-800 space-y-4">
                <div>
                  <div className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                    Source-Grounded Summary (Directly from your notes)
                  </div>
                  <p className="mt-1 text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                    {synthesisOutput.sourceSummary}
                  </p>
                </div>

                <div>
                  <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                    Additional AI Explanation (External context)
                  </div>
                  <p className="mt-1 text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                    {synthesisOutput.additionalExplanation}
                  </p>
                </div>

                <div className="space-y-2">
                  <div className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                    Generated Active-Recall Flashcards ({synthesisOutput.flashcards.length})
                  </div>
                  {synthesisOutput.flashcards.map((fc, i) => (
                    <div
                      key={i}
                      className="p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 text-xs space-y-1"
                    >
                      <div className="font-medium text-slate-900 dark:text-slate-100">
                        Q: {fc.frontPrompt}
                      </div>
                      <div className="text-slate-500 dark:text-slate-400">A: {fc.backAnswer}</div>
                    </div>
                  ))}
                  <button
                    onClick={handleSaveGeneratedFlashcards}
                    className="w-full py-2 rounded-lg bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-500 flex items-center justify-center gap-1.5"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" /> Confirm & Add Flashcards to FSRS Queue
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Active Recall Quiz Modal */}
      {activeCard && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-lg rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span>Active Recall Verification · {activeCard.moduleCode}</span>
              <span>Source: {activeCard.sourceRef || 'Lecture Notes'}</span>
            </div>

            <div className="py-4">
              <div className="text-xs uppercase tracking-wider text-slate-400 mb-1">Question</div>
              <div className="text-base font-semibold text-slate-900 dark:text-slate-100">
                {activeCard.frontPrompt}
              </div>

              {revealAnswer ? (
                <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                  <div className="text-xs uppercase tracking-wider text-emerald-500 mb-1">
                    Source-Grounded Answer
                  </div>
                  <div className="text-sm text-slate-700 dark:text-slate-200 leading-relaxed">
                    {activeCard.backAnswer}
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setRevealAnswer(true)}
                  className="mt-6 w-full py-2.5 rounded-lg border border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  Reveal Answer
                </button>
              )}
            </div>

            {revealAnswer && (
              <div className="space-y-2">
                <div className="text-xs text-slate-500">
                  Rate recall to schedule next FSRS revision:
                </div>
                <div className="grid grid-cols-5 gap-2">
                  {[1, 2, 3, 4, 5].map((r) => (
                    <button
                      key={r}
                      onClick={async () => {
                        await recordStudyFeedback(activeCard, r, 15);
                        setActiveCard(null);
                      }}
                      className="py-2 rounded-lg bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-xs font-mono font-semibold hover:bg-emerald-600 dark:hover:bg-emerald-500 dark:hover:text-white transition-colors"
                    >
                      Rating {r}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-end">
              <button
                onClick={() => setActiveCard(null)}
                className="text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
