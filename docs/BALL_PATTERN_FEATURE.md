# Ball Pattern Feature Documentation

This document contains complete specifications for the Ball Pattern feature in BeadForge.
Use this document to regenerate the feature when needed.

## Overview

Ball patterns represent beaded balls (spheres) used in bead crochet. The pattern consists of:
- **6 top wedges** (pointing up) - triangular sections that form the top hemisphere
- **6 bottom wedges** (pointing down) - triangular sections that form the bottom hemisphere
- **Zigzag layout** - wedges are arranged in alternating up/down pattern

Visual representation:
```
  /\    /\    /\    /\    /\    /\      <- 6 top wedges (pointing up)
 /  \  /  \  /  \  /  \  /  \  /  \
/    \/    \/    \/    \/    \/    \
\    /\    /\    /\    /\    /\    /
 \  /  \  /  \  /  \  /  \  /  \  /
  \/    \/    \/    \/    \/    \/      <- 6 bottom wedges (pointing down)
```

## Size Configurations

Ball sizes are defined by diameter in centimeters:

| Diameter | Circumference | Wedge Base | Wedge Height |
|----------|---------------|------------|--------------|
| 3 cm     | 66 beads      | 11 beads   | 20 rows      |
| 4 cm     | 86 beads      | 14 beads   | 25 rows      |
| 5 cm     | 104 beads     | 17 beads   | 30 rows      |
| 6 cm     | 120 beads     | 20 beads   | 35 rows      |

Key formulas:
- `width = circumference` (total beads in grid row)
- `height = wedgeHeight * 2` (top + bottom wedges)
- `wedgeBase = circumference / 6`

## TypeScript Types

### BallSizeConfig
```typescript
export interface BallSizeConfig {
  diameter: number;      // Diameter in cm (3, 4, 5, 6)
  circumference: number; // Total beads around circumference
  wedgeBase: number;     // Beads at wedge base (circumference / 6)
  wedgeHeight: number;   // Number of rows in wedge
}
```

### BallPattern
```typescript
export interface BallPattern {
  id: string;
  name: string;
  author?: string;
  notes?: string;
  type: 'ball';

  // Ball-specific dimensions
  diameter: number;
  circumference: number;
  wedgeBase: number;
  wedgeHeight: number;

  // Grid dimensions
  width: number;   // = circumference
  height: number;  // = wedgeHeight * 2

  // Pattern data
  field: Uint8Array;    // Color indices (row-major)
  colors: BeadColor[];  // Palette

  // Metadata
  createdAt: Date;
  updatedAt: Date;
  isPublic: boolean;
  price?: number;
  previewUrl?: string;
}
```

### WedgeInfo
```typescript
export interface WedgeInfo {
  index: number;           // 0-11 (0-5 top, 6-11 bottom)
  position: 'top' | 'bottom';
  startX: number;          // X offset in field
  startY: number;          // Y offset in field
  base: number;            // Width at base
  height: number;          // Number of rows
}
```

## Core Algorithms

### Wedge Width Calculation (Linear Taper)
Each wedge tapers linearly from base (widest) to tip (1 bead):

```typescript
export function getWedgeWidthAtRow(
  wedgeBase: number,
  wedgeHeight: number,
  localRow: number
): number {
  if (localRow < 0 || localRow >= wedgeHeight) return 0;

  // Linear taper: base at row 0, reducing until tip
  // At row 0: width = base
  // At row height-1: width = 1
  const ratio = localRow / (wedgeHeight - 1);
  const width = Math.round(wedgeBase - (wedgeBase - 1) * ratio);
  return Math.max(1, width);
}
```

### Position In Wedge Check
Determines if a grid coordinate falls within a wedge's triangular area:

