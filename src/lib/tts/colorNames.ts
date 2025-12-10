/**
 * Color name translations for TTS
 * Supports: Russian (ru), Ukrainian (uk), English (en)
 */

import type { TTSLanguage } from '@/types';

export interface ColorTranslations {
  [colorName: string]: {
    ru: string;
    uk: string;
    en: string;
  };
}

/**
 * Standard color translations
 * Keys match the DEFAULT_COLORS names in types/index.ts
 */
export const COLOR_TRANSLATIONS: ColorTranslations = {
  White: {
    ru: 'белый',
    uk: 'білий',
    en: 'white',
  },
  Black: {
    ru: 'чёрный',
    uk: 'чорний',
    en: 'black',
  },
  Red: {
    ru: 'красный',
    uk: 'червоний',
    en: 'red',
  },
  Green: {
    ru: 'зелёный',
    uk: 'зелений',
    en: 'green',
  },
  Blue: {
    ru: 'синий',
    uk: 'синій',
    en: 'blue',
  },
  Yellow: {
    ru: 'жёлтый',
    uk: 'жовтий',
    en: 'yellow',
  },
  Orange: {
    ru: 'оранжевый',
    uk: 'помаранчевий',
    en: 'orange',
  },
  Purple: {
    ru: 'фиолетовый',
    uk: 'фіолетовий',
    en: 'purple',
  },
  Pink: {
    ru: 'розовый',
    uk: 'рожевий',
    en: 'pink',
  },
  Cyan: {
    ru: 'голубой',
    uk: 'блакитний',
    en: 'cyan',
  },
  Brown: {
    ru: 'коричневый',
    uk: 'коричневий',
    en: 'brown',
  },
  Gray: {
    ru: 'серый',
    uk: 'сірий',
    en: 'gray',
  },
  Silver: {
    ru: 'серебряный',
    uk: 'срібний',
    en: 'silver',
  },
  Gold: {
    ru: 'золотой',
    uk: 'золотий',
    en: 'gold',
  },
  Navy: {
    ru: 'тёмно-синий',
    uk: 'темно-синій',
    en: 'navy',
  },
  Maroon: {
    ru: 'бордовый',
    uk: 'бордовий',
    en: 'maroon',
  },
  // Extended colors
  Beige: {
    ru: 'бежевый',
    uk: 'бежевий',
    en: 'beige',
  },
  Turquoise: {
    ru: 'бирюзовый',
    uk: 'бірюзовий',
    en: 'turquoise',
  },
  Coral: {
    ru: 'коралловый',
    uk: 'кораловий',
    en: 'coral',
  },
  Lavender: {
    ru: 'лавандовый',
    uk: 'лавандовий',
    en: 'lavender',
  },
  Mint: {
    ru: 'мятный',
    uk: 'м\'ятний',
    en: 'mint',
  },
  Peach: {
    ru: 'персиковый',
    uk: 'персиковий',
    en: 'peach',
  },
  Olive: {
    ru: 'оливковый',
    uk: 'оливковий',
    en: 'olive',
  },
  Lime: {
    ru: 'лаймовый',
    uk: 'лаймовий',
    en: 'lime',
  },
  Teal: {
    ru: 'бирюзово-синий',
    uk: 'синьо-зелений',
    en: 'teal',
  },
  Ivory: {
    ru: 'слоновая кость',
    uk: 'слонова кістка',
    en: 'ivory',
  },
  Khaki: {
    ru: 'хаки',
    uk: 'хакі',
    en: 'khaki',
  },
  Crimson: {
    ru: 'малиновый',
    uk: 'малиновий',
    en: 'crimson',
  },
  Indigo: {
    ru: 'индиго',
    uk: 'індиго',
    en: 'indigo',
  },
  Magenta: {
    ru: 'пурпурный',
    uk: 'пурпуровий',
    en: 'magenta',
  },
  Violet: {
    ru: 'фиалковый',
    uk: 'фіалковий',
    en: 'violet',
  },
  Salmon: {
    ru: 'лососевый',
    uk: 'лососевий',
    en: 'salmon',
  },
  Tan: {
    ru: 'загар',
    uk: 'засмага',
    en: 'tan',
  },
  Aqua: {
    ru: 'аква',
    uk: 'аква',
    en: 'aqua',
  },
  Azure: {
    ru: 'лазурный',
    uk: 'лазурний',
    en: 'azure',
  },
};

