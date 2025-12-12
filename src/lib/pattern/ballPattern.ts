/**
 * Ball Pattern Geometry Calculations
 *
 * Ball pattern consists of 6 wedges pointing up + 6 wedges pointing down
 * arranged in a zigzag pattern (развёртка шарика).
 *
 * Layout visualization (looking at development):
 *
 *   /\    /\    /\    /\    /\    /\      <- 6 top wedges (pointing up)
 *  /  \  /  \  /  \  /  \  /  \  /  \
 * /    \/    \/    \/    \/    \/    \
 * \    /\    /\    /\    /\    /\    /
 *  \  /  \  /  \  /  \  /  \  /  \  /
 *   \/    \/    \/    \/    \/    \/      <- 6 bottom wedges (pointing down)
 *
 * Each wedge tapers from base (widest) to tip (-1 bead per row).
 */

import type {
  BallPattern,
  BallSizeConfig,
  WedgeInfo,
  WedgePosition,
  BeadColor,
  BallPatternDto
} from '@/types';
import { BALL_SIZE_CONFIGS, getBallSizeConfig, DEFAULT_COLORS, SKIP_COLOR_INDEX } from '@/types';

/**
 * Create a new empty ball pattern with given diameter
 */
export function createBallPattern(
  diameter: number,
  name: string = 'New Ball Pattern',
  colors: BeadColor[] = DEFAULT_COLORS
): BallPattern | null {
  const config = getBallSizeConfig(diameter);
  if (!config) {
    console.error(`Invalid ball diameter: ${diameter}. Valid options: 3, 4, 5, 6 cm`);
    return null;
  }

  const width = config.circumference;
  const height = config.wedgeHeight * 2; // Top + bottom wedges
  const field = new Uint8Array(width * height);

  // Fill with first color (background)
  field.fill(0);

  return {
    id: crypto.randomUUID(),
    name,
    type: 'ball',
    diameter: config.diameter,
    circumference: config.circumference,
    wedgeBase: config.wedgeBase,
    wedgeHeight: config.wedgeHeight,
    width,
    height,
    field,
    colors: [...colors],
    createdAt: new Date(),
    updatedAt: new Date(),
    isPublic: false,
  };
}

/**
 * Get all 12 wedge info objects for a ball pattern
 * Returns array of 12 wedges: 6 top (pointing up) + 6 bottom (pointing down)
 */
export function getAllWedges(pattern: BallPattern): WedgeInfo[] {
  const wedges: WedgeInfo[] = [];
  const { wedgeBase, wedgeHeight } = pattern;

  // 6 top wedges (pointing up, in top half)
  for (let i = 0; i < 6; i++) {
    wedges.push({
      index: i,
      position: 'top',
      startX: i * wedgeBase,
      startY: wedgeHeight, // Top wedges start at middle row
      base: wedgeBase,
      height: wedgeHeight,
    });
  }

  // 6 bottom wedges (pointing down, in bottom half)
  for (let i = 0; i < 6; i++) {
    wedges.push({
      index: i + 6,
      position: 'bottom',
      startX: i * wedgeBase,
      startY: 0,
      base: wedgeBase,
      height: wedgeHeight,
    });
  }

  return wedges;
}

/**
 * Get wedge info for a specific wedge index (0-11)
 */
export function getWedgeByIndex(pattern: BallPattern, index: number): WedgeInfo | null {
  if (index < 0 || index >= 12) return null;
  const wedges = getAllWedges(pattern);
  return wedges[index];
}

/**
 * Calculate the width of a wedge at a specific row within the wedge
 * Wedges taper linearly: base at row 0, tip (1 bead) at top row
 *
 * @param wedgeBase - Width at the base of the wedge
 * @param wedgeHeight - Total height of the wedge
 * @param localRow - Row within the wedge (0 = base, wedgeHeight-1 = tip)
 * @returns Number of beads in that row
 */
export function getWedgeWidthAtRow(
  wedgeBase: number,
  wedgeHeight: number,
  localRow: number
): number {
  if (localRow < 0 || localRow >= wedgeHeight) return 0;

  // Linear taper: base at row 0, reducing by ~1 per row until tip
  // Formula: width = base - (base-1) * (row / (height-1))
  // At row 0: width = base
  // At row height-1: width = 1
  const ratio = localRow / (wedgeHeight - 1);
  const width = Math.round(wedgeBase - (wedgeBase - 1) * ratio);
  return Math.max(1, width);
}

