/**
 * Color Matching Algorithm
 *
 * Finds the closest voiced color for any RGB color using
 * weighted Euclidean distance that accounts for human color perception.
 */

import type { BeadColor } from '@/types';
import { SKIP_COLOR_INDEX } from '@/types';
import type {
  VoicedColor,
  ModifierVoice,
  ColorMapping,
} from '@/types/colorMapping';
import { DEFAULT_MODIFIERS } from '@/types/colorMapping';

// ============================================================
// Voiced Colors (16 base colors with audio)
// ============================================================

export const VOICED_COLORS: VoicedColor[] = [
  {
    index: 0,
    key: 'white',
    nameUk: 'білий',
    nameRu: 'белый',
    nameEn: 'white',
    rgb: { r: 255, g: 255, b: 255 },
  },
  {
    index: 1,
    key: 'black',
    nameUk: 'чорний',
    nameRu: 'чёрный',
    nameEn: 'black',
    rgb: { r: 0, g: 0, b: 0 },
  },
  {
    index: 2,
    key: 'red',
    nameUk: 'червоний',
    nameRu: 'красный',
    nameEn: 'red',
    rgb: { r: 255, g: 0, b: 0 },
  },
  {
    index: 3,
    key: 'green',
    nameUk: 'зелений',
    nameRu: 'зелёный',
    nameEn: 'green',
    rgb: { r: 0, g: 128, b: 0 },
  },
  {
    index: 4,
    key: 'blue',
    nameUk: 'синій',
    nameRu: 'синий',
    nameEn: 'blue',
    rgb: { r: 0, g: 0, b: 255 },
  },
  {
    index: 5,
    key: 'yellow',
    nameUk: 'жовтий',
    nameRu: 'жёлтый',
    nameEn: 'yellow',
    rgb: { r: 255, g: 255, b: 0 },
  },
  {
    index: 6,
    key: 'orange',
    nameUk: 'помаранчевий',
    nameRu: 'оранжевый',
    nameEn: 'orange',
    rgb: { r: 255, g: 165, b: 0 },
  },
  {
    index: 7,
    key: 'purple',
    nameUk: 'фіолетовий',
    nameRu: 'фиолетовый',
    nameEn: 'purple',
    rgb: { r: 128, g: 0, b: 128 },
  },
  {
    index: 8,
    key: 'pink',
    nameUk: 'рожевий',
    nameRu: 'розовый',
    nameEn: 'pink',
    rgb: { r: 255, g: 192, b: 203 },
  },
  {
    index: 9,
    key: 'brown',
    nameUk: 'коричневий',
    nameRu: 'коричневый',
    nameEn: 'brown',
    rgb: { r: 139, g: 69, b: 19 },
  },
  {
    index: 10,
    key: 'gray',
    nameUk: 'сірий',
    nameRu: 'серый',
    nameEn: 'gray',
    rgb: { r: 128, g: 128, b: 128 },
  },
  {
    index: 11,
    key: 'cyan',
    nameUk: 'блакитний',
    nameRu: 'голубой',
    nameEn: 'cyan',
    rgb: { r: 135, g: 206, b: 235 },
  },
  {
    index: 12,
    key: 'turquoise',
    nameUk: 'бірюзовий',
    nameRu: 'бирюзовый',
    nameEn: 'turquoise',
    rgb: { r: 0, g: 206, b: 209 },
  },
  {
    index: 13,
    key: 'beige',
    nameUk: 'бежевий',
    nameRu: 'бежевый',
    nameEn: 'beige',
    rgb: { r: 245, g: 245, b: 220 },
  },
  {
    index: 14,
    key: 'gold',
    nameUk: 'золотий',
    nameRu: 'золотой',
    nameEn: 'gold',
    rgb: { r: 255, g: 215, b: 0 },
  },
  {
    index: 15,
    key: 'silver',
    nameUk: 'срібний',
    nameRu: 'серебряный',
    nameEn: 'silver',
    rgb: { r: 192, g: 192, b: 192 },
  },
];

// ============================================================
// Modifier Voice Definitions
// ============================================================