/**
 * UI translations for TTS controls
 */
export const UI_TRANSLATIONS = {
  ru: {
    play: 'Воспроизвести',
    pause: 'Пауза',
    stop: 'Стоп',
    previous: 'Предыдущий',
    next: 'Следующий',
    goToPosition: 'Перейти к позиции',
    speed: 'Скорость',
    slow: 'Медленно',
    normal: 'Нормально',
    fast: 'Быстро',
    voice: 'Голос',
    male: 'Мужской',
    female: 'Женский',
    language: 'Язык',
    pauseBetweenColors: 'Пауза между цветами',
    mode: 'Режим',
    auto: 'Авто',
    manual: 'Ручной',
    format: 'Формат',
    individual: 'По одному',
    grouped: 'Группами',
    position: 'Позиция',
    of: 'из',
    beads: 'бусин',
    currentColor: 'Текущий цвет',
    notSupported: 'Озвучка не поддерживается в этом браузере',
    colorNumber: 'цвет',
  },
  uk: {
    play: 'Відтворити',
    pause: 'Пауза',
    stop: 'Стоп',
    previous: 'Попередній',
    next: 'Наступний',
    goToPosition: 'Перейти до позиції',
    speed: 'Швидкість',
    slow: 'Повільно',
    normal: 'Нормально',
    fast: 'Швидко',
    voice: 'Голос',
    male: 'Чоловічий',
    female: 'Жіночий',
    language: 'Мова',
    pauseBetweenColors: 'Пауза між кольорами',
    mode: 'Режим',
    auto: 'Авто',
    manual: 'Ручний',
    format: 'Формат',
    individual: 'По одному',
    grouped: 'Групами',
    position: 'Позиція',
    of: 'з',
    beads: 'бусин',
    currentColor: 'Поточний колір',
    notSupported: 'Озвучка не підтримується в цьому браузері',
    colorNumber: 'колір',
  },
  en: {
    play: 'Play',
    pause: 'Pause',
    stop: 'Stop',
    previous: 'Previous',
    next: 'Next',
    goToPosition: 'Go to position',
    speed: 'Speed',
    slow: 'Slow',
    normal: 'Normal',
    fast: 'Fast',
    voice: 'Voice',
    male: 'Male',
    female: 'Female',
    language: 'Language',
    pauseBetweenColors: 'Pause between colors',
    mode: 'Mode',
    auto: 'Auto',
    manual: 'Manual',
    format: 'Format',
    individual: 'Individual',
    grouped: 'Grouped',
    position: 'Position',
    of: 'of',
    beads: 'beads',
    currentColor: 'Current color',
    notSupported: 'Speech synthesis not supported in this browser',
    colorNumber: 'color',
  },
};

/**
 * Get translated color name
 */
export function getColorName(
  colorName: string | undefined,
  language: TTSLanguage,
  colorIndex?: number
): string {
  if (!colorName) {
    // Fallback to "color N" if no name
    const colorWord = UI_TRANSLATIONS[language].colorNumber;
    return `${colorWord} ${(colorIndex ?? 0) + 1}`;
  }

  const translation = COLOR_TRANSLATIONS[colorName];
  if (translation) {
    return translation[language];
  }

  // Return original name if no translation found
  return colorName;
}

/**
 * Get language code for Web Speech API
 */
export function getLanguageCode(language: TTSLanguage): string {
  const codes: Record<TTSLanguage, string> = {
    ru: 'ru-RU',
    uk: 'uk-UA',
    en: 'en-US',
  };
  return codes[language];
}

/**
 * Get available languages
 */
export function getAvailableLanguages(): Array<{
  code: TTSLanguage;
  name: string;
  nativeName: string;
}> {
  return [
    { code: 'ru', name: 'Russian', nativeName: 'Русский' },
    { code: 'uk', name: 'Ukrainian', nativeName: 'Українська' },
    { code: 'en', name: 'English', nativeName: 'English' },
  ];
}
