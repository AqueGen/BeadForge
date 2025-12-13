'use client';

import { useState, useCallback, useMemo, useEffect } from 'react';
import type {
  CellEvent,
  PatternEvents,
  EventCheckpoint,
  EventEditorState,
  EventSoundId,
  CellActionType,
} from '@/types/cellEvents';
import {
  createSoundEvent,
  createActionEvent,
  createTextEvent,
} from '@/types/cellEvents';
import { playEventSound, preloadEventSounds, stopEventSounds } from '@/config/eventSounds';

// ============================================================
// Storage Keys
// ============================================================

const EVENTS_STORAGE_KEY = 'beadforge_pattern_events';
const CHECKPOINT_STORAGE_KEY = 'beadforge_tts_checkpoint';

// ============================================================
// Hook Interface
// ============================================================

export interface UseCellEventsReturn {
  events: PatternEvents;
  editorState: EventEditorState;
  checkpoint: EventCheckpoint | null;
  actions: {
    // Event CRUD
    addEvent: (position: number, event: CellEvent) => void;
    removeEvent: (position: number, eventId: string) => void;
    updateEvent: (position: number, eventId: string, updates: Partial<CellEvent>) => void;
    clearEventsAtPosition: (position: number) => void;
    clearAllEvents: () => void;

    // Quick add helpers
    addSoundEvent: (position: number, soundId: EventSoundId) => void;
    addActionEvent: (position: number, actionType: CellActionType) => void;
    addTextEvent: (position: number, message: string, duration?: number) => void;

    // Editor state
    openEditor: (position: number, editingEventIndex?: number | null) => void;
    closeEditor: () => void;

    // Checkpoint management
    saveCheckpoint: (patternId: string, position: number, patternName?: string) => void;
    clearCheckpoint: () => void;

    // Event execution
    executeEventsAtPosition: (position: number, onPause?: () => void, onText?: (message: string, duration?: number) => void) => Promise<boolean>;

    // Persistence
    saveToStorage: (patternId: string) => void;
    loadFromStorage: (patternId: string) => void;

    // Preloading
    preloadSounds: () => void;
    stopAllSounds: () => void;
  };

  // Helpers
  hasEventsAtPosition: (position: number) => boolean;
  getEventsAtPosition: (position: number) => CellEvent[];
  getEventCount: () => number;
  getAllPositionsWithEvents: () => number[];
}

// ============================================================
// Hook Implementation
// ============================================================

