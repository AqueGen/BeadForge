/**
 * TTS Service - Web Speech API wrapper for bead pattern vocalization
 */

import type {
  TTSSettings,
  TTSVoiceGender,
  TTSLanguage,
  BeadPattern,
  TTSBeadItem,
  TTSGroupedItem,
} from '@/types';
import { getColorName, getLanguageCode } from './colorNames';

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
 * Select best voice based on language and gender preference
 */
export function selectVoice(
  language: TTSLanguage,
  gender: TTSVoiceGender
): SpeechSynthesisVoice | null {
  const voices = getVoicesForLanguage(language);
  if (voices.length === 0) return null;

  // Try to find voice matching gender (heuristic based on name)
  const genderKeywords =
    gender === 'female'
      ? ['female', 'woman', 'anna', 'maria', 'elena', 'oksana', 'natasha', 'алёна', 'катерина']
      : ['male', 'man', 'pavel', 'dmitry', 'maxim', 'андрей', 'олег'];

  const matchingVoice = voices.find((voice) =>
    genderKeywords.some((kw) => voice.name.toLowerCase().includes(kw))
  );

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

  // Set voice
  const voice = selectVoice(settings.language, settings.voiceGender);
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
 * TTS Controller class for managing playback
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

  constructor(settings: TTSSettings) {
    this.settings = settings;
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
   * Speak single item (for manual mode)
   */
  speakCurrent(): void {
    window.speechSynthesis.cancel();

    const text = this.getCurrentText();
    if (!text) return;

    const position = this.getCurrentPosition();
    const colorName = this.getCurrentColorName();
    this.onPositionChange?.(position, colorName);

    const utterance = createUtterance(text, this.settings);
    if (utterance) {
      window.speechSynthesis.speak(utterance);
    }
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

    const utterance = createUtterance(text, this.settings);
    if (!utterance) return;

    utterance.onend = () => {
      if (this.settings.mode === 'auto' && this.isPlaying) {
        this.currentIndex++;
        // Add pause between colors
        this.pauseTimeout = setTimeout(() => {
          this.speakNext();
        }, this.settings.pauseBetweenColors);
      }
    };

    window.speechSynthesis.speak(utterance);
  }
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
