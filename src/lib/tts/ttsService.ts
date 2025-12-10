/**
 * TTS Service - Web Speech API wrapper for bead pattern vocalization
 * With AudioTTS integration for pre-recorded audio files
 */

import type {
  TTSSettings,
  TTSVoiceGender,
  TTSLanguage,
  BeadPattern,
  TTSBeadItem,
  TTSGroupedItem,
} from '@/types';
import { getColorName, getLanguageCode, COLOR_TRANSLATIONS } from './colorNames';
import {
  playColorAudio,
  stopAudio as stopPrerecordedAudio,
  getDefaultAudioVoice,
  isAudioTTSSupported,
  getAudioVoicesForLanguage,
} from './audioTTS';

/**
 * Check if TTS is supported in the current browser
 */
export function isTTSSupported(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
}

/**
 * Get available voices for a specific language
 */
export function getVoicesForLanguage(language: TTSLanguage): SpeechSynthesisVoice[] {
  if (!isTTSSupported()) return [];

  const langCode = getLanguageCode(language);
  const voices = window.speechSynthesis.getVoices();

  return voices.filter(
    (voice) => voice.lang.startsWith(langCode.split('-')[0]) || voice.lang === langCode
  );
}

/**
 * Voice name patterns for gender detection
 * Based on common TTS voice naming conventions
 */
const VOICE_GENDER_PATTERNS: Record<TTSVoiceGender, Record<TTSLanguage, string[]>> = {
  female: {
    ru: ['irina', 'anna', 'maria', 'elena', 'natasha', 'milena', 'алёна', 'ирина', 'анна', 'мария', 'елена', 'наташа'],
    uk: ['kateryna', 'oksana', 'lesya', 'natalia', 'катерина', 'оксана', 'леся', 'наталія', 'polina'],
    en: ['zira', 'susan', 'linda', 'hazel', 'samantha', 'karen', 'moira', 'fiona', 'victoria', 'female'],
  },
  male: {
    ru: ['pavel', 'dmitry', 'maxim', 'boris', 'andrey', 'павел', 'дмитрий', 'максим', 'борис', 'андрей'],
    uk: ['orest', 'mykola', 'ostap', 'bogdan', 'орест', 'микола', 'остап', 'богдан'],
    en: ['david', 'mark', 'james', 'george', 'richard', 'daniel', 'male', 'guy'],
  },
};

/**
 * Select voice by exact name
 */
export function selectVoiceByName(
  language: TTSLanguage,
  voiceName: string
): SpeechSynthesisVoice | null {
  const voices = getVoicesForLanguage(language);
  return voices.find((voice) => voice.name === voiceName) || null;
}

/**
 * Select best voice based on language and gender preference
 */
export function selectVoice(
  language: TTSLanguage,
  gender: TTSVoiceGender
): SpeechSynthesisVoice | null {
  const voices = getVoicesForLanguage(language);
  if (voices.length === 0) return null;

  // Language-specific keywords
  const primaryKeywords = VOICE_GENDER_PATTERNS[gender][language] || [];

  // Try to find voice matching gender with language-specific keywords
  let matchingVoice = voices.find((voice) =>
    primaryKeywords.some((kw) => voice.name.toLowerCase().includes(kw.toLowerCase()))
  );

  // If not found, try with generic gender keywords
  if (!matchingVoice) {
    const genericKeywords = gender === 'female'
      ? ['female', 'woman', 'girl']
      : ['male', 'man'];

    matchingVoice = voices.find((voice) =>
      genericKeywords.some((kw) => voice.name.toLowerCase().includes(kw))
    );
  }

  // Log available voices for debugging
  if (typeof console !== 'undefined' && voices.length > 0) {
    console.log(`[TTS] Available ${language} voices:`, voices.map(v => v.name).join(', '));
    console.log(`[TTS] Selected voice:`, matchingVoice?.name || voices[0]?.name || 'none');
  }

  return matchingVoice || voices[0];
}

