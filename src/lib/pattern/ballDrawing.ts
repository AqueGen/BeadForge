/**
 * Ball Pattern Drawing Tools
 *
 * Drawing operations specific to ball patterns (wedge-aware)
 */

import type { BallPattern } from '@/types';
import { isPositionInWedge, getBallPatternBead } from './ballPattern';

/**
 * Flood fill for ball pattern (respects wedge boundaries)
 */
export function floodFillBallPattern(
  pattern: BallPattern,
  startX: number,
  startY: number,
  newColorIndex: number
): BallPattern {
  // Don't fill outside wedges
  if (!isPositionInWedge(pattern, startX, startY)) {
    return pattern;
  }

  const targetColor = pattern.field[startY * pattern.width + startX];

  // No change needed if same color
  if (targetColor === newColorIndex) {
    return pattern;
  }

  // Create a copy of the field
  const newField = new Uint8Array(pattern.field);
  const visited = new Set<number>();

  // Use stack-based flood fill to avoid recursion limit
  const stack: Array<{ x: number; y: number }> = [{ x: startX, y: startY }];

  while (stack.length > 0) {
    const { x, y } = stack.pop()!;
    const idx = y * pattern.width + x;

    // Skip if already visited
    if (visited.has(idx)) continue;
    visited.add(idx);

    // Skip if out of bounds
    if (x < 0 || x >= pattern.width || y < 0 || y >= pattern.height) {
      continue;
    }

    // Skip if outside wedge
    if (!isPositionInWedge(pattern, x, y)) {
      continue;
    }

    // Skip if not target color
    if (newField[idx] !== targetColor) {
      continue;
    }

    // Fill this pixel
    newField[idx] = newColorIndex;

    // Add neighbors to stack
    stack.push({ x: x + 1, y });
    stack.push({ x: x - 1, y });
    stack.push({ x, y: y + 1 });
    stack.push({ x, y: y - 1 });
  }

  return {
    ...pattern,
    field: newField,
    updatedAt: new Date(),
  };
}

/**
 * Draw a line on ball pattern (respects wedge boundaries)
 */
export function drawLineBallPattern(
  pattern: BallPattern,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  colorIndex: number
): BallPattern {
  const newField = new Uint8Array(pattern.field);

  // Bresenham's line algorithm
  const dx = Math.abs(x1 - x0);
  const dy = Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let err = dx - dy;

  let x = x0;
  let y = y0;

  while (true) {
    // Only set if within wedge
    if (
      x >= 0 &&
      x < pattern.width &&
      y >= 0 &&
      y < pattern.height &&
      isPositionInWedge(pattern, x, y)
    ) {
      newField[y * pattern.width + x] = colorIndex;
    }

    if (x === x1 && y === y1) break;

    const e2 = 2 * err;
    if (e2 > -dy) {
      err -= dy;
      x += sx;
    }
    if (e2 < dx) {
      err += dx;
      y += sy;
    }
  }

  return {
    ...pattern,
    field: newField,
    updatedAt: new Date(),
  };
}

/**
 * Draw a rectangle on ball pattern (respects wedge boundaries)
 */
export function drawRectangleBallPattern(
  pattern: BallPattern,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  colorIndex: number,
  filled: boolean = false
): BallPattern {
  const newField = new Uint8Array(pattern.field);

  const minX = Math.max(0, Math.min(x0, x1));
  const maxX = Math.min(pattern.width - 1, Math.max(x0, x1));
  const minY = Math.max(0, Math.min(y0, y1));
  const maxY = Math.min(pattern.height - 1, Math.max(y0, y1));

  if (filled) {
    for (let y = minY; y <= maxY; y++) {
      for (let x = minX; x <= maxX; x++) {
        if (isPositionInWedge(pattern, x, y)) {
          newField[y * pattern.width + x] = colorIndex;
        }
      }
    }
  } else {
    // Draw outline only
    for (let x = minX; x <= maxX; x++) {
      if (isPositionInWedge(pattern, x, minY)) {
        newField[minY * pattern.width + x] = colorIndex;
      }
      if (isPositionInWedge(pattern, x, maxY)) {
        newField[maxY * pattern.width + x] = colorIndex;
      }
    }
    for (let y = minY; y <= maxY; y++) {
      if (isPositionInWedge(pattern, minX, y)) {
        newField[y * pattern.width + minX] = colorIndex;
      }
      if (isPositionInWedge(pattern, maxX, y)) {
        newField[y * pattern.width + maxX] = colorIndex;
      }
    }
  }

  return {
    ...pattern,
    field: newField,
    updatedAt: new Date(),
  };
}
