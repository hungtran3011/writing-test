'use client';

import React, { useEffect } from 'react';
import { useTimer } from '@/lib/utils/useTimer';

interface ExamTimerProps {
  durationMinutes: number;
  onTimeUp: () => void;
  isSubmitted?: boolean;
}

function formatTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m ${secs}s`;
  } else {
    return `${minutes}m ${secs}s`;
  }
}

export default function ExamTimer({ durationMinutes, onTimeUp, isSubmitted }: ExamTimerProps) {
  const { remainingSeconds, isTimeUp, isWarningTriggered, start } = useTimer({
    durationMinutes,
    onTimeUp,
    warningThresholdSeconds: 300, // 5 minutes
  });

  // Auto-start timer on mount
  useEffect(() => {
    if (!isSubmitted) {
      start();
    }
  }, [isSubmitted, start]);

  // Get color based on time remaining
  const getTimerColor = () => {
    if (isTimeUp) return 'text-red-600 bg-red-50';
    if (isWarningTriggered) return 'text-orange-600 bg-orange-50';
    return 'text-gray-700 bg-gray-50';
  };

  return (
    <div className={`p-4 rounded-lg border border-gray-200 ${getTimerColor()}`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-700">Time Remaining</p>
          <p className="text-2xl font-bold mt-1">{formatTime(remainingSeconds)}</p>
        </div>

        {isTimeUp && (
          <div className="text-center">
            <p className="text-lg font-bold text-red-600">TIME IS UP</p>
          </div>
        )}

        {isWarningTriggered && !isTimeUp && (
          <div className="text-center">
            <p className="text-sm text-orange-600 font-medium">Time running out</p>
          </div>
        )}
      </div>

      {/* Progress bar */}
      <div className="mt-4 w-full bg-gray-200 rounded-full h-2">
        <div
          className={`h-2 rounded-full transition-all ${
            isTimeUp ? 'bg-red-600' : isWarningTriggered ? 'bg-orange-600' : 'bg-green-600'
          }`}
          style={{ width: `${((durationMinutes * 60 - remainingSeconds) / (durationMinutes * 60)) * 100}%` }}
        />
      </div>
    </div>
  );
}