/**
 * Calculate horizontal offset for a row in a wedge (for centering)
 * As rows taper, they need to be centered within the wedge column
 */
export function getWedgeRowOffset(
  wedgeBase: number,
  wedgeHeight: number,
  localRow: number
): number {
  const rowWidth = getWedgeWidthAtRow(wedgeBase, wedgeHeight, localRow);
  return Math.floor((wedgeBase - rowWidth) / 2);
}

/**
 * Check if a global (x, y) position falls within the triangular shape of any wedge
 * Returns the wedge info if inside a wedge, null if in empty space
 */
export function getWedgeAtPosition(
  pattern: BallPattern,
  x: number,
  y: number
): WedgeInfo | null {
  const { wedgeBase, wedgeHeight } = pattern;

  // Determine if we're in top half (top wedges) or bottom half (bottom wedges)
  const isTopHalf = y >= wedgeHeight;

  // Calculate which wedge column (0-5) based on x
  const wedgeColumn = Math.floor(x / wedgeBase);
  if (wedgeColumn < 0 || wedgeColumn >= 6) return null;

  // Local x within the wedge column
  const localX = x % wedgeBase;

  // Local y within the wedge
  let localRow: number;
  if (isTopHalf) {
    // Top wedges: y goes from wedgeHeight (base) to 2*wedgeHeight-1 (tip)
    localRow = y - wedgeHeight;
  } else {
    // Bottom wedges: y goes from wedgeHeight-1 (base) to 0 (tip)
    // Inverted: row 0 is at y = wedgeHeight-1, tip at y = 0
    localRow = (wedgeHeight - 1) - y;
  }

  if (localRow < 0 || localRow >= wedgeHeight) return null;

  // Check if localX falls within the tapered width at this row
  const rowWidth = getWedgeWidthAtRow(wedgeBase, wedgeHeight, localRow);
  const rowOffset = getWedgeRowOffset(wedgeBase, wedgeHeight, localRow);

  if (localX < rowOffset || localX >= rowOffset + rowWidth) {
    return null; // Outside the triangular wedge shape
  }

  // Inside a valid wedge
  const wedgeIndex = isTopHalf ? wedgeColumn : wedgeColumn + 6;
  return getWedgeByIndex(pattern, wedgeIndex);
}

/**
 * Check if a position (x, y) is within any wedge's triangular area
 * (i.e., not in the "empty" triangular gaps between wedges)
 */
export function isPositionInWedge(
  pattern: BallPattern,
  x: number,
  y: number
): boolean {
  return getWedgeAtPosition(pattern, x, y) !== null;
}

/**
 * Get the color index at a position, or -1 if outside wedge area
 */
export function getBallPatternBead(
  pattern: BallPattern,
  x: number,
  y: number
): number {
  if (x < 0 || x >= pattern.width || y < 0 || y >= pattern.height) {
    return -1;
  }

  if (!isPositionInWedge(pattern, x, y)) {
    return -1; // Empty space between wedges
  }

  return pattern.field[y * pattern.width + x];
}

/**
 * Set the color index at a position (only if within wedge area)
 * Returns true if set, false if position is outside wedge
 */
export function setBallPatternBead(
  pattern: BallPattern,
  x: number,
  y: number,
  colorIndex: number
): boolean {
  if (x < 0 || x >= pattern.width || y < 0 || y >= pattern.height) {
    return false;
  }

  if (!isPositionInWedge(pattern, x, y)) {
    return false; // Can't set beads in empty space
  }

  pattern.field[y * pattern.width + x] = colorIndex;
  pattern.updatedAt = new Date();
  return true;
}

/**
 * Count total beads in the ball pattern (excluding empty spaces)
 */
export function countBallPatternBeads(pattern: BallPattern): number {
  let count = 0;

  for (let y = 0; y < pattern.height; y++) {
    for (let x = 0; x < pattern.width; x++) {
      if (isPositionInWedge(pattern, x, y)) {
        count++;
      }
    }
  }

  return count;
}

