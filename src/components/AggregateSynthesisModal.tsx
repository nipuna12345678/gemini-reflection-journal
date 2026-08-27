import React, { useState } from 'react';
import {
  Sparkles,
  X,
  Layers,
  Brain,
  Calendar,
  RefreshCw,
  Copy,
  Check,
  Download,
  AlertCircle,
} from 'lucide-react';
import Markdown from 'react-markdown';
import { JournalEntry } from '../types';
import { aggregateJournalSummary } from '../lib/gemini';

interface AggregateSynthesisModalProps {
  entries: JournalEntry[];
  onClose: () => void;
}

export const AggregateSynthesisModal: React.FC<AggregateSynthesisModalProps> = ({
  entries,
  onClose,
}) => {
  const [synthesis, setSynthesis] = useState<string | null>(null);
  const [modelUsed, setModelUsed] = useState<string>('gemini-3.6-flash');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<boolean>(false);

  const handleGenerateSynthesis = async () => {
    if (entries.length === 0) {
      setError('You need at least 1 reflection entry in your history to generate a life synthesis.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const payload = entries.slice(0, 15).map((e) => ({
        date: new Date(e.createdAt).toLocaleDateString(),
        mode: e.mode,
        title: e.title,
        summary: e.summary || e.initialPrompt,
        keyTakeaways: e.keyTakeaways,
        initialPrompt: e.initialPrompt,
      }));

      const res = await aggregateJournalSummary(payload);
      setSynthesis(res.synthesis);
      setModelUsed(res.modelUsed);
    } catch (err: any) {
      console.error('[Aggregate Synthesis Error]:', err);
      setError(err.message || 'Failed to synthesize reflections.');
    } finally {
      setLoading(false);
    }
  };

  const copySynthesis = () => {
    if (!synthesis) return;
    navigator.clipboard.writeText(synthesis);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/80 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-4xl max-h-[90vh] bg-stone-900 border border-stone-800 rounded-2xl shadow-2xl flex flex-col text-stone-100 overflow-hidden my-auto">
        {/* Modal Header */}
        <div className="p-6 border-b border-stone-800 flex items-start justify-between gap-4 bg-stone-900/90">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
              <Layers className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white tracking-tight">
                AI Reflection Synthesis
              </h2>
              <p className="text-xs text-stone-400">
                Synthesize recurring themes and emotional growth across {entries.length} reflections
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-stone-400 hover:text-stone-200 hover:bg-stone-800 rounded-xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6 space-y-6 overflow-y-auto flex-1">
          {error && (
            <div className="p-4 rounded-xl bg-rose-950/60 border border-rose-800 text-rose-200 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {!synthesis && !loading && (
            <div className="p-8 rounded-2xl bg-stone-950/60 border border-stone-800 text-center space-y-4">
              <Brain className="w-12 h-12 text-amber-400 mx-auto" />
              <h3 className="text-lg font-bold text-white">
                Discover Patterns in Your Reflections
              </h3>
              <p className="text-xs sm:text-sm text-stone-300 max-w-md mx-auto leading-relaxed">
                Gemini 3.6 Flash will review your latest {Math.min(entries.length, 15)} journal sessions to highlight recurring insights, mental breakthroughs, and coaching questions for future progress.
              </p>
              <button
                onClick={handleGenerateSynthesis}
                disabled={entries.length === 0}
                className="px-6 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-sm shadow-md transition-all disabled:opacity-40"
              >
                {entries.length === 0 ? 'No Entries Available' : 'Generate Growth Synthesis'}
              </button>
            </div>
          )}

          {loading && (
            <div className="p-12 text-center space-y-4">
              <div className="w-10 h-10 border-2 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-sm font-semibold text-stone-200">
                Synthesizing multi-session patterns with Gemini...
              </p>
              <p className="text-xs text-stone-500 font-mono">
                Model: gemini-3.6-flash (with automated resilient fallback ladder)
              </p>
            </div>
          )}

          {synthesis && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/20 font-medium">
                  Model: {modelUsed}
                </span>
                <button
                  onClick={handleGenerateSynthesis}
                  disabled={loading}
                  className="text-xs text-amber-400 hover:text-amber-300 flex items-center gap-1"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Regenerate Synthesis</span>
                </button>
              </div>

              <div className="p-6 rounded-2xl bg-stone-950 border border-stone-800 text-stone-200 text-sm leading-relaxed space-y-3">
                <div className="markdown-body">
                  <Markdown>{synthesis}</Markdown>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-stone-800 bg-stone-900 flex items-center justify-between">
          <span className="text-xs text-stone-500 font-mono">
            Firestore Vault &bull; Partitioned by UID
          </span>

          {synthesis && (
            <button
              onClick={copySynthesis}
              className="px-4 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-medium flex items-center gap-2 transition-colors"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 text-emerald-400" />
                  <span className="text-emerald-400">Copied to Clipboard</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  <span>Copy Synthesis</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
