'use client';

import { FC, useRef, useEffect, useState, useCallback } from 'react';
import type { BeadPattern, ViewType, HighlightedBeads } from '@/types';
import { SKIP_COLOR_INDEX, EMPTY_COLOR_INDEX } from '@/types';
import { colorToRgba } from '@/lib/utils';
import { positionToCoordinates, getUsedHeight } from '@/lib/pattern';

// Available brick offset values (matching reference site)
export const BRICK_OFFSET_VALUES = [
  -0.5, -0.1, 0.1, 0.12, 0.15, 0.17, 0.2, 0.22, 0.25, 0.27,
  0.3, 0.32, 0.35, 0.37, 0.4, 0.42, 0.45, 0.47, 0.5, 0.52,
  0.55, 0.57, 0.6, 0.62, 0.65, 0.67, 0.7, 0.72, 0.75, 0.77, 0.8
];

interface CanvasPanelProps {
  title: string;
  pattern: BeadPattern;
  zoom: number;
  viewType: ViewType;
  shift?: number;
  onShiftChange?: (shift: number) => void;
  /** Brick offset for corrected/simulation views (0.5 = half bead shift) */
  brickOffset?: number;
  onBrickOffsetChange?: (offset: number) => void;
  onBeadClick?: (x: number, y: number) => void;
  onBeadDrag?: (x: number, y: number) => void;
  highlightedBeads?: HighlightedBeads | null;
  completedBeads?: number;  // Number of beads completed (for dimming)
  // Synchronized scrolling props
  scrollContainerRef?: React.RefObject<HTMLDivElement | null>;
  onScroll?: (scrollTop: number, scrollLeft: number) => void;
}

