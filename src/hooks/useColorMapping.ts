/**
 * useColorMapping Hook
 *
 * Manages color mappings for TTS with localStorage persistence.
 * Handles auto-mapping on pattern load and user overrides.
 */

import { useState, useCallback, useEffect, useMemo } from 'react';
import type { BeadPattern } from '@/types';
import type {
  ColorMapping,
  ColorModifiers,
  PatternColorSettings,
  TTSMode,
} from '@/types/colorMapping';
import {
  createAutoMappings,
  areAllMappingsVoiced,
  VOICED_COLORS,
} from '@/lib/pattern';
import { SKIP_COLOR_INDEX } from '@/types';

// ============================================================
// localStorage Keys
// ============================================================

const STORAGE_KEY_PREFIX = 'beadforge_color_settings_';

function getStorageKey(patternId: string): string {
  return `${STORAGE_KEY_PREFIX}${patternId}`;
}

// ============================================================
// Storage Functions
// ============================================================

function saveToStorage(patternId: string, settings: PatternColorSettings): void {
  try {
    const key = getStorageKey(patternId);
    localStorage.setItem(key, JSON.stringify(settings));
  } catch (error) {
    console.error('Failed to save color settings:', error);
  }
}

function loadFromStorage(patternId: string): PatternColorSettings | null {
  try {
    const key = getStorageKey(patternId);
    const stored = localStorage.getItem(key);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.error('Failed to load color settings:', error);
  }
  return null;
}

// Storage clearing (reserved for future use)
// function clearStorage(patternId: string): void {
//   const key = getStorageKey(patternId);
//   localStorage.removeItem(key);
// }

// ============================================================
// Hook Interface
// ============================================================

export interface UseColorMappingResult {
  /** Current color mappings */
  mappings: ColorMapping[];
  /** TTS mode (colorOnly or full) */
  ttsMode: TTSMode;
  /** Whether all mappings are valid (have voices) */
  allMappingsValid: boolean;
  /** Whether there are any custom (non-auto) mappings */
  hasCustomMappings: boolean;
  /** Count of colors that need attention (unmapped) */
  unmappedCount: number;
  /** Total bead count (excluding skip color) */
  totalBeadCount: number;
  /** Update mapping for a specific color */
  updateMapping: (
    originalIndex: number,
    mappedColorIndex: number,
    modifiers: ColorModifiers
  ) => void;
  /** Reset a mapping to auto */
  resetToAuto: (originalIndex: number) => void;
  /** Reset all mappings to auto */
  resetAllToAuto: () => void;
  /** Set TTS mode */
  setTTSMode: (mode: TTSMode) => void;
  /** Get color count by original index */
  getColorCount: (originalIndex: number) => number;
  /** Initialize mappings for a pattern */
  initializeMappings: (pattern: BeadPattern) => void;
}

// ============================================================
// Hook Implementation
// ============================================================

