'use client';

import { FC, useRef, useEffect, useState, useCallback } from 'react';
import type { BeadPattern, ViewType, HighlightedBeads } from '@/types';
import { colorToRgba } from '@/lib/utils';

interface CanvasPanelProps {
  title: string;
  pattern: BeadPattern;
  zoom: number;
  viewType: ViewType;
  shift?: number;
  onShiftChange?: (shift: number) => void;
  onBeadClick?: (x: number, y: number) => void;
  onBeadDrag?: (x: number, y: number) => void;
  highlightedBeads?: HighlightedBeads | null;
  completedBeads?: number;  // Number of beads completed (for dimming)
}

export const CanvasPanel: FC<CanvasPanelProps> = ({
  title,
  pattern,
  zoom,
  viewType,
  shift = 0,
  onShiftChange,
  onBeadClick,
  onBeadDrag,
  highlightedBeads,
  completedBeads = 0,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);

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
      canvasWidth = (pattern.width + 0.5) * zoom;
      canvasHeight = pattern.height * zoom;
    } else {
      // simulation
      canvasWidth = (Math.ceil(pattern.width / 2) + 0.5) * zoom;
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
      // Draw highlights for TTS on draft view only
      if (highlightedBeads && highlightedBeads.positions.length > 0) {
        renderHighlights(ctx, highlightedBeads, pattern.height, zoom);
      }
    } else if (viewType === 'corrected') {
      renderCorrected(ctx, pattern, zoom);
    } else {
      renderSimulation(ctx, pattern, zoom, shift);
    }
  }, [pattern, zoom, viewType, shift, highlightedBeads, completedBeads]);

  const getGridPosition = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas) return null;

      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;

      const pixelX = (e.clientX - rect.left) * scaleX;
      const pixelY = (e.clientY - rect.top) * scaleY;

      const x = Math.floor(pixelX / zoom);
      const y = pattern.height - 1 - Math.floor(pixelY / zoom);

      if (x < 0 || x >= pattern.width || y < 0 || y >= pattern.height) {
        return null;
      }

      return { x, y };
    },
    [zoom, pattern.width, pattern.height]
  );

  const handleMouseDown = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (viewType !== 'draft') return;

      const pos = getGridPosition(e);
      if (pos && onBeadClick) {
        onBeadClick(pos.x, pos.y);
        setIsDrawing(true);
      }
    },
    [viewType, getGridPosition, onBeadClick]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (!isDrawing || viewType !== 'draft') return;

      const pos = getGridPosition(e);
      if (pos && onBeadDrag) {
        onBeadDrag(pos.x, pos.y);
      }
    },
    [isDrawing, viewType, getGridPosition, onBeadDrag]
  );

  const handleMouseUp = useCallback(() => {
    setIsDrawing(false);
  }, []);

  return (
    <div className="flex flex-1 flex-col overflow-hidden rounded-lg bg-white shadow">
      <div className="border-b bg-gray-50 px-4 py-2">
        <h4 className="text-sm font-medium text-gray-700">{title}</h4>
      </div>

      <div className="custom-scrollbar flex-1 overflow-auto p-2">
        <canvas
          ref={canvasRef}
          className={viewType === 'draft' ? 'cursor-crosshair' : 'cursor-default'}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        />
      </div>

      {viewType === 'simulation' && onShiftChange && (
        <div className="flex justify-center gap-2 border-t p-2">
          <button
            onClick={() => onShiftChange(shift - 1)}
            className="rounded border px-3 py-1 text-sm hover:bg-gray-50"
          >
            ⬅️
          </button>
          <button
            onClick={() => onShiftChange(shift + 1)}
            className="rounded border px-3 py-1 text-sm hover:bg-gray-50"
          >
            ➡️
          </button>
        </div>
      )}
    </div>
  );
};

