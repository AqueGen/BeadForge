'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import { Navigation } from '@/components/layout/Navigation';
import { coordinatesToPosition } from '@/lib/pattern';
import { Toolbar } from '@/components/editor/Toolbar';
import { ColorPalette } from '@/components/editor/ColorPalette';
import { CanvasPanel } from '@/components/editor/CanvasPanel';
import { TTSPanel } from '@/components/tts';
import { usePattern } from '@/hooks/usePattern';
import { getSamplePatternList, getHighlightedBeads } from '@/lib/pattern';
import { DEFAULT_COLORS, type DrawingTool, type HighlightedBeads } from '@/types';

const SAMPLE_PATTERNS = getSamplePatternList();

// New Pattern Dialog component
function NewPatternDialog({
  isOpen,
  onClose,
  onCreate,
}: {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (width: number, height: number) => void;
}) {
  const [width, setWidth] = useState(8);
  const [height, setHeight] = useState(100);

  if (!isOpen) return null;

  const handleCreate = () => {
    onCreate(width, height);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-80 rounded-lg bg-white p-6 shadow-xl">
        <h2 className="mb-4 text-lg font-semibold">Новая схема</h2>

        <div className="mb-4">
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Ширина (обхват): 3-50
          </label>
          <input
            type="number"
            min={3}
            max={50}
            value={width}
            onChange={(e) => setWidth(Math.min(50, Math.max(3, parseInt(e.target.value) || 3)))}
            className="w-full rounded border px-3 py-2"
          />
        </div>

        <div className="mb-6">
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Высота (ряды): 1-1000
          </label>
          <input
            type="number"
            min={1}
            max={1000}
            value={height}
            onChange={(e) => setHeight(Math.min(1000, Math.max(1, parseInt(e.target.value) || 1)))}
            className="w-full rounded border px-3 py-2"
          />
        </div>

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

export default function RopeEditorPage() {
  const { pattern, actions } = usePattern(8, 100);
  const [selectedColor, setSelectedColor] = useState(1);
  const [tool, setTool] = useState<DrawingTool>('pencil');
  const [zoom, setZoom] = useState(20);
  const [shift, setShift] = useState(0);
  const [showNewDialog, setShowNewDialog] = useState(false);
  const [highlightedBeads, setHighlightedBeads] = useState<HighlightedBeads | null>(null);
  const [completedBeads, setCompletedBeads] = useState(0);
  const [ttsNavigationMode, setTtsNavigationMode] = useState(false);
  const [editModeEnabled, setEditModeEnabled] = useState(false);
  const [ttsNavigateTarget, setTtsNavigateTarget] = useState<number | null>(null);

  const handleCreatePattern = useCallback(
    (width: number, height: number) => {
      actions.reset(width, height);
    },
    [actions]
  );

  const handleBeadClick = useCallback(
    (x: number, y: number) => {
      // Handle TTS navigation mode (takes priority)
      if (ttsNavigationMode) {
        const position = coordinatesToPosition(pattern, x, y);
        if (position !== null) {
          setTtsNavigateTarget(position);
        }
        return;
      }

      // Handle edit mode or normal editing
      if (editModeEnabled || !highlightedBeads) {
        if (tool === 'pencil') {
          actions.setBead(x, y, selectedColor);
        } else if (tool === 'fill') {
          actions.floodFill(x, y, selectedColor);
        } else if (tool === 'pipette') {
          const colorIndex = pattern.field[y * pattern.width + x];
          setSelectedColor(colorIndex);
          setTool('pencil');
        }
      }
    },
    [tool, selectedColor, actions, pattern, ttsNavigationMode, editModeEnabled, highlightedBeads]
  );

  const handleBeadDrag = useCallback(
    (x: number, y: number) => {
      if (tool === 'pencil') {
        actions.setBead(x, y, selectedColor);
      }
    },
    [tool, selectedColor, actions]
  );

  const handleTTSStateChange = useCallback(
    (position: number, groupCount: number, isActive: boolean) => {
      if (isActive && position > 0 && groupCount > 0) {
        const highlighted = getHighlightedBeads(pattern, position, groupCount);
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
          <span className="text-sm text-gray-600">{pattern.name || 'Жгут'}</span>
        </div>
        <nav className="flex items-center gap-2">
          <Link
            href="/ball"
            className="px-3 py-1 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded"
          >
            Шар →
          </Link>
        </nav>
      </header>

      <Toolbar
        tool={tool}
        onToolChange={setTool}
        zoom={zoom}
        onZoomChange={setZoom}
        onClear={() => actions.clear()}
        onMirrorH={() => actions.mirrorHorizontal()}
        onMirrorV={() => actions.mirrorVertical()}
        onSave={() => actions.save()}
        onLoad={actions.load}
        onNew={() => setShowNewDialog(true)}
        onShowStats={() => {
          const stats = actions.getStats();
          alert(
            `Ширина: ${stats.width}\nВысота: ${stats.usedHeight}/${stats.height}\nРаппорт: ${stats.repeat}\nВсего бусин: ${stats.totalBeads}`
          );
        }}
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

          {/* Sample Patterns */}
          <div className="mt-6 border-t pt-4">
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500">
              Примеры
            </h3>
            <div className="space-y-1">
              {SAMPLE_PATTERNS.map((sample) => (
                <button
                  key={sample.id}
                  onClick={() => actions.loadSample(sample.id)}
                  className="w-full text-left px-2 py-1 text-xs rounded hover:bg-gray-100 transition-colors"
                  title={sample.description}
                >
                  {sample.name}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-6 border-t pt-4">
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500">
              Информация
            </h3>
            <p className="text-xs text-gray-600">
              Размер: {pattern.width} × {pattern.height}
            </p>
            <p className="text-xs text-gray-600">Инструмент: {tool}</p>
            <p className="text-xs text-gray-600">
              Цвет: {DEFAULT_COLORS[selectedColor]?.name || `#${selectedColor}`}
            </p>
          </div>
        </aside>

        {/* Canvas Area */}
        <main className="flex flex-1 gap-4 overflow-auto bg-gray-200 p-4">
          <CanvasPanel
            title="Черновик (редактирование)"
            pattern={pattern}
            zoom={zoom}
            viewType="draft"
            onBeadClick={handleBeadClick}
            onBeadDrag={handleBeadDrag}
            highlightedBeads={highlightedBeads}
            completedBeads={completedBeads}
          />

          <CanvasPanel
            title="Исправленный вид"
            pattern={pattern}
            zoom={zoom}
            viewType="corrected"
          />

          <CanvasPanel
            title="Симуляция"
            pattern={pattern}
            zoom={zoom}
            viewType="simulation"
            shift={shift}
            onShiftChange={setShift}
          />
        </main>

        {/* TTS Panel */}
        <aside className="w-80 border-l bg-white">
          <TTSPanel
            pattern={pattern}
            onTTSStateChange={handleTTSStateChange}
            onCompletedBeadsChange={setCompletedBeads}
            onNavigationModeChange={setTtsNavigationMode}
            onEditModeChange={setEditModeEnabled}
            navigateToPosition={ttsNavigateTarget}
            onNavigateComplete={() => setTtsNavigateTarget(null)}
          />
        </aside>
      </div>

      {/* New Pattern Dialog */}
      <NewPatternDialog
        isOpen={showNewDialog}
        onClose={() => setShowNewDialog(false)}
        onCreate={handleCreatePattern}
      />
      </div>
    </div>
  );
}
