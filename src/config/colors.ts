/**
 * Color Configuration
 *
 * Central configuration for color palettes and tier-based access.
 * Edit this file to manage available colors for free/paid tiers.
 */

import type { BeadColor } from '@/types';

// ============================================================
// Color Definitions
// ============================================================

export interface ColorDefinition {
  /** Unique color index */
  index: number;
  /** Color key for audio files */
  key: string;
  /** Display name (Ukrainian) */
  nameUk: string;
  /** Display name (Russian) */
  nameRu: string;
  /** RGB color values */
  rgb: BeadColor;
  /** Available in free tier */
  isFree: boolean;
}

// ============================================================
// Full Color Palette (16 colors)
// ============================================================

export const COLOR_PALETTE: ColorDefinition[] = [
  // === FREE TIER (6 colors) ===
  {
    index: 0,
    key: 'white',
    nameUk: 'Білий',
    nameRu: 'Белый',
    rgb: { r: 255, g: 255, b: 255 },
    isFree: true,
  },
  {
    index: 1,
    key: 'black',
    nameUk: 'Чорний',
    nameRu: 'Чёрный',
    rgb: { r: 0, g: 0, b: 0 },
    isFree: true,
  },
  {
    index: 2,
    key: 'red',
    nameUk: 'Червоний',
    nameRu: 'Красный',
    rgb: { r: 255, g: 0, b: 0 },
    isFree: true,
  },
  {
    index: 3,
    key: 'blue',
    nameUk: 'Синій',
    nameRu: 'Синий',
    rgb: { r: 0, g: 0, b: 255 },
    isFree: true,
  },
  {
    index: 4,
    key: 'green',
    nameUk: 'Зелений',
    nameRu: 'Зелёный',
    rgb: { r: 0, g: 128, b: 0 },
    isFree: true,
  },
  {
    index: 5,
    key: 'yellow',
    nameUk: 'Жовтий',
    nameRu: 'Жёлтый',
    rgb: { r: 255, g: 255, b: 0 },
    isFree: true,
  },

  // === PAID TIER (10 additional colors) ===
  {
    index: 6,
    key: 'orange',
    nameUk: 'Помаранчевий',
    nameRu: 'Оранжевый',
    rgb: { r: 255, g: 165, b: 0 },
    isFree: false,
  },
  {
    index: 7,
    key: 'purple',
    nameUk: 'Фіолетовий',
    nameRu: 'Фиолетовый',
    rgb: { r: 128, g: 0, b: 128 },
    isFree: false,
  },
  {
    index: 8,
    key: 'pink',
    nameUk: 'Рожевий',
    nameRu: 'Розовый',
    rgb: { r: 255, g: 192, b: 203 },
    isFree: false,
  },
  {
    index: 9,
    key: 'brown',
    nameUk: 'Коричневий',
    nameRu: 'Коричневый',
    rgb: { r: 139, g: 69, b: 19 },
    isFree: false,
  },
  {
    index: 10,
    key: 'gray',
    nameUk: 'Сірий',
    nameRu: 'Серый',
    rgb: { r: 128, g: 128, b: 128 },
    isFree: false,
  },
  {
    index: 11,
    key: 'cyan',
    nameUk: 'Блакитний',
    nameRu: 'Голубой',
    rgb: { r: 135, g: 206, b: 235 },
    isFree: false,
  },
  {
    index: 12,
    key: 'turquoise',
    nameUk: 'Бірюзовий',
    nameRu: 'Бирюзовый',
    rgb: { r: 0, g: 206, b: 209 },
    isFree: false,
  },
  {
    index: 13,
    key: 'beige',
    nameUk: 'Бежевий',
    nameRu: 'Бежевый',
    rgb: { r: 245, g: 245, b: 220 },
    isFree: false,
  },
  {
    index: 14,
    key: 'gold',
    nameUk: 'Золотий',
    nameRu: 'Золотой',
    rgb: { r: 255, g: 215, b: 0 },
    isFree: false,
  },
  {
    index: 15,
    key: 'silver',
    nameUk: 'Срібний',
    nameRu: 'Серебряный',
    rgb: { r: 192, g: 192, b: 192 },
    isFree: false,
  },
];

// ============================================================
// Helper Functions
// ============================================================

/** Get free tier colors only */
export function getFreeColors(): ColorDefinition[] {
  return COLOR_PALETTE.filter((c) => c.isFree);
}

/** Get paid tier colors only */
export function getPaidColors(): ColorDefinition[] {
  return COLOR_PALETTE.filter((c) => !c.isFree);
}

/** Get all colors */
export function getAllColors(): ColorDefinition[] {
  return COLOR_PALETTE;
}

/** Get colors based on user tier */
export function getColorsForTier(isPaidUser: boolean): ColorDefinition[] {
  return isPaidUser ? getAllColors() : getFreeColors();
}

/** Convert ColorDefinition[] to BeadColor[] for pattern use */
export function toBeadColors(colors: ColorDefinition[]): BeadColor[] {
  return colors.map((c) => c.rgb);
}

/** Get color by index */
export function getColorByIndex(index: number): ColorDefinition | undefined {
  return COLOR_PALETTE.find((c) => c.index === index);
}

/** Get color by key */
export function getColorByKey(key: string): ColorDefinition | undefined {
  return COLOR_PALETTE.find((c) => c.key === key);
}

/** Check if color index is free */
export function isColorFree(index: number): boolean {
  const color = getColorByIndex(index);
  return color?.isFree ?? false;
}

// ============================================================
// Default Exports for Compatibility
// ============================================================

/** Default colors for pattern editor (matches current DEFAULT_COLORS format) */
export const DEFAULT_COLORS: BeadColor[] = COLOR_PALETTE.map((c) => c.rgb);

/** Free colors as BeadColor[] */
export const FREE_COLORS: BeadColor[] = getFreeColors().map((c) => c.rgb);

// ============================================================
// Tier Configuration
// ============================================================

export const TIER_CONFIG = {
  free: {
    maxColors: 6,
    colorIndices: [0, 1, 2, 3, 4, 5], // white, black, red, blue, green, yellow
  },
  paid: {
    maxColors: 16,
    colorIndices: COLOR_PALETTE.map((c) => c.index),
  },
} as const;
