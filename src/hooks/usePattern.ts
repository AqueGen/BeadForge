'use client';

import { useState, useCallback, useMemo, useEffect } from 'react';
import type { BeadPattern, PatternStats, BeadColor } from '@/types';
import { EMPTY_COLOR_INDEX } from '@/types';
import {
  createPattern,
  setBead as setBeadFn,
  clearPattern,
  mirrorHorizontal,
  mirrorVertical,
  patternToDto,
  dtoToPattern,
  getPatternStats,
  getSamplePattern,
  loadJBB,
  downloadJBB,
} from '@/lib/pattern';
import { floodFill as floodFillFn } from '@/lib/pattern';

const STORAGE_KEY = 'beadforge_pattern';

export interface UsePatternReturn {
  pattern: BeadPattern;
  actions: {
    setBead: (x: number, y: number, colorIndex: number) => void;
    floodFill: (x: number, y: number, colorIndex: number) => void;
    clear: (colorIndex?: number) => void;
    mirrorHorizontal: () => void;
    mirrorVertical: () => void;
    save: () => void;
    load: (file: File) => Promise<void>;
    loadSample: (sampleId: string) => void;
    reset: (width?: number, height?: number) => void;
    getStats: () => PatternStats;
    saveJBB: () => void;
    loadJBB: (file: File) => Promise<void>;
    addColor: (color: BeadColor) => number;
    removeColor: (colorIndex: number) => void;
    replaceColor: (fromColorIndex: number, toColorIndex: number) => void;
    countEmptyCells: () => number;
  };
}

// Helper to load pattern from localStorage
function loadFromStorage(): BeadPattern | null {
  if (typeof window === 'undefined') return null;
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const dto = JSON.parse(saved);
      return dtoToPattern(dto);
    }
  } catch (e) {
    console.error('Failed to load pattern from localStorage:', e);
  }
  return null;
}

// Helper to save pattern to localStorage
function saveToStorage(pattern: BeadPattern): void {
  if (typeof window === 'undefined') return;
  try {
    const dto = patternToDto(pattern);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(dto));
  } catch (e) {
    console.error('Failed to save pattern to localStorage:', e);
  }
}