/**
 * Get beads by color for ball pattern (excluding empty spaces)
 */
export function countBallBeadsByColor(pattern: BallPattern): Map<number, number> {
  const counts = new Map<number, number>();

  for (let y = 0; y < pattern.height; y++) {
    for (let x = 0; x < pattern.width; x++) {
      if (isPositionInWedge(pattern, x, y)) {
        const colorIndex = pattern.field[y * pattern.width + x];
        counts.set(colorIndex, (counts.get(colorIndex) ?? 0) + 1);
      }
    }
  }

  return counts;
}

/**
 * Generate bead list for TTS reading
 * Reading order: row by row, left to right, bottom to top
 * Skips empty spaces between wedges
 */
export function generateBallBeadListForTTS(pattern: BallPattern): { colorIndex: number; x: number; y: number }[] {
  const beads: { colorIndex: number; x: number; y: number }[] = [];

  // Read bottom to top, left to right (same as rope pattern)
  for (let y = 0; y < pattern.height; y++) {
    for (let x = 0; x < pattern.width; x++) {
      if (isPositionInWedge(pattern, x, y)) {
        beads.push({
          colorIndex: pattern.field[y * pattern.width + x],
          x,
          y,
        });
      }
    }
  }

  return beads;
}

/**
 * Get highlighted beads for TTS visualization on ball pattern
 * Returns array of coordinates for the beads in the current group
 * More efficient than inline calculation - uses early exit
 * Properly handles skip cells (SKIP_COLOR_INDEX) - they are not counted
 */
export function getHighlightedBeadsForBall(
  pattern: BallPattern,
  startPosition: number,
  count: number
): { positions: { x: number; y: number }[]; colorIndex: number } | null {
  if (startPosition < 1 || count < 1) {
    return null;
  }

  const positions: { x: number; y: number }[] = [];
  let colorIndex = 0;
  let beadCount = 0;
  const endPosition = startPosition + count;

  // Same reading order as TTS: bottom to top, left to right
  for (let y = 0; y < pattern.height; y++) {
    for (let x = 0; x < pattern.width; x++) {
      if (isPositionInWedge(pattern, x, y)) {
        const cellColorIndex = pattern.field[y * pattern.width + x];

        // Skip cells with SKIP_COLOR_INDEX - they are not counted in TTS positions
        if (cellColorIndex === SKIP_COLOR_INDEX) {
          continue;
        }

        beadCount++;
        if (beadCount >= startPosition && beadCount < endPosition) {
          positions.push({ x, y });
          // Get color index from first valid position
          if (positions.length === 1) {
            colorIndex = cellColorIndex;
          }
        }
        // Early exit when we've found all needed positions
        if (beadCount >= endPosition - 1) {
          return positions.length > 0 ? { positions, colorIndex } : null;
        }
      }
    }
  }

  return positions.length > 0 ? { positions, colorIndex } : null;
}

/**
 * Convert ball pattern to DTO for serialization
 */
export function ballPatternToDto(pattern: BallPattern): BallPatternDto {
  // Convert Uint8Array to base64
  const fieldBase64 = btoa(String.fromCharCode.apply(null, Array.from(pattern.field)));

  return {
    id: pattern.id,
    name: pattern.name,
    author: pattern.author,
    notes: pattern.notes,
    type: 'ball',
    diameter: pattern.diameter,
    circumference: pattern.circumference,
    wedgeBase: pattern.wedgeBase,
    wedgeHeight: pattern.wedgeHeight,
    width: pattern.width,
    height: pattern.height,
    field: fieldBase64,
    colors: pattern.colors,
    createdAt: pattern.createdAt.toISOString(),
    updatedAt: pattern.updatedAt.toISOString(),
    isPublic: pattern.isPublic,
    price: pattern.price,
    previewUrl: pattern.previewUrl,
  };
}

/**
 * Convert DTO back to ball pattern
 */
