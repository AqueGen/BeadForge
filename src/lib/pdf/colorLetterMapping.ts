/**
 * Color-to-letter mapping utility for PDF export
 * Assigns unique letters (A-Z, then AA-AZ, etc.) based on Hue sorting
 * This ensures visually similar colors get different letters
 */

import { BeadColor } from '@/types';

interface ColorWithIndex {
  color: BeadColor;
  index: number;
  hue: number;
  saturation: number;
  lightness: number;
}

/**
 * Convert RGB to HSL
 */
function rgbToHsl(r: number, g: number, b: number): { h: number; s: number; l: number } {
  r /= 255;
  g /= 255;
  b /= 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / d + 2) / 6;
        break;
      case b:
        h = ((r - g) / d + 4) / 6;
        break;
    }
  }

  return { h: h * 360, s: s * 100, l: l * 100 };
}

/**
 * Generate letter code from index (0=A, 25=Z, 26=AA, 27=AB, etc.)
 */
function indexToLetter(index: number): string {
  if (index < 26) {
    return String.fromCharCode(65 + index); // A-Z
  }

  // For more than 26 colors, use AA, AB, AC...
  const first = Math.floor(index / 26) - 1;
  const second = index % 26;
  return String.fromCharCode(65 + first) + String.fromCharCode(65 + second);
}

export interface ColorLetterMapping {
  colorIndex: number;
  letter: string;
  color: BeadColor;
  count: number;
}

/**
 * Create letter mappings for colors, sorted by Hue to maximize visual distinction
 * Similar colors will have different letters due to Hue-based ordering
 */
export function createColorLetterMappings(
  colors: BeadColor[],
  field: Uint8Array
): ColorLetterMapping[] {
  // Count color usage
  const colorCounts = new Map<number, number>();
  for (let i = 0; i < field.length; i++) {
    const colorIndex = field[i];
    colorCounts.set(colorIndex, (colorCounts.get(colorIndex) || 0) + 1);
  }

  // Filter to only used colors and calculate HSL
  const usedColors: ColorWithIndex[] = [];
  colors.forEach((color, index) => {
    const count = colorCounts.get(index) || 0;
    if (count > 0) {
      const hsl = rgbToHsl(color.r, color.g, color.b);
      usedColors.push({
        color,
        index,
        hue: hsl.h,
        saturation: hsl.s,
        lightness: hsl.l,
      });
    }
  });

  // Sort by Hue first, then by Lightness for colors with similar hue
  usedColors.sort((a, b) => {
    // Group grays separately (low saturation)
    const aIsGray = a.saturation < 10;
    const bIsGray = b.saturation < 10;

    if (aIsGray && !bIsGray) return 1; // Grays at the end
    if (!aIsGray && bIsGray) return -1;

    if (aIsGray && bIsGray) {
      // Sort grays by lightness
      return a.lightness - b.lightness;
    }

    // Sort chromatic colors by hue, then lightness
    const hueDiff = a.hue - b.hue;
    if (Math.abs(hueDiff) > 15) {
      return hueDiff;
    }
    return a.lightness - b.lightness;
  });

  // Assign letters based on sorted order
  return usedColors.map((item, sortedIndex) => ({
    colorIndex: item.index,
    letter: indexToLetter(sortedIndex),
    color: item.color,
    count: colorCounts.get(item.index) || 0,
  }));
}

/**
 * Get letter for a specific color index
 */
export function getLetterForColorIndex(
  mappings: ColorLetterMapping[],
  colorIndex: number
): string {
  const mapping = mappings.find(m => m.colorIndex === colorIndex);
  return mapping?.letter || '?';
}

/**
 * Get contrasting text color (black or white) for a background color
 */
export function getContrastingTextColor(color: BeadColor): 'black' | 'white' {
  // Using relative luminance formula
  const luminance = (0.299 * color.r + 0.587 * color.g + 0.114 * color.b) / 255;
  return luminance > 0.5 ? 'black' : 'white';
}

/**
 * Convert BeadColor to hex string
 */
export function colorToHex(color: BeadColor): string {
  const r = color.r.toString(16).padStart(2, '0');
  const g = color.g.toString(16).padStart(2, '0');
  const b = color.b.toString(16).padStart(2, '0');
  return `#${r}${g}${b}`;
}

/**
 * Convert BeadColor to RGB string
 */
export function colorToRgbString(color: BeadColor): string {
  return `rgb(${color.r}, ${color.g}, ${color.b})`;
}
