'use client';

import { FC, useRef, useEffect, useState, useCallback } from 'react';
import type { BallPattern, HighlightedBeads } from '@/types';
import { colorToRgba } from '@/lib/utils';
import {
  isPositionInWedge,
  getWedgeWidthAtRow,
  getWedgeRowOffset,
} from '@/lib/pattern';

interface BallPatternCanvasProps {
  pattern: BallPattern;
  zoom: number;
  showGrid?: boolean;
  onBeadClick?: (x: number, y: number) => void;
  onBeadDrag?: (x: number, y: number) => void;
  highlightedBeads?: HighlightedBeads | null;
  completedBeads?: number;
}

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

    // Clear background (empty space between wedges)
    ctx.fillStyle = '#e0e0e0';
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    // Render beads
    renderBallPattern(ctx, pattern, zoom);

    // Draw grid if enabled and zoom is large enough
    if (showGrid && zoom >= 8) {
      renderGrid(ctx, pattern, zoom);
    }

    // Draw wedge boundaries
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

      // Only return position if it's within a wedge
      if (!isPositionInWedge(pattern, x, y)) {
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
          Ball Pattern ({pattern.diameter}cm - {pattern.circumference} beads)
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
 * Render the ball pattern beads with proper wedge masking
 */
function renderBallPattern(
  ctx: CanvasRenderingContext2D,
  pattern: BallPattern,
  zoom: number
) {
  const { width, height, wedgeBase, wedgeHeight, field, colors } = pattern;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      // Skip positions outside wedges (empty triangular gaps)
      if (!isPositionInWedge(pattern, x, y)) {
        continue;
      }

      const colorIndex = field[y * width + x];
      const color = colors[colorIndex] || colors[0];

      ctx.fillStyle = colorToRgba(color);

      // Convert grid coords to canvas coords (y=0 at bottom → canvas y at bottom)
      const canvasX = x * zoom;
      const canvasY = (height - 1 - y) * zoom;

      ctx.fillRect(canvasX, canvasY, zoom - 1, zoom - 1);
    }
  }
}

/**
 * Render grid lines for wedge cells only
 */
function renderGrid(
  ctx: CanvasRenderingContext2D,
  pattern: BallPattern,
  zoom: number
) {
  ctx.strokeStyle = '#ccc';
  ctx.lineWidth = 0.5;

  for (let y = 0; y < pattern.height; y++) {
    for (let x = 0; x < pattern.width; x++) {
      if (isPositionInWedge(pattern, x, y)) {
        const canvasX = x * zoom;
        const canvasY = (pattern.height - 1 - y) * zoom;

        ctx.strokeRect(canvasX, canvasY, zoom - 1, zoom - 1);
      }
    }
  }
}

/**
 * Render visual boundaries between wedges
 */
function renderWedgeBoundaries(
  ctx: CanvasRenderingContext2D,
  pattern: BallPattern,
  zoom: number
) {
  const { wedgeBase, wedgeHeight, height } = pattern;

  ctx.strokeStyle = '#666';
  ctx.lineWidth = 2;

  // Draw vertical lines between wedge columns
  for (let i = 1; i < 6; i++) {
    const x = i * wedgeBase * zoom;

    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height * zoom);
    ctx.stroke();
  }

  // Draw horizontal line between top and bottom wedges
  const midY = wedgeHeight * zoom;
  ctx.beginPath();
  ctx.moveTo(0, midY);
  ctx.lineTo(pattern.width * zoom, midY);
  ctx.stroke();

  // Draw diagonal wedge edges (triangular shape)
  ctx.strokeStyle = '#888';
  ctx.lineWidth = 1;

  for (let wedgeCol = 0; wedgeCol < 6; wedgeCol++) {
    const wedgeStartX = wedgeCol * wedgeBase;

    // Draw top wedge edges (pointing up)
    drawWedgeTriangle(ctx, pattern, wedgeStartX, wedgeHeight, 'top', zoom);

    // Draw bottom wedge edges (pointing down)
    drawWedgeTriangle(ctx, pattern, wedgeStartX, 0, 'bottom', zoom);
  }
}

/**
 * Draw the triangular outline of a single wedge
 */
