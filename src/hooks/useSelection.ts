'use client';

import { useState, useCallback, useMemo } from 'react';
import type {
  Selection,
  SelectionClipboard,
  SelectionMode,
  BeadPattern,
  Point,
} from '@/types';
import { EMPTY_COLOR_INDEX } from '@/types';

export interface UseSelectionReturn {
  // State
  selection: Selection | null;
  clipboard: SelectionClipboard | null;
  selectionMode: SelectionMode;
  isSelecting: boolean;
  freeformPoints: Point[];
  pastePosition: Point | null;

  // Actions
  startSelection: (x: number, y: number) => void;
  updateSelection: (x: number, y: number) => void;
  endSelection: (pattern: BeadPattern) => void;
  clearSelection: () => void;
  setSelectionMode: (mode: SelectionMode) => void;

  // Freeform selection
  addFreeformPoint: (x: number, y: number) => void;
  closeFreeformSelection: (pattern: BeadPattern) => void;

  // Operations
  copy: (pattern: BeadPattern) => void;
  cut: (pattern: BeadPattern, setCell: (x: number, y: number, colorIndex: number) => void) => void;
  paste: (pattern: BeadPattern, setCell: (x: number, y: number, colorIndex: number) => void) => void;
  setPastePosition: (x: number, y: number) => void;
  flipHorizontal: () => void;
  flipVertical: () => void;
  rotate90: () => void;
  rotate180: () => void;

  // Utility
  hasClipboard: boolean;
  hasSelection: boolean;
}

