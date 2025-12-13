/**
 * Event Sounds Configuration
 *
 * Defines the available sounds for cell events, including
 * beading technique announcements and signal sounds.
 */

import type { EventSoundId } from '@/types/cellEvents';

// ============================================================
// Sound Definitions
// ============================================================

export interface EventSoundDefinition {
  id: EventSoundId;
  nameUk: string;
  filename: string; // without extension
  category: 'technique' | 'signal';
  description?: string;
}

/**
 * Available event sounds
 *
 * Audio files should be located at:
 * public/audio/events/{language}/{filename}.mp3
 */
export const EVENT_SOUNDS: EventSoundDefinition[] = [
  // Beading techniques
  {
    id: 'петля-підйому',
    nameUk: 'Петля підйому',
    filename: 'petlya-pidyomu',
    category: 'technique',
    description: 'Оголошення техніки "петля підйому"',
  },
  {
    id: 'прибавка',
    nameUk: 'Прибавка',
    filename: 'prybavka',
    category: 'technique',
    description: 'Оголошення прибавки (додавання бісерини)',
  },
  {
    id: 'убавка',
    nameUk: 'Убавка',
    filename: 'ubavka',
    category: 'technique',
    description: 'Оголошення убавки (пропуск бісерини)',
  },
  {
    id: 'закріплення',
    nameUk: 'Закріплення',
    filename: 'zakriplennya',
    category: 'technique',
    description: 'Оголошення закріплення нитки',
  },

  // Signal sounds
  {
    id: 'біп',
    nameUk: 'Біп',
    filename: 'beep',
    category: 'signal',
    description: 'Короткий сигнальний звук',
  },
  {
    id: 'подвійний-біп',
    nameUk: 'Подвійний біп',
    filename: 'double-beep',
    category: 'signal',
    description: 'Подвійний сигнальний звук',
  },
  {
    id: 'мелодія',
    nameUk: 'Мелодія',
    filename: 'melody',
    category: 'signal',
    description: 'Приємна мелодія для важливих моментів',
  },
  {
    id: 'увага',
    nameUk: 'Увага',
    filename: 'attention',
    category: 'signal',
    description: 'Сигнал для привернення уваги',
  },
];

// ============================================================
// Helper Functions
// ============================================================

/** Get sound definition by ID */
export function getEventSoundById(id: EventSoundId): EventSoundDefinition | undefined {
  return EVENT_SOUNDS.find((s) => s.id === id);
}

/** Get sounds by category */
export function getEventSoundsByCategory(
  category: 'technique' | 'signal'
): EventSoundDefinition[] {
  return EVENT_SOUNDS.filter((s) => s.category === category);
}

/** Get audio file path for a sound */
export function getEventSoundPath(soundId: EventSoundId, language: string = 'uk'): string {
  const sound = getEventSoundById(soundId);
  if (!sound) {
    console.warn(`Unknown event sound: ${soundId}`);
    return '';
  }
  return `/audio/events/${language}/${sound.filename}.mp3`;
}

/** Get display name for sound */
export function getEventSoundName(soundId: EventSoundId): string {
  const sound = getEventSoundById(soundId);
  return sound?.nameUk || soundId;
}

// ============================================================
// Audio Cache & Player
// ============================================================

// Cache for preloaded audio elements
const audioCache = new Map<string, HTMLAudioElement>();

/** Preload event sounds for faster playback */
export function preloadEventSounds(language: string = 'uk'): void {
  EVENT_SOUNDS.forEach((sound) => {
    const path = getEventSoundPath(sound.id, language);
    if (path && !audioCache.has(path)) {
      const audio = new Audio(path);
      audio.preload = 'auto';
      audioCache.set(path, audio);
    }
  });
}

/** Play an event sound */
export async function playEventSound(
  soundId: EventSoundId,
  language: string = 'uk'
): Promise<void> {
  const path = getEventSoundPath(soundId, language);
  if (!path) return;

  let audio = audioCache.get(path);
  if (!audio) {
    audio = new Audio(path);
    audioCache.set(path, audio);
  }

  // Reset and play
  audio.currentTime = 0;

  try {
    await audio.play();
    // Wait for sound to finish
    await new Promise<void>((resolve) => {
      audio!.onended = () => resolve();
      audio!.onerror = () => resolve();
    });
  } catch (error) {
    console.warn(`Failed to play event sound: ${soundId}`, error);
  }
}

/** Stop all currently playing event sounds */
export function stopEventSounds(): void {
  audioCache.forEach((audio) => {
    audio.pause();
    audio.currentTime = 0;
  });
}

// ============================================================
// Default Export
// ============================================================

export default EVENT_SOUNDS;