/**
 * Generate bead list for TTS in stringing order (reversed)
 * Beads are read from bottom-right to top-left for stringing
 */
export function generateBeadListForTTS(
  pattern: BeadPattern,
  language: TTSLanguage
): TTSBeadItem[] {
  const items: TTSBeadItem[] = [];
  const { width, height, field, colors } = pattern;

  // Calculate used height (rows with actual beads)
  let usedHeight = height;
  for (let y = height - 1; y >= 0; y--) {
    let hasBeads = false;
    for (let x = 0; x < width; x++) {
      if (field[y * width + x] !== 0) {
        hasBeads = true;
        break;
      }
    }
    if (hasBeads) {
      usedHeight = y + 1;
      break;
    }
  }

  // Generate items in reverse order (stringing order)
  let position = 1;
  for (let y = usedHeight - 1; y >= 0; y--) {
    for (let x = width - 1; x >= 0; x--) {
      const colorIndex = field[y * width + x];
      const color = colors[colorIndex];
      const colorName = getColorName(color?.name, language, colorIndex);

      items.push({
        colorIndex,
        colorName,
        position,
      });
      position++;
    }
  }

  return items;
}

/**
 * Group consecutive same-color beads
 */
export function groupBeadList(items: TTSBeadItem[]): TTSGroupedItem[] {
  if (items.length === 0) return [];

  const grouped: TTSGroupedItem[] = [];
  let current: TTSGroupedItem = {
    colorIndex: items[0].colorIndex,
    colorName: items[0].colorName,
    count: 1,
    startPosition: items[0].position,
  };

  for (let i = 1; i < items.length; i++) {
    if (items[i].colorIndex === current.colorIndex) {
      current.count++;
    } else {
      grouped.push(current);
      current = {
        colorIndex: items[i].colorIndex,
        colorName: items[i].colorName,
        count: 1,
        startPosition: items[i].position,
      };
    }
  }
  grouped.push(current);

  return grouped;
}

/**
 * Create speech utterance with settings
 */
export function createUtterance(
  text: string,
  settings: TTSSettings
): SpeechSynthesisUtterance | null {
  if (!isTTSSupported()) return null;

  const utterance = new SpeechSynthesisUtterance(text);

  // Set voice - use explicitly selected voice if available
  let voice: SpeechSynthesisVoice | null = null;
  if (settings.systemVoiceName) {
    voice = selectVoiceByName(settings.language, settings.systemVoiceName);
  }
  if (!voice) {
    voice = selectVoice(settings.language, settings.voiceGender);
  }
  if (voice) {
    utterance.voice = voice;
  }

  // Set language
  utterance.lang = getLanguageCode(settings.language);

  // Set rate based on speed setting
  const speedRates: Record<string, number> = {
    slow: 0.7,
    normal: 1.0,
    fast: 1.3,
  };
  utterance.rate = speedRates[settings.speed] || 1.0;

  // Set volume
  utterance.volume = settings.volume;

  return utterance;
}

/**
 * Generate text for individual bead
 */
export function getIndividualText(item: TTSBeadItem): string {
  return item.colorName;
}

/**
 * Generate text for grouped beads
 */
export function getGroupedText(item: TTSGroupedItem, _language: TTSLanguage): string {
  if (item.count === 1) {
    return item.colorName;
  }

  // Different number formats for different languages
  return `${item.colorName} ${item.count}`;
}

/**
 * Get the original color name (English key) from translated color name
 */
function getColorKeyFromTranslation(translatedName: string, language: TTSLanguage): string | null {
  for (const [colorKey, translations] of Object.entries(COLOR_TRANSLATIONS)) {
    if (translations[language] === translatedName) {
      return colorKey;
    }
  }
  return null;
}

/**
 * TTS Controller class for managing playback
 * Uses pre-recorded audio files with fallback to Web Speech API
 */
