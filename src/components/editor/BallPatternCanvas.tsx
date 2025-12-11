'use client';

import { FC, useRef, useEffect, useState, useCallback } from 'react';
import type { BallPattern, HighlightedBeads } from '@/types';
import { colorToRgba } from '@/lib/utils';

interface BallPatternCanvasProps {
  pattern: BallPattern;
  zoom: number;
  showGrid?: boolean;
  onBeadClick?: (x: number, y: number) => void;
  onBeadDrag?: (x: number, y: number) => void;
  highlightedBeads?: HighlightedBeads | null;
  completedBeads?: number;
}

/**
 * Ball Pattern Canvas - Renders full rectangular grid like JBead
 * Background color cells are displayed in neutral color to show wedge shapes
 */
export const BallPatternCanvas: FC<BallPatternCanvasProps> = ({
  pattern,
  zoom,
  showGrid = true,
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

    const canvasWidth = pattern.width * zoom;
    const canvasHeight = pattern.height * zoom;

    canvas.width = canvasWidth;
    canvas.height = canvasHeight;

    // Clear background
    ctx.fillStyle = '#f5f5f5';
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    // Render all beads (full rectangular grid)
    renderBallPattern(ctx, pattern, zoom);

    // Draw grid if enabled and zoom is large enough
    if (showGrid && zoom >= 6) {
      renderGrid(ctx, pattern, zoom);
    }

    // Draw wedge boundaries (simple lines)
    renderWedgeBoundaries(ctx, pattern, zoom);

    // Draw dimmed overlay for completed beads
    if (completedBeads > 0) {
      renderCompletedOverlay(ctx, pattern, zoom, completedBeads);
    }

    // Draw highlights for TTS
    if (highlightedBeads && highlightedBeads.positions.length > 0) {
      renderHighlights(ctx, highlightedBeads, pattern.height, zoom);
    }
  }, [pattern, zoom, showGrid, highlightedBeads, completedBeads]);

  const getGridPosition = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas) return null;

      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;

      const pixelX = (e.clientX - rect.left) * scaleX;
      const pixelY = (e.clientY - rect.top) * scaleY;

      // Canvas y=0 is top, but our grid y=0 is bottom
      const x = Math.floor(pixelX / zoom);
      const y = pattern.height - 1 - Math.floor(pixelY / zoom);

      if (x < 0 || x >= pattern.width || y < 0 || y >= pattern.height) {
        return null;
      }

      return { x, y };
    },
    [zoom, pattern]
  );

  const handleMouseDown = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const pos = getGridPosition(e);
      if (pos && onBeadClick) {
        onBeadClick(pos.x, pos.y);
        setIsDrawing(true);
      }
    },
    [getGridPosition, onBeadClick]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (!isDrawing) return;

      const pos = getGridPosition(e);
      if (pos && onBeadDrag) {
        onBeadDrag(pos.x, pos.y);
      }
    },
    [isDrawing, getGridPosition, onBeadDrag]
  );

  const handleMouseUp = useCallback(() => {
    setIsDrawing(false);
  }, []);

  return (
    <div className="flex flex-1 flex-col overflow-hidden rounded-lg bg-white shadow">
      <div className="border-b bg-gray-50 px-4 py-2">
        <h4 className="text-sm font-medium text-gray-700">
          Ball Pattern ({pattern.diameter}cm - {pattern.circumference} beads × {pattern.height} rows)
        </h4>
      </div>

      <div className="custom-scrollbar flex-1 overflow-auto p-2">
        <canvas
          ref={canvasRef}
          className="cursor-crosshair"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        />
      </div>
    </div>
  );
};

/**
 * Render the ball pattern as a full rectangular grid
 * All cells are rendered - background color shows "empty" areas
 */
