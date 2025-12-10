'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import type { BallPattern, TTSSettings, TTSState } from '@/types';
import { DEFAULT_TTS_SETTINGS } from '@/types';
import { TTSController, isTTSSupported, loadVoices } from '@/lib/tts';

export interface UseBallTTSReturn {
  // State
  state: TTSState;
  settings: TTSSettings;

  // Controls
  play: () => void;
  pause: () => void;
  stop: () => void;
  next: () => void;
  previous: () => void;
  goToPosition: (position: number) => void;

  // Settings
  updateSettings: (settings: Partial<TTSSettings>) => void;

  // Initialize with ball pattern
  initializeWithPattern: (pattern: BallPattern) => void;
}

export function useBallTTS(initialSettings?: Partial<TTSSettings>): UseBallTTSReturn {
  const [settings, setSettings] = useState<TTSSettings>({
    ...DEFAULT_TTS_SETTINGS,
    ...initialSettings,
  });

  const [state, setState] = useState<TTSState>({
    isPlaying: false,
    isPaused: false,
    currentPosition: 0,
    currentGroupCount: 0,
    totalBeads: 0,
    currentColorName: '',
    isSupported: false,
  });

  const controllerRef = useRef<TTSController | null>(null);

  // Initialize TTS support check
  useEffect(() => {
    const checkSupport = async () => {
      const supported = isTTSSupported();
      setState((prev) => ({ ...prev, isSupported: supported }));

      if (supported) {
        // Pre-load voices
        await loadVoices();
      }
    };

    checkSupport();
  }, []);

  // Initialize or update controller
  useEffect(() => {
    if (!state.isSupported) return;

    if (!controllerRef.current) {
      controllerRef.current = new TTSController(settings);
    }

    controllerRef.current.setHandlers({
      onPositionChange: (position, colorName, groupCount) => {
        setState((prev) => ({
          ...prev,
          currentPosition: position,
          currentGroupCount: groupCount,
          currentColorName: colorName,
        }));
      },
      onStateChange: (isPlaying, isPaused) => {
        setState((prev) => ({
          ...prev,
          isPlaying,
          isPaused,
        }));
      },
      onComplete: () => {
        setState((prev) => ({
          ...prev,
          isPlaying: false,
          isPaused: false,
        }));
      },
    });
  }, [state.isSupported, settings]);

  // Update controller settings when settings change
  useEffect(() => {
    if (controllerRef.current) {
      controllerRef.current.updateSettings(settings);
    }
  }, [settings]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (controllerRef.current) {
        controllerRef.current.stop();
      }
    };
  }, []);

  const initializeWithPattern = useCallback((pattern: BallPattern) => {
    if (!controllerRef.current) {
      controllerRef.current = new TTSController(settings);
    }

    // Use ball pattern initialization
    controllerRef.current.initializeBallPattern(pattern);
    setState((prev) => ({
      ...prev,
      totalBeads: controllerRef.current!.getTotalBeads(),
      currentPosition: 0,
      currentGroupCount: 0,
      currentColorName: '',
    }));
  }, [settings]);

  const play = useCallback(() => {
    controllerRef.current?.play();
  }, []);

  const pause = useCallback(() => {
    controllerRef.current?.pause();
  }, []);

  const stop = useCallback(() => {
    controllerRef.current?.stop();
  }, []);

  const next = useCallback(() => {
    controllerRef.current?.next();
  }, []);

  const previous = useCallback(() => {
    controllerRef.current?.previous();
  }, []);

  const goToPosition = useCallback((position: number) => {
    controllerRef.current?.goToPosition(position);
  }, []);

  const updateSettings = useCallback((newSettings: Partial<TTSSettings>) => {
    setSettings((prev) => ({ ...prev, ...newSettings }));
  }, []);

  return {
    state,
    settings,
    play,
    pause,
    stop,
    next,
    previous,
    goToPosition,
    updateSettings,
    initializeWithPattern,
  };
}
