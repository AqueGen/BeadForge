'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import type { BeadPattern, TTSSettings, TTSState } from '@/types';
import { DEFAULT_TTS_SETTINGS } from '@/types';
import { TTSController, isTTSSupported, loadVoices } from '@/lib/tts';

const TTS_SETTINGS_STORAGE_KEY = 'beadforge_tts_settings';

// Helper to load TTS settings from localStorage
function loadTTSSettingsFromStorage(): Partial<TTSSettings> | null {
  if (typeof window === 'undefined') return null;
  try {
    const saved = localStorage.getItem(TTS_SETTINGS_STORAGE_KEY);
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (e) {
    console.error('Failed to load TTS settings from localStorage:', e);
  }
  return null;
}

// Helper to save TTS settings to localStorage
function saveTTSSettingsToStorage(settings: TTSSettings): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(TTS_SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  } catch (e) {
    console.error('Failed to save TTS settings to localStorage:', e);
  }
}

export interface UseTTSReturn {
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

  // Initialize with pattern
  initializeWithPattern: (pattern: BeadPattern) => void;
}

export function useTTS(initialSettings?: Partial<TTSSettings>): UseTTSReturn {
  const [settings, setSettings] = useState<TTSSettings>(() => {
    // Load from localStorage first, then apply initialSettings overrides
    const savedSettings = loadTTSSettingsFromStorage();
    return {
      ...DEFAULT_TTS_SETTINGS,
      ...savedSettings,
      ...initialSettings,
    };
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

  const initializeWithPattern = useCallback((pattern: BeadPattern) => {
    if (!controllerRef.current) {
      // Use DEFAULT_TTS_SETTINGS for initial creation; settings will be updated via separate effect
      controllerRef.current = new TTSController(DEFAULT_TTS_SETTINGS);
    }

    controllerRef.current.initialize(pattern);
    setState((prev) => ({
      ...prev,
      totalBeads: controllerRef.current!.getTotalBeads(),
      currentPosition: 0,
      currentGroupCount: 0,
      currentColorName: '',
    }));
  }, []); // No dependencies - settings are updated via separate effect

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
    setSettings((prev) => {
      const updated = { ...prev, ...newSettings };
      saveTTSSettingsToStorage(updated);
      return updated;
    });
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
