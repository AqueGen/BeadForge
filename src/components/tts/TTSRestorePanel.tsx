'use client';

import { FC } from 'react';
import { deleteProgress } from '@/lib/tts/ttsProgress';
import type { TTSProgress } from '@/types';
import type { BeadPattern } from '@/types';
import { getUsedHeight } from '@/lib/pattern';

interface TTSRestorePanelProps {
  pattern: BeadPattern;
  savedProgress: TTSProgress;  // Progress data passed from parent
  onRestore: (position: number, completedBeads: number) => void;
  onDismiss: () => void;
}

/**
 * Panel that offers to restore TTS progress from localStorage
 * Shows when there's saved progress for the current pattern
 */
export const TTSRestorePanel: FC<TTSRestorePanelProps> = ({
  pattern,
  savedProgress,
  onRestore,
  onDismiss,
}) => {
  const usedHeight = getUsedHeight(pattern);
  const totalBeads = usedHeight * pattern.width;
  const progressPercent = Math.round((savedProgress.completedBeads / totalBeads) * 100);

  // Format the date
  const savedDate = new Date(savedProgress.lastUpdated);
  const formattedDate = savedDate.toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });

  const handleRestore = () => {
    onRestore(savedProgress.position, savedProgress.completedBeads);
  };

  const handleStartFresh = () => {
    deleteProgress(savedProgress.patternId);
    onDismiss();
  };

  return (
    <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0">
          <svg
            className="h-6 w-6 text-blue-600"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>

        <div className="flex-1">
          <h3 className="text-sm font-medium text-blue-800">
            Найден сохранённый прогресс
          </h3>

          <div className="mt-1 text-sm text-blue-700">
            <p>
              Позиция: <strong>{savedProgress.position}</strong> из {totalBeads} ({progressPercent}%)
            </p>
            <p className="text-xs text-blue-600 mt-0.5">
              Сохранено: {formattedDate}
            </p>
          </div>

          {/* Progress bar */}
          <div className="mt-2 h-2 w-full rounded-full bg-blue-200">
            <div
              className="h-2 rounded-full bg-blue-600 transition-all"
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          <div className="mt-3 flex gap-2">
            <button
              onClick={handleRestore}
              className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              Восстановить
            </button>
            <button
              onClick={handleStartFresh}
              className="rounded-md border border-blue-300 bg-white px-3 py-1.5 text-sm font-medium text-blue-700 hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              Начать сначала
            </button>
          </div>
        </div>

        {/* Close button */}
        <button
          onClick={onDismiss}
          className="flex-shrink-0 text-blue-400 hover:text-blue-600"
          aria-label="Закрыть"
        >
          <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path
              fillRule="evenodd"
              d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
              clipRule="evenodd"
            />
          </svg>
        </button>
      </div>
    </div>
  );
};

export default TTSRestorePanel;
