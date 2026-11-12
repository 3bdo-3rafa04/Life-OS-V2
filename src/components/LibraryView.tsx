import React, { useState } from 'react';
import { Library, Plus, Search } from 'lucide-react';
import { useLifeOS } from '../context/LifeOSContext.tsx';
import { KnowledgeItemRecord } from '../types.ts';

export const LibraryView: React.FC = () => {
  const { knowledgeItems, createKnowledgeItem, updateKnowledgeProgress } = useLifeOS();

  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('all');

  const [itemType, setItemType] = useState<KnowledgeItemRecord['itemType']>('book');
  const [title, setTitle] = useState('');
  const [authorOrSource, setAuthorOrSource] = useState('');
  const [progressCurrent, setProgressCurrent] = useState(0);
  const [progressTotal, setProgressTotal] = useState(300);
  const [progressUnit, setProgressUnit] = useState('pages');
  const [tags, setTags] = useState('');
  const [takeaways, setTakeaways] = useState('');

  const handleAddResource = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    await createKnowledgeItem({
      itemType,
      title,
      authorOrSource,
      status: progressCurrent >= progressTotal ? 'completed' : 'in_progress',
      progressCurrent: Number(progressCurrent),
      progressTotal: Math.max(1, Number(progressTotal)),
      progressUnit,
      rating: 5,
      tags,
      takeaways,
    });
    setTitle('');
    setAuthorOrSource('');
    setTakeaways('');
  };

  const filteredItems = knowledgeItems.filter((item) => {
    const matchesType = filterType === 'all' || item.itemType === filterType;
    const matchesSearch =
      !searchQuery.trim() ||
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.takeaways || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.tags || '').toLowerCase().includes(searchQuery.toLowerCase());
    return matchesType && matchesSearch;
  });

  return (
    <div className="space-y-8">
      {/* Header & Search */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">
            Knowledge Library — Books, Courses, Podcasts & Unified Notes
          </h1>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Track reading and listening progress alongside linked notes and key takeaways.
          </p>
        </div>

        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search library, tags or takeaways..."
            className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 pl-9 pr-3 py-2 text-xs text-slate-900 dark:text-slate-100"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left 7 Columns: Library Items & Notes */}
        <div className="lg:col-span-7 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6">
          <div className="flex items-center justify-between gap-3 mb-4">
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Library className="w-4 h-4 text-emerald-500" />
              Active Learning & Knowledge Base
            </h2>

            <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg">
              {(['all', 'book', 'course', 'podcast', 'note'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setFilterType(t)}
                  className={`px-2.5 py-1 text-xs font-medium rounded-md capitalize transition-colors whitespace-nowrap shrink-0 ${
                    filterType === t
                      ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {filteredItems.length === 0 ? (
            <p className="py-8 text-center text-xs text-slate-500">
              No matching resources or notes found.
            </p>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
              {filteredItems.map((item) => {
                const pct = Math.min(
                  100,
                  Math.round((item.progressCurrent / Math.max(1, item.progressTotal)) * 100)
                );
                return (
                  <div key={item.id} className="py-4 space-y-2.5">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                          {item.title}
                        </div>
                        <div className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                          <span className="capitalize">{item.itemType}</span>
                          {item.authorOrSource && (
                            <>
                              <span aria-hidden="true"> · </span>
                              <span>{item.authorOrSource}</span>
                            </>
                          )}
                          <span aria-hidden="true"> · </span>
                          <span className="capitalize">{item.status.replace('_', ' ')}</span>
                          {item.tags && (
                            <>
                              <span aria-hidden="true"> · </span>
                              <span>{item.tags}</span>
                            </>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-xs font-mono tabular-nums text-slate-600 dark:text-slate-300">
                          {item.progressCurrent}/{item.progressTotal} {item.progressUnit} ({pct}%)
                        </span>
                        <button
                          onClick={() =>
                            updateKnowledgeProgress(item, item.progressCurrent + 15)
                          }
                          className="px-2 py-1 rounded border border-slate-200 dark:border-slate-800 text-xs font-mono hover:bg-slate-50 dark:hover:bg-slate-800"
                        >
                          +15
                        </button>
                      </div>
                    </div>

                    <div className="h-1.5 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                      <div className="h-full bg-emerald-500" style={{ width: `${pct}%` }} />
                    </div>

                    {item.takeaways && (
                      <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-950/70 text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                        <span className="font-semibold text-slate-900 dark:text-slate-100">
                          Takeaway:{' '}
                        </span>
                        {item.takeaways}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right 5 Columns: Add Resource or Quick Capture Note */}
        <div className="lg:col-span-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6">
          <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100 mb-4">
            Add Resource or Unified Note
          </h2>

          <form onSubmit={handleAddResource} className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <select
                value={itemType}
                onChange={(e) => setItemType(e.target.value as KnowledgeItemRecord['itemType'])}
                className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-xs text-slate-900 dark:text-slate-100"
              >
                <option value="book">Book</option>
                <option value="course">Course</option>
                <option value="podcast">Podcast</option>
                <option value="article">Article</option>
                <option value="note">Quick Idea / Note</option>
              </select>
              <input
                type="text"
                value={authorOrSource}
                onChange={(e) => setAuthorOrSource(e.target.value)}
                placeholder="Author / Creator"
                className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-xs text-slate-900 dark:text-slate-100"
              />
            </div>

            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Title of book, course, podcast, or note"
              className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-xs text-slate-900 dark:text-slate-100"
            />

            <div className="grid grid-cols-3 gap-2">
              <input
                type="number"
                value={progressCurrent}
                onChange={(e) => setProgressCurrent(Number(e.target.value))}
                placeholder="Current"
                className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-2.5 py-1.5 text-xs font-mono"
              />
              <input
                type="number"
                min={1}
                value={progressTotal}
                onChange={(e) => setProgressTotal(Number(e.target.value))}
                placeholder="Total"
                className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-2.5 py-1.5 text-xs font-mono"
              />
              <input
                type="text"
                value={progressUnit}
                onChange={(e) => setProgressUnit(e.target.value)}
                placeholder="pages / lessons"
                className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-2.5 py-1.5 text-xs"
              />
            </div>

            <input
              type="text"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="Tags (e.g. systems · philosophy · cs304)"
              className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-xs text-slate-900 dark:text-slate-100"
            />

            <textarea
              rows={4}
              value={takeaways}
              onChange={(e) => setTakeaways(e.target.value)}
              placeholder="Key takeaways, quotes, or linked synthesis notes..."
              className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-3 text-xs text-slate-900 dark:text-slate-100"
            />

            <button
              type="submit"
              className="w-full py-2 rounded-lg bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-xs font-semibold flex items-center justify-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" /> Save to Knowledge Library
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
