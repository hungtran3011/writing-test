import { get, set, del } from 'idb-keyval';

/**
 * Safe IndexedDB operations with versioning support
 * Handles migrating existing data from localStorage on first run.
 */

const VERSION_SUFFIX = '_v1';

export function getStorageKey(baseKey: string): string {
  return `exam-builder:${baseKey}${VERSION_SUFFIX}`;
}

let migrationPromise: Promise<void> | null = null;

async function migrateFromLocalStorageIfNeeded(): Promise<void> {
  const MIGRATION_KEY = 'exam-builder:migrated_to_idb';
  try {
    const isMigrated = await get(MIGRATION_KEY);
    if (isMigrated) return;

    // Migrate all keys starting with 'exam-builder:'
    // or known keys like 'collections', 'submissions', 'exam:*'
    if (typeof window !== 'undefined') {
      const keysToMigrate: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.startsWith('exam-builder:') || key.includes('exam-answers:'))) {
          keysToMigrate.push(key);
        }
      }

      for (const key of keysToMigrate) {
        try {
          const value = localStorage.getItem(key);
          if (value) {
            await set(key, JSON.parse(value));
          }
        } catch (err) {
          console.error(`Failed to migrate key ${key}`, err);
        }
      }

      await set(MIGRATION_KEY, true);
      console.log('Successfully migrated data from localStorage to IndexedDB');
    }
  } catch (error) {
    console.error('Migration failed:', error);
  }
}

export async function requestPersistentStorage(): Promise<boolean> {
  if (typeof navigator !== 'undefined' && navigator.storage && navigator.storage.persist) {
    try {
      const isPersisted = await navigator.storage.persisted();
      if (!isPersisted) {
        const granted = await navigator.storage.persist();
        console.log(granted ? "Persistent storage granted." : "Persistent storage denied.");
        return granted;
      }
      return true;
    } catch (e) {
      console.warn("Failed to request persistent storage", e);
    }
  }
  return false;
}

export async function isNearQuota(): Promise<boolean> {
  if (typeof navigator !== 'undefined' && navigator.storage && navigator.storage.estimate) {
    try {
      const estimate = await navigator.storage.estimate();
      if (estimate.quota && estimate.usage) {
        // If usage is > 90% of quota
        return estimate.usage > estimate.quota * 0.9;
      }
    } catch (e) {
      console.warn("Storage estimate failed", e);
    }
  }
  return false;
}

function ensureMigrated(): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve(); // SSR safe
  if (!migrationPromise) {
    migrationPromise = migrateFromLocalStorageIfNeeded().then(() => {
      // Attempt to request persistence silently
      requestPersistentStorage().catch(console.error);
    });
  }
  return migrationPromise;
}

export async function safeSave<T>(key: string, data: T): Promise<void> {
  if (typeof window === 'undefined') return;
  await ensureMigrated();
  try {
    const fullKey = getStorageKey(key);
    await set(fullKey, data);
  } catch (error) {
    console.error(`Failed to save to IndexedDB for key: ${key}`, error);
    throw error;
  }
}

export async function safeGet<T>(key: string, fallback?: T): Promise<T | null> {
  if (typeof window === 'undefined') return fallback ?? null;
  await ensureMigrated();
  try {
    const fullKey = getStorageKey(key);
    const item = await get(fullKey);
    if (item === undefined || item === null) return fallback ?? null;
    return item as T;
  } catch (error) {
    console.error(`Failed to get IndexedDB key: ${key}`, error);
    return fallback ?? null;
  }
}

export async function safeRemove(key: string): Promise<void> {
  if (typeof window === 'undefined') return;
  await ensureMigrated();
  try {
    const fullKey = getStorageKey(key);
    await del(fullKey);
  } catch (error) {
    console.error(`Failed to remove from IndexedDB key: ${key}`, error);
  }
}
