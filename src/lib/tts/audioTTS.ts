/**
 * Audio TTS Service - Pre-recorded audio playback for consistent cross-platform TTS
 */

import type {
  TTSLanguage,
  TTSVoiceGender,
  TTSSpeed,
  AudioVoiceConfig,
  AudioVoiceManifest,
} from '@/types';

// Base path for audio files
const AUDIO_BASE_PATH = '/audio/tts';

// Audio format priority (first available will be used)
const AUDIO_FORMATS: Array<'mp3' | 'ogg' | 'wav'> = ['mp3', 'ogg', 'wav'];

// Speed multipliers for playback rate
const SPEED_RATES: Record<TTSSpeed, number> = {
  slow: 0.8,
  normal: 1.0,
  fast: 1.25,
};

/**
 * Voice registry - defines available pre-recorded voices
 */
export const AUDIO_VOICES: AudioVoiceConfig[] = [
  // Russian voices
  {
    id: 'ru-female-default',
    name: 'Алёна',
    language: 'ru',
    gender: 'female',
    isDefault: true,
  },
  // Ukrainian voices
  {
    id: 'uk-female-default',
    name: 'Катерина',
    language: 'uk',
    gender: 'female',
    isDefault: true,
  },
  // English voices
  {
    id: 'en-female-default',
    name: 'Sarah',
    language: 'en',
    gender: 'female',
    isDefault: true,
  },
];

/**
 * Color key to audio filename mapping
 * Keys match COLOR_TRANSLATIONS in colorNames.ts
 */
const COLOR_AUDIO_FILES: Record<string, string> = {
  White: 'white',
  Black: 'black',
  Red: 'red',
  Green: 'green',
  Blue: 'blue',
  Yellow: 'yellow',
  Orange: 'orange',
  Purple: 'purple',
  Pink: 'pink',
  Cyan: 'cyan',
  Brown: 'brown',
  Gray: 'gray',
  Silver: 'silver',
  Gold: 'gold',
  Navy: 'navy',
  Maroon: 'maroon',
  // Extended colors
  Beige: 'beige',
  Turquoise: 'turquoise',
  Coral: 'coral',
  Lavender: 'lavender',
  Mint: 'mint',
  Peach: 'peach',
  Olive: 'olive',
  Lime: 'lime',
  Teal: 'teal',
  Ivory: 'ivory',
  Khaki: 'khaki',
  Crimson: 'crimson',
  Indigo: 'indigo',
  Magenta: 'magenta',
  Violet: 'violet',
  Salmon: 'salmon',
  Tan: 'tan',
  Aqua: 'aqua',
  Azure: 'azure',
};

// Cache for loaded audio elements
const audioCache: Map<string, HTMLAudioElement> = new Map();

// Current audio element being played
let currentAudio: HTMLAudioElement | null = null;

/**
 * Check if AudioTTS is supported (browser has Audio API)
 */
export function isAudioTTSSupported(): boolean {
  return typeof window !== 'undefined' && typeof Audio !== 'undefined';
}

/**
 * Get available voices for a language
 */
export function getAudioVoicesForLanguage(language: TTSLanguage): AudioVoiceConfig[] {
  return AUDIO_VOICES.filter((v) => v.language === language);
}

/**
 * Get default voice for a language and gender
 */
export function getDefaultAudioVoice(
  language: TTSLanguage,
  gender: TTSVoiceGender
): AudioVoiceConfig | undefined {
  // Try to find voice matching both language and gender
  let voice = AUDIO_VOICES.find(
    (v) => v.language === language && v.gender === gender && v.isDefault
  );

  // If not found, try just language with default flag
  if (!voice) {
    voice = AUDIO_VOICES.find((v) => v.language === language && v.isDefault);
  }

  // If still not found, try just language
  if (!voice) {
    voice = AUDIO_VOICES.find((v) => v.language === language);
  }

  return voice;
}

/**
 * Get the audio file path for a color
 */
function getAudioPath(
  voiceId: string,
  colorKey: string,
  format: 'mp3' | 'ogg' | 'wav' = 'mp3'
): string {
  const voice = AUDIO_VOICES.find((v) => v.id === voiceId);
  if (!voice) {
    console.warn(`[AudioTTS] Voice not found: ${voiceId}`);
    return '';
  }

  const audioFileName = COLOR_AUDIO_FILES[colorKey];
  if (!audioFileName) {
    console.warn(`[AudioTTS] No audio file mapping for color: ${colorKey}`);
    return '';
  }

  // Path structure: /audio/tts/{language}/{voice-folder}/{color}.{format}
  // e.g., /audio/tts/ru/female-default/red.mp3
  const voiceFolder = voiceId.replace(`${voice.language}-`, '');
  return `${AUDIO_BASE_PATH}/${voice.language}/${voiceFolder}/${audioFileName}.${format}`;
}

/**
 * Load and cache an audio element
 */
