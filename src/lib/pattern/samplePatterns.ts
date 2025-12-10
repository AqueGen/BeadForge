/**
 * Sample patterns for testing TTS functionality
 * Temporary until database is implemented
 */

import type { BeadPattern, BeadColor } from '@/types';
import { generateId } from '@/lib/utils';

export interface SamplePatternInfo {
  id: string;
  name: string;
  description: string;
}

// Helper to create pattern from simple 2D array
function createPatternFromArray(
  name: string,
  data: number[][],
  colors: BeadColor[]
): BeadPattern {
  const height = data.length;
  const width = data[0]?.length || 8;
  const field = new Uint8Array(width * height);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      field[y * width + x] = data[y]?.[x] ?? 0;
    }
  }

  return {
    id: generateId(),
    name,
    width,
    height,
    field,
    colors,
    createdAt: new Date(),
    updatedAt: new Date(),
    isPublic: false,
  };
}

// Color palettes for sample patterns
const SIMPLE_COLORS: BeadColor[] = [
  { r: 255, g: 255, b: 255, name: 'White' },
  { r: 0, g: 0, b: 0, name: 'Black' },
  { r: 255, g: 0, b: 0, name: 'Red' },
  { r: 0, g: 128, b: 0, name: 'Green' },
  { r: 0, g: 0, b: 255, name: 'Blue' },
  { r: 255, g: 255, b: 0, name: 'Yellow' },
];

const FLAG_COLORS: BeadColor[] = [
  { r: 255, g: 255, b: 255, name: 'White' },
  { r: 0, g: 87, b: 183, name: 'Blue' },
  { r: 255, g: 215, b: 0, name: 'Yellow' },
];

const FLOWER_COLORS: BeadColor[] = [
  { r: 255, g: 255, b: 255, name: 'White' },  // 0 - Background
  { r: 255, g: 105, b: 180, name: 'Pink' },   // 1 - Petals
  { r: 255, g: 215, b: 0, name: 'Yellow' },   // 2 - Center
  { r: 34, g: 139, b: 34, name: 'Green' },    // 3 - Stem/Leaves
];

// Sample Pattern 1: Simple stripes (Red, White, Blue)
const STRIPES_DATA = [
  [2, 2, 2, 2, 2, 2, 2, 2], // Red
  [2, 2, 2, 2, 2, 2, 2, 2], // Red
  [0, 0, 0, 0, 0, 0, 0, 0], // White
  [0, 0, 0, 0, 0, 0, 0, 0], // White
  [4, 4, 4, 4, 4, 4, 4, 4], // Blue
  [4, 4, 4, 4, 4, 4, 4, 4], // Blue
  [2, 2, 2, 2, 2, 2, 2, 2], // Red
  [2, 2, 2, 2, 2, 2, 2, 2], // Red
  [0, 0, 0, 0, 0, 0, 0, 0], // White
  [0, 0, 0, 0, 0, 0, 0, 0], // White
];

// Sample Pattern 2: Checkerboard (Black and White)
const CHECKERBOARD_DATA = [
  [0, 1, 0, 1, 0, 1, 0, 1],
  [1, 0, 1, 0, 1, 0, 1, 0],
  [0, 1, 0, 1, 0, 1, 0, 1],
  [1, 0, 1, 0, 1, 0, 1, 0],
  [0, 1, 0, 1, 0, 1, 0, 1],
  [1, 0, 1, 0, 1, 0, 1, 0],
  [0, 1, 0, 1, 0, 1, 0, 1],
  [1, 0, 1, 0, 1, 0, 1, 0],
];

// Sample Pattern 3: Ukrainian flag colors pattern
const UKRAINE_DATA = [
  [1, 1, 1, 1, 1, 1, 1, 1], // Blue
  [1, 1, 1, 1, 1, 1, 1, 1], // Blue
  [1, 1, 1, 1, 1, 1, 1, 1], // Blue
  [1, 1, 1, 1, 1, 1, 1, 1], // Blue
  [1, 1, 1, 1, 1, 1, 1, 1], // Blue
  [2, 2, 2, 2, 2, 2, 2, 2], // Yellow
  [2, 2, 2, 2, 2, 2, 2, 2], // Yellow
  [2, 2, 2, 2, 2, 2, 2, 2], // Yellow
  [2, 2, 2, 2, 2, 2, 2, 2], // Yellow
  [2, 2, 2, 2, 2, 2, 2, 2], // Yellow
];

// Sample Pattern 4: Simple flower
const FLOWER_DATA = [
  [0, 0, 0, 0, 1, 1, 0, 0, 0, 0], // Top petal
  [0, 0, 0, 1, 1, 1, 1, 0, 0, 0],
  [0, 0, 1, 1, 1, 1, 1, 1, 0, 0],
  [0, 1, 1, 1, 2, 2, 1, 1, 1, 0], // Center row
  [1, 1, 1, 2, 2, 2, 2, 1, 1, 1], // Center row
  [1, 1, 1, 2, 2, 2, 2, 1, 1, 1], // Center row
  [0, 1, 1, 1, 2, 2, 1, 1, 1, 0], // Center row
  [0, 0, 1, 1, 1, 1, 1, 1, 0, 0],
  [0, 0, 0, 1, 1, 1, 1, 0, 0, 0],
  [0, 0, 0, 0, 1, 1, 0, 0, 0, 0], // Bottom petal
  [0, 0, 0, 0, 3, 3, 0, 0, 0, 0], // Stem
  [0, 0, 0, 0, 3, 3, 0, 0, 0, 0],
  [0, 0, 0, 3, 3, 3, 3, 0, 0, 0], // Leaves
  [0, 0, 3, 3, 3, 3, 3, 3, 0, 0],
  [0, 0, 0, 0, 3, 3, 0, 0, 0, 0], // Stem
  [0, 0, 0, 0, 3, 3, 0, 0, 0, 0],
];

// Create sample patterns
export const SAMPLE_PATTERNS: Map<string, BeadPattern> = new Map([
  ['stripes', createPatternFromArray('Stripes (Red-White-Blue)', STRIPES_DATA, SIMPLE_COLORS)],
  ['checkerboard', createPatternFromArray('Checkerboard', CHECKERBOARD_DATA, SIMPLE_COLORS)],
  ['ukraine', createPatternFromArray('Ukraine Flag', UKRAINE_DATA, FLAG_COLORS)],
  ['flower', createPatternFromArray('Flower', FLOWER_DATA, FLOWER_COLORS)],
]);

// Get list of available sample patterns
export function getSamplePatternList(): SamplePatternInfo[] {
  return [
    { id: 'stripes', name: 'Stripes (Red-White-Blue)', description: 'Simple striped pattern' },
    { id: 'checkerboard', name: 'Checkerboard', description: 'Black and white checkerboard' },
    { id: 'ukraine', name: 'Ukraine Flag', description: 'Blue and yellow flag pattern' },
    { id: 'flower', name: 'Flower', description: 'Pink flower with yellow center' },
  ];
}

// Get a sample pattern by ID
export function getSamplePattern(id: string): BeadPattern | undefined {
  const pattern = SAMPLE_PATTERNS.get(id);
  if (pattern) {
    // Return a copy with new ID and dates
    return {
      ...pattern,
      id: generateId(),
      createdAt: new Date(),
      updatedAt: new Date(),
      field: new Uint8Array(pattern.field), // Copy the array
    };
  }
  return undefined;
}