export const MODIFIER_VOICES: ModifierVoice[] = [
  { key: 'light', nameUk: 'світлий', nameRu: 'светлый', nameEn: 'light' },
  { key: 'dark', nameUk: 'темний', nameRu: 'тёмный', nameEn: 'dark' },
  {
    key: 'transparent',
    nameUk: 'прозорий',
    nameRu: 'прозрачный',
    nameEn: 'transparent',
  },
  { key: 'matte', nameUk: 'матовий', nameRu: 'матовый', nameEn: 'matte' },
  { key: 'glossy', nameUk: 'глянцевий', nameRu: 'глянцевый', nameEn: 'glossy' },
  {
    key: 'pearl',
    nameUk: 'перламутровий',
    nameRu: 'перламутровый',
    nameEn: 'pearl',
  },
  { key: 'metallic', nameUk: 'металік', nameRu: 'металлик', nameEn: 'metallic' },
  { key: 'pastel', nameUk: 'пастельний', nameRu: 'пастельный', nameEn: 'pastel' },
  { key: 'bright', nameUk: 'яскравий', nameRu: 'яркий', nameEn: 'bright' },
];

// ============================================================
// Color Distance Algorithm
// ============================================================

/**
 * Calculate weighted color distance accounting for human perception.
 * Uses the low-cost approximation from https://www.compuphase.com/cmetric.htm
 *
 * This formula weights the RGB components based on how the human eye
 * perceives color differences, with green being most sensitive.
 */
export function colorDistance(c1: BeadColor, c2: BeadColor): number {
  const rMean = (c1.r + c2.r) / 2;
  const dR = c1.r - c2.r;
  const dG = c1.g - c2.g;
  const dB = c1.b - c2.b;

  // Weighted Euclidean distance
  return Math.sqrt(
    (2 + rMean / 256) * dR * dR +
      4 * dG * dG +
      (2 + (255 - rMean) / 256) * dB * dB
  );
}

/**
 * Find the closest voiced color for a given RGB color.
 * Returns the index of the closest voiced color.
 */
export function findClosestVoicedColor(color: BeadColor): number {
  let minDist = Infinity;
  let closestIndex = 0;

  for (const voiced of VOICED_COLORS) {
    const dist = colorDistance(color, voiced.rgb);
    if (dist < minDist) {
      minDist = dist;
      closestIndex = voiced.index;
    }
  }

  return closestIndex;
}

/**
 * Get voiced color by index
 */
export function getVoicedColor(index: number): VoicedColor | undefined {
  return VOICED_COLORS.find((c) => c.index === index);
}

/**
 * Get voiced color by key
 */
export function getVoicedColorByKey(key: string): VoicedColor | undefined {
  return VOICED_COLORS.find((c) => c.key === key);
}

/**
 * Get modifier voice by key
 */
export function getModifierVoice(key: string): ModifierVoice | undefined {
  return MODIFIER_VOICES.find((m) => m.key === key);
}

// ============================================================
// Auto-Mapping Functions
// ============================================================

/**
 * Create automatic color mapping for a pattern color
 */
export function createAutoMapping(
  originalIndex: number,
  originalColor: BeadColor
): ColorMapping {
  return {
    originalIndex,
    originalColor,
    mappedColorIndex: findClosestVoicedColor(originalColor),
    modifiers: { ...DEFAULT_MODIFIERS },
    isAutoMapped: true,
  };
}

/**
 * Create mappings for all colors in a pattern
 */
export function createAutoMappings(colors: BeadColor[]): ColorMapping[] {
  return colors.map((color, index) => createAutoMapping(index, color));
}

/**
 * Check if a mapping has valid voice (or is skip)
 */
export function isMappingVoiced(mapping: ColorMapping): boolean {
  return (
    mapping.mappedColorIndex === SKIP_COLOR_INDEX ||
    (mapping.mappedColorIndex >= 0 && mapping.mappedColorIndex < VOICED_COLORS.length)
  );
}

/**
 * Check if all mappings are valid
 */
export function areAllMappingsVoiced(mappings: ColorMapping[]): boolean {
  return mappings.every(isMappingVoiced);
}
