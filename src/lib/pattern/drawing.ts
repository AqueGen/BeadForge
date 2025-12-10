import type { BeadPattern, Selection, Point } from '@/types';
import { setBeads, getBead } from './pattern';

/**
 * Flood fill from a starting point
 */
export function floodFill(
  pattern: BeadPattern,
  startX: number,
  startY: number,
  newColor: number
): BeadPattern {
  const targetColor = getBead(pattern, startX, startY);

  if (targetColor === newColor) {
    return pattern;
  }

  const beadsToSet: Array<{ x: number; y: number; colorIndex: number }> = [];
  const stack: Point[] = [{ x: startX, y: startY }];
  const visited = new Set<string>();

  while (stack.length > 0) {
    const { x, y } = stack.pop()!;
    const key = `${x},${y}`;

    if (x < 0 || x >= pattern.width || y < 0 || y >= pattern.height) {
      continue;
    }

    if (visited.has(key)) {
      continue;
    }

    if (getBead(pattern, x, y) !== targetColor) {
      continue;
    }

    visited.add(key);
    beadsToSet.push({ x, y, colorIndex: newColor });

    stack.push({ x: x + 1, y });
    stack.push({ x: x - 1, y });
    stack.push({ x, y: y + 1 });
    stack.push({ x, y: y - 1 });
  }

  return setBeads(pattern, beadsToSet);
}

/**
 * Draw a line using Bresenham's algorithm
 */
export function drawLine(
  pattern: BeadPattern,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  color: number
): BeadPattern {
  const beadsToSet: Array<{ x: number; y: number; colorIndex: number }> = [];

  const dx = Math.abs(x1 - x0);
  const dy = Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let err = dx - dy;

  let currentX = x0;
  let currentY = y0;

  while (true) {
    beadsToSet.push({ x: currentX, y: currentY, colorIndex: color });

    if (currentX === x1 && currentY === y1) break;

    const e2 = 2 * err;

    if (e2 > -dy) {
      err -= dy;
      currentX += sx;
    }

    if (e2 < dx) {
      err += dx;
      currentY += sy;
    }
  }

  return setBeads(pattern, beadsToSet);
}

/**
 * Draw a rectangle (filled or outline)
 */
export function drawRectangle(
  pattern: BeadPattern,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  color: number,
  filled: boolean = true
): BeadPattern {
  const beadsToSet: Array<{ x: number; y: number; colorIndex: number }> = [];

  const minX = Math.min(x1, x2);
  const maxX = Math.max(x1, x2);
  const minY = Math.min(y1, y2);
  const maxY = Math.max(y1, y2);

  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      if (filled || x === minX || x === maxX || y === minY || y === maxY) {
        beadsToSet.push({ x, y, colorIndex: color });
      }
    }
  }

  return setBeads(pattern, beadsToSet);
}

/**
 * Copy a rectangular region from the pattern
 */
export function copyRegion(
  pattern: BeadPattern,
  x: number,
  y: number,
  width: number,
  height: number
): Selection {
  const data = new Uint8Array(width * height);

  for (let dy = 0; dy < height; dy++) {
    for (let dx = 0; dx < width; dx++) {
      data[dy * width + dx] = getBead(pattern, x + dx, y + dy);
    }
  }

  return { x, y, width, height, data };
}

/**
 * Paste a selection at a position
 */
export function pasteSelection(
  pattern: BeadPattern,
  selection: Selection,
  targetX: number,
  targetY: number
): BeadPattern {
  if (!selection.data || selection.width <= 0 || selection.height <= 0) {
    return pattern;
  }

  const beadsToSet: Array<{ x: number; y: number; colorIndex: number }> = [];

  for (let dy = 0; dy < selection.height; dy++) {
    for (let dx = 0; dx < selection.width; dx++) {
      const color = selection.data[dy * selection.width + dx];
      beadsToSet.push({ x: targetX + dx, y: targetY + dy, colorIndex: color });
    }
  }

  return setBeads(pattern, beadsToSet);
}

/**
 * Check if a point is within selection bounds
 */
export function isInSelection(selection: Selection, x: number, y: number): boolean {
  return (
    x >= selection.x &&
    x < selection.x + selection.width &&
    y >= selection.y &&
    y < selection.y + selection.height
  );
}