// Render functions
function renderDraft(
  ctx: CanvasRenderingContext2D,
  pattern: BeadPattern,
  zoom: number
) {
  for (let y = 0; y < pattern.height; y++) {
    for (let x = 0; x < pattern.width; x++) {
      const colorIndex = pattern.field[y * pattern.width + x];
      const color = pattern.colors[colorIndex] || pattern.colors[0];

      ctx.fillStyle = colorToRgba(color);
      ctx.fillRect(
        x * zoom,
        (pattern.height - 1 - y) * zoom,
        zoom - 1,
        zoom - 1
      );
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
  zoom: number
) {
  for (let y = 0; y < pattern.height; y++) {
    const dx = y % 2 === 1 ? zoom / 2 : 0;

    for (let x = 0; x < pattern.width; x++) {
      const colorIndex = pattern.field[y * pattern.width + x];
      const color = pattern.colors[colorIndex] || pattern.colors[0];

      ctx.fillStyle = colorToRgba(color);
      ctx.fillRect(
        x * zoom + dx,
        (pattern.height - 1 - y) * zoom,
        zoom - 1,
        zoom - 1
      );
    }
  }
}

function renderSimulation(
  ctx: CanvasRenderingContext2D,
  pattern: BeadPattern,
  zoom: number,
  shift: number
) {
  const visibleWidth = Math.ceil(pattern.width / 2);

  for (let y = 0; y < pattern.height; y++) {
    // Brick offset based on row, same as corrected view
    const dx = y % 2 === 1 ? zoom / 2 : 0;

    for (let x = 0; x < pattern.width; x++) {
      // Apply shift as horizontal rotation (wrapping around the tube)
      const shiftedX = ((x - shift) % pattern.width + pattern.width) % pattern.width;

      // Only show beads on the visible half of the tube
      if (shiftedX >= visibleWidth) continue;

      const colorIndex = pattern.field[y * pattern.width + x];
      const color = pattern.colors[colorIndex] || pattern.colors[0];

      ctx.fillStyle = colorToRgba(color);
      ctx.fillRect(
        shiftedX * zoom + dx,
        (pattern.height - 1 - y) * zoom,
        zoom - 1,
        zoom - 1
      );
    }
  }
}

function renderHighlights(
  ctx: CanvasRenderingContext2D,
  highlightedBeads: HighlightedBeads,
  patternHeight: number,
  zoom: number
) {
  ctx.strokeStyle = '#ff0000';
  ctx.lineWidth = 3;

  for (const pos of highlightedBeads.positions) {
    const screenX = pos.x * zoom;
    const screenY = (patternHeight - 1 - pos.y) * zoom;

    // Draw highlight border
    ctx.strokeRect(screenX - 1, screenY - 1, zoom + 1, zoom + 1);
  }

  // Draw a filled semi-transparent overlay for better visibility
  ctx.fillStyle = 'rgba(255, 0, 0, 0.2)';
  for (const pos of highlightedBeads.positions) {
    const screenX = pos.x * zoom;
    const screenY = (patternHeight - 1 - pos.y) * zoom;
    ctx.fillRect(screenX, screenY, zoom - 1, zoom - 1);
  }
}

/**
 * Render dimming overlay for completed beads
 * Reading order: bottom-to-top (y=0 is bottom), left-to-right
 */
function renderCompletedOverlay(
  ctx: CanvasRenderingContext2D,
  pattern: BeadPattern,
  zoom: number,
  completedBeads: number
) {
  ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';  // Semi-transparent dark overlay

  for (let pos = 1; pos <= completedBeads; pos++) {
    const zeroBasedPos = pos - 1;
    const y = Math.floor(zeroBasedPos / pattern.width);
    const x = zeroBasedPos % pattern.width;

    // Skip if out of bounds
    if (y >= pattern.height || x >= pattern.width) break;

    // Convert to screen coordinates (y=0 is visual bottom)
    const screenX = x * zoom;
    const screenY = (pattern.height - 1 - y) * zoom;

    ctx.fillRect(screenX, screenY, zoom - 1, zoom - 1);
  }
}
