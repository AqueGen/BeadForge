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
import type { ColorMapping, TTSMode as ColorMappingTTSMode } from '@/types/colorMapping';
import { getActiveModifierKeys } from '@/types/colorMapping';
import { SKIP_COLOR_INDEX } from '@/types';
import { getColorName, getLanguageCode, COLOR_TRANSLATIONS } from './colorNames';
import { VOICED_COLORS, MODIFIER_VOICES } from '@/lib/pattern/colorMatching';
import {
  playColorAudio,
  playModifierAudio,
  playNumberAudio,
  stopAudio as stopPrerecordedAudio,
  getDefaultAudioVoice,
  isAudioTTSSupported,
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
 * Generate bead list for TTS in reading order
 * Beads are read from bottom-left to top-right (left-to-right, bottom-to-top)
 * Skip cells (SKIP_COLOR_INDEX) are not included in the list
 */
export function generateBeadListForTTS(
  pattern: BeadPattern,
  language: TTSLanguage
): TTSBeadItem[] {
  const items: TTSBeadItem[] = [];
  const { width, height, field, colors } = pattern;

  // Calculate used height (rows with actual beads, excluding skip cells)
  let usedHeight = height;
  for (let y = height - 1; y >= 0; y--) {
    let hasBeads = false;
    for (let x = 0; x < width; x++) {
      const colorIndex = field[y * width + x];
      if (colorIndex !== 0 && colorIndex !== SKIP_COLOR_INDEX) {
        hasBeads = true;
        break;
      }
    }
    if (hasBeads) {
      usedHeight = y + 1;
      break;
    }
  }

  // Generate items in reading order (left-to-right, bottom-to-top)
  // Skip cells are not included
  let position = 1;
  for (let y = 0; y < usedHeight; y++) {
    for (let x = 0; x < width; x++) {
      const colorIndex = field[y * width + x];

      // Skip cells with SKIP_COLOR_INDEX
      if (colorIndex === SKIP_COLOR_INDEX) {
        continue;
      }

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
 * Event execution handler type
 * Returns true to continue, false to pause TTS
 */
export type EventExecutionHandler = (position: number) => Promise<boolean>;

/**
 * Checkpoint save handler type
 */
export type CheckpointSaveHandler = (position: number) => void;

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
  private onPositionChange?: (position: number, colorName: string, groupCount: number) => void;
  private onComplete?: () => void;
  private onStateChange?: (isPlaying: boolean, isPaused: boolean) => void;
  private onExecuteEvents?: EventExecutionHandler;
  private onSaveCheckpoint?: CheckpointSaveHandler;
  private pauseTimeout?: ReturnType<typeof setTimeout>;
  private useAudioFiles = true; // Try audio files first
  private colorMappings: ColorMapping[] = [];
  private colorMappingTTSMode: ColorMappingTTSMode = 'colorOnly';

  constructor(settings: TTSSettings) {
    this.settings = settings;
    this.useAudioFiles = isAudioTTSSupported();
  }

  /**
   * Set color mappings for TTS
   */
  setColorMappings(mappings: ColorMapping[], ttsMode: ColorMappingTTSMode): void {
    this.colorMappings = mappings;
    this.colorMappingTTSMode = ttsMode;
  }

  /**
   * Initialize with rope pattern data
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
    onPositionChange?: (position: number, colorName: string, groupCount: number) => void;
    onComplete?: () => void;
    onStateChange?: (isPlaying: boolean, isPaused: boolean) => void;
    onExecuteEvents?: EventExecutionHandler;
    onSaveCheckpoint?: CheckpointSaveHandler;
  }): void {
    this.onPositionChange = handlers.onPositionChange;
    this.onComplete = handlers.onComplete;
    this.onStateChange = handlers.onStateChange;
    this.onExecuteEvents = handlers.onExecuteEvents;
    this.onSaveCheckpoint = handlers.onSaveCheckpoint;
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
    this.onPositionChange?.(0, '', 0);
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
        this.onPositionChange?.(item.startPosition, item.colorName, item.count);
      }
    } else {
      // Direct position for individual mode
      if (position >= 1 && position <= this.items.length) {
        this.currentIndex = position - 1;
        const item = this.items[this.currentIndex];
        this.onPositionChange?.(item.position, item.colorName, 1);
      }
    }
  }

  /**
   * Go to next item (skipping over items mapped to skip)
   */
  next(): void {
    const maxIndex =
      this.settings.format === 'grouped' ? this.groupedItems.length : this.items.length;

    if (this.currentIndex < maxIndex - 1) {
      this.currentIndex++;
      // Skip over items mapped to skip
      while (this.currentIndex < maxIndex - 1 && this.isCurrentMappedToSkip()) {
        this.currentIndex++;
      }
      this.speakCurrent();
    }
  }

  /**
   * Go to previous item (skipping over items mapped to skip)
   */
  previous(): void {
    if (this.currentIndex > 0) {
      this.currentIndex--;
      // Skip over items mapped to skip
      while (this.currentIndex > 0 && this.isCurrentMappedToSkip()) {
        this.currentIndex--;
      }
      this.speakCurrent();
    }
  }

  /**
   * Get current color index from item
   */
  private getCurrentColorIndex(): number {
    if (this.settings.format === 'grouped') {
      return this.groupedItems[this.currentIndex]?.colorIndex ?? -1;
    }
    return this.items[this.currentIndex]?.colorIndex ?? -1;
  }

  /**
   * Get color mapping for current color
   */
  private getCurrentMapping(): ColorMapping | undefined {
    const colorIndex = this.getCurrentColorIndex();
    if (colorIndex < 0) return undefined;
    return this.colorMappings.find(m => m.originalIndex === colorIndex);
  }

  /**
   * Get color key for audio file lookup - uses mappings if available
   */
  private getCurrentColorKey(): string | null {
    // If we have mappings, use the mapped voiced color
    const mapping = this.getCurrentMapping();
    if (mapping) {
      const voicedColor = VOICED_COLORS[mapping.mappedColorIndex];
      if (voicedColor) {
        // Capitalize first letter for audio file lookup
        return voicedColor.key.charAt(0).toUpperCase() + voicedColor.key.slice(1);
      }
    }

    // Fallback to original behavior
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
   * Get active modifiers for current color
   */
  private getCurrentModifierKeys(): string[] {
    if (this.colorMappingTTSMode !== 'full') return [];
    const mapping = this.getCurrentMapping();
    if (!mapping) return [];
    return getActiveModifierKeys(mapping.modifiers);
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
   * For grouped mode with count > 1, plays color audio then number audio
   * When colorMappingTTSMode is 'full', plays modifiers after color
   */
  private async tryPlayAudio(): Promise<boolean> {
    if (!this.shouldUseAudioFiles()) return false;

    const colorKey = this.getCurrentColorKey();
    if (!colorKey) return false;

    const voiceId = this.getBuiltinVoiceId();
    if (!voiceId) return false;

    try {
      // Play color audio first
      const colorPlayed = await playColorAudio(
        voiceId,
        colorKey,
        this.settings.speed,
        this.settings.volume
      );

      if (!colorPlayed) return false;

      // Play modifiers if TTS mode is 'full'
      const modifierKeys = this.getCurrentModifierKeys();
      if (modifierKeys.length > 0) {
        for (const modKey of modifierKeys) {
          // Small pause between audio clips
          await new Promise(resolve => setTimeout(resolve, 80));

          // Try to play modifier audio
          const modPlayed = await playModifierAudio(
            voiceId,
            modKey,
            this.settings.speed,
            this.settings.volume
          );

          // Fallback to system TTS for modifier if audio not available
          if (!modPlayed && this.shouldUseSystemTTS()) {
            const modVoice = MODIFIER_VOICES.find(m => m.key === modKey);
            if (modVoice) {
              const modText = this.settings.language === 'uk' ? modVoice.nameUk :
                              this.settings.language === 'ru' ? modVoice.nameRu : modVoice.nameEn;
              const utterance = createUtterance(modText, this.settings);
              if (utterance) {
                await new Promise<void>((resolve) => {
                  utterance.onend = () => resolve();
                  utterance.onerror = () => resolve();
                  window.speechSynthesis.speak(utterance);
                });
              }
            }
          }
        }
      }

      // For grouped mode with count > 1, also play the number
      if (this.settings.format === 'grouped') {
        const groupCount = this.getCurrentGroupCount();
        if (groupCount > 1) {
          // Small pause between color/modifiers and number
          await new Promise(resolve => setTimeout(resolve, 100));

          // Try to play number audio, fallback to system TTS if not available
          const numberPlayed = await playNumberAudio(
            voiceId,
            groupCount,
            this.settings.speed,
            this.settings.volume
          );

          // If number audio not available, use system TTS for number only
          if (!numberPlayed && this.shouldUseSystemTTS()) {
            const utterance = createUtterance(String(groupCount), this.settings);
            if (utterance) {
              await new Promise<void>((resolve) => {
                utterance.onend = () => resolve();
                utterance.onerror = () => resolve();
                window.speechSynthesis.speak(utterance);
              });
            }
          }
        }
      }

      return true;
    } catch (error) {
      console.warn('[TTS] Audio playback failed, falling back to speech synthesis:', error);
      return false;
    }
  }

  /**
   * Check if current item is mapped to skip
   */
  private isCurrentMappedToSkip(): boolean {
    const mapping = this.getCurrentMapping();
    return mapping !== undefined && mapping.mappedColorIndex === SKIP_COLOR_INDEX;
  }

  /**
   * Speak single item (for manual mode)
   */
  speakCurrent(): void {
    window.speechSynthesis.cancel();
    stopPrerecordedAudio();

    // Check if current color is mapped to skip - don't voice it
    if (this.isCurrentMappedToSkip()) {
      const position = this.getCurrentPosition();
      const groupCount = this.getCurrentGroupCount();
      this.onPositionChange?.(position, 'пропуск', groupCount);
      return;
    }

    const text = this.getCurrentText();
    if (!text) return;

    const position = this.getCurrentPosition();
    const colorName = this.getCurrentColorName();
    const groupCount = this.getCurrentGroupCount();
    this.onPositionChange?.(position, colorName, groupCount);

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

  /**
   * Get current group count (1 for individual mode)
   */
  getCurrentGroupCount(): number {
    if (this.settings.format === 'grouped') {
      return this.groupedItems[this.currentIndex]?.count || 0;
    }
    return 1;
  }

  private getCurrentText(): string {
    if (this.settings.format === 'grouped') {
      const item = this.groupedItems[this.currentIndex];
      return item ? getGroupedText(item, this.settings.language) : '';
    }
    const item = this.items[this.currentIndex];
    return item ? getIndividualText(item) : '';
  }

  private async speakNext(): Promise<void> {
    if (!this.isPlaying || this.isPaused) return;

    const maxIndex =
      this.settings.format === 'grouped' ? this.groupedItems.length : this.items.length;

    if (this.currentIndex >= maxIndex) {
      this.isPlaying = false;
      this.onStateChange?.(false, false);
      this.onComplete?.();
      return;
    }

    // Check if current color is mapped to skip - move to next without voicing
    if (this.isCurrentMappedToSkip()) {
      this.currentIndex++;
      // Continue to next item immediately (no pause since nothing was voiced)
      this.speakNext();
      return;
    }

    const text = this.getCurrentText();
    const position = this.getCurrentPosition();
    const colorName = this.getCurrentColorName();
    const groupCount = this.getCurrentGroupCount();

    // Execute cell events BEFORE voicing (if handler is set)
    if (this.onExecuteEvents) {
      try {
        const shouldContinue = await this.onExecuteEvents(position);
        if (!shouldContinue) {
          // Event requested pause (e.g., pause action)
          this.pause();
          return;
        }
      } catch (error) {
        console.warn('[TTS] Error executing events at position', position, error);
      }
    }

    this.onPositionChange?.(position, colorName, groupCount);

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
