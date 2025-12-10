'use client';

import { useState, useCallback } from 'react';
import { Header } from '@/components/layout/Header';
import { Toolbar } from '@/components/editor/Toolbar';
import { ColorPalette } from '@/components/editor/ColorPalette';
import { BallPatternCanvas } from '@/components/editor/BallPatternCanvas';
import { BallTTSPanel } from '@/components/tts/BallTTSPanel';
import { useBallPattern } from '@/hooks/useBallPattern';
import { DEFAULT_COLORS, BALL_SIZE_CONFIGS, type DrawingTool, type HighlightedBeads } from '@/types';

// Ball Pattern Creation Dialog
function NewBallPatternDialog({
  isOpen,
  onClose,
  onCreate,
}: {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (diameter: number) => void;
}) {
  const [diameter, setDiameter] = useState(4);

  if (!isOpen) return null;

  const config = BALL_SIZE_CONFIGS.find(c => c.diameter === diameter);

  const handleCreate = () => {
    onCreate(diameter);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-96 rounded-lg bg-white p-6 shadow-xl">
        <h2 className="mb-4 text-lg font-semibold">New Ball Pattern</h2>

        <div className="mb-4">
          <label className="mb-2 block text-sm font-medium text-gray-700">
            Ball Diameter
          </label>
          <div className="grid grid-cols-2 gap-2">
            {BALL_SIZE_CONFIGS.map((cfg) => (
              <button
                key={cfg.diameter}
                onClick={() => setDiameter(cfg.diameter)}
                className={`rounded border p-3 text-left transition-colors ${
                  diameter === cfg.diameter
                    ? 'border-primary-500 bg-primary-50'
                    : 'border-gray-200 hover:bg-gray-50'
                }`}
              >
                <div className="font-medium">{cfg.diameter} cm</div>
                <div className="text-xs text-gray-500">
                  {cfg.circumference} beads around
                </div>
              </button>
            ))}
          </div>
        </div>

        {config && (
          <div className="mb-4 rounded bg-gray-50 p-3 text-sm">
            <div className="grid grid-cols-2 gap-2 text-gray-600">
              <div>Wedge base: {config.wedgeBase} beads</div>
              <div>Wedge height: {config.wedgeHeight} rows</div>
              <div>6 top wedges + 6 bottom wedges</div>
              <div>Linear taper (-1/row)</div>
            </div>
          </div>
        )}

        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded border px-4 py-2 text-sm hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleCreate}
            className="rounded bg-primary-500 px-4 py-2 text-sm text-white hover:bg-primary-600"
          >
            Create
          </button>
        </div>
      </div>
    </div>
  );
}

// Helper function to convert ball pattern coordinates to linear position
function ballCoordinatesToPosition(pattern: ReturnType<typeof useBallPattern>['pattern'], x: number, y: number): number | null {
  if (!pattern) return null;

  let position = 0;

  // Same reading order as TTS: bottom to top, left to right
  for (let py = 0; py < pattern.height; py++) {
    for (let px = 0; px < pattern.width; px++) {
      // Check if position is in a wedge
      const wedgeCol = Math.floor(px / pattern.wedgeBase);
      const localX = px % pattern.wedgeBase;
      const isTopRow = py >= pattern.wedgeHeight;
      const localY = isTopRow ? py - pattern.wedgeHeight : pattern.wedgeHeight - 1 - py;
      const wedgeWidth = pattern.wedgeBase - localY;
      const offset = Math.floor(localY / 2);

      if (localX >= offset && localX < offset + wedgeWidth) {
        position++;
        if (px === x && py === y) {
          return position;
        }
      }
    }
  }

  return null;
}