export const CanvasPanel: FC<CanvasPanelProps> = ({
  title,
  pattern,
  zoom,
  viewType,
  shift = 0,
  onShiftChange,
  brickOffset = 0.5,
  onBrickOffsetChange,
  onBeadClick,
  onBeadDrag,
  highlightedBeads,
  completedBeads = 0,
  scrollContainerRef,
  onScroll,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const internalScrollRef = useRef<HTMLDivElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);

  // For simulation drag-to-shift
  const [isDraggingShift, setIsDraggingShift] = useState(false);
  const [dragStartX, setDragStartX] = useState(0);
  const [dragStartShift, setDragStartShift] = useState(0);

  // Merge internal and external refs
  const scrollRef = scrollContainerRef || internalScrollRef;

  // Handle scroll events for synchronization
  const handleScroll = useCallback(() => {
    if (scrollRef.current && onScroll) {
      onScroll(scrollRef.current.scrollTop, scrollRef.current.scrollLeft);
    }
  }, [scrollRef, onScroll]);

  // Render canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Calculate canvas size
    let canvasWidth: number;
    let canvasHeight: number;

    if (viewType === 'draft') {
      canvasWidth = pattern.width * zoom;
      canvasHeight = pattern.height * zoom;
    } else if (viewType === 'corrected') {
      // Canvas width depends on brick offset (need extra space for shifted rows)
      canvasWidth = (pattern.width + Math.abs(brickOffset)) * zoom;
      canvasHeight = pattern.height * zoom;
    } else {
      // simulation
      canvasWidth = (Math.ceil(pattern.width / 2) + Math.abs(brickOffset)) * zoom;
      canvasHeight = pattern.height * zoom;
    }

    canvas.width = canvasWidth;
    canvas.height = canvasHeight;

    // Clear background
    ctx.fillStyle = '#f0f0f0';
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    // Render based on view type
    if (viewType === 'draft') {
      renderDraft(ctx, pattern, zoom);
      // Draw dimmed overlay for completed beads
      if (completedBeads > 0) {
        renderCompletedOverlay(ctx, pattern, zoom, completedBeads);
      }
      // Draw highlights for TTS
      if (highlightedBeads && highlightedBeads.positions.length > 0) {
        renderHighlights(ctx, highlightedBeads, pattern.height, zoom);
      }
    } else if (viewType === 'corrected') {
      renderCorrected(ctx, pattern, zoom, brickOffset);
      // Draw dimmed overlay for completed beads (with brick offset)
      if (completedBeads > 0) {
        renderCompletedOverlay(ctx, pattern, zoom, completedBeads, brickOffset);
      }
      // Draw highlights for TTS (with brick offset)
      if (highlightedBeads && highlightedBeads.positions.length > 0) {
        renderHighlights(ctx, highlightedBeads, pattern.height, zoom, brickOffset, pattern.width);
      }
    } else {
      renderSimulation(ctx, pattern, zoom, shift, brickOffset);
    }
  }, [pattern, zoom, viewType, shift, brickOffset, highlightedBeads, completedBeads]);

  const getGridPosition = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas) return null;

      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;

      const pixelX = (e.clientX - rect.left) * scaleX;
      const pixelY = (e.clientY - rect.top) * scaleY;

      // Calculate y first (same for both views)
      const y = pattern.height - 1 - Math.floor(pixelY / zoom);

      // For corrected view, account for cumulative brick offset
      let x: number;
      if (viewType === 'corrected' && y >= 0 && y < pattern.height) {
        // Cumulative offset for this row
        const rowOffset = y * brickOffset;
        const intOffset = Math.floor(rowOffset);
        const fracOffset = rowOffset - intOffset;
        const dx = fracOffset * zoom;

        // Reverse the transformation: screen position to pattern position
        const visualX = Math.floor((pixelX - dx) / zoom);
        // Convert visual X back to pattern X (reverse the wrapping)
        x = ((visualX - intOffset) % pattern.width + pattern.width) % pattern.width;
      } else {
        x = Math.floor(pixelX / zoom);
      }

      if (x < 0 || x >= pattern.width || y < 0 || y >= pattern.height) {
        return null;
      }

      return { x, y };
    },
    [zoom, pattern.width, pattern.height, viewType, brickOffset]
  );

  const handleMouseDown = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      // Handle simulation drag-to-shift
      if (viewType === 'simulation' && onShiftChange) {
        setIsDraggingShift(true);
        setDragStartX(e.clientX);
        setDragStartShift(shift);
        return;
      }

      // Allow editing on draft and corrected views
      if (viewType !== 'draft' && viewType !== 'corrected') return;

      const pos = getGridPosition(e);
      if (pos && onBeadClick) {
        onBeadClick(pos.x, pos.y);
        setIsDrawing(true);
      }
    },
    [viewType, getGridPosition, onBeadClick, onShiftChange, shift]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      // Handle simulation drag-to-shift
      if (isDraggingShift && viewType === 'simulation' && onShiftChange) {
        const deltaX = e.clientX - dragStartX;
        // Convert pixel drag to shift units (negative because dragging right = shift left visually)
        const shiftDelta = Math.round(-deltaX / (zoom * 0.5));
        const newShift = dragStartShift + shiftDelta;
        onShiftChange(newShift);
        return;
      }

      // Allow dragging on draft and corrected views
      if (!isDrawing || (viewType !== 'draft' && viewType !== 'corrected')) return;

      const pos = getGridPosition(e);
      if (pos && onBeadDrag) {
        onBeadDrag(pos.x, pos.y);
      }
    },
    [isDrawing, isDraggingShift, viewType, getGridPosition, onBeadDrag, onShiftChange, dragStartX, dragStartShift, zoom]
  );

  const handleMouseUp = useCallback(() => {
    setIsDrawing(false);
    setIsDraggingShift(false);
  }, []);

  return (
    <div className="relative flex flex-1 flex-col overflow-hidden rounded-lg bg-white shadow">
      <div className="border-b bg-gray-50 px-4 py-2">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-medium text-gray-700">{title}</h4>
          {viewType === 'corrected' && onBrickOffsetChange && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">Зсув рядка:</span>
              <select
                value={brickOffset}
                onChange={(e) => onBrickOffsetChange(parseFloat(e.target.value))}
                className="rounded border border-gray-300 bg-white px-2 py-0.5 text-xs text-gray-700 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                {BRICK_OFFSET_VALUES.map((val) => (
                  <option key={val} value={val}>
                    {val}
                  </option>
                ))}
              </select>
            </div>
          )}
          {viewType === 'simulation' && onShiftChange && (
            <div className="flex items-center gap-3">
              <span className="text-xs text-gray-400">← Затисніть ЛКМ і тягніть →</span>
              <div className="flex items-center gap-1 rounded bg-white px-2 py-0.5 text-xs shadow-sm">
                <span className="text-gray-400">зсув:</span>
                <span className="font-bold text-gray-700">{shift}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      <div
        ref={scrollRef as React.RefObject<HTMLDivElement>}
        className="custom-scrollbar flex-1 overflow-auto p-2"
        onScroll={handleScroll}
      >
        <canvas
          ref={canvasRef}
          className={
            viewType === 'draft' || viewType === 'corrected'
              ? 'cursor-crosshair'
              : viewType === 'simulation'
                ? 'cursor-grab active:cursor-grabbing'
                : 'cursor-default'
          }
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        />
      </div>

    </div>
  );
};

// Helper function to draw a skip cell (empty circle with X)
function renderSkipCell(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number
) {
  const centerX = x + size / 2;
  const centerY = y + size / 2;
  const radius = (size - 2) / 2;

  // Draw empty circle
  ctx.strokeStyle = '#999';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
  ctx.stroke();

  // Draw X inside
  const xPadding = size * 0.25;
  ctx.strokeStyle = '#999';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(x + xPadding, y + xPadding);
  ctx.lineTo(x + size - xPadding, y + size - xPadding);
  ctx.moveTo(x + size - xPadding, y + xPadding);
  ctx.lineTo(x + xPadding, y + size - xPadding);
  ctx.stroke();
}

