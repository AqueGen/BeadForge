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

// Row number spacing for display
const ROW_NUMBER_HEIGHT = 20;

/**
 * Ball Wrapped View - Shows ball pattern as if wrapped around the ball
 * Similar to CrochetBeadPaint's middle view - demonstrates how wedges connect
 * Uses round beads like the reference screenshots
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

    // Show FULL pattern width to match CrochetBeadPaint reference
    const displayWidth = pattern.width;
    const displayHeight = pattern.height;

    // Bead size with small gap
    const beadSize = zoom * 0.9;
    const beadRadius = beadSize / 2;

    const canvasWidth = displayWidth * zoom;
    const canvasHeight = displayHeight * zoom + ROW_NUMBER_HEIGHT;

    canvas.width = canvasWidth;
    canvas.height = canvasHeight;

    // Clear background - dark like CrochetBeadPaint
    ctx.fillStyle = '#333333';
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    // Render wrapped pattern with round beads
    renderWrappedPattern(ctx, pattern, zoom, offset, displayWidth, beadRadius);

    // Render completion overlay
    if (completedBeads > 0) {
      renderWrappedCompletedOverlay(ctx, pattern, zoom, offset, completedBeads, displayWidth, beadRadius);
    }

    // Render highlights
    if (highlightedBeads && highlightedBeads.positions.length > 0) {
      renderWrappedHighlights(ctx, pattern, highlightedBeads, zoom, offset, displayWidth, beadRadius);
    }

    // Render row numbers at the bottom
    renderRowNumbers(ctx, pattern, zoom, displayHeight);
  }, [pattern, zoom, offset, highlightedBeads, completedBeads]);

  return (
    <div className="flex flex-col overflow-hidden rounded-lg bg-white shadow">
      <div className="border-b bg-gray-50 px-4 py-2">
        <h4 className="text-sm font-medium text-gray-700">
          Симуляция (смещение: {offset})
        </h4>
      </div>

      <div className="custom-scrollbar flex-1 overflow-auto p-2">
        <canvas ref={canvasRef} />
      </div>
    </div>
  );
};

/**
 * Render the wrapped/simulated ball pattern with ROUND beads
 * Shows how wedges connect when wrapped around the ball
 * Matches CrochetBeadPaint visual style
 */
function renderWrappedPattern(
  ctx: CanvasRenderingContext2D,
  pattern: BallPattern,
  zoom: number,
  offset: number,
  displayWidth: number,
  beadRadius: number
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

      // Convert grid coords to canvas center coords for circles
      const centerX = displayX * zoom + zoom / 2;
      const centerY = (height - 1 - y) * zoom + zoom / 2;

      // Draw round bead
      ctx.beginPath();
      ctx.arc(centerX, centerY, beadRadius, 0, Math.PI * 2);
      ctx.fillStyle = rgba;
      ctx.fill();

      // Add subtle border for definition
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
      ctx.lineWidth = 0.5;
      ctx.stroke();
    }
  }

  // Draw center line (equator) - dashed for better visibility
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
  ctx.lineWidth = 2;
  ctx.setLineDash([5, 5]);
  const midY = pattern.wedgeHeight * zoom;
  ctx.beginPath();
  ctx.moveTo(0, midY);
  ctx.lineTo(displayWidth * zoom, midY);
  ctx.stroke();
  ctx.setLineDash([]);
}

/**
 * Render row numbers at the bottom of the canvas
 */
function renderRowNumbers(
  ctx: CanvasRenderingContext2D,
  pattern: BallPattern,
  zoom: number,
  displayHeight: number
) {
  const { width } = pattern;
  const yPos = displayHeight * zoom + 15;

  ctx.fillStyle = '#666';
  ctx.font = '10px Arial';
  ctx.textAlign = 'center';

  // Show row numbers every 5 columns
  for (let x = 0; x < width; x += 5) {
    const xPos = x * zoom + zoom / 2;
    ctx.fillText(String(x), xPos, yPos);
  }
}

/**
 * Render dimming overlay for completed beads in wrapped view (round beads)
 */
function renderWrappedCompletedOverlay(
  ctx: CanvasRenderingContext2D,
  pattern: BallPattern,
  zoom: number,
  offset: number,
  completedBeads: number,
  displayWidth: number,
  beadRadius: number
) {
  ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';

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
          const centerX = displayX * zoom + zoom / 2;
          const centerY = (height - 1 - y) * zoom + zoom / 2;

          // Draw round overlay
          ctx.beginPath();
          ctx.arc(centerX, centerY, beadRadius, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
  }
}

/**
 * Render highlights for currently spoken beads in wrapped view (round beads)
 */
function renderWrappedHighlights(
  ctx: CanvasRenderingContext2D,
  pattern: BallPattern,
  highlightedBeads: HighlightedBeads,
  zoom: number,
  offset: number,
  displayWidth: number,
  beadRadius: number
) {
  const { height, width, wedgeBase } = pattern;

  for (const pos of highlightedBeads.positions) {
    const rowOffset = Math.floor(pos.y * offset) % wedgeBase;
    const displayX = (pos.x - rowOffset + width) % width;

    if (displayX < displayWidth) {
      const centerX = displayX * zoom + zoom / 2;
      const centerY = (height - 1 - pos.y) * zoom + zoom / 2;

      // Draw highlight fill
      ctx.beginPath();
      ctx.arc(centerX, centerY, beadRadius + 2, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255, 0, 0, 0.3)';
      ctx.fill();

      // Draw highlight border
      ctx.strokeStyle = '#ff0000';
      ctx.lineWidth = 3;
      ctx.stroke();
    }
  }
}
