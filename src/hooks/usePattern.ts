'use client';

import { useState, useCallback, useMemo } from 'react';
import type { BeadPattern, PatternStats } from '@/types';
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
  };
}

export function usePattern(
  initialWidth: number = 8,
  initialHeight: number = 100
): UsePatternReturn {
  const [pattern, setPattern] = useState<BeadPattern>(() =>
    createPattern(initialWidth, initialHeight)
  );

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
  }, []);

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
    }),
    [setBead, floodFill, clear, mirrorH, mirrorV, save, load, loadSample, reset, getStats, saveJBB, loadJBBFile]
  );

  return { pattern, actions };
}
