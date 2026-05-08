'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

interface UseTimerOptions {
  durationMinutes: number;
  onTimeUp?: () => void;
  onWarning?: (remainingSeconds: number) => void;
  warningThresholdSeconds?: number; // Warn at this many seconds remaining (default 5 min = 300s)
}

interface TimerState {
  remainingSeconds: number;
  isRunning: boolean;
  isTimeUp: boolean;
  isWarningTriggered: boolean;
}

/**
 * React hook for exam countdown timer
 * Syncs with system clock to prevent manipulation
 */
export function useTimer({
  durationMinutes,
  onTimeUp,
  onWarning,
  warningThresholdSeconds = 300, // Default: 5 minutes
}: UseTimerOptions): TimerState & { start: () => void; pause: () => void; resume: () => void; reset: () => void } {
  const durationSeconds = durationMinutes * 60;
  const [remainingSeconds, setRemainingSeconds] = useState(durationSeconds);
  const [isRunning, setIsRunning] = useState(false);
  const [isTimeUp, setIsTimeUp] = useState(false);
  const [isWarningTriggered, setIsWarningTriggered] = useState(false);

  const startTimeRef = useRef<number | null>(null);
  const pausedTimeRef = useRef<number>(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const warningTriggeredRef = useRef(false);

  const start = useCallback(() => {
    if (isRunning || isTimeUp) return;
    startTimeRef.current = Date.now() - pausedTimeRef.current;
    setIsRunning(true);
  }, [isRunning, isTimeUp]);

  const pause = useCallback(() => {
    if (!isRunning) return;
    if (startTimeRef.current !== null) {
      pausedTimeRef.current = Date.now() - startTimeRef.current;
    }
    setIsRunning(false);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
  }, [isRunning]);

  const resume = useCallback(() => {
    start();
  }, [start]);

  const reset = useCallback(() => {
    setIsRunning(false);
    setIsTimeUp(false);
    setIsWarningTriggered(false);
    setRemainingSeconds(durationSeconds);
    pausedTimeRef.current = 0;
    startTimeRef.current = null;
    warningTriggeredRef.current = false;
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
  }, [durationSeconds]);

  // Timer tick effect
  useEffect(() => {
    if (!isRunning) return;

    intervalRef.current = setInterval(() => {
      if (startTimeRef.current === null) return;

      const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
      const remaining = Math.max(0, durationSeconds - elapsed);

      setRemainingSeconds(remaining);

      // Check warning threshold
      if (remaining <= warningThresholdSeconds && !warningTriggeredRef.current) {
        warningTriggeredRef.current = true;
        setIsWarningTriggered(true);
        onWarning?.(remaining);
      }

      // Time up
      if (remaining === 0) {
        setIsRunning(false);
        setIsTimeUp(true);
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
        onTimeUp?.();
      }
    }, 100); // Update every 100ms for smooth countdown

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isRunning, durationSeconds, warningThresholdSeconds, onTimeUp, onWarning]);

  return {
    remainingSeconds,
    isRunning,
    isTimeUp,
    isWarningTriggered,
    start,
    pause,
    resume,
    reset,
  };
}