function renderBallPattern(
  ctx: CanvasRenderingContext2D,
  pattern: BallPattern,
  zoom: number
) {
  const { width, height, field, colors } = pattern;

  // Get background color (usually index 0 or 1)
  const bgColor = colors[0] || { r: 255, g: 255, b: 255 };
  const bgRgba = colorToRgba(bgColor);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const colorIndex = field[y * width + x];
      const color = colors[colorIndex] || colors[0];
      const rgba = colorToRgba(color);

      // Convert grid coords to canvas coords (y=0 at bottom → canvas y at bottom)
      const canvasX = x * zoom;
      const canvasY = (height - 1 - y) * zoom;

      // Check if this is background color - render with slight transparency
      const isBackground = colorIndex === 0 ||
        (color.r === bgColor.r && color.g === bgColor.g && color.b === bgColor.b);

      if (isBackground) {
        // Render background cells with pattern to show grid structure
        ctx.fillStyle = '#e8e8e8';
        ctx.fillRect(canvasX, canvasY, zoom - 1, zoom - 1);
      } else {
        ctx.fillStyle = rgba;
        ctx.fillRect(canvasX, canvasY, zoom - 1, zoom - 1);
      }
    }
  }
}

/**
 * Render grid lines for all cells
 */
function renderGrid(
  ctx: CanvasRenderingContext2D,
  pattern: BallPattern,
  zoom: number
) {
  ctx.strokeStyle = '#ddd';
  ctx.lineWidth = 0.5;

  // Vertical lines
  for (let x = 0; x <= pattern.width; x++) {
    ctx.beginPath();
    ctx.moveTo(x * zoom, 0);
    ctx.lineTo(x * zoom, pattern.height * zoom);
    ctx.stroke();
  }

  // Horizontal lines
  for (let y = 0; y <= pattern.height; y++) {
    ctx.beginPath();
    ctx.moveTo(0, y * zoom);
    ctx.lineTo(pattern.width * zoom, y * zoom);
    ctx.stroke();
  }
}

/**
 * Render visual boundaries between wedges
 * Simple vertical lines every wedgeBase columns + horizontal line at middle
 */
function renderWedgeBoundaries(
  ctx: CanvasRenderingContext2D,
  pattern: BallPattern,
  zoom: number
) {
  const { wedgeBase, wedgeHeight, height, width } = pattern;

  ctx.strokeStyle = '#666';
  ctx.lineWidth = 2;

  // Draw vertical lines between wedge columns
  for (let i = 1; i < 6; i++) {
    const x = i * wedgeBase * zoom;
    if (x < width * zoom) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height * zoom);
      ctx.stroke();
    }
  }

  // Draw horizontal line between top and bottom halves (equator)
  const midY = wedgeHeight * zoom;
  ctx.beginPath();
  ctx.moveTo(0, midY);
  ctx.lineTo(width * zoom, midY);
  ctx.stroke();
}

/**
 * Render dimming overlay for completed beads in TTS mode
 * Reads all non-background cells from bottom to top, left to right
 */
function renderCompletedOverlay(
  ctx: CanvasRenderingContext2D,
  pattern: BallPattern,
  zoom: number,
  completedBeads: number
) {
  ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';

  const bgColor = pattern.colors[0] || { r: 255, g: 255, b: 255 };
  let beadCount = 0;

  // Same reading order as TTS: bottom to top, left to right
  for (let y = 0; y < pattern.height && beadCount < completedBeads; y++) {
    for (let x = 0; x < pattern.width && beadCount < completedBeads; x++) {
      const colorIndex = pattern.field[y * pattern.width + x];
      const color = pattern.colors[colorIndex];

      // Skip background cells
      const isBackground = colorIndex === 0 ||
        (color && color.r === bgColor.r && color.g === bgColor.g && color.b === bgColor.b);

      if (!isBackground) {
        beadCount++;
        if (beadCount <= completedBeads) {
          const canvasX = x * zoom;
          const canvasY = (pattern.height - 1 - y) * zoom;
          ctx.fillRect(canvasX, canvasY, zoom - 1, zoom - 1);
        }
      }
    }
  }
}

/**
 * Render highlight for currently spoken beads in TTS
 */
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

    ctx.strokeRect(screenX - 1, screenY - 1, zoom + 1, zoom + 1);
  }

  ctx.fillStyle = 'rgba(255, 0, 0, 0.2)';
  for (const pos of highlightedBeads.positions) {
    const screenX = pos.x * zoom;
    const screenY = (patternHeight - 1 - pos.y) * zoom;
    ctx.fillRect(screenX, screenY, zoom - 1, zoom - 1);
  }
}
