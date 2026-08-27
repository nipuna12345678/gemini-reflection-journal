export type ReflectionMode =
  | 'reflection'
  | 'brainstorm'
  | 'action_plan'
  | 'mindful_inquiry'
  | 'freeform';

export type SummaryType =
  | 'concise_overview'
  | 'key_themes'
  | 'action_items'
  | 'emotional_arc'
  | 'creative_sparks'
  | 'deep_takeaways';

export interface SummaryOption {
  id: SummaryType;
  label: string;
  shortLabel: string;
  description: string;
  iconName: string;
}

export interface InteractionMessage {
  id: string;
  role: 'user' | 'model';
  content: string;
  timestamp: string;
  modelUsed?: string;
}

export interface EntryAnalysis {
  title: string;
  summary: string;
  keyTakeaways: string[];
  tags: string[];
  sentiment: string;
  summaryType?: SummaryType;
  actionItems?: string[];
  keyThemes?: string[];
}

export interface JournalEntry {
  id: string;
  userId: string;
  title: string;
  initialPrompt: string;
  mode: ReflectionMode;
  createdAt: string;
  updatedAt: string;
  messages: InteractionMessage[];
  summary?: string;
  summaryType?: SummaryType;
  customSummaries?: Record<string, string>;
  actionItems?: string[];
  keyTakeaways?: string[];
  tags?: string[];
  sentiment?: string;
  modelUsed?: string;
  isFavorite?: boolean;
  wordCount?: number;
}

export interface UserPreferences {
  lastSearchQuery?: string;
  preferredSummaryType?: SummaryType;
  updatedAt?: string;
}

export interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  isAnonymous?: boolean;
  preferences?: UserPreferences;
}

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';
