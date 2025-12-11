'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import { Navigation } from '@/components/layout/Navigation';
import { Toolbar } from '@/components/editor/Toolbar';
import { ColorPalette } from '@/components/editor/ColorPalette';
import { BallPatternCanvas } from '@/components/editor/BallPatternCanvas';
import { BallTTSPanel } from '@/components/tts/BallTTSPanel';
import { useBallPattern } from '@/hooks/useBallPattern';
import { DEFAULT_COLORS, BALL_SIZE_CONFIGS, type DrawingTool, type HighlightedBeads } from '@/types';
import { isPositionInWedge, getHighlightedBeadsForBall } from '@/lib/pattern/ballPattern';

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
        <h2 className="mb-4 text-lg font-semibold">Новая схема шара</h2>

        <div className="mb-4">
          <label className="mb-2 block text-sm font-medium text-gray-700">
            Диаметр шара
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
                <div className="font-medium">{cfg.diameter} см</div>
                <div className="text-xs text-gray-500">
                  {cfg.circumference} бусин в обхвате
                </div>
              </button>
            ))}
          </div>
        </div>

        {config && (
          <div className="mb-4 rounded bg-gray-50 p-3 text-sm">
            <div className="grid grid-cols-2 gap-2 text-gray-600">
              <div>Основание клина: {config.wedgeBase}</div>
              <div>Высота клина: {config.wedgeHeight}</div>
              <div>6 верхних + 6 нижних клиньев</div>
              <div>Линейное сужение (-1/ряд)</div>
            </div>
          </div>
        )}

        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded border px-4 py-2 text-sm hover:bg-gray-50"
          >
            Отмена
          </button>
          <button
            onClick={handleCreate}
            className="rounded bg-primary-500 px-4 py-2 text-sm text-white hover:bg-primary-600"
          >
            Создать
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
      // Use the same isPositionInWedge function used everywhere else
      if (isPositionInWedge(pattern, px, py)) {
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
  const [showNewDialog, setShowNewDialog] = useState(false); // Don't show dialog - try to load saved pattern first
  const [highlightedBeads, setHighlightedBeads] = useState<HighlightedBeads | null>(null);
  const [completedBeads, setCompletedBeads] = useState(0);
  const [ttsNavigationMode, setTtsNavigationMode] = useState(false);
  const [editModeEnabled, setEditModeEnabled] = useState(false);
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

      // Handle edit mode - only allow editing when enabled
      if (editModeEnabled) {
        if (tool === 'pencil') {
          actions.setBead(x, y, selectedColor);
        } else if (tool === 'fill') {
          actions.floodFill(x, y, selectedColor);
        } else if (tool === 'pipette') {
          const colorIndex = pattern.field[y * pattern.width + x];
          setSelectedColor(colorIndex);
          setTool('pencil');
        }
        return;
      }

      // If no mode is enabled, do nothing
    },
    [tool, selectedColor, actions, pattern, ttsNavigationMode, editModeEnabled]
  );

  const handleBeadDrag = useCallback(
    (x: number, y: number) => {
      // Only allow dragging when edit mode is enabled
      if (editModeEnabled && tool === 'pencil') {
        actions.setBead(x, y, selectedColor);
      }
    },
    [tool, selectedColor, actions, editModeEnabled]
  );

  const handleShowStats = useCallback(() => {
    const stats = actions.getStats();
    if (stats) {
      alert(
        `Диаметр: ${stats.diameter} см\n` +
        `Обхват: ${stats.circumference} бусин\n` +
        `Основание клина: ${stats.wedgeBase} бусин\n` +
        `Высота клина: ${stats.wedgeHeight} рядов\n` +
        `Всего бусин: ${stats.totalBeads}`
      );
    }
  }, [actions]);

  const handleTTSStateChange = useCallback(
    (position: number, groupCount: number, isActive: boolean) => {
      if (isActive && position > 0 && groupCount > 0 && pattern) {
        const highlighted = getHighlightedBeadsForBall(pattern, position, groupCount);
        setHighlightedBeads(highlighted);
      } else {
        setHighlightedBeads(null);
      }
    },
    [pattern]
  );

  return (
    <div className="flex min-h-screen">
      <Navigation />
      <div className="flex flex-1 flex-col">
        {/* Header */}
        <header className="flex h-12 items-center justify-between border-b bg-white px-4">
        <div className="flex items-center gap-4">
          <Link href="/" className="text-xl font-bold text-primary-600 hover:text-primary-700">
            BeadForge
          </Link>
          <span className="text-gray-400">|</span>
          <span className="text-sm text-gray-600">{pattern?.name || 'Шар'}</span>
        </div>
        <nav className="flex items-center gap-2">
          <Link
            href="/rope"
            className="px-3 py-1 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded"
          >
            ← Жгут
          </Link>
        </nav>
      </header>

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
        onSaveJBB={() => actions.saveJBB()}
        onLoadJBB={actions.loadJBB}
      />

      <div className="flex flex-1">
        {/* Sidebar */}
        <aside className="w-52 border-r bg-white p-4">
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-500">
            Цвета
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
                Операции с клиньями
              </h3>
              <div className="space-y-2">
                <button
                  onClick={() => actions.copyWedgeToAll(0, true)}
                  className="w-full rounded border px-2 py-1 text-xs hover:bg-gray-50"
                  title="Скопировать первый верхний клин во все верхние"
                >
                  Верх 1 → все верхние
                </button>
                <button
                  onClick={() => actions.copyWedgeToAll(6, true)}
                  className="w-full rounded border px-2 py-1 text-xs hover:bg-gray-50"
                  title="Скопировать первый нижний клин во все нижние"
                >
                  Низ 1 → все нижние
                </button>
                <button
                  onClick={() => {
                    // Copy top wedge pattern to corresponding bottom wedges
                    for (let i = 0; i < 6; i++) {
                      actions.copyWedge(i, i + 6);
                    }
                  }}
                  className="w-full rounded border px-2 py-1 text-xs hover:bg-gray-50"
                  title="Скопировать все верхние клинья в нижние"
                >
                  Верх → Низ
                </button>
                <button
                  onClick={() => actions.mirrorWedge(0)}
                  className="w-full rounded border px-2 py-1 text-xs hover:bg-gray-50"
                  title="Отзеркалить первый верхний клин горизонтально"
                >
                  Зеркало (верх 1)
                </button>
              </div>
            </div>
          )}

          <div className="mt-6 border-t pt-4">
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500">
              Информация
            </h3>
            {pattern ? (
              <>
                <p className="text-xs text-gray-600">
                  Диаметр: {pattern.diameter} см
                </p>
                <p className="text-xs text-gray-600">
                  Обхват: {pattern.circumference} бусин
                </p>
                <p className="text-xs text-gray-600">
                  Клин: {pattern.wedgeBase} × {pattern.wedgeHeight}
                </p>
                <p className="text-xs text-gray-600">Инструмент: {tool}</p>
                <p className="text-xs text-gray-600">
                  Цвет: {DEFAULT_COLORS[selectedColor]?.name || `#${selectedColor}`}
                </p>
              </>
            ) : (
              <p className="text-xs text-gray-500">
                Создайте схему шара
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
                <p className="mb-4 text-lg">Схема шара не создана</p>
                <button
                  onClick={() => setShowNewDialog(true)}
                  className="rounded bg-primary-500 px-4 py-2 text-white hover:bg-primary-600"
                >
                  Создать новую схему
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
              onTTSStateChange={handleTTSStateChange}
              onCompletedBeadsChange={setCompletedBeads}
              onNavigationModeChange={setTtsNavigationMode}
              onEditModeChange={setEditModeEnabled}
              navigateToPosition={ttsNavigateTarget}
              onNavigateComplete={() => setTtsNavigateTarget(null)}
            />
          ) : (
            <div className="p-4 text-center text-gray-500">
              Создайте схему для использования озвучки
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
    </div>
  );
}