export class TTSController {
  private settings: TTSSettings;
  private items: TTSBeadItem[] = [];
  private groupedItems: TTSGroupedItem[] = [];
  private currentIndex = 0;
  private isPlaying = false;
  private isPaused = false;
  private onPositionChange?: (position: number, colorName: string) => void;
  private onComplete?: () => void;
  private onStateChange?: (isPlaying: boolean, isPaused: boolean) => void;
  private pauseTimeout?: ReturnType<typeof setTimeout>;
  private useAudioFiles = true; // Try audio files first

  constructor(settings: TTSSettings) {
    this.settings = settings;
    this.useAudioFiles = isAudioTTSSupported();
  }

  /**
   * Initialize with pattern data
   */
  initialize(pattern: BeadPattern): void {
    this.items = generateBeadListForTTS(pattern, this.settings.language);
    this.groupedItems = groupBeadList(this.items);
    this.currentIndex = 0;
  }

  /**
   * Update settings
   */
  updateSettings(settings: Partial<TTSSettings>): void {
    this.settings = { ...this.settings, ...settings };

    // Regenerate items if language changed
    if (settings.language && this.items.length > 0) {
      // Keep current position, just update language
    }
  }

  /**
   * Set event handlers
   */
  setHandlers(handlers: {
    onPositionChange?: (position: number, colorName: string) => void;
    onComplete?: () => void;
    onStateChange?: (isPlaying: boolean, isPaused: boolean) => void;
  }): void {
    this.onPositionChange = handlers.onPositionChange;
    this.onComplete = handlers.onComplete;
    this.onStateChange = handlers.onStateChange;
  }

  /**
   * Play/resume playback
   */
  play(): void {
    if (!isTTSSupported()) return;

    if (this.isPaused) {
      this.isPaused = false;
      this.isPlaying = true;
      this.onStateChange?.(true, false);
      this.speakNext();
    } else if (!this.isPlaying) {
      this.isPlaying = true;
      this.isPaused = false;
      this.onStateChange?.(true, false);
      this.speakNext();
    }
  }

  /**
   * Pause playback
   */
  pause(): void {
    if (this.isPlaying) {
      window.speechSynthesis.cancel();
      stopPrerecordedAudio(); // Stop any pre-recorded audio
      if (this.pauseTimeout) {
        clearTimeout(this.pauseTimeout);
      }
      this.isPlaying = false;
      this.isPaused = true;
      this.onStateChange?.(false, true);
    }
  }

  /**
   * Stop playback and reset position
   */
  stop(): void {
    window.speechSynthesis.cancel();
    stopPrerecordedAudio(); // Stop any pre-recorded audio
    if (this.pauseTimeout) {
      clearTimeout(this.pauseTimeout);
    }
    this.isPlaying = false;
    this.isPaused = false;
    this.currentIndex = 0;
    this.onStateChange?.(false, false);
    this.onPositionChange?.(0, '');
  }

  /**
   * Go to specific position
   */
  goToPosition(position: number): void {
    if (this.settings.format === 'grouped') {
      // Find grouped item containing this position
      const groupIndex = this.groupedItems.findIndex(
        (item) => position >= item.startPosition && position < item.startPosition + item.count
      );
      if (groupIndex >= 0) {
        this.currentIndex = groupIndex;
        const item = this.groupedItems[groupIndex];
        this.onPositionChange?.(item.startPosition, item.colorName);
      }
    } else {
      // Direct position for individual mode
      if (position >= 1 && position <= this.items.length) {
        this.currentIndex = position - 1;
        const item = this.items[this.currentIndex];
        this.onPositionChange?.(item.position, item.colorName);
      }
    }
  }

  /**
   * Go to next item
   */
  next(): void {
    const maxIndex =
      this.settings.format === 'grouped' ? this.groupedItems.length : this.items.length;

    if (this.currentIndex < maxIndex - 1) {
      this.currentIndex++;
      this.speakCurrent();
    }
  }

