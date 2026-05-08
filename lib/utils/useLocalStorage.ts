'use client';

import { useState, useEffect, useCallback } from 'react';
import { safeSave, safeGet } from '@/lib/utils/localStorage';

/**
 * React hook for managing state synced with localStorage
 */
export function useLocalStorage<T>(
  key: string,
  initialValue: T,
  options?: {
    sync?: boolean; // Sync across tabs
  }
): [T, (value: T | ((prev: T) => T)) => void] {
  const [storedValue, setStoredValue] = useState<T>(() => {
    const item = safeGet<T>(key, initialValue);
    return item ?? initialValue;
  });

  const setValue = useCallback(
    (value: T | ((prev: T) => T)) => {
      try {
        const valueToStore = value instanceof Function ? value(storedValue) : value;
        setStoredValue(valueToStore);
        safeSave(key, valueToStore);
      } catch (error) {
        console.error('Error in useLocalStorage:', error);
      }
    },
    [key, storedValue]
  );

  // Handle storage changes from other tabs
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      const fullKey = `exam-builder:${key}_v1`;
      if (e.key === fullKey && e.newValue) {
        try {
          setStoredValue(JSON.parse(e.newValue) as T);
        } catch (error) {
          console.error('Error parsing storage event:', error);
        }
      }
    };

    if (options?.sync !== false) {
      window.addEventListener('storage', handleStorageChange);
      return () => window.removeEventListener('storage', handleStorageChange);
    }
  }, [key, options?.sync]);

  return [storedValue, setValue];
}
