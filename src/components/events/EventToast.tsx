'use client';

import { useState, useEffect, useCallback } from 'react';
import { X } from 'lucide-react';

// ============================================================
// Types
// ============================================================

export interface ToastMessage {
  id: string;
  message: string;
  duration: number;
  timestamp: number;
}

interface EventToastProps {
  /** Current toast to display (if any) */
  toast: ToastMessage | null;
  /** Called when toast is dismissed */
  onDismiss: () => void;
}

// ============================================================
// Hook for Toast Management
// ============================================================

export interface UseEventToastReturn {
  toast: ToastMessage | null;
  showToast: (message: string, duration?: number) => void;
  dismissToast: () => void;
}

export function useEventToast(): UseEventToastReturn {
  const [toast, setToast] = useState<ToastMessage | null>(null);

  const showToast = useCallback((message: string, duration: number = 5000) => {
    const newToast: ToastMessage = {
      id: `toast-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      message,
      duration,
      timestamp: Date.now(),
    };
    setToast(newToast);
  }, []);

  const dismissToast = useCallback(() => {
    setToast(null);
  }, []);

  // Auto-dismiss after duration
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => {
        setToast(null);
      }, toast.duration);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  return { toast, showToast, dismissToast };
}

// ============================================================
// Component
// ============================================================

export function EventToast({ toast, onDismiss }: EventToastProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [progress, setProgress] = useState(100);

  // Animation on mount/unmount
  useEffect(() => {
    if (toast) {
      // Small delay for enter animation
      const showTimer = setTimeout(() => setIsVisible(true), 10);
      return () => clearTimeout(showTimer);
    } else {
      setIsVisible(false);
    }
  }, [toast]);

  // Progress bar animation
  useEffect(() => {
    if (!toast) {
      setProgress(100);
      return;
    }

    setProgress(100);
    const startTime = Date.now();
    const duration = toast.duration;

    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, 100 - (elapsed / duration) * 100);
      setProgress(remaining);

      if (remaining <= 0) {
        clearInterval(interval);
      }
    }, 50);

    return () => clearInterval(interval);
  }, [toast]);

  if (!toast) return null;

  return (
    <div
      className={`
        fixed bottom-20 left-1/2 -translate-x-1/2 z-50
        max-w-md w-full mx-4
        transition-all duration-300 ease-out
        ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}
      `}
    >
      <div className="bg-slate-800 border border-slate-600 rounded-lg shadow-xl overflow-hidden">
        {/* Content */}
        <div className="flex items-start gap-3 p-4">
          {/* Message icon */}
          <div className="flex-shrink-0 text-2xl">💬</div>

          {/* Message text */}
          <div className="flex-1 min-w-0">
            <p className="text-slate-100 text-sm leading-relaxed break-words">
              {toast.message}
            </p>
          </div>

          {/* Close button */}
          <button
            onClick={onDismiss}
            className="
              flex-shrink-0 p-1 rounded
              text-slate-400 hover:text-slate-200
              hover:bg-slate-700 transition-colors
            "
            aria-label="Закрити"
          >
            <X size={16} />
          </button>
        </div>

        {/* Progress bar */}
        <div className="h-1 bg-slate-700">
          <div
            className="h-full bg-blue-500 transition-all duration-50 ease-linear"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </div>
  );
}

export default EventToast;