// Helper function to draw an empty/uncolored cell (checkerboard pattern)
function renderEmptyCell(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number
) {
  const squareSize = Math.max(2, Math.floor(size / 4));
  const numSquares = Math.ceil(size / squareSize);

  // Draw checkerboard pattern
  for (let row = 0; row < numSquares; row++) {
    for (let col = 0; col < numSquares; col++) {
      const isLight = (row + col) % 2 === 0;
      ctx.fillStyle = isLight ? '#ffcccc' : '#ff9999'; // Light/dark pink pattern

      const squareX = x + col * squareSize;
      const squareY = y + row * squareSize;
      const w = Math.min(squareSize, x + size - squareX);
      const h = Math.min(squareSize, y + size - squareY);

      if (w > 0 && h > 0) {
        ctx.fillRect(squareX, squareY, w, h);
      }
    }
  }

  // Draw question mark in center
  const centerX = x + size / 2;
  const centerY = y + size / 2;
  ctx.fillStyle = '#cc0000';
  ctx.font = `bold ${Math.max(8, size * 0.6)}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('?', centerX, centerY);
}

// Render functions
function renderDraft(
  ctx: CanvasRenderingContext2D,
  pattern: BeadPattern,
  zoom: number
) {
  for (let y = 0; y < pattern.height; y++) {
    for (let x = 0; x < pattern.width; x++) {
      const colorIndex = pattern.field[y * pattern.width + x];
      const screenX = x * zoom;
      const screenY = (pattern.height - 1 - y) * zoom;

      // Handle special cells
      if (colorIndex === SKIP_COLOR_INDEX) {
        renderSkipCell(ctx, screenX, screenY, zoom - 1);
      } else if (colorIndex === EMPTY_COLOR_INDEX) {
        renderEmptyCell(ctx, screenX, screenY, zoom - 1);
      } else {
        const color = pattern.colors[colorIndex] || pattern.colors[0];
        ctx.fillStyle = colorToRgba(color);
        ctx.fillRect(screenX, screenY, zoom - 1, zoom - 1);
      }
    }
  }

  // Draw grid if zoom is large enough
  if (zoom >= 10) {
    ctx.strokeStyle = '#ccc';
    ctx.lineWidth = 0.5;

    for (let x = 0; x <= pattern.width; x++) {
      ctx.beginPath();
      ctx.moveTo(x * zoom, 0);
      ctx.lineTo(x * zoom, pattern.height * zoom);
      ctx.stroke();
    }

    for (let y = 0; y <= pattern.height; y++) {
      ctx.beginPath();
      ctx.moveTo(0, y * zoom);
      ctx.lineTo(pattern.width * zoom, y * zoom);
      ctx.stroke();
    }
  }
}

function renderCorrected(
  ctx: CanvasRenderingContext2D,
  pattern: BeadPattern,
  zoom: number,
  brickOffset: number
) {
  // Cumulative offset: each row shifts by y * brickOffset
  // When offset >= 1, cells wrap around (cylinder effect)

  for (let y = 0; y < pattern.height; y++) {
    // Total cumulative offset for this row
    const rowOffset = y * brickOffset;
    // Integer part: how many full cells to shift (for wrapping)
    const intOffset = Math.floor(rowOffset);
    // Fractional part: sub-cell visual offset in pixels
    const fracOffset = rowOffset - intOffset;
    // Pixel offset for fractional part
    const dx = fracOffset * zoom;

    for (let visualX = 0; visualX < pattern.width; visualX++) {
      // Calculate which pattern column corresponds to this visual position
      // If row is shifted right by intOffset, visual position X shows pattern column (X - intOffset)
      const patternX = ((visualX - intOffset) % pattern.width + pattern.width) % pattern.width;
      const colorIndex = pattern.field[y * pattern.width + patternX];

      // Screen position includes fractional offset
      const screenX = visualX * zoom + dx;
      const screenY = (pattern.height - 1 - y) * zoom;

      // Handle special cells
      if (colorIndex === SKIP_COLOR_INDEX) {
        renderSkipCell(ctx, screenX, screenY, zoom - 1);
      } else if (colorIndex === EMPTY_COLOR_INDEX) {
        renderEmptyCell(ctx, screenX, screenY, zoom - 1);
      } else {
        const color = pattern.colors[colorIndex] || pattern.colors[0];
        ctx.fillStyle = colorToRgba(color);
        ctx.fillRect(screenX, screenY, zoom - 1, zoom - 1);
      }
    }
  }
}

function renderSimulation(
  ctx: CanvasRenderingContext2D,
  pattern: BeadPattern,
  zoom: number,
  shift: number,
  brickOffset: number
) {
  const visibleWidth = Math.ceil(pattern.width / 2);

  for (let y = 0; y < pattern.height; y++) {
    // Cumulative brick offset, same as corrected view
    const rowOffset = y * brickOffset;
    const intOffset = Math.floor(rowOffset);
    const fracOffset = rowOffset - intOffset;
    const dx = fracOffset * zoom;

    for (let x = 0; x < pattern.width; x++) {
      // Apply shift as horizontal rotation (wrapping around the tube)
      const shiftedX = ((x - shift) % pattern.width + pattern.width) % pattern.width;

      // Only show beads on the visible half of the tube
      if (shiftedX >= visibleWidth) continue;

      // Apply brick offset wrapping
      const patternX = ((x - intOffset) % pattern.width + pattern.width) % pattern.width;
      const colorIndex = pattern.field[y * pattern.width + patternX];
      const screenX = shiftedX * zoom + dx;
      const screenY = (pattern.height - 1 - y) * zoom;

      // Handle special cells
      if (colorIndex === SKIP_COLOR_INDEX) {
        renderSkipCell(ctx, screenX, screenY, zoom - 1);
      } else if (colorIndex === EMPTY_COLOR_INDEX) {
        renderEmptyCell(ctx, screenX, screenY, zoom - 1);
      } else {
        const color = pattern.colors[colorIndex] || pattern.colors[0];
        ctx.fillStyle = colorToRgba(color);
        ctx.fillRect(screenX, screenY, zoom - 1, zoom - 1);
      }
    }
  }
}

function renderHighlights(
  ctx: CanvasRenderingContext2D,
  highlightedBeads: HighlightedBeads,
  patternHeight: number,
  zoom: number,
  brickOffset: number = 0,
  patternWidth: number = 0
) {
  ctx.strokeStyle = '#ff0000';
  ctx.lineWidth = 3;

  for (const pos of highlightedBeads.positions) {
    // Cumulative brick offset for this row
    const rowOffset = pos.y * brickOffset;
    const intOffset = Math.floor(rowOffset);
    const fracOffset = rowOffset - intOffset;
    const dx = fracOffset * zoom;

    // Calculate visual X position with wrapping
    let visualX = pos.x;
    if (patternWidth > 0) {
      visualX = ((pos.x + intOffset) % patternWidth + patternWidth) % patternWidth;
    }

    const screenX = visualX * zoom + dx;
    const screenY = (patternHeight - 1 - pos.y) * zoom;

    // Draw highlight border
    ctx.strokeRect(screenX - 1, screenY - 1, zoom + 1, zoom + 1);
  }

  // Draw a filled semi-transparent overlay for better visibility
  ctx.fillStyle = 'rgba(255, 0, 0, 0.2)';
  for (const pos of highlightedBeads.positions) {
    // Cumulative brick offset for this row
    const rowOffset = pos.y * brickOffset;
    const intOffset = Math.floor(rowOffset);
    const fracOffset = rowOffset - intOffset;
    const dx = fracOffset * zoom;

    // Calculate visual X position with wrapping
    let visualX = pos.x;
    if (patternWidth > 0) {
      visualX = ((pos.x + intOffset) % patternWidth + patternWidth) % patternWidth;
    }

    const screenX = visualX * zoom + dx;
    const screenY = (patternHeight - 1 - pos.y) * zoom;
    ctx.fillRect(screenX, screenY, zoom - 1, zoom - 1);
  }
}

/**
 * Render dimming overlay for completed beads
 * Reading order: bottom-to-top (y=0 first), left-to-right (x=0 first)
 * Uses positionToCoordinates to match TTS reading order
 * Properly handles skip cells (they are not counted in positions)
 */
function renderCompletedOverlay(
  ctx: CanvasRenderingContext2D,
  pattern: BeadPattern,
  zoom: number,
  completedBeads: number,
  brickOffset: number = 0
) {
  const usedHeight = getUsedHeight(pattern);
  if (usedHeight === 0) return;

  ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';  // Semi-transparent dark overlay

  for (let pos = 1; pos <= completedBeads; pos++) {
    const coord = positionToCoordinates(pos, pattern, usedHeight);
    if (!coord) continue;

    // Cumulative brick offset for this row
    const rowOffset = coord.y * brickOffset;
    const intOffset = Math.floor(rowOffset);
    const fracOffset = rowOffset - intOffset;
    const dx = fracOffset * zoom;

    // Calculate visual X position with wrapping
    const visualX = ((coord.x + intOffset) % pattern.width + pattern.width) % pattern.width;

    // Convert to screen coordinates (y=0 is visual bottom)
    const screenX = visualX * zoom + dx;
    const screenY = (pattern.height - 1 - coord.y) * zoom;

    ctx.fillRect(screenX, screenY, zoom - 1, zoom - 1);
  }
}
