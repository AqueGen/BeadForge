/**
 * Cell Events Type Definitions
 *
 * Events that can be attached to specific positions in the stringing order.
 * These events trigger during TTS playback.
 */

// ============================================================
// Event Types
// ============================================================

/** Types of cell events */
export type CellEventType = 'sound' | 'action' | 'text';

/** System action types */
export type CellActionType = 'pause' | 'checkpoint';

/** Sound IDs from the event sounds library */
export type EventSoundId =
  // Beading techniques
  | 'петля-підйому'
  | 'прибавка'
  | 'убавка'
  | 'закріплення'
  // Signals
  | 'біп'
  | 'подвійний-біп'
  | 'мелодія'
  | 'увага';

// ============================================================
// Event Interfaces
// ============================================================

/** Base event interface */
interface BaseCellEvent {
  type: CellEventType;
  id: string; // Unique ID for this event instance
}

/** Sound event - plays audio from the library */
export interface SoundEvent extends BaseCellEvent {
  type: 'sound';
  soundId: EventSoundId;
}

/** Action event - triggers system behavior */
export interface ActionEvent extends BaseCellEvent {
  type: 'action';
  actionType: CellActionType;
}

/** Text event - displays a toast message */
export interface TextEvent extends BaseCellEvent {
  type: 'text';
  message: string;
  duration?: number; // milliseconds, default 5000
}

/** Union type for all cell events */
export type CellEvent = SoundEvent | ActionEvent | TextEvent;

// ============================================================
// Pattern Events Map
// ============================================================

/**
 * Map of position (1-based stringing order) to array of events
 * Multiple events can be attached to a single position
 */
export interface PatternEvents {
  [position: number]: CellEvent[];
}

// ============================================================
// Checkpoint Types
// ============================================================

/** Saved checkpoint for resuming TTS playback */
export interface EventCheckpoint {
  patternId: string;
  position: number;
  timestamp: number;
  patternName?: string;
}

// ============================================================
// Event Editor State
// ============================================================

/** State for event editing UI */
export interface EventEditorState {
  isOpen: boolean;
  position: number | null;
  editingEventIndex: number | null; // null = adding new event
}

// ============================================================
// Helper Functions
// ============================================================

/** Create a new sound event */
export function createSoundEvent(soundId: EventSoundId): SoundEvent {
  return {
    type: 'sound',
    id: `sound-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    soundId,
  };
}

/** Create a new action event */
export function createActionEvent(actionType: CellActionType): ActionEvent {
  return {
    type: 'action',
    id: `action-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    actionType,
  };
}

/** Create a new text event */
export function createTextEvent(message: string, duration?: number): TextEvent {
  return {
    type: 'text',
    id: `text-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    message,
    duration,
  };
}

/** Get display name for event */
export function getEventDisplayName(event: CellEvent): string {
  switch (event.type) {
    case 'sound':
      return `🔊 ${event.soundId}`;
    case 'action':
      return event.actionType === 'pause' ? '⏸️ Пауза' : '💾 Чекпоінт';
    case 'text':
      return `💬 "${event.message.slice(0, 20)}${event.message.length > 20 ? '...' : ''}"`;
  }
}

/** Get short icon for event type */
export function getEventIcon(event: CellEvent): string {
  switch (event.type) {
    case 'sound':
      return '🔊';
    case 'action':
      return event.actionType === 'pause' ? '⏸️' : '💾';
    case 'text':
      return '💬';
  }
}
