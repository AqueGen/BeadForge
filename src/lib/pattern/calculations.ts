import type { BeadPattern, Point, BeadRun, PatternStats, HighlightedBeads } from '@/types';
import { SKIP_COLOR_INDEX } from '@/types';
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
 * Skips cells with SKIP_COLOR_INDEX (they are not counted in TTS positions)
 */
export function positionToCoordinates(
  position: number,
  pattern: BeadPattern,
  usedHeight: number
): Point | null {
  if (position < 1) {
    return null;
  }

  // Iterate through pattern in TTS reading order, counting non-skip cells
  let currentPosition = 0;

  for (let y = 0; y < usedHeight; y++) {
    for (let x = 0; x < pattern.width; x++) {
      const colorIndex = pattern.field[y * pattern.width + x];

      // Skip cells with SKIP_COLOR_INDEX
      if (colorIndex === SKIP_COLOR_INDEX) {
        continue;
      }

      currentPosition++;

      if (currentPosition === position) {
        return { x, y };
      }
    }
  }

  // Position out of range
  return null;
}

/**
 * Convert coordinates (x, y) to TTS reading position (1-based)
 * Inverse of positionToCoordinates
 * Reading order: bottom-to-top (y=0 first), left-to-right (x=0 first)
 * Skips cells with SKIP_COLOR_INDEX (they are not counted in TTS positions)
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

  // Check if the target cell itself is a skip cell
  const targetColorIndex = pattern.field[y * pattern.width + x];
  if (targetColorIndex === SKIP_COLOR_INDEX) {
    return null; // Skip cells don't have TTS positions
  }

  // Count non-skip cells up to and including (x, y)
  let position = 0;

  for (let row = 0; row < usedHeight; row++) {
    for (let col = 0; col < pattern.width; col++) {
      const colorIndex = pattern.field[row * pattern.width + col];

      // Skip cells with SKIP_COLOR_INDEX
      if (colorIndex === SKIP_COLOR_INDEX) {
        continue;
      }

      position++;

      // Found the target cell
      if (row === y && col === x) {
        return position;
      }
    }
  }

  return null;
}

/**
 * Get highlighted beads for TTS visualization
 * Returns array of coordinates for the beads in the current group
 * Properly handles skip cells (SKIP_COLOR_INDEX)
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
    const coord = positionToCoordinates(pos, pattern, usedHeight);
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