```typescript
export function isPositionInWedge(
  pattern: BallPattern,
  x: number,
  y: number
): boolean {
  const { wedgeBase, wedgeHeight } = pattern;

  // Determine if in top or bottom half
  const isTopHalf = y >= wedgeHeight;

  // Calculate wedge column (0-5)
  const wedgeColumn = Math.floor(x / wedgeBase);
  if (wedgeColumn < 0 || wedgeColumn >= 6) return false;

  // Local position within wedge
  const localX = x % wedgeBase;

  let localRow: number;
  if (isTopHalf) {
    // Top wedges: y goes from wedgeHeight (base) to 2*wedgeHeight-1 (tip)
    localRow = y - wedgeHeight;
  } else {
    // Bottom wedges: y goes from wedgeHeight-1 (base) to 0 (tip)
    localRow = (wedgeHeight - 1) - y;
  }

  if (localRow < 0 || localRow >= wedgeHeight) return false;

  // Check if localX falls within tapered width
  const rowWidth = getWedgeWidthAtRow(wedgeBase, wedgeHeight, localRow);
  const rowOffset = Math.floor((wedgeBase - rowWidth) / 2);

  return localX >= rowOffset && localX < rowOffset + rowWidth;
}
```

### TTS Bead List Generation (with Skip Cells)
Reading order: bottom-to-top, left-to-right, skipping empty spaces and skip cells:

```typescript
export function generateBallBeadListForTTS(
  pattern: BallPattern,
  language: TTSLanguage
): TTSBeadItem[] {
  const items: TTSBeadItem[] = [];
  let position = 1;

  for (let y = 0; y < pattern.height; y++) {
    for (let x = 0; x < pattern.width; x++) {
      // Skip positions outside wedges
      if (!isPositionInWedge(pattern, x, y)) continue;

      const colorIndex = pattern.field[y * pattern.width + x];

      // Skip cells with SKIP_COLOR_INDEX (255)
      if (colorIndex === SKIP_COLOR_INDEX) continue;

      items.push({
        colorIndex,
        colorName: getColorName(color?.name, language, colorIndex),
        position: position++,
      });
    }
  }

  return items;
}
```

### Highlighted Beads for TTS
Get coordinates for beads to highlight during TTS playback:

```typescript
export function getHighlightedBeadsForBall(
  pattern: BallPattern,
  startPosition: number,
  count: number
): { positions: { x: number; y: number }[]; colorIndex: number } | null {
  if (startPosition < 1 || count < 1) return null;

  const positions: { x: number; y: number }[] = [];
  let colorIndex = 0;
  let beadCount = 0;
  const endPosition = startPosition + count;

  for (let y = 0; y < pattern.height; y++) {
    for (let x = 0; x < pattern.width; x++) {
      if (isPositionInWedge(pattern, x, y)) {
        const cellColorIndex = pattern.field[y * pattern.width + x];

        // Skip cells with SKIP_COLOR_INDEX
        if (cellColorIndex === SKIP_COLOR_INDEX) continue;

        beadCount++;
        if (beadCount >= startPosition && beadCount < endPosition) {
          positions.push({ x, y });
          if (positions.length === 1) colorIndex = cellColorIndex;
        }
        if (beadCount >= endPosition - 1) {
          return positions.length > 0 ? { positions, colorIndex } : null;
        }
      }
    }
  }

  return positions.length > 0 ? { positions, colorIndex } : null;
}
```

## Drawing Tools

### Flood Fill (Wedge-Aware)
```typescript
export function floodFillBallPattern(
  pattern: BallPattern,
  startX: number,
  startY: number,
  newColorIndex: number
): BallPattern {
  // Don't fill outside wedges
  if (!isPositionInWedge(pattern, startX, startY)) return pattern;

  const targetColor = pattern.field[startY * pattern.width + startX];
  if (targetColor === newColorIndex) return pattern;

  const newField = new Uint8Array(pattern.field);
  const visited = new Set<number>();
  const stack: Array<{ x: number; y: number }> = [{ x: startX, y: startY }];

  while (stack.length > 0) {
    const { x, y } = stack.pop()!;
    const idx = y * pattern.width + x;

    if (visited.has(idx)) continue;
    visited.add(idx);

    if (x < 0 || x >= pattern.width || y < 0 || y >= pattern.height) continue;
    if (!isPositionInWedge(pattern, x, y)) continue;
    if (newField[idx] !== targetColor) continue;

    newField[idx] = newColorIndex;

    stack.push({ x: x + 1, y }, { x: x - 1, y }, { x, y: y + 1 }, { x, y: y - 1 });
  }

  return { ...pattern, field: newField, updatedAt: new Date() };
}
```

