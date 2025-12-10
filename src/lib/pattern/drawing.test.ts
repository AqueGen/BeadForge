import { describe, it, expect } from 'vitest';
import {
  floodFill,
  drawLine,
  drawRectangle,
  copyRegion,
  pasteSelection,
  isInSelection,
} from './drawing';
import { createPattern, getBead, setBead, setBeads } from './pattern';

describe('drawing', () => {
  describe('floodFill', () => {
    it('should fill connected region', () => {
      const pattern = createPattern(5, 5);
      // Create a 3x3 area of color 0 surrounded by pattern edges

      const filled = floodFill(pattern, 2, 2, 3);

      // Should fill all connected zeros
      expect(getBead(filled, 2, 2)).toBe(3);
      expect(getBead(filled, 0, 0)).toBe(3);
      expect(getBead(filled, 4, 4)).toBe(3);
    });

    it('should not fill if target color equals new color', () => {
      let pattern = createPattern(3, 3);
      pattern = setBead(pattern, 1, 1, 5);

      const filled = floodFill(pattern, 1, 1, 5);

      expect(filled).toBe(pattern);
    });

    it('should respect boundaries', () => {
      let pattern = createPattern(5, 5);
      // Create a border of color 1
      for (let x = 0; x < 5; x++) {
        pattern = setBead(pattern, x, 2, 1);
      }

      // Fill bottom half
      const filled = floodFill(pattern, 2, 0, 3);

      // Top of border should still be 0
      expect(getBead(filled, 2, 3)).toBe(0);
      // Bottom should be filled
      expect(getBead(filled, 2, 1)).toBe(3);
    });
  });

  describe('drawLine', () => {
    it('should draw horizontal line', () => {
      const pattern = createPattern(5, 5);
      const drawn = drawLine(pattern, 0, 2, 4, 2, 5);

      for (let x = 0; x <= 4; x++) {
        expect(getBead(drawn, x, 2)).toBe(5);
      }
    });

    it('should draw vertical line', () => {
      const pattern = createPattern(5, 5);
      const drawn = drawLine(pattern, 2, 0, 2, 4, 5);

      for (let y = 0; y <= 4; y++) {
        expect(getBead(drawn, 2, y)).toBe(5);
      }
    });

    it('should draw diagonal line', () => {
      const pattern = createPattern(5, 5);
      const drawn = drawLine(pattern, 0, 0, 4, 4, 5);

      // Check some points on the diagonal
      expect(getBead(drawn, 0, 0)).toBe(5);
      expect(getBead(drawn, 2, 2)).toBe(5);
      expect(getBead(drawn, 4, 4)).toBe(5);
    });

    it('should handle single point line', () => {
      const pattern = createPattern(5, 5);
      const drawn = drawLine(pattern, 2, 2, 2, 2, 5);

      expect(getBead(drawn, 2, 2)).toBe(5);
    });
  });

  describe('drawRectangle', () => {
    it('should draw filled rectangle', () => {
      const pattern = createPattern(5, 5);
      const drawn = drawRectangle(pattern, 1, 1, 3, 3, 5, true);

      // Check all points in rectangle are filled
      for (let y = 1; y <= 3; y++) {
        for (let x = 1; x <= 3; x++) {
          expect(getBead(drawn, x, y)).toBe(5);
        }
      }

      // Check outside is not filled
      expect(getBead(drawn, 0, 0)).toBe(0);
      expect(getBead(drawn, 4, 4)).toBe(0);
    });

    it('should draw outline rectangle', () => {
      const pattern = createPattern(5, 5);
      const drawn = drawRectangle(pattern, 1, 1, 3, 3, 5, false);

      // Check border is filled
      expect(getBead(drawn, 1, 1)).toBe(5);
      expect(getBead(drawn, 3, 1)).toBe(5);
      expect(getBead(drawn, 1, 3)).toBe(5);
      expect(getBead(drawn, 3, 3)).toBe(5);

      // Check center is not filled
      expect(getBead(drawn, 2, 2)).toBe(0);
    });

    it('should handle reversed coordinates', () => {
      const pattern = createPattern(5, 5);
      const drawn = drawRectangle(pattern, 3, 3, 1, 1, 5, true);

      // Should normalize coordinates
      expect(getBead(drawn, 2, 2)).toBe(5);
    });
  });

  describe('copyRegion / pasteSelection', () => {
    it('should copy region correctly', () => {
      let pattern = createPattern(5, 5);
      pattern = setBeads(pattern, [
        { x: 1, y: 1, colorIndex: 1 },
        { x: 2, y: 1, colorIndex: 2 },
        { x: 1, y: 2, colorIndex: 3 },
        { x: 2, y: 2, colorIndex: 4 },
      ]);

      const selection = copyRegion(pattern, 1, 1, 2, 2);

      expect(selection.x).toBe(1);
      expect(selection.y).toBe(1);
      expect(selection.width).toBe(2);
      expect(selection.height).toBe(2);
      expect(selection.data).toBeDefined();
      expect(selection.data![0]).toBe(1);
      expect(selection.data![1]).toBe(2);
      expect(selection.data![2]).toBe(3);
      expect(selection.data![3]).toBe(4);
    });

    it('should paste selection correctly', () => {
      let pattern = createPattern(5, 5);
      pattern = setBeads(pattern, [
        { x: 0, y: 0, colorIndex: 1 },
        { x: 1, y: 0, colorIndex: 2 },
      ]);

      const selection = copyRegion(pattern, 0, 0, 2, 1);
      const pasted = pasteSelection(pattern, selection, 3, 3);

      expect(getBead(pasted, 3, 3)).toBe(1);
      expect(getBead(pasted, 4, 3)).toBe(2);
    });

    it('should handle empty selection', () => {
      const pattern = createPattern(5, 5);
      const emptySelection = { x: 0, y: 0, width: 0, height: 0 };

      const result = pasteSelection(pattern, emptySelection, 2, 2);

      expect(result).toBe(pattern);
    });
  });

  describe('isInSelection', () => {
    it('should return true for points inside selection', () => {
      const selection = { x: 1, y: 1, width: 3, height: 3 };

      expect(isInSelection(selection, 1, 1)).toBe(true);
      expect(isInSelection(selection, 2, 2)).toBe(true);
      expect(isInSelection(selection, 3, 3)).toBe(true);
    });

    it('should return false for points outside selection', () => {
      const selection = { x: 1, y: 1, width: 3, height: 3 };

      expect(isInSelection(selection, 0, 0)).toBe(false);
      expect(isInSelection(selection, 4, 4)).toBe(false);
      expect(isInSelection(selection, 1, 4)).toBe(false);
    });

    it('should handle boundary correctly (exclusive end)', () => {
      const selection = { x: 0, y: 0, width: 2, height: 2 };

      expect(isInSelection(selection, 0, 0)).toBe(true);
      expect(isInSelection(selection, 1, 1)).toBe(true);
      expect(isInSelection(selection, 2, 0)).toBe(false);
      expect(isInSelection(selection, 0, 2)).toBe(false);
    });
  });
});
