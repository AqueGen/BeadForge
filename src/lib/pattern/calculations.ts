import type { BeadPattern, Point, BeadRun, PatternStats, HighlightedBeads } from '@/types';
import { getUsedHeight } from './pattern';

/**
 * Correct coordinates from Draft view to Corrected/Simulation view
 * Accounts for spiral structure where even/odd rows alternate
 */
export function correctPoint(x: number, y: number, width: number, scroll: number = 0): Point {
  let idx = x + (y + scroll) * width;

  const m1 = width;     // Beads in odd row
  const m2 = width + 1; // Beads in even row

  let k = 0;
  let m = m1;

  while (idx >= m) {
    idx -= m;
    k++;
    m = k % 2 === 0 ? m1 : m2;
  }

  return { x: idx, y: k - scroll };
}

/**
 * Calculate the minimum repeat period of the pattern
 */
export function calculateRepeat(pattern: BeadPattern): number {
  const usedHeight = getUsedHeight(pattern);
  if (usedHeight === 0) return 0;

  const totalBeads = usedHeight * pattern.width;

  for (let period = 1; period < totalBeads; period++) {
    if (pattern.field[period] === pattern.field[0]) {
      let isRepeat = true;

      for (let k = period + 1; k < totalBeads; k++) {
        if (pattern.field[(k - period) % period] !== pattern.field[k]) {
          isRepeat = false;
          break;
        }
      }

      if (isRepeat) return period;
    }
  }

  return totalBeads;
}

/**
 * Count beads by color index
 */
export function countBeadsByColor(pattern: BeadPattern): Map<number, number> {
  const counts = new Map<number, number>();
  const usedHeight = getUsedHeight(pattern);

  for (let y = 0; y < usedHeight; y++) {
    for (let x = 0; x < pattern.width; x++) {
      const colorIndex = pattern.field[y * pattern.width + x];
      counts.set(colorIndex, (counts.get(colorIndex) ?? 0) + 1);
    }
  }

  return counts;
}

/**
 * Generate the bead stringing list (runs of same color)
 * Order is REVERSED (last bead goes on thread first)
 */
export function generateBeadList(pattern: BeadPattern): BeadRun[] {
  const runs: BeadRun[] = [];
  const usedHeight = getUsedHeight(pattern);

  if (usedHeight === 0) return runs;

  let currentColor: number | null = null;
  let currentCount = 0;

  // Read beads bottom to top (y=0 is visual bottom), left to right
  for (let y = 0; y < usedHeight; y++) {
    for (let x = 0; x < pattern.width; x++) {
      const color = pattern.field[y * pattern.width + x];

      if (currentColor === null) {
        currentColor = color;
        currentCount = 1;
      } else if (color === currentColor) {
        currentCount++;
      } else {
        runs.push({ colorIndex: currentColor, count: currentCount });
        currentColor = color;
        currentCount = 1;
      }
    }
  }

  if (currentColor !== null && currentCount > 0) {
    runs.push({ colorIndex: currentColor, count: currentCount });
  }

  return runs;
}

/**
 * Calculate estimated length of finished rope in mm
 * Based on bead size (typically 2.5mm for 11/0 delica)
 */
export function calculateLength(pattern: BeadPattern, beadSizeMm: number = 2.5): number {
  const usedHeight = getUsedHeight(pattern);
  // Each row adds approximately beadSize * 0.85 to length
  return usedHeight * beadSizeMm * 0.85;
}

/**
 * Calculate estimated weight in grams
 * Based on typical bead weight (~0.1g per bead for 11/0)
 */
export function calculateWeight(pattern: BeadPattern, beadWeightGrams: number = 0.1): number {
  const beadCounts = countBeadsByColor(pattern);
  let total = 0;
  beadCounts.forEach((count) => {
    total += count;
  });
  return total * beadWeightGrams;
}

/**
 * Get full pattern statistics
 */
export function getPatternStats(pattern: BeadPattern): PatternStats {
  const usedHeight = getUsedHeight(pattern);
  const beadCounts = countBeadsByColor(pattern);

  let totalBeads = 0;
  beadCounts.forEach((count) => {
    totalBeads += count;
  });

  return {
    width: pattern.width,
    height: pattern.height,
    usedHeight,
    repeat: calculateRepeat(pattern),
    totalBeads,
    estimatedLengthMm: calculateLength(pattern),
    estimatedWeightGrams: calculateWeight(pattern),
    beadCounts,
  };
}

/**
 * Convert TTS reading position (1-based) to grid coordinates (x, y)
 * Reading order: bottom-to-top (y=0 first), left-to-right (x=0 first)
 * This matches the order used in generateBeadListForTTS in ttsService.ts
 */
export function positionToCoordinates(
  position: number,
  width: number,
  usedHeight: number
): Point | null {
  if (position < 1 || position > width * usedHeight) {
    return null;
  }

  const zeroBasedPos = position - 1;
  const row = Math.floor(zeroBasedPos / width);  // 0-based row from bottom
  const col = zeroBasedPos % width;              // 0-based col from left

  // Convert to grid coordinates (direct mapping)
  const y = row;   // y=0 is bottom, first in reading
  const x = col;   // x=0 is left, first in reading

  return { x, y };
}

/**
 * Convert coordinates (x, y) to TTS reading position (1-based)
 * Inverse of positionToCoordinates
 * Reading order: bottom-to-top (y=0 first), left-to-right (x=0 first)
 */
export function coordinatesToPosition(
  pattern: BeadPattern,
  x: number,
  y: number
): number | null {
  const usedHeight = getUsedHeight(pattern);

  if (usedHeight === 0 || x < 0 || x >= pattern.width || y < 0 || y >= usedHeight) {
    return null;
  }

  // Convert grid coordinates to reading order (direct mapping)
  const row = y;  // row 0 = bottom (y=0)
  const col = x;  // col 0 = left (x=0)

  // Position = row * width + col + 1 (1-based)
  return row * pattern.width + col + 1;
}

/**
 * Get highlighted beads for TTS visualization
 * Returns array of coordinates for the beads in the current group
 */
export function getHighlightedBeads(
  pattern: BeadPattern,
  startPosition: number,
  count: number
): HighlightedBeads | null {
  const usedHeight = getUsedHeight(pattern);
  if (usedHeight === 0 || startPosition < 1) {
    return null;
  }

  const positions: Point[] = [];
  let colorIndex = 0;

  for (let i = 0; i < count; i++) {
    const pos = startPosition + i;
    const coord = positionToCoordinates(pos, pattern.width, usedHeight);
    if (coord) {
      positions.push(coord);
      // Get color index from first valid position
      if (i === 0) {
        colorIndex = pattern.field[coord.y * pattern.width + coord.x];
      }
    }
  }

  if (positions.length === 0) {
    return null;
  }

  return { positions, colorIndex };
}