function drawWedgeTriangle(
  ctx: CanvasRenderingContext2D,
  pattern: BallPattern,
  startX: number,
  startY: number,
  position: 'top' | 'bottom',
  zoom: number
) {
  const { wedgeBase, wedgeHeight, height } = pattern;

  ctx.beginPath();

  if (position === 'top') {
    // Top wedge: base at bottom (startY), tip at top
    // Left edge
    for (let row = 0; row < wedgeHeight; row++) {
      const rowWidth = getWedgeWidthAtRow(wedgeBase, wedgeHeight, row);
      const rowOffset = getWedgeRowOffset(wedgeBase, wedgeHeight, row);

      const canvasX = (startX + rowOffset) * zoom;
      const canvasY = (height - 1 - (startY + row)) * zoom;

      if (row === 0) {
        ctx.moveTo(canvasX, canvasY + zoom);
      }
      ctx.lineTo(canvasX, canvasY);
    }

    // Top tip
    const tipRow = wedgeHeight - 1;
    const tipWidth = getWedgeWidthAtRow(wedgeBase, wedgeHeight, tipRow);
    const tipOffset = getWedgeRowOffset(wedgeBase, wedgeHeight, tipRow);
    const tipCanvasY = (height - 1 - (startY + tipRow)) * zoom;
    ctx.lineTo((startX + tipOffset + tipWidth) * zoom, tipCanvasY);

    // Right edge going back down
    for (let row = wedgeHeight - 1; row >= 0; row--) {
      const rowWidth = getWedgeWidthAtRow(wedgeBase, wedgeHeight, row);
      const rowOffset = getWedgeRowOffset(wedgeBase, wedgeHeight, row);

      const canvasX = (startX + rowOffset + rowWidth) * zoom;
      const canvasY = (height - 1 - (startY + row)) * zoom + zoom;

      ctx.lineTo(canvasX, canvasY);
    }
  } else {
    // Bottom wedge: base at top (startY + wedgeHeight - 1), tip at bottom
    // Left edge
    for (let row = 0; row < wedgeHeight; row++) {
      const actualY = (wedgeHeight - 1) - row; // Invert for bottom wedges
      const rowWidth = getWedgeWidthAtRow(wedgeBase, wedgeHeight, row);
      const rowOffset = getWedgeRowOffset(wedgeBase, wedgeHeight, row);

      const canvasX = (startX + rowOffset) * zoom;
      const canvasY = (height - 1 - actualY) * zoom;

      if (row === 0) {
        ctx.moveTo(canvasX, canvasY);
      }
      ctx.lineTo(canvasX, canvasY + zoom);
    }

    // Bottom tip
    const tipRow = wedgeHeight - 1;
    const tipWidth = getWedgeWidthAtRow(wedgeBase, wedgeHeight, tipRow);
    const tipOffset = getWedgeRowOffset(wedgeBase, wedgeHeight, tipRow);
    ctx.lineTo((startX + tipOffset + tipWidth) * zoom, (height - 1) * zoom + zoom);

    // Right edge going back up
    for (let row = wedgeHeight - 1; row >= 0; row--) {
      const actualY = (wedgeHeight - 1) - row;
      const rowWidth = getWedgeWidthAtRow(wedgeBase, wedgeHeight, row);
      const rowOffset = getWedgeRowOffset(wedgeBase, wedgeHeight, row);

      const canvasX = (startX + rowOffset + rowWidth) * zoom;
      const canvasY = (height - 1 - actualY) * zoom;

      ctx.lineTo(canvasX, canvasY);
    }
  }

  ctx.closePath();
  ctx.stroke();
}

/**
 * Render dimming overlay for completed beads in TTS mode
 */
function renderCompletedOverlay(
  ctx: CanvasRenderingContext2D,
  pattern: BallPattern,
  zoom: number,
  completedBeads: number
) {
  ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';

  let beadCount = 0;

  // Same reading order as TTS: bottom to top, left to right
  for (let y = 0; y < pattern.height && beadCount < completedBeads; y++) {
    for (let x = 0; x < pattern.width && beadCount < completedBeads; x++) {
      if (isPositionInWedge(pattern, x, y)) {
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
