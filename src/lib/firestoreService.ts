import {
  collection,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  getDoc,
  query,
  orderBy,
  onSnapshot,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../firebase';
import { JournalEntry, InteractionMessage } from '../types';

/**
 * Strict Undefined-Stripping Utility
 * Strips all undefined fields recursively from an object to prevent Firestore driver serialization crashes.
 */
export function stripUndefined<T>(obj: T): T {
  if (obj === null || obj === undefined) {
    return obj;
  }
  if (Array.isArray(obj)) {
    return obj.map(stripUndefined) as unknown as T;
  }
  if (typeof obj === 'object') {
    const cleaned: Record<string, any> = {};
    for (const [key, value] of Object.entries(obj)) {
      if (value !== undefined) {
        cleaned[key] = stripUndefined(value);
      }
    }
    return cleaned as T;
  }
  return obj;
}

/**
 * Save or create a new user reflection entry
 */
export async function saveReflectionEntry(
  userId: string,
  entry: Omit<JournalEntry, 'userId'> & { userId?: string }
): Promise<JournalEntry> {
  if (!userId) {
    throw new Error('User ID is required to persist reflection.');
  }

  const now = new Date().toISOString();
  const entryId = entry.id || `entry_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

  const fullEntry: JournalEntry = {
    ...entry,
    id: entryId,
    userId,
    createdAt: entry.createdAt || now,
    updatedAt: now,
    messages: entry.messages || [],
    title: entry.title || 'Untitled Reflection',
    initialPrompt: entry.initialPrompt || '',
    mode: entry.mode || 'reflection',
    isFavorite: Boolean(entry.isFavorite),
    tags: entry.tags || [],
    keyTakeaways: entry.keyTakeaways || [],
    actionItems: entry.actionItems || [],
    summary: entry.summary || '',
    summaryType: entry.summaryType || 'concise_overview',
    customSummaries: entry.customSummaries || {},
    sentiment: entry.sentiment || 'Reflective',
    modelUsed: entry.modelUsed || 'gemini-3.6-flash',
    wordCount: calculateWordCount(entry.messages, entry.initialPrompt),
  };

  const cleanPayload = stripUndefined(fullEntry);
  const docRef = doc(db, 'users', userId, 'reflections', entryId);

  await setDoc(docRef, cleanPayload, { merge: true });
  return fullEntry;
}

/**
 * Save user preferences (such as persisted search query and preferred summary mode)
 */
export async function saveUserPreferences(
  userId: string,
  preferences: { lastSearchQuery?: string; preferredSummaryType?: string }
): Promise<void> {
  if (!userId) return;
  try {
    const userDocRef = doc(db, 'users', userId);
    const cleanPayload = stripUndefined({
      preferences: {
        ...preferences,
        updatedAt: new Date().toISOString(),
      },
      updatedAt: new Date().toISOString(),
    });
    await setDoc(userDocRef, cleanPayload, { merge: true });
  } catch (err) {
    console.warn('[Firestore] Failed to save user preferences:', err);
  }
}

/**
 * Get user preferences from Firestore
 */
export async function getUserPreferences(
  userId: string
): Promise<{ lastSearchQuery?: string; preferredSummaryType?: string } | null> {
  if (!userId) return null;
  try {
    const userDocRef = doc(db, 'users', userId);
    const snap = await getDoc(userDocRef);
    if (!snap.exists()) return null;
    const data = snap.data();
    return data.preferences || null;
  } catch (err) {
    console.warn('[Firestore] Failed to retrieve user preferences:', err);
    return null;
  }
}

/**
 * Update an existing reflection entry
 */
export async function updateReflectionEntry(
  userId: string,
  entryId: string,
  updates: Partial<JournalEntry>
): Promise<void> {
  if (!userId || !entryId) {
    throw new Error('User ID and Entry ID are required.');
  }

  const now = new Date().toISOString();
  const docRef = doc(db, 'users', userId, 'reflections', entryId);
  const cleanUpdates = stripUndefined({
    ...updates,
    updatedAt: now,
  });

  await updateDoc(docRef, cleanUpdates);
}

/**
 * Delete a reflection entry
 */
export async function deleteReflectionEntry(userId: string, entryId: string): Promise<void> {
  if (!userId || !entryId) {
    throw new Error('User ID and Entry ID are required to delete entry.');
  }

  const docRef = doc(db, 'users', userId, 'reflections', entryId);
  await deleteDoc(docRef);
}

/**
 * Subscribe to real-time updates for a user's reflection entries
 */
export function subscribeUserReflections(
  userId: string,
  onUpdate: (entries: JournalEntry[]) => void,
  onError?: (err: Error) => void
): () => void {
  if (!userId) {
    onUpdate([]);
    return () => {};
  }

  const reflectionsCollection = collection(db, 'users', userId, 'reflections');
  const q = query(reflectionsCollection, orderBy('updatedAt', 'desc'));

  return onSnapshot(
    q,
    (snapshot) => {
      const entries: JournalEntry[] = [];
      snapshot.forEach((docSnap) => {
        entries.push(docSnap.data() as JournalEntry);
      });
      onUpdate(entries);
    },
    (error) => {
      console.error('[Firestore] subscribeUserReflections error:', error);
      if (onError) onError(error);
    }
  );
}

/**
 * Fetch one single reflection entry
 */
export async function getReflectionEntry(userId: string, entryId: string): Promise<JournalEntry | null> {
  if (!userId || !entryId) return null;
  const docRef = doc(db, 'users', userId, 'reflections', entryId);
  const snap = await getDoc(docRef);
  if (!snap.exists()) return null;
  return snap.data() as JournalEntry;
}

/**
 * Word count helper
 */
function calculateWordCount(messages: InteractionMessage[] = [], initialPrompt: string = ''): number {
  let total = initialPrompt.split(/\s+/).filter(Boolean).length;
  for (const m of messages) {
    if (m.content) {
      total += m.content.split(/\s+/).filter(Boolean).length;
    }
  }
  return total;
}
