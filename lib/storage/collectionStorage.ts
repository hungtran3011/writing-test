import { Collection } from '@/lib/types';
import { safeSave, safeGet, safeRemove } from '@/lib/utils/indexedDB';

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
export async function saveCollection(collection: Collection): Promise<void> {
  // Save collection metadata
  await safeSave(`${COLLECTION_KEY_PREFIX}:${collection.id}`, collection);

  // Update collections index
  const collections = await getAllCollections();
  if (!collections.find((c) => c.id === collection.id)) {
    collections.push(collection);
    await safeSave(COLLECTIONS_KEY, collections);
  }
}

/**
 * Get all collections
 */
export async function getAllCollections(): Promise<Collection[]> {
  return (await safeGet<Collection[]>(COLLECTIONS_KEY, [])) ?? [];
}

/**
 * Get a single collection by ID
 */
export async function getCollection(id: string): Promise<Collection | null> {
  return await safeGet<Collection>(`${COLLECTION_KEY_PREFIX}:${id}`, undefined);
}

/**
 * Update collection metadata (name, description)
 */
export async function updateCollection(id: string, updates: Partial<Omit<Collection, 'id' | 'createdAt'>>): Promise<void> {
  const collection = await getCollection(id);
  if (!collection) {
    throw new Error(`Collection not found: ${id}`);
  }

  const updated: Collection = {
    ...collection,
    ...updates,
    updatedAt: Date.now(),
  };

  await safeSave(`${COLLECTION_KEY_PREFIX}:${id}`, updated);

  // Update collections index
  const collections = await getAllCollections();
  const index = collections.findIndex((c) => c.id === id);
  if (index >= 0) {
    collections[index] = updated;
    await safeSave(COLLECTIONS_KEY, collections);
  }
}

/**
 * Delete a collection and all its exams and submissions
 */
export async function deleteCollection(id: string): Promise<void> {
  // Remove collection document
  await safeRemove(`${COLLECTION_KEY_PREFIX}:${id}`);

  // Update collections index
  const allCols = await getAllCollections();
  const collections = allCols.filter((c) => c.id !== id);
  await safeSave(COLLECTIONS_KEY, collections);

  // Cleanup associated exams and submissions
  const examKey = `exams:${id}`;
  await safeRemove(examKey);

  const submissions = (await safeGet<Record<string, string[]>>('submissions', {})) ?? {};
  delete submissions[id];
  if (Object.keys(submissions).length > 0) {
    await safeSave('submissions', submissions);
  } else {
    await safeRemove('submissions');
  }
}