### Line Drawing (Bresenham's Algorithm)
```typescript
export function drawLineBallPattern(
  pattern: BallPattern,
  x0: number, y0: number,
  x1: number, y1: number,
  colorIndex: number
): BallPattern {
  const newField = new Uint8Array(pattern.field);

  // Bresenham's line algorithm
  const dx = Math.abs(x1 - x0);
  const dy = Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let err = dx - dy;
  let x = x0, y = y0;

  while (true) {
    if (x >= 0 && x < pattern.width && y >= 0 && y < pattern.height
        && isPositionInWedge(pattern, x, y)) {
      newField[y * pattern.width + x] = colorIndex;
    }

    if (x === x1 && y === y1) break;

    const e2 = 2 * err;
    if (e2 > -dy) { err -= dy; x += sx; }
    if (e2 < dx) { err += dx; y += sy; }
  }

  return { ...pattern, field: newField, updatedAt: new Date() };
}
```

## Wedge Operations

### Copy Single Wedge
```typescript
export function copyWedge(
  pattern: BallPattern,
  sourceWedgeIndex: number,
  targetWedgeIndex: number
): boolean {
  const sourceWedge = getWedgeByIndex(pattern, sourceWedgeIndex);
  const targetWedge = getWedgeByIndex(pattern, targetWedgeIndex);
  if (!sourceWedge || !targetWedge) return false;

  const { wedgeBase, wedgeHeight } = pattern;

  for (let localRow = 0; localRow < wedgeHeight; localRow++) {
    const rowWidth = getWedgeWidthAtRow(wedgeBase, wedgeHeight, localRow);
    const rowOffset = getWedgeRowOffset(wedgeBase, wedgeHeight, localRow);

    for (let localX = 0; localX < rowWidth; localX++) {
      // Calculate global positions
      const sourceY = sourceWedge.position === 'top'
        ? sourceWedge.startY + localRow
        : (wedgeHeight - 1) - localRow;
      const sourceX = sourceWedge.startX + rowOffset + localX;

      const targetY = targetWedge.position === 'top'
        ? targetWedge.startY + localRow
        : (wedgeHeight - 1) - localRow;
      const targetX = targetWedge.startX + rowOffset + localX;

      const colorIndex = pattern.field[sourceY * pattern.width + sourceX];
      pattern.field[targetY * pattern.width + targetX] = colorIndex;
    }
  }

  pattern.updatedAt = new Date();
  return true;
}
```

### Copy Wedge to All
```typescript
export function copyWedgeToAll(
  pattern: BallPattern,
  sourceWedgeIndex: number,
  sameOrientationOnly: boolean = true
): boolean {
  const sourceWedge = getWedgeByIndex(pattern, sourceWedgeIndex);
  if (!sourceWedge) return false;

  const startIndex = sameOrientationOnly
    ? (sourceWedge.position === 'top' ? 0 : 6)
    : 0;
  const endIndex = sameOrientationOnly
    ? (sourceWedge.position === 'top' ? 6 : 12)
    : 12;

  for (let i = startIndex; i < endIndex; i++) {
    if (i !== sourceWedgeIndex) {
      copyWedge(pattern, sourceWedgeIndex, i);
    }
  }

  return true;
}
```