  /**
   * Go to previous item
   */
  previous(): void {
    if (this.currentIndex > 0) {
      this.currentIndex--;
      this.speakCurrent();
    }
  }

  /**
   * Get color key for audio file lookup
   */
  private getCurrentColorKey(): string | null {
    const colorName = this.getCurrentColorName();
    if (!colorName) return null;

    // Try to find the English color key from the translated name
    const colorKey = getColorKeyFromTranslation(colorName, this.settings.language);
    if (colorKey) return colorKey;

    // If not found in translations, try using the name directly (might be English)
    if (COLOR_TRANSLATIONS[colorName]) {
      return colorName;
    }

    return null;
  }

  /**
   * Check if should use audio files based on voiceSource setting
   */
  private shouldUseAudioFiles(): boolean {
    const voiceSource = this.settings.voiceSource || 'auto';

    // 'system' = only use system TTS, never audio files
    if (voiceSource === 'system') return false;

    // 'builtin' or 'auto' = try audio files (if available)
    return this.useAudioFiles;
  }

  /**
   * Check if should use system TTS based on voiceSource setting
   */
  private shouldUseSystemTTS(): boolean {
    const voiceSource = this.settings.voiceSource || 'auto';

    // 'builtin' = only use builtin audio, never system TTS
    if (voiceSource === 'builtin') return false;

    // 'system' or 'auto' = use system TTS (as primary or fallback)
    return isTTSSupported();
  }

  /**
   * Get the builtin voice ID to use
   */
  private getBuiltinVoiceId(): string | null {
    // Use explicitly selected voice if available
    if (this.settings.builtinVoiceId) {
      return this.settings.builtinVoiceId;
    }

    // Fall back to default voice for language
    const defaultVoice = getDefaultAudioVoice(this.settings.language, this.settings.voiceGender);
    return defaultVoice?.id || null;
  }

  /**
   * Try to play audio file, returns true if successful
   */
  private async tryPlayAudio(): Promise<boolean> {
    if (!this.shouldUseAudioFiles()) return false;

    const colorKey = this.getCurrentColorKey();
    if (!colorKey) return false;

    const voiceId = this.getBuiltinVoiceId();
    if (!voiceId) return false;

    try {
      const played = await playColorAudio(
        voiceId,
        colorKey,
        this.settings.speed,
        this.settings.volume
      );
      return played;
    } catch (error) {
      console.warn('[TTS] Audio playback failed, falling back to speech synthesis:', error);
      return false;
    }
  }

  /**
   * Speak single item (for manual mode)
   */
  speakCurrent(): void {
    window.speechSynthesis.cancel();
    stopPrerecordedAudio();

    const text = this.getCurrentText();
    if (!text) return;

    const position = this.getCurrentPosition();
    const colorName = this.getCurrentColorName();
    this.onPositionChange?.(position, colorName);

    const voiceSource = this.settings.voiceSource || 'auto';

    // If system only, skip audio files entirely
    if (voiceSource === 'system') {
      if (this.shouldUseSystemTTS()) {
        const utterance = createUtterance(text, this.settings);
        if (utterance) {
          window.speechSynthesis.speak(utterance);
        }
      }
      return;
    }

    // Try audio file first (for 'auto' and 'builtin')
    this.tryPlayAudio().then((played) => {
      // If audio played or voiceSource is 'builtin', don't fallback to system TTS
      if (!played && this.shouldUseSystemTTS()) {
        const utterance = createUtterance(text, this.settings);
        if (utterance) {
          window.speechSynthesis.speak(utterance);
        }
      }
    });
  }

  /**
   * Get total items count
   */
  getTotalCount(): number {
    return this.settings.format === 'grouped' ? this.groupedItems.length : this.items.length;
  }

  /**
   * Get total beads count
   */
  getTotalBeads(): number {
    return this.items.length;
  }

  /**
   * Get current position
   */
  getCurrentPosition(): number {
    if (this.settings.format === 'grouped') {
      const item = this.groupedItems[this.currentIndex];
      return item?.startPosition || 0;
    }
    return this.items[this.currentIndex]?.position || 0;
  }

