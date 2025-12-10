import { describe, it, expect } from 'vitest';
import {
  correctPoint,
  calculateRepeat,
  countBeadsByColor,
  generateBeadList,
  calculateLength,
  calculateWeight,
  getPatternStats,
} from './calculations';
import { createPattern, setBead, setBeads } from './pattern';

describe('calculations', () => {
  describe('correctPoint', () => {
    it('should return same point at origin with no scroll', () => {
      const result = correctPoint(0, 0, 8, 0);

      expect(result.x).toBe(0);
      expect(result.y).toBe(0);
    });

    it('should handle coordinate correction for spiral pattern', () => {
      // Width = 8, first row has 8 beads
      // Testing that the algorithm handles the alternating row pattern
      const result1 = correctPoint(7, 0, 8, 0);
      expect(result1.x).toBe(7);
      expect(result1.y).toBe(0);

      // At x=8, y=0, we should be at the start of the next row
      // But since width is 8, x can't be 8, so test boundary
      const result2 = correctPoint(0, 1, 8, 0);
      // After 8 beads (row 0), we're in row 1
      expect(result2.y).toBeGreaterThanOrEqual(0);
    });

    it('should handle scroll offset', () => {
      // Scroll shifts the starting point in the calculation
      // When scroll is applied, y output is reduced by approximately scroll amount
      const result = correctPoint(0, 0, 8, 2);

      // With scroll=2 at origin, the effective y should be negative
      // because we're looking at earlier rows in the sequence
      expect(result.y).toBeLessThan(0);
    });
  });

  describe('calculateRepeat', () => {
    it('should return 0 for empty pattern', () => {
      const pattern = createPattern(5, 10);

      expect(calculateRepeat(pattern)).toBe(0);
    });

    it('should find simple repeat pattern', () => {
      let pattern = createPattern(4, 4);
      // Create a repeating pattern: 1,2,1,2,1,2...
      for (let i = 0; i < 16; i++) {
        const x = i % 4;
        const y = Math.floor(i / 4);
        pattern = setBead(pattern, x, y, (i % 2) + 1);
      }

      const repeat = calculateRepeat(pattern);

      expect(repeat).toBe(2);
    });

    it('should return total beads for non-repeating pattern', () => {
      let pattern = createPattern(3, 2);
      // All different colors
      pattern = setBeads(pattern, [
        { x: 0, y: 0, colorIndex: 1 },
        { x: 1, y: 0, colorIndex: 2 },
        { x: 2, y: 0, colorIndex: 3 },
        { x: 0, y: 1, colorIndex: 4 },
        { x: 1, y: 1, colorIndex: 5 },
        { x: 2, y: 1, colorIndex: 6 },
      ]);

      const repeat = calculateRepeat(pattern);

      expect(repeat).toBe(6);
    });
  });

  describe('countBeadsByColor', () => {
    it('should return empty map for empty pattern', () => {
      const pattern = createPattern(5, 5);
      const counts = countBeadsByColor(pattern);

      expect(counts.size).toBe(0);
    });

    it('should count beads correctly', () => {
      let pattern = createPattern(3, 3);
      pattern = setBeads(pattern, [
        { x: 0, y: 0, colorIndex: 1 },
        { x: 1, y: 0, colorIndex: 1 },
        { x: 2, y: 0, colorIndex: 2 },
        { x: 0, y: 1, colorIndex: 1 },
        { x: 1, y: 1, colorIndex: 3 },
      ]);

      const counts = countBeadsByColor(pattern);

      expect(counts.get(1)).toBe(3);
      expect(counts.get(2)).toBe(1);
      expect(counts.get(3)).toBe(1);
    });

    it('should only count used height', () => {
      let pattern = createPattern(3, 10);
      pattern = setBead(pattern, 0, 0, 1);
      pattern = setBead(pattern, 1, 0, 1);
      // Row 1+ is empty, should not count zeros

      const counts = countBeadsByColor(pattern);

      expect(counts.get(1)).toBe(2);
      expect(counts.get(0)).toBe(1); // Only 1 zero in row 0
    });
  });

  describe('generateBeadList', () => {
    it('should return empty list for empty pattern', () => {
      const pattern = createPattern(5, 5);
      const list = generateBeadList(pattern);

      expect(list).toHaveLength(0);
    });

    it('should generate runs correctly', () => {
      let pattern = createPattern(4, 1);
      // Pattern: 1, 1, 2, 2 (left to right)
      pattern = setBeads(pattern, [
        { x: 0, y: 0, colorIndex: 1 },
        { x: 1, y: 0, colorIndex: 1 },
        { x: 2, y: 0, colorIndex: 2 },
        { x: 3, y: 0, colorIndex: 2 },
      ]);

      const list = generateBeadList(pattern);

      // Left to right order: 1,1,2,2
      expect(list).toHaveLength(2);
      expect(list[0]).toEqual({ colorIndex: 1, count: 2 });
      expect(list[1]).toEqual({ colorIndex: 2, count: 2 });
    });

    it('should merge consecutive same colors', () => {
      let pattern = createPattern(3, 2);
      // All same color
      for (let y = 0; y < 2; y++) {
        for (let x = 0; x < 3; x++) {
          pattern = setBead(pattern, x, y, 5);
        }
      }

      const list = generateBeadList(pattern);

      expect(list).toHaveLength(1);
      expect(list[0]).toEqual({ colorIndex: 5, count: 6 });
    });
  });

  describe('calculateLength', () => {
    it('should return 0 for empty pattern', () => {
      const pattern = createPattern(8, 100);

      expect(calculateLength(pattern)).toBe(0);
    });

    it('should calculate length based on used height', () => {
      let pattern = createPattern(8, 100);
      pattern = setBead(pattern, 0, 9, 1); // Used height = 10

      const length = calculateLength(pattern, 2.5);

      // 10 rows * 2.5mm * 0.85 = 21.25mm
      expect(length).toBeCloseTo(21.25);
    });

    it('should use custom bead size', () => {
      let pattern = createPattern(8, 10);
      pattern = setBead(pattern, 0, 4, 1); // Used height = 5

      const length = calculateLength(pattern, 3.0);

      // 5 rows * 3.0mm * 0.85 = 12.75mm
      expect(length).toBeCloseTo(12.75);
    });
  });

  describe('calculateWeight', () => {
    it('should return 0 for empty pattern', () => {
      const pattern = createPattern(5, 5);

      expect(calculateWeight(pattern)).toBe(0);
    });

    it('should calculate weight based on bead count', () => {
      let pattern = createPattern(3, 2);
      // 6 beads filled
      for (let y = 0; y < 2; y++) {
        for (let x = 0; x < 3; x++) {
          pattern = setBead(pattern, x, y, 1);
        }
      }

      const weight = calculateWeight(pattern, 0.1);

      // 6 beads * 0.1g = 0.6g
      expect(weight).toBeCloseTo(0.6);
    });
  });

  describe('getPatternStats', () => {
    it('should return comprehensive statistics', () => {
      let pattern = createPattern(4, 5);
      pattern = setBeads(pattern, [
        { x: 0, y: 0, colorIndex: 1 },
        { x: 1, y: 0, colorIndex: 1 },
        { x: 2, y: 0, colorIndex: 2 },
        { x: 3, y: 0, colorIndex: 2 },
        { x: 0, y: 1, colorIndex: 1 },
        { x: 1, y: 1, colorIndex: 1 },
        { x: 2, y: 1, colorIndex: 2 },
        { x: 3, y: 1, colorIndex: 2 },
      ]);

      const stats = getPatternStats(pattern);

      expect(stats.width).toBe(4);
      expect(stats.height).toBe(5);
      expect(stats.usedHeight).toBe(2);
      expect(stats.totalBeads).toBe(8);
      expect(stats.beadCounts.get(1)).toBe(4);
      expect(stats.beadCounts.get(2)).toBe(4);
      expect(stats.estimatedLengthMm).toBeGreaterThan(0);
      expect(stats.estimatedWeightGrams).toBeGreaterThan(0);
    });
  });
});
