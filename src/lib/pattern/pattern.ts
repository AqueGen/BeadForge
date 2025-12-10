import type { BeadPattern, BeadColor, BeadPatternDto } from '@/types';
import { DEFAULT_COLORS } from '@/types';
import { generateId, uint8ArrayToBase64, base64ToUint8Array, clamp } from '@/lib/utils';

/**
 * Create a new empty pattern
 */
export function createPattern(
  width: number = 8,
  height: number = 100,
  name: string = 'Untitled'
): BeadPattern {
  const clampedWidth = clamp(width, 3, 50);
  const clampedHeight = clamp(height, 1, 1000);

  return {
    id: generateId(),
    name,
    width: clampedWidth,
    height: clampedHeight,
    field: new Uint8Array(clampedWidth * clampedHeight),
    colors: [...DEFAULT_COLORS],
    createdAt: new Date(),
    updatedAt: new Date(),
    isPublic: false,
  };
}

/**
 * Get bead color index at position
 */
export function getBead(pattern: BeadPattern, x: number, y: number): number {
  if (x < 0 || x >= pattern.width || y < 0 || y >= pattern.height) {
    return 0;
  }
  return pattern.field[y * pattern.width + x];
}

/**
 * Set bead color index at position (returns new pattern)
 */
export function setBead(
  pattern: BeadPattern,
  x: number,
  y: number,
  colorIndex: number
): BeadPattern {
  if (x < 0 || x >= pattern.width || y < 0 || y >= pattern.height) {
    return pattern;
  }

  const newField = new Uint8Array(pattern.field);
  newField[y * pattern.width + x] = colorIndex;

  return {
    ...pattern,
    field: newField,
    updatedAt: new Date(),
  };
}

/**
 * Set multiple beads at once (returns new pattern)
 */
export function setBeads(
  pattern: BeadPattern,
  beads: Array<{ x: number; y: number; colorIndex: number }>
): BeadPattern {
  const newField = new Uint8Array(pattern.field);

  for (const bead of beads) {
    if (bead.x >= 0 && bead.x < pattern.width && bead.y >= 0 && bead.y < pattern.height) {
      newField[bead.y * pattern.width + bead.x] = bead.colorIndex;
    }
  }

  return {
    ...pattern,
    field: newField,
    updatedAt: new Date(),
  };
}

/**
 * Clear pattern to specified color
 */
export function clearPattern(pattern: BeadPattern, colorIndex: number = 0): BeadPattern {
  const newField = new Uint8Array(pattern.width * pattern.height);
  newField.fill(colorIndex);

  return {
    ...pattern,
    field: newField,
    updatedAt: new Date(),
  };
}

/**
 * Resize pattern (preserving existing data)
 */
export function resizePattern(
  pattern: BeadPattern,
  newWidth: number,
  newHeight: number
): BeadPattern {
  const clampedWidth = clamp(newWidth, 3, 50);
  const clampedHeight = clamp(newHeight, 1, 1000);

  const newField = new Uint8Array(clampedWidth * clampedHeight);
  const copyWidth = Math.min(pattern.width, clampedWidth);
  const copyHeight = Math.min(pattern.height, clampedHeight);

  for (let y = 0; y < copyHeight; y++) {
    for (let x = 0; x < copyWidth; x++) {
      newField[y * clampedWidth + x] = pattern.field[y * pattern.width + x];
    }
  }

  return {
    ...pattern,
    width: clampedWidth,
    height: clampedHeight,
    field: newField,
    updatedAt: new Date(),
  };
}

/**
 * Mirror pattern horizontally
 */
export function mirrorHorizontal(pattern: BeadPattern): BeadPattern {
  const newField = new Uint8Array(pattern.field);

  for (let y = 0; y < pattern.height; y++) {
    for (let x = 0; x < Math.floor(pattern.width / 2); x++) {
      const left = y * pattern.width + x;
      const right = y * pattern.width + (pattern.width - 1 - x);
      [newField[left], newField[right]] = [newField[right], newField[left]];
    }
  }

  return {
    ...pattern,
    field: newField,
    updatedAt: new Date(),
  };
}

/**
 * Mirror pattern vertically
 */
export function mirrorVertical(pattern: BeadPattern): BeadPattern {
  const newField = new Uint8Array(pattern.field);

  for (let y = 0; y < Math.floor(pattern.height / 2); y++) {
    for (let x = 0; x < pattern.width; x++) {
      const top = y * pattern.width + x;
      const bottom = (pattern.height - 1 - y) * pattern.width + x;
      [newField[top], newField[bottom]] = [newField[bottom], newField[top]];
    }
  }

  return {
    ...pattern,
    field: newField,
    updatedAt: new Date(),
  };
}

/**
 * Get the actual height used (non-empty rows from bottom)
 */
export function getUsedHeight(pattern: BeadPattern): number {
  for (let y = pattern.height - 1; y >= 0; y--) {
    for (let x = 0; x < pattern.width; x++) {
      if (pattern.field[y * pattern.width + x] !== 0) {
        return y + 1;
      }
    }
  }
  return 0;
}

/**
 * Convert pattern to DTO for serialization
 */
export function patternToDto(pattern: BeadPattern): BeadPatternDto {
  return {
    id: pattern.id,
    name: pattern.name,
    author: pattern.author,
    notes: pattern.notes,
    width: pattern.width,
    height: pattern.height,
    field: uint8ArrayToBase64(pattern.field),
    colors: pattern.colors,
    createdAt: pattern.createdAt.toISOString(),
    updatedAt: pattern.updatedAt.toISOString(),
    isPublic: pattern.isPublic,
    price: pattern.price,
    previewUrl: pattern.previewUrl,
  };
}

/**
 * Convert DTO to pattern
 */
export function dtoToPattern(dto: BeadPatternDto): BeadPattern {
  return {
    id: dto.id,
    name: dto.name,
    author: dto.author,
    notes: dto.notes,
    width: dto.width,
    height: dto.height,
    field: base64ToUint8Array(dto.field),
    colors: dto.colors,
    createdAt: new Date(dto.createdAt),
    updatedAt: new Date(dto.updatedAt),
    isPublic: dto.isPublic,
    price: dto.price,
    previewUrl: dto.previewUrl,
  };
}

/**
 * Update pattern colors
 */
export function updateColors(pattern: BeadPattern, colors: BeadColor[]): BeadPattern {
  return {
    ...pattern,
    colors: [...colors],
    updatedAt: new Date(),
  };
}