export function dtoToBallPattern(dto: BallPatternDto): BallPattern {
  // Convert base64 to Uint8Array
  const binaryString = atob(dto.field);
  const field = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    field[i] = binaryString.charCodeAt(i);
  }

  return {
    id: dto.id,
    name: dto.name,
    author: dto.author,
    notes: dto.notes,
    type: 'ball',
    diameter: dto.diameter,
    circumference: dto.circumference,
    wedgeBase: dto.wedgeBase,
    wedgeHeight: dto.wedgeHeight,
    width: dto.width,
    height: dto.height,
    field,
    colors: dto.colors,
    createdAt: new Date(dto.createdAt),
    updatedAt: new Date(dto.updatedAt),
    isPublic: dto.isPublic,
    price: dto.price,
    previewUrl: dto.previewUrl,
  };
}

/**
 * Copy a single wedge to another position
 * Useful for creating symmetric patterns
 */
export function copyWedge(
  pattern: BallPattern,
  sourceWedgeIndex: number,
  targetWedgeIndex: number
): boolean {
  const sourceWedge = getWedgeByIndex(pattern, sourceWedgeIndex);
  const targetWedge = getWedgeByIndex(pattern, targetWedgeIndex);

  if (!sourceWedge || !targetWedge) return false;

  const { wedgeBase, wedgeHeight } = pattern;

  // Copy bead by bead
  for (let localRow = 0; localRow < wedgeHeight; localRow++) {
    const rowWidth = getWedgeWidthAtRow(wedgeBase, wedgeHeight, localRow);
    const rowOffset = getWedgeRowOffset(wedgeBase, wedgeHeight, localRow);

    for (let localX = 0; localX < rowWidth; localX++) {
      // Calculate global positions
      const sourceY = sourceWedge.position === 'top'
        ? sourceWedge.startY + localRow
        : (wedgeHeight - 1) - localRow;
      const sourceX = sourceWedge.startX + rowOffset + localX;

      const targetY = targetWedge.position === 'top'
        ? targetWedge.startY + localRow
        : (wedgeHeight - 1) - localRow;
      const targetX = targetWedge.startX + rowOffset + localX;

      const colorIndex = pattern.field[sourceY * pattern.width + sourceX];
      pattern.field[targetY * pattern.width + targetX] = colorIndex;
    }
  }

  pattern.updatedAt = new Date();
  return true;
}

/**
 * Copy pattern from one wedge to all other wedges of the same orientation
 * (e.g., copy top wedge 0 to top wedges 1-5)
 */
export function copyWedgeToAll(
  pattern: BallPattern,
  sourceWedgeIndex: number,
  sameOrientationOnly: boolean = true
): boolean {
  const sourceWedge = getWedgeByIndex(pattern, sourceWedgeIndex);
  if (!sourceWedge) return false;

  const startIndex = sameOrientationOnly
    ? (sourceWedge.position === 'top' ? 0 : 6)
    : 0;
  const endIndex = sameOrientationOnly
    ? (sourceWedge.position === 'top' ? 6 : 12)
    : 12;

  for (let i = startIndex; i < endIndex; i++) {
    if (i !== sourceWedgeIndex) {
      copyWedge(pattern, sourceWedgeIndex, i);
    }
  }

  return true;
}

/**
 * Mirror a wedge horizontally (useful for symmetric designs)
 */
export function mirrorWedgeHorizontally(
  pattern: BallPattern,
  wedgeIndex: number
): boolean {
  const wedge = getWedgeByIndex(pattern, wedgeIndex);
  if (!wedge) return false;

  const { wedgeBase, wedgeHeight } = pattern;

  for (let localRow = 0; localRow < wedgeHeight; localRow++) {
    const rowWidth = getWedgeWidthAtRow(wedgeBase, wedgeHeight, localRow);
    const rowOffset = getWedgeRowOffset(wedgeBase, wedgeHeight, localRow);

    const globalY = wedge.position === 'top'
      ? wedge.startY + localRow
      : (wedgeHeight - 1) - localRow;

    // Swap beads from left and right of this row
    for (let i = 0; i < Math.floor(rowWidth / 2); i++) {
      const leftX = wedge.startX + rowOffset + i;
      const rightX = wedge.startX + rowOffset + rowWidth - 1 - i;

      const leftColor = pattern.field[globalY * pattern.width + leftX];
      const rightColor = pattern.field[globalY * pattern.width + rightX];

      pattern.field[globalY * pattern.width + leftX] = rightColor;
      pattern.field[globalY * pattern.width + rightX] = leftColor;
    }
  }

  pattern.updatedAt = new Date();
  return true;
}
