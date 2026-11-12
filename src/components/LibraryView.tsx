import React, { useState } from 'react';
import { useLifeOS } from '../context/LifeOSContext.tsx';
import { KnowledgeItemRecord } from '../types.ts';
import { Plus, X, Trash2 } from 'lucide-react';

interface LibraryViewProps {
  subPage?: string;
  onSubPageChange?: (sub: string) => void;
}

export const LibraryView: React.FC<LibraryViewProps> = ({
  subPage = 'books',
  onSubPageChange,
}) => {
  const {
    knowledgeItems,
    todayDate,
    createKnowledgeItem,
    updateKnowledgeProgress,
    deleteKnowledgeItem,
    createTask,
    createStudyItem,
  } = useLifeOS();

  const [activeTab, setActiveTab] = useState<'books' | 'courses' | 'podcasts' | 'articles'>(
    (subPage as 'books' | 'courses' | 'podcasts' | 'articles') || 'books'
  );
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);

  // Add Item Form
  const [newItemType, setNewItemType] = useState<KnowledgeItemRecord['itemType']>('book');
  const [newTitle, setNewTitle] = useState('');
  const [newAuthor, setNewAuthor] = useState('');
  const [newTotal, setNewTotal] = useState(300);
  const [newUnit, setNewUnit] = useState('pages');
  const [newTakeaways, setNewTakeaways] = useState('');
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const switchTab = (tab: 'books' | 'courses' | 'podcasts' | 'articles') => {
    setActiveTab(tab);
    if (onSubPageChange && (tab === 'books' || tab === 'courses' || tab === 'podcasts')) {
      onSubPageChange(tab);
    }
  };

  const books = knowledgeItems.filter((k) => k.itemType === 'book');
  const courses = knowledgeItems.filter((k) => k.itemType === 'course');
  const podcasts = knowledgeItems.filter((k) => k.itemType === 'podcast');
  const articlesAndNotes = knowledgeItems.filter(
    (k) => k.itemType === 'article' || k.itemType === 'note'
  );

  const visibleItems =
    activeTab === 'books'
      ? books
      : activeTab === 'courses'
      ? courses
      : activeTab === 'podcasts'
      ? podcasts
      : articlesAndNotes;

  const selectedItem =
    knowledgeItems.find((k) => k.id === selectedItemId) ||
    visibleItems[0] ||
    knowledgeItems[0] ||
    null;

  const handleAddKnowledge = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    await createKnowledgeItem({
      itemType: newItemType,
      title: newTitle.trim(),
      authorOrSource: newAuthor.trim() || undefined,
      status: 'in_progress',
      progressCurrent: 0,
      progressTotal: Math.max(1, newTotal),
      progressUnit: newUnit.trim() || 'pages',
      takeaways: newTakeaways.trim() || undefined,
    });
    setNewTitle('');
    setNewAuthor('');
    setNewTakeaways('');
    setShowAddModal(false);
  };

  const handleSendToFlashcards = async (item: KnowledgeItemRecord) => {
    await createStudyItem({
      moduleId: '',
      moduleCode: 'LIB',
      title: `Takeaway: ${item.title}`,
      itemType: 'flashcard',
      status: 'review_due',
      importance: 'medium',
      estimatedMinutes: 5,
      confidenceRating: 3,
      repetitionCount: 0,
      nextReviewDate: todayDate,
      frontPrompt: `What are the key takeaways from "${item.title}"?`,
      backAnswer: item.takeaways || `Completed ${item.progressCurrent}/${item.progressTotal} ${item.progressUnit}.`,
    });
    setToastMsg(`Created flashcard from "${item.title}" in Study!`);
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-[#E8EDE8]">Library</h1>
          <p className="text-xs text-[#9AA79E] mt-1">
            {books.length} books · {courses.length} courses · {podcasts.length} podcasts ·{' '}
            {articlesAndNotes.length} notes &amp; articles
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex items-center p-1 rounded-xl bg-[#222C27] border border-[#BDD3C1]/15 text-xs">
            {(
              [
                { id: 'books', label: 'Books' },
                { id: 'courses', label: 'Courses' },
                { id: 'podcasts', label: 'Podcasts' },
                { id: 'articles', label: 'Articles & Notes' },
              ] as const
            ).map((t) => (
              <button
                key={t.id}
                onClick={() => switchTab(t.id)}
                className={`px-3.5 py-1.5 rounded-lg font-medium transition-colors ${
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
            onClick={() => {
              setNewItemType(
                activeTab === 'books'
                  ? 'book'
                  : activeTab === 'courses'
                  ? 'course'
                  : activeTab === 'podcasts'
                  ? 'podcast'
                  : 'note'
              );
              setNewUnit(
                activeTab === 'books'
                  ? 'pages'
                  : activeTab === 'courses'
                  ? 'lessons'
                  : activeTab === 'podcasts'
                  ? 'mins'
                  : 'notes'
              );
              setShowAddModal(true);
            }}
            className="px-4 py-2 rounded-xl bg-[#9BB9A2] hover:bg-[#a9c5b0] text-[#171E1B] text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" /> Add item
          </button>
        </div>
      </div>

      {toastMsg && (
        <div className="px-4 py-2.5 rounded-xl bg-[#2C3932] border border-[#9BB9A2]/40 text-xs text-[#9BB9A2] flex items-center justify-between">
          <span>{toastMsg}</span>
          <button onClick={() => setToastMsg(null)}>×</button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left 8-Col Items Grid */}
        <div className="lg:col-span-8 sage-card p-5 flex flex-col justify-between space-y-5">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-[#E8EDE8] capitalize">
                {activeTab} ({visibleItems.length})
              </h2>
            </div>

            {visibleItems.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5">
                {visibleItems.map((item) => {
                  const isSelected = selectedItem?.id === item.id;
                  const pct =
                    item.progressTotal > 0
                      ? Math.round((item.progressCurrent / item.progressTotal) * 100)
                      : 0;
                  return (
                    <div
                      key={item.id}
                      onClick={() => setSelectedItemId(item.id)}
                      className={`p-3.5 rounded-2xl border cursor-pointer transition-all flex flex-col justify-between ${
                        isSelected
                          ? 'bg-[#2C3932] border-[#9BB9A2]/60 shadow-md'
                          : 'bg-[#1C2520]/80 border-[#BDD3C1]/12 hover:border-[#BDD3C1]/30'
                      }`}
                    >
                      <div>
                        <div className="h-28 rounded-xl bg-gradient-to-br from-[#35463D] to-[#1D2722] border border-[#BDD3C1]/20 p-3 flex flex-col justify-between mb-3">
                          <div className="flex items-center justify-between">
                            <span className="text-[9px] uppercase tracking-wider text-[#9BB9A2] font-semibold">
                              {item.itemType}
                            </span>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteKnowledgeItem(item.id);
                              }}
                              className="text-[#9AA79E] hover:text-[#D97A6C]"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                          <div>
                            <p className="text-xs font-bold text-[#E8EDE8] line-clamp-2">
                              {item.title}
                            </p>
                            {item.authorOrSource && (
                              <p className="text-[10px] text-[#9AA79E] mt-0.5 truncate">
                                {item.authorOrSource}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="mt-2 space-y-1.5">
                        <div className="w-full h-1.5 rounded-full bg-[#171E1B] overflow-hidden">
                          <div
                            className="h-full rounded-full bg-[#9BB9A2]"
                            style={{ width: `${Math.min(100, pct)}%` }}
                          />
                        </div>
                        <div className="flex items-center justify-between text-[10px]">
                          <span className="text-[#9BB9A2] font-medium capitalize">
                            {item.status.replace('_', ' ')}
                          </span>
                          <span className="text-[#9AA79E]">
                            {item.progressCurrent}/{item.progressTotal} {item.progressUnit} ({pct}%)
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="py-12 text-center space-y-3">
                <p className="text-xs text-[#9AA79E]">
                  No {activeTab} in your Library yet.
                </p>
                <button
                  onClick={() => setShowAddModal(true)}
                  className="px-4 py-2 rounded-xl bg-[#9BB9A2] text-[#171E1B] text-xs font-semibold"
                >
                  + Add your first {activeTab.slice(0, -1)}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Right 4-Col Detail Inspector */}
        <div className="lg:col-span-4 sage-card p-5 flex flex-col justify-between space-y-4">
          {selectedItem ? (
            <>
              <div className="space-y-4">
                <div>
                  <h2 className="text-base font-semibold text-[#E8EDE8]">{selectedItem.title}</h2>
                  <p className="text-xs text-[#9AA79E]">
                    {selectedItem.authorOrSource || selectedItem.itemType}
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-[#2C3932]/75 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[#9AA79E]">Progress</span>
                    <span className="font-bold text-[#E8EDE8]">
                      {Math.round(
                        (selectedItem.progressCurrent /
                          Math.max(1, selectedItem.progressTotal)) *
                          100
                      )}
                      %
                    </span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-[#171E1B] overflow-hidden">
                    <div
                      className="h-full rounded-full bg-[#9BB9A2]"
                      style={{
                        width: `${Math.min(
                          100,
                          Math.round(
                            (selectedItem.progressCurrent /
                              Math.max(1, selectedItem.progressTotal)) *
                              100
                          )
                        )}%`,
                      }}
                    />
                  </div>
                  <p className="text-[11px] text-[#9AA79E]">
                    {selectedItem.progressCurrent} of {selectedItem.progressTotal}{' '}
                    {selectedItem.progressUnit}
                  </p>
                </div>

                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-[#65756B] mb-1.5">
                    KEY TAKEAWAYS &amp; NOTES
                  </p>
                  <div className="p-3 rounded-xl bg-[#1C2520] border border-[#BDD3C1]/10 text-xs text-[#E8EDE8]/90 whitespace-pre-wrap">
                    {selectedItem.takeaways || 'No notes recorded yet.'}
                  </div>
                </div>
              </div>

              <div className="space-y-2 pt-2">
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() =>
                      updateKnowledgeProgress(
                        selectedItem,
                        selectedItem.progressCurrent +
                          (selectedItem.itemType === 'book' ? 15 : 1)
                      )
                    }
                    className="py-2 rounded-xl bg-[#9BB9A2] text-[#171E1B] text-xs font-semibold"
                  >
                    + Log progress
                  </button>
                  <button
                    onClick={() => handleSendToFlashcards(selectedItem)}
                    className="py-2 rounded-xl bg-[#2C3932] text-[#E8EDE8] text-xs font-medium"
                  >
                    Send to flashcards
                  </button>
                </div>
                <button
                  onClick={async () => {
                    await createTask({
                      title: `Continue: ${selectedItem.title}`,
                      priority: 'medium',
                      status: 'todo',
                      category: 'study',
                      estimatedMinutes: 30,
                      dueDate: todayDate,
                    });
                    setToastMsg(`Created task for "${selectedItem.title}"`);
                  }}
                  className="w-full py-2 rounded-xl bg-[#2C3932]/70 text-[#9BB9A2] text-xs font-medium"
                >
                  Convert to task
                </button>
              </div>
            </>
          ) : (
            <div className="py-12 text-center text-xs text-[#65756B]">
              Select an item from your Library to inspect notes and log progress.
            </div>
          )}
        </div>
      </div>

      {/* Add Item Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={handleAddKnowledge}
            className="w-full max-w-md rounded-2xl bg-[#222C27] border border-[#BDD3C1]/25 p-6 space-y-4"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-[#E8EDE8]">Add to Library</h3>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="text-[#9AA79E]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div>
              <label className="block text-xs text-[#9AA79E] mb-1">Type</label>
              <select
                value={newItemType}
                onChange={(e) =>
                  setNewItemType(e.target.value as KnowledgeItemRecord['itemType'])
                }
                className="w-full sage-input px-3 py-2 text-xs"
              >
                <option value="book">Book</option>
                <option value="course">Course</option>
                <option value="podcast">Podcast</option>
                <option value="article">Article</option>
                <option value="note">Note</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-[#9AA79E] mb-1">Title</label>
              <input
                type="text"
                required
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="Title..."
                className="w-full sage-input px-3.5 py-2 text-xs"
              />
            </div>
            <div>
              <label className="block text-xs text-[#9AA79E] mb-1">Author / Source</label>
              <input
                type="text"
                value={newAuthor}
                onChange={(e) => setNewAuthor(e.target.value)}
                placeholder="Author or creator..."
                className="w-full sage-input px-3.5 py-2 text-xs"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-[#9AA79E] mb-1">Total Length</label>
                <input
                  type="number"
                  min={1}
                  value={newTotal}
                  onChange={(e) => setNewTotal(Number(e.target.value))}
                  className="w-full sage-input px-3 py-2 text-xs"
                />
              </div>
              <div>
                <label className="block text-xs text-[#9AA79E] mb-1">Unit</label>
                <input
                  type="text"
                  value={newUnit}
                  onChange={(e) => setNewUnit(e.target.value)}
                  placeholder="pages, lessons, mins"
                  className="w-full sage-input px-3 py-2 text-xs"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs text-[#9AA79E] mb-1">Takeaways / Notes</label>
              <textarea
                rows={3}
                value={newTakeaways}
                onChange={(e) => setNewTakeaways(e.target.value)}
                placeholder="Key insights..."
                className="w-full sage-input p-3 text-xs"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 rounded-xl bg-[#2C3932] text-xs text-[#9AA79E]"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-[#9BB9A2] text-[#171E1B] text-xs font-semibold"
              >
                Add item
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
