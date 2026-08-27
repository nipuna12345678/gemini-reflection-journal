import React, { useState, useEffect, useRef } from 'react';
import {
  Sparkles,
  Send,
  Save,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  PlusCircle,
  MessageSquare,
  BookOpen,
  Lightbulb,
  Compass,
  Smile,
  Tag,
  Copy,
  Check,
  Zap,
  ArrowRight,
  ListTodo,
  Layers,
  HeartHandshake,
  Target,
  FileCheck,
} from 'lucide-react';
import Markdown from 'react-markdown';
import { useAuth } from '../context/AuthContext';
import {
  JournalEntry,
  InteractionMessage,
  ReflectionMode,
  SaveStatus,
  SummaryType,
  SummaryOption,
} from '../types';
import {
  generateReflection,
  analyzeJournalEntry,
  generateCustomSummary,
} from '../lib/gemini';
import { saveReflectionEntry } from '../lib/firestoreService';

interface JournalEditorProps {
  onSaveComplete?: (entry: JournalEntry) => void;
  onNavigateHistory?: () => void;
  onNewEntry?: () => void;
  initialEntry?: JournalEntry | null;
}

const MODES: Array<{
  id: ReflectionMode;
  label: string;
  icon: any;
  desc: string;
  placeholder: string;
}> = [
  {
    id: 'reflection',
    label: 'Daily Reflection',
    icon: Sparkles,
    desc: 'Unpack emotions, identify patterns, and gain deep self-awareness.',
    placeholder: 'What happened today? How did it make you feel, and what is on your mind right now?',
  },
  {
    id: 'brainstorm',
    label: 'Creative Brainstorm',
    icon: Lightbulb,
    desc: 'Explore fresh angles, analogies, and untamed ideas.',
    placeholder: 'What idea or problem do you want to explore? Share your thoughts, raw fragments, or vision...',
  },
  {
    id: 'action_plan',
    label: 'Action Plan',
    icon: Compass,
    desc: 'Transform ambiguous thoughts into structured, prioritized steps.',
    placeholder: 'What goal, project, or challenge are you facing? Describe where you are and where you want to be...',
  },
  {
    id: 'mindful_inquiry',
    label: 'Mindful Inquiry',
    icon: Smile,
    desc: 'Ground your emotions, practice acceptance, and find calm.',
    placeholder: 'Take a deep breath. What sensations, worries, or mental tension are present in this moment?',
  },
  {
    id: 'freeform',
    label: 'Freeform Journal',
    icon: BookOpen,
    desc: 'Open-ended stream of consciousness and conversational reflection.',
    placeholder: 'Write freely about anything on your mind. Gemini will listen and converse attentively...',
  },
];

export const SUMMARY_OPTIONS: SummaryOption[] = [
  {
    id: 'concise_overview',
    label: 'Concise Overview',
    shortLabel: 'Overview',
    description: 'A crisp, high-level 2-3 sentence executive synopsis.',
    iconName: 'FileCheck',
  },
  {
    id: 'key_themes',
    label: 'Summarize Key Themes',
    shortLabel: 'Themes',
    description: 'Identify recurring motifs, core themes, and psychological patterns.',
    iconName: 'Layers',
  },
  {
    id: 'action_items',
    label: 'Extract Action Items',
    shortLabel: 'Action Items',
    description: 'Concrete next steps, actionable commitments, and prioritized to-dos.',
    iconName: 'ListTodo',
  },
  {
    id: 'emotional_arc',
    label: 'Emotional & Mindset Shifts',
    shortLabel: 'Emotions',
    description: 'Analyze emotional trajectory, perspectives, and mindset breakthroughs.',
    iconName: 'HeartHandshake',
  },
  {
    id: 'creative_sparks',
    label: 'Creative Sparks & Reframes',
    shortLabel: 'Sparks',
    description: 'Generate lateral perspectives, brainstorm angles, and metaphors.',
    iconName: 'Lightbulb',
  },
  {
    id: 'deep_takeaways',
    label: 'Deep Personal Takeaways',
    shortLabel: 'Takeaways',
    description: 'Distill core principles, enduring wisdom, and personal lessons.',
    iconName: 'Target',
  },
];