export function usePattern(
  initialWidth: number = 8,
  initialHeight: number = 100
): UsePatternReturn {
  const [pattern, setPattern] = useState<BeadPattern>(() =>
    createPattern(initialWidth, initialHeight)
  );

  // Load from localStorage on mount
  useEffect(() => {
    const saved = loadFromStorage();
    if (saved) {
      setPattern(saved);
    }
  }, []);

  const setBead = useCallback((x: number, y: number, colorIndex: number) => {
    setPattern((prev) => setBeadFn(prev, x, y, colorIndex));
  }, []);

  const floodFill = useCallback((x: number, y: number, colorIndex: number) => {
    setPattern((prev) => floodFillFn(prev, x, y, colorIndex));
  }, []);

  const clear = useCallback((colorIndex: number = 0) => {
    setPattern((prev) => clearPattern(prev, colorIndex));
  }, []);

  const mirrorH = useCallback(() => {
    setPattern((prev) => mirrorHorizontal(prev));
  }, []);

  const mirrorV = useCallback(() => {
    setPattern((prev) => mirrorVertical(prev));
  }, []);

  const save = useCallback(() => {
    const dto = patternToDto(pattern);
    const blob = new Blob([JSON.stringify(dto, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `${pattern.name || 'pattern'}.beadforge`;
    a.click();

    URL.revokeObjectURL(url);
  }, [pattern]);

  const load = useCallback(async (file: File) => {
    const text = await file.text();
    const dto = JSON.parse(text);
    const loaded = dtoToPattern(dto);
    setPattern(loaded);
  }, []);

  const loadSample = useCallback((sampleId: string) => {
    const sample = getSamplePattern(sampleId);
    if (sample) {
      setPattern(sample);
    }
  }, []);

  const reset = useCallback((width: number = 8, height: number = 100) => {
    setPattern(createPattern(width, height));
  }, []);

  const getStats = useCallback(() => {
    return getPatternStats(pattern);
  }, [pattern]);

  const saveJBB = useCallback(() => {
    downloadJBB(pattern);
  }, [pattern]);

  const loadJBBFile = useCallback(async (file: File) => {
    const text = await file.text();
    const loaded = loadJBB(text, file.name.replace(/\.jbb$/i, ''));
    setPattern(loaded);
    // Save to localStorage for persistence
    saveToStorage(loaded);
  }, []);

  // Add a new color to the pattern palette, returns new color index
  const addColor = useCallback((color: BeadColor): number => {
    let newIndex = -1;
    setPattern((prev) => {
      newIndex = prev.colors.length;
      return {
        ...prev,
        colors: [...prev.colors, color],
      };
    });
    return newIndex;
  }, []);

  // Remove a color from the palette, setting all cells with that color to EMPTY_COLOR_INDEX
  const removeColor = useCallback((colorIndex: number) => {
    setPattern((prev) => {
      // Don't remove if it's the last color or invalid index
      if (colorIndex < 0 || colorIndex >= prev.colors.length || prev.colors.length <= 1) {
        return prev;
      }

      // Create new field with updated color indices
      const newField = new Uint8Array(prev.field.length);
      for (let i = 0; i < prev.field.length; i++) {
        const currentColor = prev.field[i];
        if (currentColor === colorIndex) {
          // This cell had the removed color - mark as empty
          newField[i] = EMPTY_COLOR_INDEX;
        } else if (currentColor > colorIndex && currentColor < EMPTY_COLOR_INDEX) {
          // Shift indices down for colors after the removed one
          newField[i] = currentColor - 1;
        } else {
          // Keep as is (including SKIP_COLOR_INDEX and EMPTY_COLOR_INDEX)
          newField[i] = currentColor;
        }
      }

      // Remove the color from palette
      const newColors = [...prev.colors];
      newColors.splice(colorIndex, 1);

      return {
        ...prev,
        field: newField,
        colors: newColors,
      };
    });
  }, []);

  // Replace all cells of one color with another color
  const replaceColor = useCallback((fromColorIndex: number, toColorIndex: number) => {
    setPattern((prev) => {
      if (fromColorIndex === toColorIndex) return prev;
      if (fromColorIndex < 0 || fromColorIndex >= prev.colors.length) return prev;
      if (toColorIndex < 0 || toColorIndex >= prev.colors.length) return prev;

      // Calculate adjusted target index (shifts down if target is after the removed color)
      const adjustedToIndex = toColorIndex > fromColorIndex ? toColorIndex - 1 : toColorIndex;

      // Create new field with replaced colors
      const newField = new Uint8Array(prev.field.length);
      for (let i = 0; i < prev.field.length; i++) {
        const currentColor = prev.field[i];
        if (currentColor === fromColorIndex) {
          // Replace with target color (already adjusted for index shift)
          newField[i] = adjustedToIndex;
        } else if (currentColor > fromColorIndex && currentColor < EMPTY_COLOR_INDEX) {
          // Shift indices down for colors after the removed one
          newField[i] = currentColor - 1;
        } else {
          // Keep as is (colors before removed, SKIP_COLOR_INDEX, EMPTY_COLOR_INDEX)
          newField[i] = currentColor;
        }
      }

      // Remove the "from" color from palette
      const newColors = [...prev.colors];
      newColors.splice(fromColorIndex, 1);

      return {
        ...prev,
        field: newField,
        colors: newColors,
      };
    });
  }, []);

  // Count cells with EMPTY_COLOR_INDEX
  const countEmptyCells = useCallback((): number => {
    let count = 0;
    for (let i = 0; i < pattern.field.length; i++) {
      if (pattern.field[i] === EMPTY_COLOR_INDEX) {
        count++;
      }
    }
    return count;
  }, [pattern.field]);

  const actions = useMemo(
    () => ({
      setBead,
      floodFill,
      clear,
      mirrorHorizontal: mirrorH,
      mirrorVertical: mirrorV,
      save,
      load,
      loadSample,
      reset,
      getStats,
      saveJBB,
      loadJBB: loadJBBFile,
      addColor,
      removeColor,
      replaceColor,
      countEmptyCells,
    }),
    [setBead, floodFill, clear, mirrorH, mirrorV, save, load, loadSample, reset, getStats, saveJBB, loadJBBFile, addColor, removeColor, replaceColor, countEmptyCells]
  );

  return { pattern, actions };
}
