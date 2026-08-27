import React, { useState } from 'react';
import {
  X,
  Calendar,
  Sparkles,
  Tag,
  Download,
  Copy,
  Check,
  Brain,
  MessageSquare,
  ArrowUpRight,
  Trash2,
  ListTodo,
  Layers,
} from 'lucide-react';
import Markdown from 'react-markdown';
import { JournalEntry, SummaryType } from '../types';

interface EntryDetailModalProps {
  entry: JournalEntry;
  onClose: () => void;
  onResumeInEditor: (entry: JournalEntry) => void;
  onDelete: (entryId: string) => void;
}

export const EntryDetailModal: React.FC<EntryDetailModalProps> = ({
  entry,
  onClose,
  onResumeInEditor,
  onDelete,
}) => {
  const [copiedTranscript, setCopiedTranscript] = useState<boolean>(false);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<string>(
    entry.summaryType || Object.keys(entry.customSummaries || {})[0] || 'overview'
  );

  const formattedDate = new Date(entry.createdAt).toLocaleDateString(undefined, {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const customSummaries = entry.customSummaries || {};
  const currentSummaryText = customSummaries[activeTab] || entry.summary || '';

  const exportMarkdown = () => {
    let md = `# ${entry.title || 'Journal Reflection'}\n\n`;
    md += `**Date:** ${formattedDate}\n`;
    md += `**Mode:** ${entry.mode}\n`;
    if (entry.sentiment) md += `**Sentiment:** ${entry.sentiment}\n`;
    if (entry.summary) md += `\n## Executive Summary\n${entry.summary}\n`;

    if (entry.actionItems && entry.actionItems.length > 0) {
      md += `\n## Action Items\n`;
      entry.actionItems.forEach((a) => {
        md += `- [ ] ${a}\n`;
      });
    }

    if (entry.keyTakeaways && entry.keyTakeaways.length > 0) {
      md += `\n## Key Takeaways\n`;
      entry.keyTakeaways.forEach((t) => {
        md += `- ${t}\n`;
      });
    }

    if (entry.tags && entry.tags.length > 0) {
      md += `\n**Tags:** ${entry.tags.map((t) => `#${t}`).join(' ')}\n`;
    }

    md += `\n---\n\n## Conversation Transcript\n\n`;
    if (entry.messages && entry.messages.length > 0) {
      entry.messages.forEach((msg) => {
        const speaker = msg.role === 'user' ? '### User' : '### Gemini AI';
        md += `${speaker} (${new Date(msg.timestamp).toLocaleTimeString()}):\n${msg.content}\n\n`;
      });
    } else if (entry.initialPrompt) {
      md += `### User:\n${entry.initialPrompt}\n\n`;
    }

    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute(
      'download',
      `${(entry.title || 'reflection').toLowerCase().replace(/[^a-z0-9]/g, '_')}.md`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const copyTranscript = () => {
    let text = `${entry.title || 'Journal Reflection'}\nDate: ${formattedDate}\n\n`;
    if (entry.summary) text += `Summary:\n${entry.summary}\n\n`;
    if (entry.actionItems && entry.actionItems.length > 0) {
      text += `Action Items:\n${entry.actionItems.map((a) => `• ${a}`).join('\n')}\n\n`;
    }
    if (entry.messages) {
      entry.messages.forEach((m) => {
        text += `${m.role === 'user' ? 'User' : 'Gemini'}: ${m.content}\n\n`;
      });
    }
    navigator.clipboard.writeText(text);
    setCopiedTranscript(true);
    setTimeout(() => setCopiedTranscript(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/80 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-4xl max-h-[90vh] bg-stone-900 border border-stone-800 rounded-2xl shadow-2xl flex flex-col text-stone-100 overflow-hidden my-auto">
        {/* Modal Header */}
        <div className="p-6 border-b border-stone-800 flex items-start justify-between gap-4 bg-stone-900/90">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/20 font-medium">
                {entry.mode}
              </span>
              {entry.sentiment && (
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-stone-800 text-stone-300 border border-stone-700">
                  {entry.sentiment}
                </span>
              )}
              <span className="text-xs text-stone-400 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />
                {formattedDate}
              </span>
            </div>
            <h2 className="text-xl font-bold text-white tracking-tight">
              {entry.title || 'Reflection Session'}
            </h2>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onResumeInEditor(entry)}
              className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Resume conversing with Gemini in this session"
            >
              <span>Continue Chat</span>
              <ArrowUpRight className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-2 text-stone-400 hover:text-stone-200 hover:bg-stone-800 rounded-xl transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Content Body */}
        <div className="p-6 space-y-6 overflow-y-auto flex-1">
          {/* Executive & Tailored Summaries */}
          {(currentSummaryText || Object.keys(customSummaries).length > 0) && (
            <div className="p-4 rounded-xl bg-stone-950/60 border border-stone-800/80 space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2 text-amber-400 text-xs font-bold uppercase tracking-wider">
                  <Sparkles className="w-4 h-4" />
                  <span>Gemini Synthesis</span>
                </div>

                {Object.keys(customSummaries).length > 1 && (
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {Object.keys(customSummaries).map((k) => (
                      <button
                        key={k}
                        onClick={() => setActiveTab(k)}
                        className={`text-xs px-2.5 py-0.5 rounded-lg capitalize transition-colors ${
                          activeTab === k
                            ? 'bg-amber-500 text-stone-950 font-bold'
                            : 'bg-stone-800 text-stone-400 hover:text-stone-200'
                        }`}
                      >
                        {k.replace('_', ' ')}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div className="markdown-body text-sm text-stone-300 leading-relaxed">
                <Markdown>{currentSummaryText}</Markdown>
              </div>
            </div>
          )}

          {/* Action Items */}
          {entry.actionItems && entry.actionItems.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                <ListTodo className="w-3.5 h-3.5" />
                <span>Action Items & Commitments</span>
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {entry.actionItems.map((item, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-xl bg-stone-950/40 border border-stone-800 text-xs text-stone-200 flex items-start gap-2"
                  >
                    <span className="text-amber-400 font-bold mt-0.5">&bull;</span>
                    <span className="leading-relaxed">{item}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Key Takeaways */}
          {entry.keyTakeaways && entry.keyTakeaways.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-stone-400 uppercase tracking-wider">
                Key Insights & Takeaways
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {entry.keyTakeaways.map((takeaway, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-xl bg-stone-950/40 border border-stone-800 text-xs text-stone-200 flex items-start gap-2"
                  >
                    <span className="text-amber-400 font-bold mt-0.5">&bull;</span>
                    <span className="leading-relaxed">{takeaway}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tags */}
          {entry.tags && entry.tags.length > 0 && (
            <div className="flex items-center flex-wrap gap-2 pt-2 border-t border-stone-800/80">
              <Tag className="w-3.5 h-3.5 text-stone-400 mr-1" />
              {entry.tags.map((tag, idx) => (
                <span
                  key={idx}
                  className="text-xs px-2.5 py-0.5 rounded-md bg-stone-800 text-stone-300 border border-stone-700"
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}

          {/* Full Conversation Transcript */}
          <div className="space-y-4 pt-4 border-t border-stone-800">
            <h4 className="text-xs font-bold text-stone-400 uppercase tracking-wider flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-amber-400" />
              <span>Full Multi-Turn Dialogue Transcript</span>
            </h4>

            {entry.messages && entry.messages.length > 0 ? (
              <div className="space-y-4">
                {entry.messages.map((msg) => {
                  const isUser = msg.role === 'user';
                  return (
                    <div
                      key={msg.id}
                      className={`p-4 rounded-xl text-sm leading-relaxed ${
                        isUser
                          ? 'bg-amber-500/10 border border-amber-500/20 text-stone-200'
                          : 'bg-stone-950/80 border border-stone-800 text-stone-300'
                      }`}
                    >
                      <div className="flex items-center justify-between text-xs font-semibold mb-2 text-stone-400">
                        <span>{isUser ? 'Journaler' : 'Gemini 3.6 Flash'}</span>
                        <span className="text-[10px] text-stone-500 font-normal">
                          {new Date(msg.timestamp).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                      {isUser ? (
                        <p className="whitespace-pre-wrap">{msg.content}</p>
                      ) : (
                        <div className="markdown-body text-stone-200 text-sm">
                          <Markdown>{msg.content}</Markdown>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-stone-950 border border-stone-800 text-stone-300 text-sm whitespace-pre-wrap">
                {entry.initialPrompt || 'No written transcript.'}
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer Controls */}
        <div className="p-4 border-t border-stone-800 bg-stone-900 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              onClick={exportMarkdown}
              className="px-3 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export .md</span>
            </button>

            <button
              onClick={copyTranscript}
              className="px-3 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              {copiedTranscript ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy Text</span>
                </>
              )}
            </button>
          </div>

          <div className="flex items-center gap-2">
            {!isDeleting ? (
              <button
                onClick={() => setIsDeleting(true)}
                className="p-2 text-stone-500 hover:text-rose-400 hover:bg-stone-800 rounded-lg transition-colors cursor-pointer"
                title="Delete reflection"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-xs text-rose-300">Confirm delete?</span>
                <button
                  onClick={() => onDelete(entry.id)}
                  className="px-2.5 py-1 rounded bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold cursor-pointer"
                >
                  Yes, Delete
                </button>
                <button
                  onClick={() => setIsDeleting(false)}
                  className="px-2 py-1 rounded bg-stone-800 text-stone-300 text-xs cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
