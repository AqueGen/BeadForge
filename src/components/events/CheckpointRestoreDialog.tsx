'use client';

import { useEffect, useState } from 'react';
import { Play, X, Clock } from 'lucide-react';
import type { EventCheckpoint } from '@/types/cellEvents';

// ============================================================
// Types
// ============================================================

interface CheckpointRestoreDialogProps {
  /** Saved checkpoint to restore */
  checkpoint: EventCheckpoint | null;
  /** Current pattern ID to check if checkpoint matches */
  currentPatternId?: string;
  /** Called when user accepts to restore checkpoint */
  onRestore: (position: number) => void;
  /** Called when user dismisses the dialog */
  onDismiss: () => void;
}

// ============================================================
// Helper Functions
// ============================================================

function formatTimestamp(timestamp: number): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) {
    return 'щойно';
  } else if (diffMins < 60) {
    return `${diffMins} хв. тому`;
  } else if (diffHours < 24) {
    return `${diffHours} год. тому`;
  } else if (diffDays < 7) {
    return `${diffDays} дн. тому`;
  } else {
    return date.toLocaleDateString('uk-UA', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  }
}

// ============================================================
// Component
// ============================================================

export function CheckpointRestoreDialog({
  checkpoint,
  currentPatternId,
  onRestore,
  onDismiss,
}: CheckpointRestoreDialogProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [shouldShow, setShouldShow] = useState(false);

  // Determine if we should show the dialog
  useEffect(() => {
    if (checkpoint && currentPatternId) {
      // Show dialog if checkpoint matches current pattern
      const matches = checkpoint.patternId === currentPatternId;
      setShouldShow(matches);
    } else {
      setShouldShow(false);
    }
  }, [checkpoint, currentPatternId]);

  // Animation on mount
  useEffect(() => {
    if (shouldShow) {
      const timer = setTimeout(() => setIsVisible(true), 50);
      return () => clearTimeout(timer);
    } else {
      setIsVisible(false);
    }
  }, [shouldShow]);

  if (!shouldShow || !checkpoint) return null;

  const handleRestore = () => {
    setIsVisible(false);
    setTimeout(() => {
      onRestore(checkpoint.position);
    }, 200);
  };

  const handleDismiss = () => {
    setIsVisible(false);
    setTimeout(() => {
      onDismiss();
    }, 200);
  };

  return (
    <div
      className={`
        fixed bottom-20 left-1/2 -translate-x-1/2 z-50
        max-w-md w-full mx-4
        transition-all duration-300 ease-out
        ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}
      `}
    >
      <div className="bg-slate-800 border border-amber-500/50 rounded-lg shadow-xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center gap-2 px-4 py-3 bg-amber-500/20 border-b border-amber-500/30">
          <Clock size={18} className="text-amber-400" />
          <span className="font-medium text-amber-200">
            Знайдено збережену позицію
          </span>
        </div>

        {/* Content */}
        <div className="p-4">
          <p className="text-slate-200 text-sm mb-3">
            У вас є збережена позиція у цій схемі. Бажаєте продовжити з неї?
          </p>

          {/* Checkpoint details */}
          <div className="bg-slate-700/50 rounded-lg p-3 mb-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-400">Позиція:</span>
              <span className="text-amber-300 font-mono font-medium">
                {checkpoint.position}
              </span>
            </div>
            {checkpoint.patternName && (
              <div className="flex items-center justify-between text-sm mt-1">
                <span className="text-slate-400">Схема:</span>
                <span className="text-slate-200 truncate max-w-[200px]">
                  {checkpoint.patternName}
                </span>
              </div>
            )}
            <div className="flex items-center justify-between text-sm mt-1">
              <span className="text-slate-400">Збережено:</span>
              <span className="text-slate-300">
                {formatTimestamp(checkpoint.timestamp)}
              </span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <button
              onClick={handleRestore}
              className="
                flex-1 flex items-center justify-center gap-2
                px-4 py-2.5 rounded-lg
                bg-amber-500 hover:bg-amber-400
                text-slate-900 font-medium
                transition-colors
              "
            >
              <Play size={16} />
              Продовжити
            </button>
            <button
              onClick={handleDismiss}
              className="
                flex items-center justify-center
                px-4 py-2.5 rounded-lg
                bg-slate-700 hover:bg-slate-600
                text-slate-300 hover:text-slate-100
                transition-colors
              "
              title="Почати спочатку"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default CheckpointRestoreDialog;