export function useCellEvents(patternId?: string): UseCellEventsReturn {
  const [events, setEvents] = useState<PatternEvents>({});
  const [editorState, setEditorState] = useState<EventEditorState>({
    isOpen: false,
    position: null,
    editingEventIndex: null,
  });
  const [checkpoint, setCheckpoint] = useState<EventCheckpoint | null>(null);

  // Load events and checkpoint from storage on mount
  useEffect(() => {
    if (patternId) {
      loadFromStorageInternal(patternId);
    }
    loadCheckpointFromStorage();
    // Preload event sounds
    preloadEventSounds('uk');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patternId]);

  // ============================================================
  // Storage Functions
  // ============================================================

  const loadFromStorageInternal = useCallback((pid: string) => {
    if (typeof window === 'undefined') return;
    try {
      const stored = localStorage.getItem(`${EVENTS_STORAGE_KEY}_${pid}`);
      if (stored) {
        const parsed = JSON.parse(stored);
        setEvents(parsed);
      }
    } catch (e) {
      console.error('Failed to load events from storage:', e);
    }
  }, []);

  const saveToStorage = useCallback((pid: string) => {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(`${EVENTS_STORAGE_KEY}_${pid}`, JSON.stringify(events));
    } catch (e) {
      console.error('Failed to save events to storage:', e);
    }
  }, [events]);

  const loadFromStorage = useCallback((pid: string) => {
    loadFromStorageInternal(pid);
  }, [loadFromStorageInternal]);

  const loadCheckpointFromStorage = useCallback(() => {
    if (typeof window === 'undefined') return;
    try {
      const stored = localStorage.getItem(CHECKPOINT_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as EventCheckpoint;
        setCheckpoint(parsed);
      }
    } catch (e) {
      console.error('Failed to load checkpoint from storage:', e);
    }
  }, []);

  // ============================================================
  // Event CRUD
  // ============================================================

  const addEvent = useCallback((position: number, event: CellEvent) => {
    setEvents((prev) => {
      const positionEvents = prev[position] || [];
      return {
        ...prev,
        [position]: [...positionEvents, event],
      };
    });
  }, []);

  const removeEvent = useCallback((position: number, eventId: string) => {
    setEvents((prev) => {
      const positionEvents = prev[position] || [];
      const filtered = positionEvents.filter((e) => e.id !== eventId);

      if (filtered.length === 0) {
        // Remove the position entirely if no events left
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { [position]: _removed, ...rest } = prev;
        return rest;
      }

      return {
        ...prev,
        [position]: filtered,
      };
    });
  }, []);

  const updateEvent = useCallback((position: number, eventId: string, updates: Partial<CellEvent>) => {
    setEvents((prev) => {
      const positionEvents = prev[position] || [];
      return {
        ...prev,
        [position]: positionEvents.map((e) =>
          e.id === eventId ? { ...e, ...updates } as CellEvent : e
        ),
      };
    });
  }, []);

  const clearEventsAtPosition = useCallback((position: number) => {
    setEvents((prev) => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { [position]: _removed, ...rest } = prev;
      return rest;
    });
  }, []);

  const clearAllEvents = useCallback(() => {
    setEvents({});
  }, []);

  // ============================================================
  // Quick Add Helpers
  // ============================================================

  const addSoundEvent = useCallback((position: number, soundId: EventSoundId) => {
    addEvent(position, createSoundEvent(soundId));
  }, [addEvent]);

  const addActionEvent = useCallback((position: number, actionType: CellActionType) => {
    addEvent(position, createActionEvent(actionType));
  }, [addEvent]);

  const addTextEvent = useCallback((position: number, message: string, duration?: number) => {
    addEvent(position, createTextEvent(message, duration));
  }, [addEvent]);

  // ============================================================
  // Editor State
  // ============================================================

  const openEditor = useCallback((position: number, editingEventIndex: number | null = null) => {
    setEditorState({
      isOpen: true,
      position,
      editingEventIndex,
    });
  }, []);

  const closeEditor = useCallback(() => {
    setEditorState({
      isOpen: false,
      position: null,
      editingEventIndex: null,
    });
  }, []);

  // ============================================================
  // Checkpoint Management
  // ============================================================

  const saveCheckpoint = useCallback((pid: string, position: number, patternName?: string) => {
    const newCheckpoint: EventCheckpoint = {
      patternId: pid,
      position,
      timestamp: Date.now(),
      patternName,
    };
    setCheckpoint(newCheckpoint);

    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(CHECKPOINT_STORAGE_KEY, JSON.stringify(newCheckpoint));
      } catch (e) {
        console.error('Failed to save checkpoint:', e);
      }
    }
  }, []);

  const clearCheckpoint = useCallback(() => {
    setCheckpoint(null);
    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem(CHECKPOINT_STORAGE_KEY);
      } catch (e) {
        console.error('Failed to clear checkpoint:', e);
      }
    }
  }, []);

  // ============================================================
  // Event Execution
  // ============================================================

  const executeEventsAtPosition = useCallback(async (
    position: number,
    onPause?: () => void,
    onText?: (message: string, duration?: number) => void
  ): Promise<boolean> => {
    const positionEvents = events[position] || [];

    if (positionEvents.length === 0) {
      return true; // No events, continue normally
    }

    for (const event of positionEvents) {
      switch (event.type) {
        case 'sound':
          await playEventSound(event.soundId, 'uk');
          break;

        case 'action':
          if (event.actionType === 'pause') {
            onPause?.();
            return false; // Signal to pause TTS
          } else if (event.actionType === 'checkpoint') {
            // Checkpoint is handled by the TTS service, just continue
          }
          break;

        case 'text':
          onText?.(event.message, event.duration);
          break;
      }
    }

    return true; // Continue TTS
  }, [events]);

  // ============================================================
  // Sound Control
  // ============================================================

  const preloadSounds = useCallback(() => {
    preloadEventSounds('uk');
  }, []);

  const stopAllSounds = useCallback(() => {
    stopEventSounds();
  }, []);

  // ============================================================
  // Helpers
  // ============================================================

  const hasEventsAtPosition = useCallback((position: number): boolean => {
    return (events[position]?.length || 0) > 0;
  }, [events]);

  const getEventsAtPosition = useCallback((position: number): CellEvent[] => {
    return events[position] || [];
  }, [events]);

  const getEventCount = useCallback((): number => {
    return Object.values(events).reduce((sum, arr) => sum + arr.length, 0);
  }, [events]);

  const getAllPositionsWithEvents = useCallback((): number[] => {
    return Object.keys(events)
      .map(Number)
      .filter((pos) => events[pos].length > 0)
      .sort((a, b) => a - b);
  }, [events]);

  // ============================================================
  // Memoized Actions
  // ============================================================

  const actions = useMemo(() => ({
    addEvent,
    removeEvent,
    updateEvent,
    clearEventsAtPosition,
    clearAllEvents,
    addSoundEvent,
    addActionEvent,
    addTextEvent,
    openEditor,
    closeEditor,
    saveCheckpoint,
    clearCheckpoint,
    executeEventsAtPosition,
    saveToStorage,
    loadFromStorage,
    preloadSounds,
    stopAllSounds,
  }), [
    addEvent,
    removeEvent,
    updateEvent,
    clearEventsAtPosition,
    clearAllEvents,
    addSoundEvent,
    addActionEvent,
    addTextEvent,
    openEditor,
    closeEditor,
    saveCheckpoint,
    clearCheckpoint,
    executeEventsAtPosition,
    saveToStorage,
    loadFromStorage,
    preloadSounds,
    stopAllSounds,
  ]);

  return {
    events,
    editorState,
    checkpoint,
    actions,
    hasEventsAtPosition,
    getEventsAtPosition,
    getEventCount,
    getAllPositionsWithEvents,
  };
}

export default useCellEvents;
