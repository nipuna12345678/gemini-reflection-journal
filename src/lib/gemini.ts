import { InteractionMessage, ReflectionMode, EntryAnalysis, SummaryType } from '../types';

export interface GenerateReflectionParams {
  prompt?: string;
  mode: ReflectionMode;
  history: InteractionMessage[];
  entryContext?: string;
}

export interface ReflectionResponse {
  text: string;
  modelUsed: string;
  timestamp: string;
}

/**
 * Call the backend server to generate an AI reflection / multi-turn conversation reply
 */
export async function generateReflection(params: GenerateReflectionParams): Promise<ReflectionResponse> {
  const response = await fetch('/api/gemini/reflect', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      prompt: params.prompt || '',
      mode: params.mode,
      history: params.history,
      entryContext: params.entryContext || '',
    }),
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.error || `Server responded with status ${response.status}`);
  }

  return response.json();
}

/**
 * Call the backend server to analyze an entry (generate title, executive summary, key takeaways, tags, sentiment)
 */
export async function analyzeJournalEntry(
  content: string,
  messages: InteractionMessage[],
  summaryType: SummaryType = 'concise_overview'
): Promise<{ analysis: EntryAnalysis; modelUsed: string }> {
  const response = await fetch('/api/gemini/analyze-entry', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      content,
      messages,
      summaryType,
    }),
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.error || `Failed to analyze journal entry: ${response.status}`);
  }

  return response.json();
}

/**
 * Call the backend server to generate a specific requested summary format from Gemini
 */
export async function generateCustomSummary(params: {
  content: string;
  messages: InteractionMessage[];
  summaryType: SummaryType;
}): Promise<{ summary: string; summaryType: SummaryType; modelUsed: string; timestamp: string }> {
  const response = await fetch('/api/gemini/summarize', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      content: params.content,
      messages: params.messages,
      summaryType: params.summaryType,
    }),
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.error || `Failed to generate tailored summary: ${response.status}`);
  }

  return response.json();
}

/**
 * Call the backend server to aggregate insights across multiple journal entries
 */
export async function aggregateJournalSummary(
  entries: Array<{ date?: string; mode?: string; title?: string; summary?: string; keyTakeaways?: string[]; initialPrompt?: string }>
): Promise<{ synthesis: string; modelUsed: string; timestamp: string }> {
  const response = await fetch('/api/gemini/aggregate-summary', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ entries }),
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.error || `Failed to aggregate journal synthesis: ${response.status}`);
  }

  return response.json();
}

