'use client';

import { useState, useCallback, useMemo } from 'react';
import type { BallPattern } from '@/types';
import {
  createBallPattern,
  setBallPatternBead,
  countBallBeadsByColor,
  countBallPatternBeads,
  ballPatternToDto,
  dtoToBallPattern,
  copyWedge,
  copyWedgeToAll,
  mirrorWedgeHorizontally,
  loadJBBBall,
} from '@/lib/pattern';
import { floodFillBallPattern } from '@/lib/pattern/ballDrawing';

export interface BallPatternStats {
  diameter: number;
  circumference: number;
  wedgeBase: number;
  wedgeHeight: number;
  totalBeads: number;
  beadCounts: Map<number, number>;
}

export interface UseBallPatternReturn {
  pattern: BallPattern | null;
  actions: {
    setBead: (x: number, y: number, colorIndex: number) => void;
    floodFill: (x: number, y: number, colorIndex: number) => void;
    clear: (colorIndex?: number) => void;
    copyWedge: (sourceIdx: number, targetIdx: number) => void;
    copyWedgeToAll: (sourceIdx: number, sameOrientation?: boolean) => void;
    mirrorWedge: (wedgeIdx: number) => void;
    save: () => void;
    load: (file: File) => Promise<void>;
    create: (diameter: number, name?: string) => void;
    getStats: () => BallPatternStats | null;
  };
}

export function useBallPattern(): UseBallPatternReturn {
  const [pattern, setPattern] = useState<BallPattern | null>(null);

  const create = useCallback((diameter: number, name?: string) => {
    const newPattern = createBallPattern(diameter, name);
    if (newPattern) {
      setPattern(newPattern);
    }
  }, []);

  const setBead = useCallback((x: number, y: number, colorIndex: number) => {
    setPattern((prev) => {
      if (!prev) return prev;
      const updated = { ...prev, field: new Uint8Array(prev.field) };
      setBallPatternBead(updated, x, y, colorIndex);
      return updated;
    });
  }, []);

  const floodFill = useCallback((x: number, y: number, colorIndex: number) => {
    setPattern((prev) => {
      if (!prev) return prev;
      return floodFillBallPattern(prev, x, y, colorIndex);
    });
  }, []);

  const clear = useCallback((colorIndex: number = 0) => {
    setPattern((prev) => {
      if (!prev) return prev;
      const newField = new Uint8Array(prev.width * prev.height);
      newField.fill(colorIndex);
      return { ...prev, field: newField, updatedAt: new Date() };
    });
  }, []);

  const handleCopyWedge = useCallback((sourceIdx: number, targetIdx: number) => {
    setPattern((prev) => {
      if (!prev) return prev;
      const updated = { ...prev, field: new Uint8Array(prev.field) };
      copyWedge(updated, sourceIdx, targetIdx);
      return updated;
    });
  }, []);

  const handleCopyWedgeToAll = useCallback((sourceIdx: number, sameOrientation: boolean = true) => {
    setPattern((prev) => {
      if (!prev) return prev;
      const updated = { ...prev, field: new Uint8Array(prev.field) };
      copyWedgeToAll(updated, sourceIdx, sameOrientation);
      return updated;
    });
  }, []);

  const handleMirrorWedge = useCallback((wedgeIdx: number) => {
    setPattern((prev) => {
      if (!prev) return prev;
      const updated = { ...prev, field: new Uint8Array(prev.field) };
      mirrorWedgeHorizontally(updated, wedgeIdx);
      return updated;
    });
  }, []);

  const save = useCallback(() => {
    if (!pattern) return;

    const dto = ballPatternToDto(pattern);
    const blob = new Blob([JSON.stringify(dto, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `${pattern.name || 'ball-pattern'}.beadforge`;
    a.click();

    URL.revokeObjectURL(url);
  }, [pattern]);

  const load = useCallback(async (file: File) => {
    const text = await file.text();
    const filename = file.name.toLowerCase();

    // Handle JBB files (JBead format)
    if (filename.endsWith('.jbb')) {
      const loaded = loadJBBBall(text, file.name);
      setPattern(loaded);
      return;
    }

    // Handle BeadForge JSON format
    const dto = JSON.parse(text);

    if (dto.type !== 'ball') {
      throw new Error('Not a ball pattern file');
    }

    const loaded = dtoToBallPattern(dto);
    setPattern(loaded);
  }, []);

  const getStats = useCallback((): BallPatternStats | null => {
    if (!pattern) return null;

    return {
      diameter: pattern.diameter,
      circumference: pattern.circumference,
      wedgeBase: pattern.wedgeBase,
      wedgeHeight: pattern.wedgeHeight,
      totalBeads: countBallPatternBeads(pattern),
      beadCounts: countBallBeadsByColor(pattern),
    };
  }, [pattern]);

  const actions = useMemo(
    () => ({
      setBead,
      floodFill,
      clear,
      copyWedge: handleCopyWedge,
      copyWedgeToAll: handleCopyWedgeToAll,
      mirrorWedge: handleMirrorWedge,
      save,
      load,
      create,
      getStats,
    }),
    [
      setBead,
      floodFill,
      clear,
      handleCopyWedge,
      handleCopyWedgeToAll,
      handleMirrorWedge,
      save,
      load,
      create,
      getStats,
    ]
  );

  return { pattern, actions };
}
