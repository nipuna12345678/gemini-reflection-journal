import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  Calendar,
  Sparkles,
  Tag,
  ArrowRight,
  Filter,
  Trash2,
  BookOpen,
  MessageSquare,
  Smile,
  Lightbulb,
  Compass,
  FileText,
  Clock,
  ChevronDown,
  CheckCircle2,
  RefreshCw,
  X,
  ListTodo,
  Bot,
  User as UserIcon,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { JournalEntry, ReflectionMode } from '../types';
import {
  subscribeUserReflections,
  deleteReflectionEntry,
  getUserPreferences,
  saveUserPreferences,
} from '../lib/firestoreService';
import { EntryDetailModal } from './EntryDetailModal';

interface JournalHistoryProps {
  onSelectEntryToEdit: (entry: JournalEntry) => void;
  onNewEntryClick: () => void;
}

export const JournalHistory: React.FC<JournalHistoryProps> = ({
  onSelectEntryToEdit,
  onNewEntryClick,
}) => {
  const { user } = useAuth();
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isSearchPersisting, setIsSearchPersisting] = useState<boolean>(false);
  const [searchPersistedTime, setSearchPersistedTime] = useState<string | null>(null);
  const [selectedMode, setSelectedMode] = useState<string>('all');
  const [selectedSentiment, setSelectedSentiment] = useState<string>('all');
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');
  const [activeModalEntry, setActiveModalEntry] = useState<JournalEntry | null>(null);
  const [error, setError] = useState<string | null>(null);

  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const initialPreferencesLoadedRef = useRef<boolean>(false);

  // Load saved search query from Firestore on component mount
  useEffect(() => {
    if (!user) return;
    async function loadSavedQuery() {
      try {
        const prefs = await getUserPreferences(user!.uid);
        if (prefs?.lastSearchQuery) {
          setSearchQuery(prefs.lastSearchQuery);
          setSearchPersistedTime('Loaded from Firestore');
        }
      } catch (err) {
        console.warn('Failed to load saved search query:', err);
      } finally {
        initialPreferencesLoadedRef.current = true;
      }
    }
    loadSavedQuery();
  }, [user]);

  // Subscribe to real-time updates from Firestore
  useEffect(() => {
    if (!user) return;
    setLoading(true);

    const unsubscribe = subscribeUserReflections(
      user.uid,
      (updatedEntries) => {
        setEntries(updatedEntries);
        setLoading(false);
      },
      (err) => {
        console.error('[History Firestore Error]:', err);
        setError('Failed to fetch journal history from Firestore.');
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user]);

  // Save search query to Firestore whenever it changes (with debounce)
  const handleSearchChange = (newQuery: string) => {
    setSearchQuery(newQuery);

    if (!user || !initialPreferencesLoadedRef.current) return;

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    setIsSearchPersisting(true);
    debounceTimerRef.current = setTimeout(async () => {
      try {
        await saveUserPreferences(user.uid, { lastSearchQuery: newQuery });
        setIsSearchPersisting(false);
        setSearchPersistedTime(new Date().toLocaleTimeString());
      } catch (err) {
        console.warn('Failed to persist search query:', err);
        setIsSearchPersisting(false);
      }
    }, 450);
  };

  const handleClearSearch = async () => {
    setSearchQuery('');
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    if (user) {
      setIsSearchPersisting(true);
      await saveUserPreferences(user.uid, { lastSearchQuery: '' });
      setIsSearchPersisting(false);
      setSearchPersistedTime('Cleared');
    }
  };

  // Handle entry deletion
  const handleDeleteEntry = async (entryId: string) => {
    if (!user) return;
    try {
      await deleteReflectionEntry(user.uid, entryId);
      if (activeModalEntry?.id === entryId) {
        setActiveModalEntry(null);
      }
    } catch (err: any) {
      console.error('[Delete Error]:', err);
      setError('Failed to delete reflection entry.');
    }
  };

  // Filter and sort entries by keywords in user prompts OR Gemini responses OR summaries OR tags
  const filteredEntries = entries
    .filter((entry) => {
      // Mode filter
      if (selectedMode !== 'all' && entry.mode !== selectedMode) {
        return false;
      }
      // Sentiment filter
      if (selectedSentiment !== 'all' && entry.sentiment !== selectedSentiment) {
        return false;
      }
      // Comprehensive Search query filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();

        // 1. Check title, summary, initial prompt
        const inTitle = entry.title?.toLowerCase().includes(query);
        const inSummary = entry.summary?.toLowerCase().includes(query);
        const inInitialPrompt = entry.initialPrompt?.toLowerCase().includes(query);

        // 2. Check user prompts inside conversation turns
        const inUserPrompts = entry.messages?.some(
          (m) => m.role === 'user' && m.content.toLowerCase().includes(query)
        );

        // 3. Check Gemini's responses inside conversation turns
        const inGeminiResponses = entry.messages?.some(
          (m) => m.role === 'model' && m.content.toLowerCase().includes(query)
        );

        // 4. Check Key Takeaways, Action Items, and Tags
        const inTags = entry.tags?.some((t) => t.toLowerCase().includes(query));
        const inTakeaways = entry.keyTakeaways?.some((k) => k.toLowerCase().includes(query));
        const inActionItems = entry.actionItems?.some((a) => a.toLowerCase().includes(query));

        return (
          inTitle ||
          inSummary ||
          inInitialPrompt ||
          inUserPrompts ||
          inGeminiResponses ||
          inTags ||
          inTakeaways ||
          inActionItems
        );
      }
      return true;
    })
    .sort((a, b) => {
      const timeA = new Date(a.updatedAt || a.createdAt).getTime();
      const timeB = new Date(b.updatedAt || b.createdAt).getTime();
      return sortOrder === 'newest' ? timeB - timeA : timeA - timeB;
    });

  const uniqueSentiments = Array.from(
    new Set(entries.map((e) => e.sentiment).filter(Boolean))
  );

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      {/* Header Bar with prominent New Entry button */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-2xl bg-stone-900 border border-stone-800">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
              Reflection Vault & History
            </h2>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 font-mono">
              Firestore Synced
            </span>
          </div>
          <p className="text-xs text-stone-400 mt-1">
            Search keywords across your prompt thoughts and Gemini’s multi-turn responses.
          </p>
        </div>

        <button
          id="btn-history-new-reflection"
          onClick={onNewEntryClick}
          className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 text-xs sm:text-sm font-bold shadow-md hover:shadow-amber-500/20 flex items-center gap-2 transition-all cursor-pointer shrink-0"
        >
          <BookOpen className="w-4 h-4" />
          <span>+ New Entry</span>
        </button>
      </div>

      {/* Error notification */}
      {error && (
        <div className="p-4 rounded-xl bg-rose-950/60 border border-rose-800 text-rose-200 text-xs flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="underline text-xs">
            Dismiss
          </button>
        </div>
      )}

      {/* Search and Filters Section */}
      <div className="p-4 sm:p-5 rounded-2xl bg-stone-900 border border-stone-800 space-y-4">
        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
          {/* Keyword Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              id="history-search-input"
              type="text"
              placeholder="Search by keywords in prompts, Gemini responses, summaries, or takeaways..."
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="w-full bg-stone-950 text-stone-100 text-xs sm:text-sm pl-10 pr-24 py-2.5 rounded-xl border border-stone-800 focus:outline-none focus:border-amber-500/70 placeholder:text-stone-500 transition-colors"
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
              {isSearchPersisting ? (
                <span className="text-[10px] font-mono text-amber-400 flex items-center gap-1">
                  <RefreshCw className="w-3 h-3 animate-spin" />
                  <span>Syncing</span>
                </span>
              ) : searchQuery ? (
                <button
                  id="btn-clear-history-search"
                  onClick={handleClearSearch}
                  className="text-xs text-stone-400 hover:text-stone-200 flex items-center gap-1 bg-stone-800 px-2 py-0.5 rounded"
                  title="Clear search and reset Firestore saved query"
                >
                  <X className="w-3 h-3" />
                  <span>Clear</span>
                </button>
              ) : null}
            </div>
          </div>

          {/* Sentiment Dropdown */}
          <div className="flex items-center gap-2">
            <select
              id="sentiment-filter-select"
              value={selectedSentiment}
              onChange={(e) => setSelectedSentiment(e.target.value)}
              className="bg-stone-950 text-stone-300 text-xs px-3 py-2.5 rounded-xl border border-stone-800 focus:outline-none focus:border-amber-500/70"
            >
              <option value="all">All Sentiments</option>
              {uniqueSentiments.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>

            {/* Sort Order */}
            <select
              id="sort-order-select"
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value as 'newest' | 'oldest')}
              className="bg-stone-950 text-stone-300 text-xs px-3 py-2.5 rounded-xl border border-stone-800 focus:outline-none focus:border-amber-500/70"
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
            </select>
          </div>
        </div>

        {/* Search persistence status banner & mode pills */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pt-2 border-t border-stone-800/80">
          <div className="flex items-center flex-wrap gap-1.5">
            <span className="text-xs text-stone-500 mr-2 flex items-center gap-1">
              <Filter className="w-3 h-3" />
              Mode:
            </span>
            {[
              { id: 'all', label: 'All Modes' },
              { id: 'reflection', label: 'Daily Reflection' },
              { id: 'brainstorm', label: 'Brainstorm' },
              { id: 'action_plan', label: 'Action Plan' },
              { id: 'mindful_inquiry', label: 'Mindful Inquiry' },
              { id: 'freeform', label: 'Freeform' },
            ].map((modeItem) => (
              <button
                key={modeItem.id}
                onClick={() => setSelectedMode(modeItem.id)}
                className={`text-xs px-3 py-1 rounded-lg transition-colors ${
                  selectedMode === modeItem.id
                    ? 'bg-amber-500 text-stone-950 font-bold shadow-sm'
                    : 'bg-stone-950 text-stone-400 hover:text-stone-200 border border-stone-800'
                }`}
              >
                {modeItem.label}
              </button>
            ))}
          </div>

          {searchQuery && (
            <div className="text-[11px] font-mono text-stone-400 flex items-center gap-1.5 bg-stone-950 px-2.5 py-1 rounded-lg border border-stone-800">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>Query saved in Firestore for next session</span>
            </div>
          )}
        </div>
      </div>

      {/* Entries List or Empty State */}
      {loading ? (
        <div className="p-12 text-center text-stone-400 space-y-3">
          <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs font-mono">Syncing reflections from Cloud Firestore...</p>
        </div>
      ) : filteredEntries.length === 0 ? (
        <div className="p-12 rounded-2xl bg-stone-900/40 border border-dashed border-stone-800 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-stone-800 text-stone-400 flex items-center justify-center mx-auto">
            <FileText className="w-6 h-6 text-stone-500" />
          </div>
          <h3 className="text-base font-semibold text-white">
            {entries.length === 0 ? 'No journal entries yet' : 'No matching entries found'}
          </h3>
          <p className="text-xs text-stone-400 max-w-sm mx-auto">
            {entries.length === 0
              ? 'Start your very first reflection session with Gemini to preserve your insights in Firestore.'
              : `No entries matched "${searchQuery}". Search queries scan both your writing and Gemini’s responses.`}
          </p>
          {searchQuery ? (
            <button
              onClick={handleClearSearch}
              className="mt-2 px-3.5 py-1.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-semibold transition-colors"
            >
              Clear Search Filter
            </button>
          ) : (
            <button
              onClick={onNewEntryClick}
              className="mt-2 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 text-xs font-bold transition-colors"
            >
              Write First Reflection
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredEntries.map((entry) => {
            const dateStr = new Date(entry.createdAt).toLocaleDateString(undefined, {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            });
            const timeStr = new Date(entry.createdAt).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            });

            // Check if search keyword matched in prompt or Gemini response
            const queryLower = searchQuery.toLowerCase().trim();
            const matchedInPrompt = queryLower && (
              entry.initialPrompt?.toLowerCase().includes(queryLower) ||
              entry.messages?.some((m) => m.role === 'user' && m.content.toLowerCase().includes(queryLower))
            );
            const matchedInGemini = queryLower && (
              entry.messages?.some((m) => m.role === 'model' && m.content.toLowerCase().includes(queryLower))
            );

            return (
              <div
                key={entry.id}
                id={`entry-card-${entry.id}`}
                className="p-5 rounded-2xl bg-stone-900 border border-stone-800 hover:border-stone-700 transition-all flex flex-col justify-between group space-y-4 shadow-sm hover:shadow-md"
              >
                {/* Card Top Details */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/20 font-medium">
                        {entry.mode}
                      </span>
                      {entry.sentiment && (
                        <span className="text-[11px] px-2 py-0.5 rounded-full bg-stone-800 text-stone-300 border border-stone-700">
                          {entry.sentiment}
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-stone-500 flex items-center gap-1 font-mono">
                      <Clock className="w-3 h-3" />
                      {dateStr} {timeStr}
                    </span>
                  </div>

                  <div>
                    <h3 className="font-bold text-base text-white group-hover:text-amber-300 transition-colors line-clamp-1">
                      {entry.title || 'Untitled Reflection'}
                    </h3>
                    <p className="text-xs text-stone-400 mt-1.5 line-clamp-2 leading-relaxed">
                      {entry.summary || entry.initialPrompt || 'No written summary available.'}
                    </p>
                  </div>

                  {/* Search Match Badges */}
                  {queryLower && (matchedInPrompt || matchedInGemini) && (
                    <div className="flex items-center gap-2 text-[10px] font-mono text-amber-400/90 bg-amber-500/10 px-2.5 py-1 rounded-lg border border-amber-500/20">
                      <span>Keyword Match:</span>
                      {matchedInPrompt && (
                        <span className="flex items-center gap-1 text-stone-300">
                          <UserIcon className="w-2.5 h-2.5 text-amber-400" />
                          <span>In Prompt</span>
                        </span>
                      )}
                      {matchedInGemini && (
                        <span className="flex items-center gap-1 text-stone-300">
                          <Bot className="w-2.5 h-2.5 text-amber-400" />
                          <span>In Gemini Response</span>
                        </span>
                      )}
                    </div>
                  )}

                  {/* Key Takeaways or Action Items preview */}
                  {entry.actionItems && entry.actionItems.length > 0 ? (
                    <div className="space-y-1.5 pt-2 border-t border-stone-800/60">
                      <p className="text-[11px] font-semibold text-amber-400 flex items-center gap-1">
                        <ListTodo className="w-3 h-3" />
                        Action Item:
                      </p>
                      <p className="text-xs text-stone-300 bg-stone-950/60 px-3 py-1.5 rounded-lg border border-stone-800/80 line-clamp-1">
                        &bull; {entry.actionItems[0]}
                      </p>
                    </div>
                  ) : entry.keyTakeaways && entry.keyTakeaways.length > 0 ? (
                    <div className="space-y-1.5 pt-2 border-t border-stone-800/60">
                      <p className="text-[11px] font-semibold text-stone-400">Takeaway:</p>
                      <p className="text-xs text-stone-300 bg-stone-950/60 px-3 py-1.5 rounded-lg border border-stone-800/80 line-clamp-1">
                        &bull; {entry.keyTakeaways[0]}
                      </p>
                    </div>
                  ) : null}

                  {/* Tags */}
                  {entry.tags && entry.tags.length > 0 && (
                    <div className="flex items-center flex-wrap gap-1 pt-1">
                      {entry.tags.slice(0, 3).map((tag, idx) => (
                        <span
                          key={idx}
                          className="text-[10px] px-2 py-0.5 rounded bg-stone-800 text-stone-400"
                        >
                          #{tag}
                        </span>
                      ))}
                      {entry.tags.length > 3 && (
                        <span className="text-[10px] text-stone-500">
                          +{entry.tags.length - 3} more
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Card Actions Footer */}
                <div className="pt-3 border-t border-stone-800 flex items-center justify-between text-xs text-stone-400">
                  <div className="flex items-center gap-2 text-[11px] font-mono text-stone-500">
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>{entry.messages?.length || 1} turns</span>
                    <span>&bull;</span>
                    <span>{entry.modelUsed || 'gemini-3.6-flash'}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setActiveModalEntry(entry)}
                      className="px-3 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-medium flex items-center gap-1 transition-colors"
                      title="View full transcript and tailored summaries"
                    >
                      <span>Read</span>
                    </button>

                    <button
                      onClick={() => onSelectEntryToEdit(entry)}
                      className="px-3 py-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-semibold flex items-center gap-1 transition-colors"
                      title="Continue chatting in this session"
                    >
                      <span>Resume</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Entry Detail Transcript & Summaries Modal */}
      {activeModalEntry && (
        <EntryDetailModal
          entry={activeModalEntry}
          onClose={() => setActiveModalEntry(null)}
          onResumeInEditor={(e) => {
            setActiveModalEntry(null);
            onSelectEntryToEdit(e);
          }}
          onDelete={(id) => handleDeleteEntry(id)}
        />
      )}
    </div>
  );
};