  /**
   * Get current color name
   */
  getCurrentColorName(): string {
    if (this.settings.format === 'grouped') {
      return this.groupedItems[this.currentIndex]?.colorName || '';
    }
    return this.items[this.currentIndex]?.colorName || '';
  }

  private getCurrentText(): string {
    if (this.settings.format === 'grouped') {
      const item = this.groupedItems[this.currentIndex];
      return item ? getGroupedText(item, this.settings.language) : '';
    }
    const item = this.items[this.currentIndex];
    return item ? getIndividualText(item) : '';
  }

  private speakNext(): void {
    if (!this.isPlaying || this.isPaused) return;

    const maxIndex =
      this.settings.format === 'grouped' ? this.groupedItems.length : this.items.length;

    if (this.currentIndex >= maxIndex) {
      this.isPlaying = false;
      this.onStateChange?.(false, false);
      this.onComplete?.();
      return;
    }

    const text = this.getCurrentText();
    const position = this.getCurrentPosition();
    const colorName = this.getCurrentColorName();

    this.onPositionChange?.(position, colorName);

    // Handle auto mode with next after playback
    const handlePlaybackComplete = () => {
      if (this.settings.mode === 'auto' && this.isPlaying) {
        this.currentIndex++;
        // Add pause between colors
        this.pauseTimeout = setTimeout(() => {
          this.speakNext();
        }, this.settings.pauseBetweenColors);
      }
    };

    const voiceSource = this.settings.voiceSource || 'auto';

    // If system only, skip audio files entirely
    if (voiceSource === 'system') {
      if (this.shouldUseSystemTTS()) {
        const utterance = createUtterance(text, this.settings);
        if (!utterance) {
          handlePlaybackComplete();
          return;
        }
        utterance.onend = handlePlaybackComplete;
        window.speechSynthesis.speak(utterance);
      } else {
        handlePlaybackComplete();
      }
      return;
    }

    // Try audio file first (for 'auto' and 'builtin')
    this.tryPlayAudio().then((played) => {
      if (played) {
        handlePlaybackComplete();
      } else if (this.shouldUseSystemTTS()) {
        // Fallback to speech synthesis (only for 'auto')
        const utterance = createUtterance(text, this.settings);
        if (!utterance) {
          handlePlaybackComplete();
          return;
        }
        utterance.onend = handlePlaybackComplete;
        window.speechSynthesis.speak(utterance);
      } else {
        // No audio and no system TTS available - just continue
        handlePlaybackComplete();
      }
    });
  }
}

/**
 * Get available voices count by language for UI display
 */
export function getAvailableVoicesInfo(): Record<TTSLanguage, { count: number; names: string[] }> {
  const languages: TTSLanguage[] = ['ru', 'uk', 'en'];
  const result: Record<TTSLanguage, { count: number; names: string[] }> = {
    ru: { count: 0, names: [] },
    uk: { count: 0, names: [] },
    en: { count: 0, names: [] },
  };

  if (!isTTSSupported()) return result;

  for (const lang of languages) {
    const voices = getVoicesForLanguage(lang);
    result[lang] = {
      count: voices.length,
      names: voices.map(v => v.name),
    };
  }

  return result;
}

/**
 * Load voices (needed for some browsers)
 */
export function loadVoices(): Promise<SpeechSynthesisVoice[]> {
  return new Promise((resolve) => {
    if (!isTTSSupported()) {
      resolve([]);
      return;
    }

    const voices = window.speechSynthesis.getVoices();
    if (voices.length > 0) {
      resolve(voices);
      return;
    }

    // Wait for voices to load
    window.speechSynthesis.onvoiceschanged = () => {
      resolve(window.speechSynthesis.getVoices());
    };

    // Timeout fallback
    setTimeout(() => {
      resolve(window.speechSynthesis.getVoices());
    }, 1000);
  });
}
