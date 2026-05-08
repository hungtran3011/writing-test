import { Collection } from '@/lib/types';
import { safeSave, safeGet, safeRemove } from '@/lib/utils/localStorage';

/**
 * Collection Storage - manages collections in localStorage
 */

const COLLECTIONS_KEY = 'collections';
const COLLECTION_KEY_PREFIX = 'collection';

export function createCollection(name: string, description?: string): Collection {
  const now = Date.now();
  return {
    id: `col_${now}_${Math.random().toString(36).substr(2, 9)}`,
    name,
    description,
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * Save a new collection
 */
export function saveCollection(collection: Collection): void {
  // Save collection metadata
  safeSave(`${COLLECTION_KEY_PREFIX}:${collection.id}`, collection);

  // Update collections index
  const collections = getAllCollections();
  if (!collections.find((c) => c.id === collection.id)) {
    collections.push(collection);
    safeSave(COLLECTIONS_KEY, collections);
  }
}

/**
 * Get all collections
 */
export function getAllCollections(): Collection[] {
  return safeGet<Collection[]>(COLLECTIONS_KEY, []) ?? [];
}

/**
 * Get a single collection by ID
 */
export function getCollection(id: string): Collection | null {
  return safeGet<Collection>(`${COLLECTION_KEY_PREFIX}:${id}`, undefined);
}

/**
 * Update collection metadata (name, description)
 */
export function updateCollection(id: string, updates: Partial<Omit<Collection, 'id' | 'createdAt'>>): void {
  const collection = getCollection(id);
  if (!collection) {
    throw new Error(`Collection not found: ${id}`);
  }

  const updated: Collection = {
    ...collection,
    ...updates,
    updatedAt: Date.now(),
  };

  safeSave(`${COLLECTION_KEY_PREFIX}:${id}`, updated);

  // Update collections index
  const collections = getAllCollections();
  const index = collections.findIndex((c) => c.id === id);
  if (index >= 0) {
    collections[index] = updated;
    safeSave(COLLECTIONS_KEY, collections);
  }
}

/**
 * Delete a collection and all its exams and submissions
 */
export function deleteCollection(id: string): void {
  // Remove collection document
  safeRemove(`${COLLECTION_KEY_PREFIX}:${id}`);

  // Update collections index
  const collections = getAllCollections().filter((c) => c.id !== id);
  safeSave(COLLECTIONS_KEY, collections);

  // Cleanup associated exams and submissions
  const examKey = `exams:${id}`;
  safeRemove(examKey);

  const submissions = safeGet<Record<string, string[]>>('submissions', {}) ?? {};
  delete submissions[id];
  if (Object.keys(submissions).length > 0) {
    safeSave('submissions', submissions);
  } else {
    safeRemove('submissions');
  }
}