export function useColorMapping(pattern: BeadPattern | null): UseColorMappingResult {
  const [mappings, setMappings] = useState<ColorMapping[]>([]);
  const [ttsMode, setTTSModeState] = useState<TTSMode>('full');
  const [colorCounts, setColorCounts] = useState<Map<number, number>>(new Map());

  // Calculate color counts from pattern
  const calculateColorCounts = useCallback((p: BeadPattern): Map<number, number> => {
    const counts = new Map<number, number>();
    for (let i = 0; i < p.field.length; i++) {
      const colorIndex = p.field[i];
      if (colorIndex !== SKIP_COLOR_INDEX) {
        counts.set(colorIndex, (counts.get(colorIndex) || 0) + 1);
      }
    }
    return counts;
  }, []);

  // Initialize mappings when pattern changes
  const initializeMappings = useCallback((p: BeadPattern) => {
    // Try to load from storage first
    const stored = loadFromStorage(p.id);

    if (stored && stored.mappings.length === p.colors.length) {
      // Validate stored mappings match current colors
      const valid = stored.mappings.every(
        (m, i) =>
          m.originalIndex === i &&
          m.originalColor.r === p.colors[i].r &&
          m.originalColor.g === p.colors[i].g &&
          m.originalColor.b === p.colors[i].b
      );

      if (valid) {
        setMappings(stored.mappings);
        setTTSModeState(stored.ttsMode);
        setColorCounts(calculateColorCounts(p));
        return;
      }
    }

    // Create auto mappings
    const autoMappings = createAutoMappings(p.colors);
    setMappings(autoMappings);
    setTTSModeState('full');
    setColorCounts(calculateColorCounts(p));

    // Save initial mappings
    saveToStorage(p.id, { mappings: autoMappings, ttsMode: 'full' });
  }, [calculateColorCounts]);

  // Initialize on pattern change
  useEffect(() => {
    if (pattern) {
      initializeMappings(pattern);
    } else {
      setMappings([]);
      setColorCounts(new Map());
    }
  }, [pattern?.id, pattern?.colors.length]);

  // Update a single mapping
  const updateMapping = useCallback(
    (originalIndex: number, mappedColorIndex: number, modifiers: ColorModifiers) => {
      if (!pattern) return;

      setMappings((prev) => {
        const updated = prev.map((m) =>
          m.originalIndex === originalIndex
            ? {
                ...m,
                mappedColorIndex,
                modifiers,
                isAutoMapped: false,
              }
            : m
        );

        // Save to storage
        saveToStorage(pattern.id, { mappings: updated, ttsMode });

        return updated;
      });
    },
    [pattern, ttsMode]
  );

  // Reset a single mapping to auto
  const resetToAuto = useCallback(
    (originalIndex: number) => {
      if (!pattern) return;

      const color = pattern.colors[originalIndex];
      if (!color) return;

      setMappings((prev) => {
        const autoMapping = createAutoMappings([color])[0];
        const updated = prev.map((m) =>
          m.originalIndex === originalIndex
            ? { ...autoMapping, originalIndex }
            : m
        );

        // Save to storage
        saveToStorage(pattern.id, { mappings: updated, ttsMode });

        return updated;
      });
    },
    [pattern, ttsMode]
  );

  // Reset all mappings to auto
  const resetAllToAuto = useCallback(() => {
    if (!pattern) return;

    const autoMappings = createAutoMappings(pattern.colors);
    setMappings(autoMappings);

    // Save to storage
    saveToStorage(pattern.id, { mappings: autoMappings, ttsMode });
  }, [pattern, ttsMode]);

  // Set TTS mode
  const setTTSMode = useCallback(
    (mode: TTSMode) => {
      setTTSModeState(mode);

      if (pattern) {
        saveToStorage(pattern.id, { mappings, ttsMode: mode });
      }
    },
    [pattern, mappings]
  );

  // Get color count
  const getColorCount = useCallback(
    (originalIndex: number): number => {
      return colorCounts.get(originalIndex) || 0;
    },
    [colorCounts]
  );

  // Computed values
  const allMappingsValid = useMemo(
    () => areAllMappingsVoiced(mappings),
    [mappings]
  );

  const hasCustomMappings = useMemo(
    () => mappings.some((m) => !m.isAutoMapped),
    [mappings]
  );

  const unmappedCount = useMemo(
    () =>
      mappings.filter(
        (m) =>
          m.mappedColorIndex < 0 || m.mappedColorIndex >= VOICED_COLORS.length
      ).length,
    [mappings]
  );

  const totalBeadCount = useMemo(() => {
    let total = 0;
    colorCounts.forEach((count) => {
      total += count;
    });
    return total;
  }, [colorCounts]);

  return {
    mappings,
    ttsMode,
    allMappingsValid,
    hasCustomMappings,
    unmappedCount,
    totalBeadCount,
    updateMapping,
    resetToAuto,
    resetAllToAuto,
    setTTSMode,
    getColorCount,
    initializeMappings,
  };
}