export function useSelection(): UseSelectionReturn {
  const [selection, setSelection] = useState<Selection | null>(null);
  const [clipboard, setClipboard] = useState<SelectionClipboard | null>(null);
  const [selectionMode, setSelectionMode] = useState<SelectionMode>('rectangle');
  const [isSelecting, setIsSelecting] = useState(false);
  const [startPoint, setStartPoint] = useState<Point | null>(null);
  const [freeformPoints, setFreeformPoints] = useState<Point[]>([]);
  const [pastePosition, setPastePositionState] = useState<Point | null>(null);

  // Start rectangle selection
  const startSelection = useCallback((x: number, y: number) => {
    setStartPoint({ x, y });
    setIsSelecting(true);
    setSelection({
      x,
      y,
      width: 1,
      height: 1,
      mode: selectionMode,
    });
    if (selectionMode === 'freeform') {
      setFreeformPoints([{ x, y }]);
    }
  }, [selectionMode]);

  // Update selection during drag
  const updateSelection = useCallback((x: number, y: number) => {
    if (!isSelecting || !startPoint) return;

    if (selectionMode === 'rectangle') {
      const minX = Math.min(startPoint.x, x);
      const minY = Math.min(startPoint.y, y);
      const maxX = Math.max(startPoint.x, x);
      const maxY = Math.max(startPoint.y, y);

      setSelection({
        x: minX,
        y: minY,
        width: maxX - minX + 1,
        height: maxY - minY + 1,
        mode: 'rectangle',
      });
    }
  }, [isSelecting, startPoint, selectionMode]);

  // Add point to freeform selection
  const addFreeformPoint = useCallback((x: number, y: number) => {
    if (!isSelecting || selectionMode !== 'freeform') return;

    setFreeformPoints(prev => {
      // Avoid duplicates
      const last = prev[prev.length - 1];
      if (last && last.x === x && last.y === y) return prev;
      return [...prev, { x, y }];
    });
  }, [isSelecting, selectionMode]);

  // Create mask from freeform points using flood fill from polygon
  const createFreeformMask = useCallback((points: Point[], width: number, height: number): Uint8Array => {
    const mask = new Uint8Array(width * height);

    if (points.length < 3) return mask;

    // Simple polygon fill using scanline algorithm
    for (let y = 0; y < height; y++) {
      const intersections: number[] = [];

      for (let i = 0; i < points.length; i++) {
        const p1 = points[i];
        const p2 = points[(i + 1) % points.length];

        if ((p1.y <= y && p2.y > y) || (p2.y <= y && p1.y > y)) {
          const x = p1.x + (y - p1.y) / (p2.y - p1.y) * (p2.x - p1.x);
          intersections.push(x);
        }
      }

      intersections.sort((a, b) => a - b);

      for (let i = 0; i < intersections.length; i += 2) {
        if (i + 1 < intersections.length) {
          const xStart = Math.max(0, Math.ceil(intersections[i]));
          const xEnd = Math.min(width - 1, Math.floor(intersections[i + 1]));
          for (let x = xStart; x <= xEnd; x++) {
            mask[y * width + x] = 1;
          }
        }
      }
    }

    return mask;
  }, []);

  // End rectangle selection and capture data
  const endSelection = useCallback((pattern: BeadPattern) => {
    if (!selection) {
      setIsSelecting(false);
      return;
    }

    // Clamp selection to pattern bounds
    const x = Math.max(0, Math.min(selection.x, pattern.width - 1));
    const y = Math.max(0, Math.min(selection.y, pattern.height - 1));
    const width = Math.min(selection.width, pattern.width - x);
    const height = Math.min(selection.height, pattern.height - y);

    // Extract data from pattern
    const data = new Uint8Array(width * height);
    for (let dy = 0; dy < height; dy++) {
      for (let dx = 0; dx < width; dx++) {
        const patternIndex = (y + dy) * pattern.width + (x + dx);
        data[dy * width + dx] = pattern.field[patternIndex];
      }
    }

    setSelection({
      x,
      y,
      width,
      height,
      data,
      mode: 'rectangle',
    });
    setIsSelecting(false);
  }, [selection]);

  // Close freeform selection
  const closeFreeformSelection = useCallback((pattern: BeadPattern) => {
    if (freeformPoints.length < 3) {
      setIsSelecting(false);
      setFreeformPoints([]);
      setSelection(null);
      return;
    }

    // Calculate bounding box
    const minX = Math.max(0, Math.min(...freeformPoints.map(p => p.x)));
    const minY = Math.max(0, Math.min(...freeformPoints.map(p => p.y)));
    const maxX = Math.min(pattern.width - 1, Math.max(...freeformPoints.map(p => p.x)));
    const maxY = Math.min(pattern.height - 1, Math.max(...freeformPoints.map(p => p.y)));

    const width = maxX - minX + 1;
    const height = maxY - minY + 1;

    // Translate points to local coordinates
    const localPoints = freeformPoints.map(p => ({
      x: p.x - minX,
      y: p.y - minY,
    }));

    // Create mask
    const mask = createFreeformMask(localPoints, width, height);

    // Extract data
    const data = new Uint8Array(width * height);
    for (let dy = 0; dy < height; dy++) {
      for (let dx = 0; dx < width; dx++) {
        if (mask[dy * width + dx]) {
          const patternIndex = (minY + dy) * pattern.width + (minX + dx);
          data[dy * width + dx] = pattern.field[patternIndex];
        } else {
          data[dy * width + dx] = EMPTY_COLOR_INDEX;
        }
      }
    }

    setSelection({
      x: minX,
      y: minY,
      width,
      height,
      data,
      mask,
      mode: 'freeform',
    });
    setIsSelecting(false);
    setFreeformPoints([]);
  }, [freeformPoints, createFreeformMask]);

  // Clear selection
  const clearSelection = useCallback(() => {
    setSelection(null);
    setIsSelecting(false);
    setStartPoint(null);
    setFreeformPoints([]);
  }, []);

  // Copy selection to clipboard
  const copy = useCallback((_pattern: BeadPattern) => {
    if (!selection || !selection.data) return;

    setClipboard({
      width: selection.width,
      height: selection.height,
      data: new Uint8Array(selection.data),
      mask: selection.mask ? new Uint8Array(selection.mask) : undefined,
    });
  }, [selection]);

  // Cut selection (copy + clear original cells, but keep selection for paste position)
  const cut = useCallback((
    pattern: BeadPattern,
    setCell: (x: number, y: number, colorIndex: number) => void
  ) => {
    if (!selection || !selection.data) return;

    // Copy first
    copy(pattern);

    // Clear selected cells
    for (let dy = 0; dy < selection.height; dy++) {
      for (let dx = 0; dx < selection.width; dx++) {
        const shouldClear = selection.mask
          ? selection.mask[dy * selection.width + dx] === 1
          : true;

        if (shouldClear) {
          setCell(selection.x + dx, selection.y + dy, EMPTY_COLOR_INDEX);
        }
      }
    }

    // Don't clear selection - keep it for paste position reference
    // User can click "Скасувати виділення" to clear manually
  }, [selection, copy]);

  // Set paste position
  const setPastePosition = useCallback((x: number, y: number) => {
    setPastePositionState({ x, y });
  }, []);

  // Paste clipboard at position
  // Priority: pastePosition > selection position > (0, 0)
  const paste = useCallback((
    pattern: BeadPattern,
    setCell: (x: number, y: number, colorIndex: number) => void
  ) => {
    if (!clipboard) return;

    // Calculate paste position: use explicit pastePosition, or selection position, or (0, 0)
    const pasteX = pastePosition ? pastePosition.x : (selection ? selection.x : 0);
    const pasteY = pastePosition ? pastePosition.y : (selection ? selection.y : 0);

    for (let dy = 0; dy < clipboard.height; dy++) {
      for (let dx = 0; dx < clipboard.width; dx++) {
        const targetX = pasteX + dx;
        const targetY = pasteY + dy;

        // Check bounds
        if (targetX < 0 || targetX >= pattern.width || targetY < 0 || targetY >= pattern.height) {
          continue;
        }

        const shouldPaste = clipboard.mask
          ? clipboard.mask[dy * clipboard.width + dx] === 1
          : true;

        if (shouldPaste) {
          const colorIndex = clipboard.data[dy * clipboard.width + dx];
          if (colorIndex !== EMPTY_COLOR_INDEX) {
            setCell(targetX, targetY, colorIndex);
          }
        }
      }
    }

    // Clear paste position after pasting
    setPastePositionState(null);
  }, [clipboard, selection, pastePosition]);

  // Flip clipboard horizontally
  const flipHorizontal = useCallback(() => {
    if (!clipboard) return;

    const { width, height, data, mask } = clipboard;
    const newData = new Uint8Array(width * height);
    const newMask = mask ? new Uint8Array(width * height) : undefined;

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const srcIndex = y * width + x;
        const dstIndex = y * width + (width - 1 - x);
        newData[dstIndex] = data[srcIndex];
        if (newMask && mask) {
          newMask[dstIndex] = mask[srcIndex];
        }
      }
    }

    setClipboard({
      ...clipboard,
      data: newData,
      mask: newMask,
    });
  }, [clipboard]);

  // Flip clipboard vertically
  const flipVertical = useCallback(() => {
    if (!clipboard) return;

    const { width, height, data, mask } = clipboard;
    const newData = new Uint8Array(width * height);
    const newMask = mask ? new Uint8Array(width * height) : undefined;

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const srcIndex = y * width + x;
        const dstIndex = (height - 1 - y) * width + x;
        newData[dstIndex] = data[srcIndex];
        if (newMask && mask) {
          newMask[dstIndex] = mask[srcIndex];
        }
      }
    }

    setClipboard({
      ...clipboard,
      data: newData,
      mask: newMask,
    });
  }, [clipboard]);

  // Rotate clipboard 90 degrees clockwise
  const rotate90 = useCallback(() => {
    if (!clipboard) return;

    const { width, height, data, mask } = clipboard;
    const newWidth = height;
    const newHeight = width;
    const newData = new Uint8Array(newWidth * newHeight);
    const newMask = mask ? new Uint8Array(newWidth * newHeight) : undefined;

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const srcIndex = y * width + x;
        const newX = height - 1 - y;
        const newY = x;
        const dstIndex = newY * newWidth + newX;
        newData[dstIndex] = data[srcIndex];
        if (newMask && mask) {
          newMask[dstIndex] = mask[srcIndex];
        }
      }
    }

    setClipboard({
      width: newWidth,
      height: newHeight,
      data: newData,
      mask: newMask,
    });
  }, [clipboard]);

  // Rotate clipboard 180 degrees
  const rotate180 = useCallback(() => {
    if (!clipboard) return;

    const { width, height, data, mask } = clipboard;
    const newData = new Uint8Array(width * height);
    const newMask = mask ? new Uint8Array(width * height) : undefined;

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const srcIndex = y * width + x;
        const dstIndex = (height - 1 - y) * width + (width - 1 - x);
        newData[dstIndex] = data[srcIndex];
        if (newMask && mask) {
          newMask[dstIndex] = mask[srcIndex];
        }
      }
    }

    setClipboard({
      ...clipboard,
      data: newData,
      mask: newMask,
    });
  }, [clipboard]);

  const hasClipboard = useMemo(() => clipboard !== null, [clipboard]);
  const hasSelection = useMemo(() => selection !== null && !isSelecting, [selection, isSelecting]);

  return {
    selection,
    clipboard,
    selectionMode,
    isSelecting,
    freeformPoints,
    pastePosition,

    startSelection,
    updateSelection,
    endSelection,
    clearSelection,
    setSelectionMode,

    addFreeformPoint,
    closeFreeformSelection,

    copy,
    cut,
    paste,
    setPastePosition,
    flipHorizontal,
    flipVertical,
    rotate90,
    rotate180,

    hasClipboard,
    hasSelection,
  };
}