### Mirror Wedge Horizontally
```typescript
export function mirrorWedgeHorizontally(
  pattern: BallPattern,
  wedgeIndex: number
): boolean {
  const wedge = getWedgeByIndex(pattern, wedgeIndex);
  if (!wedge) return false;

  const { wedgeBase, wedgeHeight } = pattern;

  for (let localRow = 0; localRow < wedgeHeight; localRow++) {
    const rowWidth = getWedgeWidthAtRow(wedgeBase, wedgeHeight, localRow);
    const rowOffset = getWedgeRowOffset(wedgeBase, wedgeHeight, localRow);

    const globalY = wedge.position === 'top'
      ? wedge.startY + localRow
      : (wedgeHeight - 1) - localRow;

    // Swap beads from left and right
    for (let i = 0; i < Math.floor(rowWidth / 2); i++) {
      const leftX = wedge.startX + rowOffset + i;
      const rightX = wedge.startX + rowOffset + rowWidth - 1 - i;

      const leftColor = pattern.field[globalY * pattern.width + leftX];
      const rightColor = pattern.field[globalY * pattern.width + rightX];

      pattern.field[globalY * pattern.width + leftX] = rightColor;
      pattern.field[globalY * pattern.width + rightX] = leftColor;
    }
  }

  pattern.updatedAt = new Date();
  return true;
}
```

## File Structure

### Files to Create

1. **`src/lib/pattern/ballPattern.ts`** - Core geometry calculations
   - `createBallPattern()`
   - `getAllWedges()`, `getWedgeByIndex()`
   - `getWedgeWidthAtRow()`, `getWedgeRowOffset()`
   - `getWedgeAtPosition()`, `isPositionInWedge()`
   - `getBallPatternBead()`, `setBallPatternBead()`
   - `countBallPatternBeads()`, `countBallBeadsByColor()`
   - `generateBallBeadListForTTS()`
   - `getHighlightedBeadsForBall()`
   - `ballPatternToDto()`, `dtoToBallPattern()`
   - `copyWedge()`, `copyWedgeToAll()`, `mirrorWedgeHorizontally()`

2. **`src/lib/pattern/ballDrawing.ts`** - Drawing tools
   - `floodFillBallPattern()`
   - `drawLineBallPattern()`
   - `drawRectangleBallPattern()`

3. **`src/hooks/useBallPattern.ts`** - React hook for state management
   - Pattern CRUD operations
   - LocalStorage persistence
   - JBB file import/export

4. **`src/hooks/useBallTTS.ts`** - TTS hook for ball patterns
   - Uses `TTSController.initializeBallPattern()`
   - Same interface as `useTTS` but for ball patterns

5. **`src/components/editor/BallPatternCanvas.tsx`** - Main editing canvas
   - Renders full rectangular grid
   - Only displays cells inside wedges
   - Handles click/drag for editing
   - Shows wedge boundaries and equator line
   - Renders TTS highlights and completed overlay