export default function BallEditorPage() {
  const { pattern, actions } = useBallPattern();
  const [selectedColor, setSelectedColor] = useState(1);
  const [tool, setTool] = useState<DrawingTool>('pencil');
  const [zoom, setZoom] = useState(15);
  const [showNewDialog, setShowNewDialog] = useState(true); // Show dialog on first load
  const [highlightedBeads, setHighlightedBeads] = useState<HighlightedBeads | null>(null);
  const [completedBeads, setCompletedBeads] = useState(0);
  const [ttsNavigationMode, setTtsNavigationMode] = useState(false);
  const [ttsNavigateTarget, setTtsNavigateTarget] = useState<number | null>(null);

  const handleCreatePattern = useCallback(
    (diameter: number) => {
      actions.create(diameter, `Ball Pattern ${diameter}cm`);
    },
    [actions]
  );

  const handleBeadClick = useCallback(
    (x: number, y: number) => {
      if (!pattern) return;

      // Handle TTS navigation mode
      if (ttsNavigationMode) {
        const position = ballCoordinatesToPosition(pattern, x, y);
        if (position !== null) {
          setTtsNavigateTarget(position);
        }
        return;
      }

      if (tool === 'pencil') {
        actions.setBead(x, y, selectedColor);
      } else if (tool === 'fill') {
        actions.floodFill(x, y, selectedColor);
      } else if (tool === 'pipette') {
        const colorIndex = pattern.field[y * pattern.width + x];
        setSelectedColor(colorIndex);
        setTool('pencil');
      }
    },
    [tool, selectedColor, actions, pattern, ttsNavigationMode]
  );

  const handleBeadDrag = useCallback(
    (x: number, y: number) => {
      if (tool === 'pencil') {
        actions.setBead(x, y, selectedColor);
      }
    },
    [tool, selectedColor, actions]
  );

  const handleShowStats = useCallback(() => {
    const stats = actions.getStats();
    if (stats) {
      alert(
        `Diameter: ${stats.diameter} cm\n` +
        `Circumference: ${stats.circumference} beads\n` +
        `Wedge base: ${stats.wedgeBase} beads\n` +
        `Wedge height: ${stats.wedgeHeight} rows\n` +
        `Total beads: ${stats.totalBeads}`
      );
    }
  }, [actions]);

  return (
    <div className="flex min-h-screen flex-col">
      <Header patternName={pattern?.name || 'Ball Pattern'} />

      <Toolbar
        tool={tool}
        onToolChange={setTool}
        zoom={zoom}
        onZoomChange={setZoom}
        onClear={() => actions.clear()}
        onMirrorH={() => {
          // Mirror first top wedge
          if (pattern) actions.mirrorWedge(0);
        }}
        onMirrorV={() => {
          // Copy first top wedge to all top wedges
          if (pattern) actions.copyWedgeToAll(0, true);
        }}
        onSave={() => actions.save()}
        onLoad={actions.load}
        onNew={() => setShowNewDialog(true)}
        onShowStats={handleShowStats}
      />

      <div className="flex flex-1">
        {/* Sidebar */}
        <aside className="w-52 border-r bg-white p-4">
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-500">
            Colors
          </h3>
          <ColorPalette
            colors={DEFAULT_COLORS}
            selectedColor={selectedColor}
            onColorSelect={setSelectedColor}
          />

          {/* Wedge Operations */}
          {pattern && (
            <div className="mt-6 border-t pt-4">
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500">
                Wedge Operations
              </h3>
              <div className="space-y-2">
                <button
                  onClick={() => actions.copyWedgeToAll(0, true)}
                  className="w-full rounded border px-2 py-1 text-xs hover:bg-gray-50"
                  title="Copy first top wedge to all other top wedges"
                >
                  Copy Top Wedge 1 → All Top
                </button>
                <button
                  onClick={() => actions.copyWedgeToAll(6, true)}
                  className="w-full rounded border px-2 py-1 text-xs hover:bg-gray-50"
                  title="Copy first bottom wedge to all other bottom wedges"
                >
                  Copy Bottom Wedge 1 → All Bottom
                </button>
                <button
                  onClick={() => {
                    // Copy top wedge pattern to corresponding bottom wedges
                    for (let i = 0; i < 6; i++) {
                      actions.copyWedge(i, i + 6);
                    }
                  }}
                  className="w-full rounded border px-2 py-1 text-xs hover:bg-gray-50"
                  title="Copy all top wedges to bottom wedges"
                >
                  Copy Top → Bottom
                </button>
                <button
                  onClick={() => actions.mirrorWedge(0)}
                  className="w-full rounded border px-2 py-1 text-xs hover:bg-gray-50"
                  title="Mirror first top wedge horizontally"
                >
                  Mirror Top Wedge 1
                </button>
              </div>
            </div>
          )}

          <div className="mt-6 border-t pt-4">
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500">
              Info
            </h3>
            {pattern ? (
              <>
                <p className="text-xs text-gray-600">
                  Diameter: {pattern.diameter} cm
                </p>
                <p className="text-xs text-gray-600">
                  Circumference: {pattern.circumference} beads
                </p>
                <p className="text-xs text-gray-600">
                  Wedge: {pattern.wedgeBase} × {pattern.wedgeHeight}
                </p>
                <p className="text-xs text-gray-600">Tool: {tool}</p>
                <p className="text-xs text-gray-600">
                  Color: {DEFAULT_COLORS[selectedColor]?.name || `#${selectedColor}`}
                </p>
              </>
            ) : (
              <p className="text-xs text-gray-500">
                Create a ball pattern to start
              </p>
            )}
          </div>
        </aside>

        {/* Canvas Area */}
        <main className="flex flex-1 gap-4 overflow-auto bg-gray-200 p-4">
          {pattern ? (
            <BallPatternCanvas
              pattern={pattern}
              zoom={zoom}
              showGrid={true}
              onBeadClick={handleBeadClick}
              onBeadDrag={handleBeadDrag}
              highlightedBeads={highlightedBeads}
              completedBeads={completedBeads}
            />
          ) : (
            <div className="flex flex-1 items-center justify-center">
              <div className="text-center text-gray-500">
                <p className="mb-4 text-lg">No ball pattern created</p>
                <button
                  onClick={() => setShowNewDialog(true)}
                  className="rounded bg-primary-500 px-4 py-2 text-white hover:bg-primary-600"
                >
                  Create New Ball Pattern
                </button>
              </div>
            </div>
          )}
        </main>

        {/* TTS Panel */}
        <aside className="w-80 border-l bg-white">
          {pattern ? (
            <BallTTSPanel
              pattern={pattern}
              onTTSStateChange={(position, groupCount, isActive) => {
                if (isActive && position > 0) {
                  // Calculate positions for highlighted beads
                  const positions: { x: number; y: number }[] = [];
                  let beadCount = 0;

                  // Same reading order as TTS: bottom to top, left to right
                  outer: for (let y = 0; y < pattern.height; y++) {
                    for (let x = 0; x < pattern.width; x++) {
                      // Check if position is in a wedge (simplified check)
                      const localX = x % pattern.wedgeBase;
                      const isTopRow = y >= pattern.wedgeHeight;
                      const localY = isTopRow ? y - pattern.wedgeHeight : pattern.wedgeHeight - 1 - y;
                      const wedgeWidth = pattern.wedgeBase - localY;
                      const offset = Math.floor(localY / 2);

                      if (localX >= offset && localX < offset + wedgeWidth) {
                        beadCount++;
                        if (beadCount >= position && beadCount < position + groupCount) {
                          positions.push({ x, y });
                        }
                        if (beadCount >= position + groupCount - 1) {
                          break outer;
                        }
                      }
                    }
                  }

                  if (positions.length > 0) {
                    setHighlightedBeads({
                      positions,
                      colorIndex: pattern.field[positions[0].y * pattern.width + positions[0].x],
                    });
                  }
                } else {
                  setHighlightedBeads(null);
                }
              }}
              onCompletedBeadsChange={setCompletedBeads}
              onNavigationModeChange={setTtsNavigationMode}
              navigateToPosition={ttsNavigateTarget}
              onNavigateComplete={() => setTtsNavigateTarget(null)}
            />
          ) : (
            <div className="p-4 text-center text-gray-500">
              Create a pattern to use TTS
            </div>
          )}
        </aside>
      </div>

      {/* New Ball Pattern Dialog */}
      <NewBallPatternDialog
        isOpen={showNewDialog}
        onClose={() => setShowNewDialog(false)}
        onCreate={handleCreatePattern}
      />
    </div>
  );
}