export const JournalEditor: React.FC<JournalEditorProps> = ({
  onSaveComplete,
  onNavigateHistory,
  onNewEntry,
  initialEntry,
}) => {
  const { user } = useAuth();

  // Active reflection state
  const [currentEntryId, setCurrentEntryId] = useState<string>(
    initialEntry?.id || `entry_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`
  );
  const [mode, setMode] = useState<ReflectionMode>(initialEntry?.mode || 'reflection');
  const [initialPrompt, setInitialPrompt] = useState<string>(initialEntry?.initialPrompt || '');
  const [messages, setMessages] = useState<InteractionMessage[]>(initialEntry?.messages || []);
  const [title, setTitle] = useState<string>(initialEntry?.title || '');
  const [summary, setSummary] = useState<string>(initialEntry?.summary || '');
  const [summaryType, setSummaryType] = useState<SummaryType>(initialEntry?.summaryType || 'concise_overview');
  const [customSummaries, setCustomSummaries] = useState<Record<string, string>>(initialEntry?.customSummaries || {});
  const [activeSummaryTab, setActiveSummaryTab] = useState<SummaryType>(initialEntry?.summaryType || 'concise_overview');
  const [keyTakeaways, setKeyTakeaways] = useState<string[]>(initialEntry?.keyTakeaways || []);
  const [actionItems, setActionItems] = useState<string[]>(initialEntry?.actionItems || []);
  const [tags, setTags] = useState<string[]>(initialEntry?.tags || []);
  const [sentiment, setSentiment] = useState<string>(initialEntry?.sentiment || '');
  const [modelUsed, setModelUsed] = useState<string>(initialEntry?.modelUsed || 'gemini-3.6-flash');

  // Input & UI States
  const [currentInput, setCurrentInput] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [isGeneratingCustomSummary, setIsGeneratingCustomSummary] = useState<boolean>(false);
  const [summaryLoadingType, setSummaryLoadingType] = useState<SummaryType | null>(null);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [lastSavedTime, setLastSavedTime] = useState<string | null>(
    initialEntry?.updatedAt ? new Date(initialEntry.updatedAt).toLocaleTimeString() : null
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const activeModeConfig = MODES.find((m) => m.id === mode) || MODES[0];

  // Auto-scroll on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isGenerating]);

  // If initialEntry changes from parent (e.g. user selected to edit or view an entry)
  useEffect(() => {
    if (initialEntry) {
      setCurrentEntryId(initialEntry.id);
      setMode(initialEntry.mode);
      setInitialPrompt(initialEntry.initialPrompt);
      setMessages(initialEntry.messages || []);
      setTitle(initialEntry.title || '');
      setSummary(initialEntry.summary || '');
      setSummaryType(initialEntry.summaryType || 'concise_overview');
      setCustomSummaries(initialEntry.customSummaries || {});
      setActiveSummaryTab(initialEntry.summaryType || 'concise_overview');
      setKeyTakeaways(initialEntry.keyTakeaways || []);
      setActionItems(initialEntry.actionItems || []);
      setTags(initialEntry.tags || []);
      setSentiment(initialEntry.sentiment || '');
      setModelUsed(initialEntry.modelUsed || 'gemini-3.6-flash');
      setLastSavedTime(new Date(initialEntry.updatedAt).toLocaleTimeString());
      setSaveStatus('saved');
    }
  }, [initialEntry]);

  // Helper to persist current state to Firestore
  const persistToFirestore = async (
    customMessages = messages,
    customPrompt = initialPrompt,
    customTitle = title,
    customSummary = summary,
    customSummType = summaryType,
    customSummMap = customSummaries,
    customTakeaways = keyTakeaways,
    customActions = actionItems,
    customTags = tags,
    customSentiment = sentiment,
    customModel = modelUsed
  ) => {
    if (!user) return;
    setSaveStatus('saving');
    setErrorMessage(null);

    try {
      const entryPayload: JournalEntry = {
        id: currentEntryId,
        userId: user.uid,
        title: customTitle || (customPrompt ? customPrompt.slice(0, 40) + '...' : 'Untitled Reflection'),
        initialPrompt: customPrompt,
        mode,
        createdAt: initialEntry?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        messages: customMessages,
        summary: customSummary,
        summaryType: customSummType,
        customSummaries: customSummMap,
        keyTakeaways: customTakeaways,
        actionItems: customActions,
        tags: customTags,
        sentiment: customSentiment,
        modelUsed: customModel,
      };

      const saved = await saveReflectionEntry(user.uid, entryPayload);
      setSaveStatus('saved');
      setLastSavedTime(new Date().toLocaleTimeString());
      if (onSaveComplete) {
        onSaveComplete(saved);
      }
    } catch (err: any) {
      console.error('[Firestore Save Failure]:', err);
      setSaveStatus('error');
      setErrorMessage(err.message || 'Failed to sync entry to Firestore.');
    }
  };

  // Submit initial journal entry or follow-up conversation turn
  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const promptToSend = currentInput.trim();
    if (!promptToSend || isGenerating) return;

    setErrorMessage(null);
    setIsGenerating(true);

    const userMessage: InteractionMessage = {
      id: `msg_${Date.now()}_user`,
      role: 'user',
      content: promptToSend,
      timestamp: new Date().toISOString(),
    };

    // If this is the very first entry prompt, save it as initialPrompt as well
    const updatedInitialPrompt = initialPrompt || promptToSend;
    if (!initialPrompt) {
      setInitialPrompt(promptToSend);
    }

    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setCurrentInput('');

    try {
      // Call Gemini reflection API
      const result = await generateReflection({
        prompt: promptToSend,
        mode,
        history: messages,
        entryContext: updatedInitialPrompt,
      });

      const modelMessage: InteractionMessage = {
        id: `msg_${Date.now()}_model`,
        role: 'model',
        content: result.text,
        timestamp: result.timestamp || new Date().toISOString(),
        modelUsed: result.modelUsed,
      };

      const allMessagesWithModel = [...updatedMessages, modelMessage];
      setMessages(allMessagesWithModel);
      setModelUsed(result.modelUsed);

      // Auto-save to Firestore
      await persistToFirestore(
        allMessagesWithModel,
        updatedInitialPrompt,
        title,
        summary,
        summaryType,
        customSummaries,
        keyTakeaways,
        actionItems,
        tags,
        sentiment,
        result.modelUsed
      );
    } catch (err: any) {
      console.error('[Gemini Generation Error]:', err);
      setErrorMessage(err.message || 'Error generating AI reflection. Please try again.');
      setSaveStatus('error');
    } finally {
      setIsGenerating(false);
    }
  };

  // Auto-analyze entry with Gemini with selected summary type
  const handleAutoAnalyze = async (specificType: SummaryType = summaryType) => {
    if (messages.length === 0 && !initialPrompt) {
      setErrorMessage('Write some journal thoughts first before generating AI insights.');
      return;
    }

    setIsAnalyzing(true);
    setErrorMessage(null);

    try {
      const { analysis, modelUsed: analyzedModel } = await analyzeJournalEntry(
        initialPrompt,
        messages,
        specificType
      );

      const updatedSummaries = {
        ...customSummaries,
        [specificType]: analysis.summary,
      };

      setTitle(analysis.title);
      setSummary(analysis.summary);
      setSummaryType(specificType);
      setCustomSummaries(updatedSummaries);
      setActiveSummaryTab(specificType);
      setKeyTakeaways(analysis.keyTakeaways || []);
      if (analysis.actionItems && analysis.actionItems.length > 0) {
        setActionItems(analysis.actionItems);
      }
      setTags(analysis.tags || []);
      setSentiment(analysis.sentiment || 'Reflective');

      // Persist the analyzed insights to Firestore
      await persistToFirestore(
        messages,
        initialPrompt,
        analysis.title,
        analysis.summary,
        specificType,
        updatedSummaries,
        analysis.keyTakeaways || [],
        analysis.actionItems || actionItems,
        analysis.tags || [],
        analysis.sentiment || 'Reflective',
        analyzedModel
      );
    } catch (err: any) {
      console.error('[Analysis Error]:', err);
      setErrorMessage(err.message || 'Failed to auto-generate AI insights.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Request a specific summary type on demand from Gemini (e.g. Key Themes, Action Items, Emotional Shifts)
  const handleRequestSpecificSummary = async (targetType: SummaryType) => {
    if (messages.length === 0 && !initialPrompt) {
      setErrorMessage('Please write a reflection entry first before requesting a specialized summary.');
      return;
    }

    setSummaryLoadingType(targetType);
    setIsGeneratingCustomSummary(true);
    setErrorMessage(null);

    try {
      const result = await generateCustomSummary({
        content: initialPrompt,
        messages,
        summaryType: targetType,
      });

      const updatedSummaries = {
        ...customSummaries,
        [targetType]: result.summary,
      };

      setSummary(result.summary);
      setSummaryType(targetType);
      setCustomSummaries(updatedSummaries);
      setActiveSummaryTab(targetType);

      // If action items summary, extract bullet points into actionItems array
      if (targetType === 'action_items') {
        const lines = result.summary
          .split('\n')
          .map((l) => l.replace(/^[-*•\d.)\s]+/, '').trim())
          .filter((l) => l.length > 3);
        if (lines.length > 0) {
          setActionItems(lines);
        }
      }

      await persistToFirestore(
        messages,
        initialPrompt,
        title,
        result.summary,
        targetType,
        updatedSummaries,
        keyTakeaways,
        actionItems,
        tags,
        sentiment,
        result.modelUsed
      );
    } catch (err: any) {
      console.error('[Custom Summary Error]:', err);
      setErrorMessage(err.message || `Failed to generate ${targetType} summary.`);
    } finally {
      setIsGeneratingCustomSummary(false);
      setSummaryLoadingType(null);
    }
  };

  // Reset to start a new blank session
  const handleStartNewSession = () => {
    if (onNewEntry) {
      onNewEntry();
      return;
    }
    setCurrentEntryId(`entry_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`);
    setInitialPrompt('');
    setMessages([]);
    setTitle('');
    setSummary('');
    setSummaryType('concise_overview');
    setCustomSummaries({});
    setActiveSummaryTab('concise_overview');
    setKeyTakeaways([]);
    setActionItems([]);
    setTags([]);
    setSentiment('');
    setCurrentInput('');
    setSaveStatus('idle');
    setLastSavedTime(null);
    setErrorMessage(null);
  };

  const handleCopyText = (content: string, id: string) => {
    navigator.clipboard.writeText(content);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Top Session Controls Bar with Prominent New Entry Action */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-2xl bg-stone-900 border border-stone-800 text-stone-100">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
            <activeModeConfig.icon className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="font-bold text-base text-white">
                {title || 'Active Reflection Session'}
              </h2>
              {sentiment && (
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-stone-800 border border-stone-700 text-amber-300 font-medium">
                  {sentiment}
                </span>
              )}
            </div>
            <p className="text-xs text-stone-400">
              {activeModeConfig.label} &bull; Mode: {mode}
            </p>
          </div>
        </div>

        {/* Action Controls, Prominent New Entry, and Save Status */}
        <div className="flex items-center flex-wrap gap-2">
          {/* Prominent New Entry Button */}
          <button
            id="btn-editor-prominent-new-entry"
            onClick={handleStartNewSession}
            className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 text-xs sm:text-sm font-bold shadow-md hover:shadow-amber-500/20 flex items-center gap-1.5 transition-all cursor-pointer"
            title="Clear the current conversation interface and start a new journal entry with Gemini"
          >
            <PlusCircle className="w-4 h-4" />
            <span>+ New Entry</span>
          </button>

          {/* Real-time Save Status Indicator */}
          <div
            id="firestore-save-badge"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs bg-stone-950 border border-stone-800 font-mono"
          >
            {saveStatus === 'saving' && (
              <>
                <RefreshCw className="w-3.5 h-3.5 text-amber-400 animate-spin" />
                <span className="text-amber-300">Syncing to Firestore...</span>
              </>
            )}
            {saveStatus === 'saved' && (
              <>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-300">
                  Vaulted {lastSavedTime ? `@ ${lastSavedTime}` : ''}
                </span>
              </>
            )}
            {saveStatus === 'error' && (
              <button
                onClick={() => persistToFirestore()}
                className="flex items-center gap-1 text-rose-400 hover:text-rose-300 underline"
                title="Click to retry saving"
              >
                <AlertCircle className="w-3.5 h-3.5" />
                <span>Save Failed (Retry)</span>
              </button>
            )}
            {saveStatus === 'idle' && (
              <span className="text-stone-500">Draft Ready</span>
            )}
          </div>

          <button
            id="btn-manual-save"
            onClick={() => persistToFirestore()}
            disabled={saveStatus === 'saving' || (!initialPrompt && messages.length === 0)}
            className="px-3 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-medium flex items-center gap-1.5 transition-colors disabled:opacity-40"
            title="Force Save to Firestore"
          >
            <Save className="w-3.5 h-3.5" />
            <span>Save</span>
          </button>

          <button
            id="btn-auto-analyze"
            onClick={() => handleAutoAnalyze(summaryType)}
            disabled={isAnalyzing || (messages.length === 0 && !initialPrompt)}
            className="px-3 py-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-40"
            title="Auto-extract key takeaways, summary, sentiment, and title"
          >
            <Sparkles className={`w-3.5 h-3.5 ${isAnalyzing ? 'animate-spin' : ''}`} />
            <span>{isAnalyzing ? 'Analyzing...' : 'AI Insights'}</span>
          </button>

          {onNavigateHistory && (
            <button
              id="btn-view-in-history"
              onClick={onNavigateHistory}
              className="px-3 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-medium flex items-center gap-1.5 transition-colors"
            >
              <span>History</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Error Message Toast */}
      {errorMessage && (
        <div className="p-4 rounded-xl bg-rose-950/60 border border-rose-800 text-rose-200 text-xs flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button
            onClick={() => setErrorMessage(null)}
            className="text-rose-400 hover:text-rose-200 underline text-xs"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Mode Selector Pill Bar */}
      <div className="space-y-2">
        <label className="text-xs font-semibold text-stone-400 uppercase tracking-wider">
          Reflection Mode
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          {MODES.map((m) => {
            const Icon = m.icon;
            const isSelected = mode === m.id;
            return (
              <button
                key={m.id}
                id={`btn-mode-${m.id}`}
                onClick={() => setMode(m.id)}
                className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between gap-1.5 ${
                  isSelected
                    ? 'bg-amber-500/10 border-amber-500 text-amber-300 shadow-sm'
                    : 'bg-stone-900 border-stone-800 text-stone-400 hover:border-stone-700 hover:text-stone-200'
                }`}
              >
                <div className="flex items-center justify-between">
                  <Icon className="w-4 h-4" />
                  {isSelected && (
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                  )}
                </div>
                <div>
                  <div className="font-semibold text-xs text-stone-100">
                    {m.label}
                  </div>
                  <div className="text-[10px] text-stone-400 line-clamp-1">
                    {m.desc}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Selectable Summary Types Selector (Before or After entry is made) */}
      <div className="p-4 rounded-2xl bg-stone-900/90 border border-stone-800 space-y-3">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <h3 className="text-xs font-bold text-stone-200 uppercase tracking-wider">
                Summary Type & AI Synthesis Options
              </h3>
            </div>
            <p className="text-xs text-stone-400 mt-0.5">
              Select what type of summary you want Gemini to extract before or after writing.
            </p>
          </div>

          {(messages.length > 0 || initialPrompt) && (
            <span className="text-[11px] font-mono text-amber-400 bg-amber-500/10 px-2.5 py-0.5 rounded-full border border-amber-500/20">
              Click any option to generate on-demand
            </span>
          )}
        </div>

        {/* Summary Options Pills */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
          {SUMMARY_OPTIONS.map((opt) => {
            const isSelected = summaryType === opt.id;
            const isGenerated = Boolean(customSummaries[opt.id]);
            const isLoadingThis = isGeneratingCustomSummary && summaryLoadingType === opt.id;

            return (
              <button
                key={opt.id}
                id={`btn-summary-opt-${opt.id}`}
                onClick={() => {
                  setSummaryType(opt.id);
                  if (customSummaries[opt.id]) {
                    setSummary(customSummaries[opt.id]);
                    setActiveSummaryTab(opt.id);
                  } else if (messages.length > 0 || initialPrompt) {
                    handleRequestSpecificSummary(opt.id);
                  }
                }}
                disabled={isLoadingThis}
                className={`p-2.5 rounded-xl border text-left transition-all flex items-start gap-2.5 relative ${
                  isSelected
                    ? 'bg-amber-500/15 border-amber-500 text-amber-200 shadow-sm'
                    : isGenerated
                    ? 'bg-stone-950 border-stone-700 text-stone-300 hover:border-amber-500/50'
                    : 'bg-stone-950/60 border-stone-800/80 text-stone-400 hover:border-stone-700'
                }`}
              >
                <div className="mt-0.5 shrink-0">
                  {opt.id === 'key_themes' && <Layers className="w-4 h-4 text-amber-400" />}
                  {opt.id === 'concise_overview' && <FileCheck className="w-4 h-4 text-amber-400" />}
                  {opt.id === 'action_items' && <ListTodo className="w-4 h-4 text-amber-400" />}
                  {opt.id === 'emotional_arc' && <HeartHandshake className="w-4 h-4 text-amber-400" />}
                  {opt.id === 'creative_sparks' && <Lightbulb className="w-4 h-4 text-amber-400" />}
                  {opt.id === 'deep_takeaways' && <Target className="w-4 h-4 text-amber-400" />}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-xs font-semibold text-stone-100 truncate">
                      {opt.label}
                    </span>
                    {isLoadingThis ? (
                      <RefreshCw className="w-3 h-3 text-amber-400 animate-spin shrink-0" />
                    ) : isGenerated ? (
                      <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 shrink-0">
                        Generated
                      </span>
                    ) : null}
                  </div>
                  <p className="text-[11px] text-stone-400 line-clamp-1 mt-0.5">
                    {opt.description}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Generated Analysis & Tailored Summaries Display Panel */}
      {(summary || Object.keys(customSummaries).length > 0 || keyTakeaways.length > 0 || actionItems.length > 0) && (
        <div className="p-5 rounded-2xl bg-stone-900 border border-stone-800 space-y-4 shadow-sm">
          {/* Summary Tabs Header if multiple summaries generated */}
          <div className="flex items-center justify-between flex-wrap gap-2 pb-3 border-b border-stone-800">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-4 h-4" />
                <span>Gemini Tailored Summaries:</span>
              </span>

              {/* Tabs for available summaries */}
              {Object.keys(customSummaries).map((typeKey) => {
                const opt = SUMMARY_OPTIONS.find((o) => o.id === typeKey);
                const isActive = activeSummaryTab === typeKey;
                return (
                  <button
                    key={typeKey}
                    onClick={() => {
                      setActiveSummaryTab(typeKey as SummaryType);
                      setSummary(customSummaries[typeKey]);
                    }}
                    className={`text-xs px-2.5 py-1 rounded-lg transition-colors font-medium ${
                      isActive
                        ? 'bg-amber-500 text-stone-950 font-bold'
                        : 'bg-stone-950 text-stone-400 hover:text-stone-200 border border-stone-800'
                    }`}
                  >
                    {opt?.label || typeKey}
                  </button>
                );
              })}
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => handleRequestSpecificSummary(activeSummaryTab)}
                disabled={isGeneratingCustomSummary}
                className="text-xs text-amber-400 hover:text-amber-300 flex items-center gap-1 font-medium disabled:opacity-50"
                title="Regenerate this specific summary"
              >
                <RefreshCw className={`w-3 h-3 ${isGeneratingCustomSummary ? 'animate-spin' : ''}`} />
                <span>Regenerate</span>
              </button>
            </div>
          </div>

          {/* Active Summary Content */}
          {summary && (
            <div className="p-4 rounded-xl bg-stone-950/60 border border-stone-800/80 space-y-2">
              <div className="markdown-body text-xs sm:text-sm text-stone-200 leading-relaxed">
                <Markdown>{summary}</Markdown>
              </div>
            </div>
          )}

          {/* Action Items List */}
          {actionItems && actionItems.length > 0 && (
            <div className="space-y-2 pt-2 border-t border-stone-800">
              <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                <ListTodo className="w-3.5 h-3.5" />
                <span>Action Items & Next Steps</span>
              </h4>
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {actionItems.map((item, idx) => (
                  <li
                    key={idx}
                    className="text-xs text-stone-200 bg-stone-950/70 px-3 py-2.5 rounded-xl border border-stone-800 flex items-start gap-2"
                  >
                    <span className="text-amber-400 font-bold mt-0.5">&bull;</span>
                    <span className="leading-relaxed">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Key Insights & Takeaways */}
          {keyTakeaways.length > 0 && (
            <div className="space-y-2 pt-2 border-t border-stone-800">
              <h4 className="text-xs font-bold text-stone-400 uppercase tracking-wider">
                Key Insights & Takeaways
              </h4>
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {keyTakeaways.map((takeaway, i) => (
                  <li
                    key={i}
                    className="text-xs text-stone-200 bg-stone-950/40 px-3 py-2 rounded-lg border border-stone-800 flex items-start gap-2"
                  >
                    <span className="text-amber-400 font-bold">&bull;</span>
                    <span>{takeaway}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Tags */}
          {tags.length > 0 && (
            <div className="flex items-center flex-wrap gap-1.5 pt-2 border-t border-stone-800">
              <Tag className="w-3.5 h-3.5 text-stone-400 mr-1" />
              {tags.map((tag, i) => (
                <span
                  key={i}
                  className="text-[11px] px-2.5 py-0.5 rounded-md bg-stone-800 text-stone-300 border border-stone-700"
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Multi-Turn Conversation Stream */}
      <div className="space-y-4">
        {messages.length === 0 ? (
          <div className="p-8 rounded-2xl bg-stone-900/40 border border-dashed border-stone-800 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-stone-800 text-stone-400 flex items-center justify-center mx-auto">
              <MessageSquare className="w-6 h-6 text-amber-400" />
            </div>
            <h3 className="text-base font-semibold text-white">
              Ready for your reflection
            </h3>
            <p className="text-xs text-stone-400 max-w-md mx-auto">
              {activeModeConfig.desc} Express your thoughts below and Gemini 3.6 Flash will converse, reframe, and distill your takeaways.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((msg) => {
              const isUser = msg.role === 'user';
              return (
                <div
                  key={msg.id}
                  className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}
                >
                  <div className="flex items-center gap-2 mb-1 px-1">
                    <span className="text-[11px] font-medium text-stone-400">
                      {isUser ? 'You (Journaler)' : 'Gemini 3.6 Flash'}
                    </span>
                    <span className="text-[10px] text-stone-500">
                      {new Date(msg.timestamp).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>

                  <div
                    className={`max-w-3xl p-4 sm:p-5 rounded-2xl shadow-sm text-sm leading-relaxed ${
                      isUser
                        ? 'bg-amber-500/10 border border-amber-500/30 text-stone-100 rounded-tr-none'
                        : 'bg-stone-900 border border-stone-800 text-stone-200 rounded-tl-none prose prose-invert max-w-none'
                    }`}
                  >
                    {isUser ? (
                      <div className="whitespace-pre-wrap">{msg.content}</div>
                    ) : (
                      <div className="space-y-2">
                        <div className="markdown-body text-stone-200 text-sm">
                          <Markdown>{msg.content}</Markdown>
                        </div>
                        <div className="flex items-center justify-between pt-3 mt-3 border-t border-stone-800 text-[11px] text-stone-500">
                          <span className="font-mono text-[10px]">
                            {msg.modelUsed || 'gemini-3.6-flash'}
                          </span>
                          <button
                            onClick={() => handleCopyText(msg.content, msg.id)}
                            className="flex items-center gap-1 hover:text-stone-300 text-stone-400 transition-colors"
                            title="Copy response"
                          >
                            {copiedId === msg.id ? (
                              <>
                                <Check className="w-3.5 h-3.5 text-emerald-400" />
                                <span className="text-emerald-400">Copied</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3.5 h-3.5" />
                                <span>Copy</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {isGenerating && (
              <div className="flex flex-col items-start">
                <div className="flex items-center gap-2 mb-1 px-1">
                  <span className="text-[11px] font-medium text-amber-400">
                    Gemini 3.6 Flash
                  </span>
                  <span className="text-[10px] text-stone-500">Reflecting...</span>
                </div>
                <div className="p-4 rounded-2xl bg-stone-900 border border-stone-800 rounded-tl-none flex items-center gap-3">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-amber-400 animate-bounce" />
                    <span className="w-2 h-2 rounded-full bg-amber-400 animate-bounce [animation-delay:0.2s]" />
                    <span className="w-2 h-2 rounded-full bg-amber-400 animate-bounce [animation-delay:0.4s]" />
                  </div>
                  <span className="text-xs text-stone-400 font-mono">
                    Synthesizing thoughtful reflection...
                  </span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input Box & Multi-Turn Composer */}
      <div className="p-4 rounded-2xl bg-stone-900 border border-stone-800 shadow-xl space-y-3 sticky bottom-4 z-30">
        <form onSubmit={handleSendMessage} className="space-y-3">
          <textarea
            id="journal-input-textarea"
            rows={messages.length === 0 ? 4 : 3}
            value={currentInput}
            onChange={(e) => setCurrentInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                handleSendMessage();
              }
            }}
            placeholder={
              messages.length === 0
                ? activeModeConfig.placeholder
                : 'Reply to Gemini or deepen your reflection (Press Cmd/Ctrl + Enter to send)...'
            }
            className="w-full bg-stone-950 text-stone-100 text-sm rounded-xl p-3.5 border border-stone-800 focus:outline-none focus:border-amber-500/70 placeholder:text-stone-500 resize-y transition-colors leading-relaxed"
          />

          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 text-xs text-stone-500">
              <span>{currentInput.length} chars</span>
              <span>&bull;</span>
              <span>Cmd/Ctrl + Enter to send</span>
            </div>

            <div className="flex items-center gap-2">
              {currentInput.trim() && (
                <button
                  type="button"
                  onClick={() => setCurrentInput('')}
                  className="px-3 py-1.5 text-xs text-stone-400 hover:text-stone-200 transition-colors"
                >
                  Clear
                </button>
              )}

              <button
                type="submit"
                id="btn-submit-reflection"
                disabled={!currentInput.trim() || isGenerating}
                className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs sm:text-sm shadow-md flex items-center gap-2 transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                <Send className="w-4 h-4" />
                <span>{messages.length === 0 ? 'Start Reflection' : 'Send Reply'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
