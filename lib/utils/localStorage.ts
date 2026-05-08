/**
 * Safe localStorage operations with versioning support
 */

const VERSION_SUFFIX = '_v1';

export function getStorageKey(baseKey: string): string {
  return `exam-builder:${baseKey}${VERSION_SUFFIX}`;
}

export function safeSave<T>(key: string, data: T): void {
  try {
    const fullKey = getStorageKey(key);
    localStorage.setItem(fullKey, JSON.stringify(data));
  } catch (error) {
    if (error instanceof Error) {
      if (error.name === 'QuotaExceededError') {
        console.error(`localStorage quota exceeded for key: ${key}`);
        throw new Error('Storage quota exceeded. Please remove some data or images.');
      }
    }
    console.error(`Failed to save to localStorage for key: ${key}`, error);
    throw error;
  }
}

export function safeGet<T>(key: string, fallback?: T): T | null {
  try {
    const fullKey = getStorageKey(key);
    const item = localStorage.getItem(fullKey);
    if (!item) return fallback ?? null;
    return JSON.parse(item) as T;
  } catch (error) {
    console.error(`Failed to parse localStorage key: ${key}`, error);
    return fallback ?? null;
  }
}

export function safeRemove(key: string): void {
  try {
    const fullKey = getStorageKey(key);
    localStorage.removeItem(fullKey);
  } catch (error) {
    console.error(`Failed to remove from localStorage key: ${key}`, error);
  }
}

export function getStorageSize(): number {
  let size = 0;
  for (const key in localStorage) {
    if (localStorage.hasOwnProperty(key) && key.startsWith('exam-builder:')) {
      size += localStorage[key].length + key.length;
    }
  }
  return size;
}

/**
 * Check if storage is near quota (>90% of ~5MB)
 */
export function isNearQuota(): boolean {
  const size = getStorageSize();
  const quota = 5 * 1024 * 1024; // 5MB
  return size > quota * 0.9;
}
