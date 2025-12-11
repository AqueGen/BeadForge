'use client';

import { FC, useRef, useEffect } from 'react';
import type { BallPattern, HighlightedBeads } from '@/types';
import { colorToRgba } from '@/lib/utils';
import { isPositionInWedge } from '@/lib/pattern/ballPattern';

interface BallWrappedViewProps {
  pattern: BallPattern;
  zoom: number;
  offset?: number; // Row offset for bead crochet stagger (-0.5 to 0.8)
  highlightedBeads?: HighlightedBeads | null;
  completedBeads?: number;
}

/**
 * Ball Wrapped View - Shows ball pattern as if wrapped around the ball
 * Similar to CrochetBeadPaint's middle view - demonstrates how wedges connect
 */
export const BallWrappedView: FC<BallWrappedViewProps> = ({
  pattern,
  zoom,
  offset = 0.5,
  highlightedBeads,
  completedBeads = 0,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Calculate canvas dimensions for wrapped view
    // Show one complete "repeat" - 6 wedges worth, with wrapping simulation
    const displayWidth = pattern.wedgeBase * 3; // Show ~3 wedges worth for wrapped effect
    const displayHeight = pattern.height;

    const canvasWidth = displayWidth * zoom;
    const canvasHeight = displayHeight * zoom;

    canvas.width = canvasWidth;
    canvas.height = canvasHeight;

    // Clear background
    ctx.fillStyle = '#f5f5f5';
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    // Render wrapped pattern
    renderWrappedPattern(ctx, pattern, zoom, offset, displayWidth);

    // Render completion overlay
    if (completedBeads > 0) {
      renderWrappedCompletedOverlay(ctx, pattern, zoom, offset, completedBeads, displayWidth);
    }

    // Render highlights
    if (highlightedBeads && highlightedBeads.positions.length > 0) {
      renderWrappedHighlights(ctx, pattern, highlightedBeads, zoom, offset, displayWidth);
    }
  }, [pattern, zoom, offset, highlightedBeads, completedBeads]);

  return (
    <div className="flex flex-col overflow-hidden rounded-lg bg-white shadow">
      <div className="border-b bg-gray-50 px-4 py-2">
        <h4 className="text-sm font-medium text-gray-700">
          Симуляция (offset: {offset})
        </h4>
      </div>

      <div className="custom-scrollbar flex-1 overflow-auto p-2">
        <canvas ref={canvasRef} />
      </div>
    </div>
  );
};

/**
 * Render the wrapped/simulated ball pattern
 * Shows how wedges connect when wrapped around the ball
 */
function renderWrappedPattern(
  ctx: CanvasRenderingContext2D,
  pattern: BallPattern,
  zoom: number,
  offset: number,
  displayWidth: number
) {
  const { height, field, colors, width, wedgeBase } = pattern;

  for (let y = 0; y < height; y++) {
    // Calculate row offset for bead crochet stagger effect
    const rowOffset = Math.floor(y * offset) % wedgeBase;

    for (let displayX = 0; displayX < displayWidth; displayX++) {
      // Map display X to actual pattern X with offset and wrapping
      const actualX = (displayX + rowOffset) % width;

      // Skip cells outside wedge areas
      if (!isPositionInWedge(pattern, actualX, y)) {
        continue;
      }

      const colorIndex = field[y * width + actualX];
      const color = colors[colorIndex] || colors[0];
      const rgba = colorToRgba(color);

      // Convert grid coords to canvas coords
      const canvasX = displayX * zoom;
      const canvasY = (height - 1 - y) * zoom;

      ctx.fillStyle = rgba;
      ctx.fillRect(canvasX, canvasY, zoom - 1, zoom - 1);
    }
  }

  // Draw subtle grid
  if (zoom >= 8) {
    ctx.strokeStyle = '#ddd';
    ctx.lineWidth = 0.5;

    for (let y = 0; y < height; y++) {
      const rowOffset = Math.floor(y * offset) % wedgeBase;

      for (let displayX = 0; displayX < displayWidth; displayX++) {
        const actualX = (displayX + rowOffset) % width;

        if (!isPositionInWedge(pattern, actualX, y)) {
          continue;
        }

        const canvasX = displayX * zoom;
        const canvasY = (height - 1 - y) * zoom;
        ctx.strokeRect(canvasX, canvasY, zoom - 1, zoom - 1);
      }
    }
  }

  // Draw center line (equator)
  ctx.strokeStyle = '#999';
  ctx.lineWidth = 2;
  const midY = pattern.wedgeHeight * zoom;
  ctx.beginPath();
  ctx.moveTo(0, midY);
  ctx.lineTo(displayWidth * zoom, midY);
  ctx.stroke();
}

/**
 * Render dimming overlay for completed beads in wrapped view
 */
function renderWrappedCompletedOverlay(
  ctx: CanvasRenderingContext2D,
  pattern: BallPattern,
  zoom: number,
  offset: number,
  completedBeads: number,
  displayWidth: number
) {
  ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';

  let beadCount = 0;
  const { height, width, wedgeBase } = pattern;

  // Count beads in same order as TTS
  for (let y = 0; y < height && beadCount < completedBeads; y++) {
    for (let x = 0; x < width && beadCount < completedBeads; x++) {
      if (!isPositionInWedge(pattern, x, y)) {
        continue;
      }

      beadCount++;
      if (beadCount <= completedBeads) {
        // Find display position for this bead
        const rowOffset = Math.floor(y * offset) % wedgeBase;
        const displayX = (x - rowOffset + width) % width;

        if (displayX < displayWidth) {
          const canvasX = displayX * zoom;
          const canvasY = (height - 1 - y) * zoom;
          ctx.fillRect(canvasX, canvasY, zoom - 1, zoom - 1);
        }
      }
    }
  }
}

/**
 * Render highlights for currently spoken beads in wrapped view
 */
function renderWrappedHighlights(
  ctx: CanvasRenderingContext2D,
  pattern: BallPattern,
  highlightedBeads: HighlightedBeads,
  zoom: number,
  offset: number,
  displayWidth: number
) {
  const { height, width, wedgeBase } = pattern;

  ctx.strokeStyle = '#ff0000';
  ctx.lineWidth = 3;

  for (const pos of highlightedBeads.positions) {
    const rowOffset = Math.floor(pos.y * offset) % wedgeBase;
    const displayX = (pos.x - rowOffset + width) % width;

    if (displayX < displayWidth) {
      const screenX = displayX * zoom;
      const screenY = (height - 1 - pos.y) * zoom;
      ctx.strokeRect(screenX - 1, screenY - 1, zoom + 1, zoom + 1);
    }
  }

  ctx.fillStyle = 'rgba(255, 0, 0, 0.2)';
  for (const pos of highlightedBeads.positions) {
    const rowOffset = Math.floor(pos.y * offset) % wedgeBase;
    const displayX = (pos.x - rowOffset + width) % width;

    if (displayX < displayWidth) {
      const screenX = displayX * zoom;
      const screenY = (height - 1 - pos.y) * zoom;
      ctx.fillRect(screenX, screenY, zoom - 1, zoom - 1);
    }
  }
}