6. **`src/components/editor/BallWrappedView.tsx`** - Simulation view
   - Shows pattern as wrapped around ball
   - Row offset/stagger effect for bead crochet
   - Round beads (circles) like CrochetBeadPaint
   - Dark background (#333)
   - Row numbers at bottom

7. **`src/components/tts/BallTTSPanel.tsx`** - TTS control panel
   - Same UI as TTSPanel but uses `useBallTTS`
   - Ball-specific info display
   - Edit mode and navigation mode toggles

8. **`src/app/ball/page.tsx`** - Ball editor page
   - Two-panel layout: BallWrappedView (top) + BallPatternCanvas (bottom)
   - Offset selector for row stagger
   - Wedge operations buttons in sidebar
   - TTS panel on right side

### Exports to Add

In `src/lib/pattern/index.ts`:
```typescript
export * from './ballPattern';
export * from './ballDrawing';
export { loadJBBBall, downloadJBBBall, saveJBBBall } from './jbbFormat';
```

In `src/hooks/index.ts`:
```typescript
export { useBallPattern } from './useBallPattern';
export { useBallTTS } from './useBallTTS';
```

## JBB Format Support

Ball patterns use the same JBB format as rope patterns. The conversion handles:
- Grid dimensions from JBB `width`/`height` → Ball dimensions
- Field data in row-major order (reversed Y)
- Color palette with 1-based indexing in JBB

Key functions in `jbbFormat.ts`:
- `loadJBBBall(content, filename)` - Parse JBB to BallPattern
- `saveJBBBall(pattern)` - Convert BallPattern to JBB string
- `downloadJBBBall(pattern, filename)` - Trigger file download

## UI Features

### Offset Control
Row stagger values for bead crochet simulation:
```typescript
const OFFSET_VALUES = [
  -0.5, -0.1, 0.1, 0.12, 0.15, 0.17, 0.2, 0.22, 0.25, 0.27,
  0.3, 0.32, 0.35, 0.37, 0.4, 0.42, 0.45, 0.47, 0.5, 0.52,
  0.55, 0.57, 0.6, 0.62, 0.65, 0.67, 0.7, 0.72, 0.75, 0.77, 0.8
];
```

### Wedge Operations (Sidebar Buttons)
1. "Верх 1 → все верхние" - Copy top wedge 0 to all top wedges
2. "Низ 1 → все нижние" - Copy bottom wedge 6 to all bottom wedges
3. "Верх → Низ" - Copy all top wedges to corresponding bottom wedges
4. "Зеркало (верх 1)" - Mirror first top wedge horizontally

### Skip Cells
- `SKIP_COLOR_INDEX = 255` - Special color for cells that are skipped in TTS
- Rendered as empty circle with X inside (gray color)
- Not counted in TTS positions

## TTS Integration

Ball patterns use `TTSController.initializeBallPattern()` which:
1. Generates bead list using `generateBallBeadListForTTS()`
2. Groups consecutive same-color beads
3. Handles skip cells (SKIP_COLOR_INDEX)

Highlighting uses `getHighlightedBeadsForBall()` to get coordinates for current TTS position.

## LocalStorage Keys

- `beadforge_ball_pattern` - Current ball pattern (serialized DTO)
- `beadforge_tts_settings` - TTS settings (shared with rope patterns)

## Navigation

- Header link: "← Жгут" returns to rope editor
- URL: `/ball` for ball editor, `/rope` for rope editor
- Main navigation component shared with rope editor

---

## Regeneration Checklist

When regenerating this feature:

1. [ ] Add types to `src/types/index.ts`:
   - `BallSizeConfig`, `BALL_SIZE_CONFIGS`, `getBallSizeConfig()`
   - `BallPattern`, `BallPatternDto`
   - `WedgeInfo`, `WedgePosition`

2. [ ] Create `src/lib/pattern/ballPattern.ts` with all geometry functions

3. [ ] Create `src/lib/pattern/ballDrawing.ts` with drawing tools

4. [ ] Add JBB support in `src/lib/pattern/jbbFormat.ts`:
   - `jbbToBallPattern()`, `ballPatternToJBB()`
   - `loadJBBBall()`, `saveJBBBall()`, `downloadJBBBall()`

5. [ ] Update `src/lib/pattern/index.ts` with exports

6. [ ] Create `src/hooks/useBallPattern.ts`

7. [ ] Create `src/hooks/useBallTTS.ts`

8. [ ] Update `src/hooks/index.ts` with exports

9. [ ] Add `initializeBallPattern()` to `TTSController` in `src/lib/tts/ttsService.ts`

10. [ ] Add `generateBallBeadListForTTS()` to `src/lib/tts/ttsService.ts`

11. [ ] Create `src/components/editor/BallPatternCanvas.tsx`

12. [ ] Create `src/components/editor/BallWrappedView.tsx`

13. [ ] Create `src/components/tts/BallTTSPanel.tsx`

14. [ ] Create `src/app/ball/page.tsx`

15. [ ] Add navigation link in rope editor header

16. [ ] Update Navigation component if needed