async function loadAudio(path: string): Promise<HTMLAudioElement | null> {
  if (audioCache.has(path)) {
    return audioCache.get(path)!;
  }

  return new Promise((resolve) => {
    const audio = new Audio(path);

    audio.oncanplaythrough = () => {
      audioCache.set(path, audio);
      resolve(audio);
    };

    audio.onerror = () => {
      console.warn(`[AudioTTS] Failed to load audio: ${path}`);
      resolve(null);
    };

    // Start loading
    audio.load();
  });
}

/**
 * Check if audio file exists for a color
 */
export async function hasAudioForColor(
  voiceId: string,
  colorKey: string
): Promise<boolean> {
  for (const format of AUDIO_FORMATS) {
    const path = getAudioPath(voiceId, colorKey, format);
    if (!path) continue;

    const audio = await loadAudio(path);
    if (audio) return true;
  }
  return false;
}

/**
 * Preload audio files for common colors
 */
export async function preloadAudioFiles(
  voiceId: string,
  colorKeys: string[]
): Promise<number> {
  let loaded = 0;

  const loadPromises = colorKeys.map(async (colorKey) => {
    for (const format of AUDIO_FORMATS) {
      const path = getAudioPath(voiceId, colorKey, format);
      if (!path) continue;

      const audio = await loadAudio(path);
      if (audio) {
        loaded++;
        return;
      }
    }
  });

  await Promise.all(loadPromises);
  return loaded;
}

/**
 * Play audio for a color
 */
export async function playColorAudio(
  voiceId: string,
  colorKey: string,
  speed: TTSSpeed = 'normal',
  volume: number = 1
): Promise<boolean> {
  // Stop any currently playing audio
  stopAudio();

  // Try each format until one works
  for (const format of AUDIO_FORMATS) {
    const path = getAudioPath(voiceId, colorKey, format);
    if (!path) continue;

    const audio = await loadAudio(path);
    if (!audio) continue;

    return new Promise((resolve) => {
      currentAudio = audio.cloneNode(true) as HTMLAudioElement;
      currentAudio.playbackRate = SPEED_RATES[speed];
      currentAudio.volume = volume;

      currentAudio.onended = () => {
        currentAudio = null;
        resolve(true);
      };

      currentAudio.onerror = () => {
        currentAudio = null;
        resolve(false);
      };

      currentAudio.play().catch(() => {
        currentAudio = null;
        resolve(false);
      });
    });
  }

  console.warn(`[AudioTTS] No audio found for color: ${colorKey}`);
  return false;
}

/**
 * Play a number audio (for grouped format: "red 5")
 */
export async function playNumberAudio(
  voiceId: string,
  number: number,
  speed: TTSSpeed = 'normal',
  volume: number = 1
): Promise<boolean> {
  const voice = AUDIO_VOICES.find((v) => v.id === voiceId);
  if (!voice) return false;

  const voiceFolder = voiceId.replace(`${voice.language}-`, '');
  const path = `${AUDIO_BASE_PATH}/${voice.language}/${voiceFolder}/numbers/${number}.mp3`;

  const audio = await loadAudio(path);
  if (!audio) return false;

  return new Promise((resolve) => {
    currentAudio = audio.cloneNode(true) as HTMLAudioElement;
    currentAudio.playbackRate = SPEED_RATES[speed];
    currentAudio.volume = volume;

    currentAudio.onended = () => {
      currentAudio = null;
      resolve(true);
    };

    currentAudio.onerror = () => {
      currentAudio = null;
      resolve(false);
    };

    currentAudio.play().catch(() => {
      currentAudio = null;
      resolve(false);
    });
  });
}

/**
 * Stop currently playing audio
 */
export function stopAudio(): void {
  if (currentAudio) {
    currentAudio.pause();
    currentAudio.currentTime = 0;
    currentAudio = null;
  }
}

/**
 * Pause currently playing audio
 */
export function pauseAudio(): void {
  if (currentAudio) {
    currentAudio.pause();
  }
}

/**
 * Resume paused audio
 */
export function resumeAudio(): void {
  if (currentAudio) {
    currentAudio.play().catch(console.error);
  }
}

/**
 * Check if audio is currently playing
 */
export function isAudioPlaying(): boolean {
  return currentAudio !== null && !currentAudio.paused;
}

/**
 * Get available audio voices info for UI
 */
export function getAvailableAudioVoicesInfo(): Record<
  TTSLanguage,
  { count: number; names: string[] }
> {
  const result: Record<TTSLanguage, { count: number; names: string[] }> = {
    ru: { count: 0, names: [] },
    uk: { count: 0, names: [] },
    en: { count: 0, names: [] },
  };

  for (const voice of AUDIO_VOICES) {
    result[voice.language].count++;
    result[voice.language].names.push(voice.name);
  }

  return result;
}

/**
 * Clear audio cache (useful for freeing memory)
 */
export function clearAudioCache(): void {
  audioCache.clear();
}

/**
 * Get voice display name
 */
export function getVoiceDisplayName(voiceId: string): string {
  const voice = AUDIO_VOICES.find((v) => v.id === voiceId);
  return voice?.name || voiceId;
}

/**
 * Get all color keys that have audio file mappings
 */
export function getAvailableColorKeys(): string[] {
  return Object.keys(COLOR_AUDIO_FILES);
}
