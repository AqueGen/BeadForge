import { describe, it, expect, beforeEach } from 'vitest';
import {
  createPattern,
  getBead,
  setBead,
  setBeads,
  clearPattern,
  resizePattern,
  mirrorHorizontal,
  mirrorVertical,
  getUsedHeight,
  patternToDto,
  dtoToPattern,
} from './pattern';
import type { BeadPattern } from '@/types';

describe('pattern', () => {
  describe('createPattern', () => {
    it('should create a pattern with default values', () => {
      const pattern = createPattern();

      expect(pattern.width).toBe(8);
      expect(pattern.height).toBe(100);
      expect(pattern.name).toBe('Untitled');
      expect(pattern.field.length).toBe(800);
      expect(pattern.colors.length).toBeGreaterThan(0);
    });

    it('should create a pattern with custom size', () => {
      const pattern = createPattern(10, 50, 'Test Pattern');

      expect(pattern.width).toBe(10);
      expect(pattern.height).toBe(50);
      expect(pattern.name).toBe('Test Pattern');
      expect(pattern.field.length).toBe(500);
    });

    it('should clamp width to valid range', () => {
      const tooSmall = createPattern(1, 100);
      const tooLarge = createPattern(100, 100);

      expect(tooSmall.width).toBe(3);
      expect(tooLarge.width).toBe(50);
    });

    it('should clamp height to valid range', () => {
      const tooSmall = createPattern(8, 0);
      const tooLarge = createPattern(8, 2000);

      expect(tooSmall.height).toBe(1);
      expect(tooLarge.height).toBe(1000);
    });

    it('should initialize field with zeros', () => {
      const pattern = createPattern(5, 5);

      for (let i = 0; i < pattern.field.length; i++) {
        expect(pattern.field[i]).toBe(0);
      }
    });
  });

  describe('getBead / setBead', () => {
    let pattern: BeadPattern;

    beforeEach(() => {
      pattern = createPattern(5, 5);
    });

    it('should get bead at valid position', () => {
      expect(getBead(pattern, 0, 0)).toBe(0);
    });

    it('should return 0 for out of bounds', () => {
      expect(getBead(pattern, -1, 0)).toBe(0);
      expect(getBead(pattern, 10, 0)).toBe(0);
      expect(getBead(pattern, 0, -1)).toBe(0);
      expect(getBead(pattern, 0, 10)).toBe(0);
    });

    it('should set bead at valid position', () => {
      const updated = setBead(pattern, 2, 3, 5);

      expect(getBead(updated, 2, 3)).toBe(5);
      // Original should be unchanged (immutable)
      expect(getBead(pattern, 2, 3)).toBe(0);
    });

    it('should not modify pattern for out of bounds set', () => {
      const updated = setBead(pattern, -1, 0, 5);

      expect(updated).toBe(pattern);
    });

    it('should update timestamp on set', () => {
      const before = pattern.updatedAt;
      const updated = setBead(pattern, 0, 0, 1);

      expect(updated.updatedAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
    });
  });

  describe('setBeads', () => {
    it('should set multiple beads at once', () => {
      const pattern = createPattern(5, 5);
      const updated = setBeads(pattern, [
        { x: 0, y: 0, colorIndex: 1 },
        { x: 1, y: 1, colorIndex: 2 },
        { x: 2, y: 2, colorIndex: 3 },
      ]);

      expect(getBead(updated, 0, 0)).toBe(1);
      expect(getBead(updated, 1, 1)).toBe(2);
      expect(getBead(updated, 2, 2)).toBe(3);
    });

    it('should skip invalid positions', () => {
      const pattern = createPattern(5, 5);
      const updated = setBeads(pattern, [
        { x: -1, y: 0, colorIndex: 1 },
        { x: 2, y: 2, colorIndex: 3 },
      ]);

      expect(getBead(updated, 2, 2)).toBe(3);
    });
  });

  describe('clearPattern', () => {
    it('should clear all beads to specified color', () => {
      let pattern = createPattern(5, 5);
      pattern = setBead(pattern, 2, 2, 5);

      const cleared = clearPattern(pattern, 1);

      for (let y = 0; y < 5; y++) {
        for (let x = 0; x < 5; x++) {
          expect(getBead(cleared, x, y)).toBe(1);
        }
      }
    });

    it('should clear to 0 by default', () => {
      let pattern = createPattern(3, 3);
      pattern = setBead(pattern, 1, 1, 5);

      const cleared = clearPattern(pattern);

      expect(getBead(cleared, 1, 1)).toBe(0);
    });
  });

  describe('resizePattern', () => {
    it('should preserve data when expanding', () => {
      let pattern = createPattern(3, 3);
      pattern = setBead(pattern, 1, 1, 5);

      const resized = resizePattern(pattern, 5, 5);

      expect(resized.width).toBe(5);
      expect(resized.height).toBe(5);
      expect(getBead(resized, 1, 1)).toBe(5);
    });

    it('should crop data when shrinking', () => {
      let pattern = createPattern(5, 5);
      pattern = setBead(pattern, 4, 4, 5);
      pattern = setBead(pattern, 1, 1, 3);

      const resized = resizePattern(pattern, 3, 3);

      expect(resized.width).toBe(3);
      expect(resized.height).toBe(3);
      expect(getBead(resized, 1, 1)).toBe(3);
      // Point (4, 4) should be gone
      expect(resized.field.length).toBe(9);
    });
  });

  describe('mirrorHorizontal', () => {
    it('should mirror pattern horizontally', () => {
      let pattern = createPattern(4, 2);
      // Set first column to 1, last column to 2
      pattern = setBead(pattern, 0, 0, 1);
      pattern = setBead(pattern, 0, 1, 1);
      pattern = setBead(pattern, 3, 0, 2);
      pattern = setBead(pattern, 3, 1, 2);

      const mirrored = mirrorHorizontal(pattern);

      expect(getBead(mirrored, 0, 0)).toBe(2);
      expect(getBead(mirrored, 3, 0)).toBe(1);
    });
  });

  describe('mirrorVertical', () => {
    it('should mirror pattern vertically', () => {
      let pattern = createPattern(2, 4);
      // Set first row to 1, last row to 2
      pattern = setBead(pattern, 0, 0, 1);
      pattern = setBead(pattern, 1, 0, 1);
      pattern = setBead(pattern, 0, 3, 2);
      pattern = setBead(pattern, 1, 3, 2);

      const mirrored = mirrorVertical(pattern);

      expect(getBead(mirrored, 0, 0)).toBe(2);
      expect(getBead(mirrored, 0, 3)).toBe(1);
    });
  });

  describe('getUsedHeight', () => {
    it('should return 0 for empty pattern', () => {
      const pattern = createPattern(5, 10);

      expect(getUsedHeight(pattern)).toBe(0);
    });

    it('should return correct height for pattern with data', () => {
      let pattern = createPattern(5, 10);
      pattern = setBead(pattern, 2, 5, 1);

      expect(getUsedHeight(pattern)).toBe(6);
    });

    it('should find highest non-zero row', () => {
      let pattern = createPattern(5, 10);
      pattern = setBead(pattern, 0, 2, 1);
      pattern = setBead(pattern, 4, 7, 1);

      expect(getUsedHeight(pattern)).toBe(8);
    });
  });

  describe('patternToDto / dtoToPattern', () => {
    it('should serialize and deserialize pattern', () => {
      let pattern = createPattern(5, 5, 'Test');
      pattern = setBead(pattern, 2, 2, 3);

      const dto = patternToDto(pattern);
      const restored = dtoToPattern(dto);

      expect(restored.id).toBe(pattern.id);
      expect(restored.name).toBe(pattern.name);
      expect(restored.width).toBe(pattern.width);
      expect(restored.height).toBe(pattern.height);
      expect(getBead(restored, 2, 2)).toBe(3);
    });

    it('should convert dates properly', () => {
      const pattern = createPattern();
      const dto = patternToDto(pattern);

      expect(typeof dto.createdAt).toBe('string');
      expect(typeof dto.updatedAt).toBe('string');

      const restored = dtoToPattern(dto);

      expect(restored.createdAt).toBeInstanceOf(Date);
      expect(restored.updatedAt).toBeInstanceOf(Date);
    });
  });
});
