import type { BeadPattern, Point, BeadRun, PatternStats } from '@/types';
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

  // Read beads in reverse order (last row first, right to left)
  for (let y = usedHeight - 1; y >= 0; y--) {
    for (let x = pattern.width - 1; x >= 0; x--) {
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
