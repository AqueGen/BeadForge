'use client';

import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { Navigation } from '@/components/layout/Navigation';
import { coordinatesToPosition, calculateRepeat } from '@/lib/pattern';
import { Toolbar, type PanelVisibility } from '@/components/editor/Toolbar';
import { ColorPalette } from '@/components/editor/ColorPalette';
import { CanvasPanel } from '@/components/editor/CanvasPanel';
import { ColorMappingPanel } from '@/components/editor/ColorMappingPanel';
import { TTSPanel } from '@/components/tts';
import { ConfirmDialog, StatsModal, type StatsModalData } from '@/components/ui/Modals';
import { usePattern } from '@/hooks/usePattern';
import { useColorMapping } from '@/hooks/useColorMapping';
import { getSamplePatternList, getHighlightedBeads } from '@/lib/pattern';
import { SKIP_COLOR_INDEX, EMPTY_COLOR_INDEX, type DrawingTool, type HighlightedBeads } from '@/types';

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
        <h2 className="mb-4 text-lg font-semibold">Нова схема</h2>

        <div className="mb-4">
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Ширина (обхват): 0-1000
          </label>
          <input
            type="number"
            min={0}
            max={1000}
            value={width}
            onChange={(e) => setWidth(Math.min(1000, Math.max(0, parseInt(e.target.value) || 0)))}
            className="w-full rounded border px-3 py-2"
          />
        </div>

        <div className="mb-6">
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Висота (ряди): 0-1000
          </label>
          <input
            type="number"
            min={0}
            max={1000}
            value={height}
            onChange={(e) => setHeight(Math.min(1000, Math.max(0, parseInt(e.target.value) || 0)))}
            className="w-full rounded border px-3 py-2"
          />
        </div>

        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded border px-4 py-2 text-sm hover:bg-gray-50"
          >
            Скасувати
          </button>
          <button
            onClick={handleCreate}
            className="rounded bg-primary-500 px-4 py-2 text-sm text-white hover:bg-primary-600"
          >
            Створити
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
  const [zoom, setZoom] = useState(10);
  const [shift, setShift] = useState(0);
  const [showNewDialog, setShowNewDialog] = useState(false);
  const [highlightedBeads, setHighlightedBeads] = useState<HighlightedBeads | null>(null);
  const [completedBeads, setCompletedBeads] = useState(0);
  const [ttsNavigationMode, setTtsNavigationMode] = useState(false);
  const [editModeEnabled, setEditModeEnabled] = useState(false);
  const [ttsNavigateTarget, setTtsNavigateTarget] = useState<number | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true); // Default: collapsed
  const [showColorMappingPanel, setShowColorMappingPanel] = useState(false);
  const [brickOffset, setBrickOffset] = useState(0.5); // Default: half bead shift
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [showStatsModal, setShowStatsModal] = useState(false);
  const [panelVisibility, setPanelVisibility] = useState<PanelVisibility>({
    draft: true,
    corrected: true,
    simulation: true,
    tts: true,
  });
  const [replaceMode, setReplaceMode] = useState<number | null>(null); // color index to replace
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Load panelVisibility from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('beadforge_panel_visibility');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setPanelVisibility(parsed);
      } catch {
        // ignore invalid JSON
      }
    }
  }, []);

  // Handle panel visibility toggle
  const handlePanelVisibilityChange = useCallback((panel: keyof PanelVisibility) => {
    setPanelVisibility(prev => {
      const updated = { ...prev, [panel]: !prev[panel] };
      localStorage.setItem('beadforge_panel_visibility', JSON.stringify(updated));
      return updated;
    });
  }, []);

  // Load brickOffset from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('beadforge_brick_offset');
    if (saved !== null) {
      const parsed = parseFloat(saved);
      if (!isNaN(parsed)) {
        setBrickOffset(parsed);
      }
    }
  }, []);

  // Save brickOffset to localStorage when it changes
  const handleBrickOffsetChange = useCallback((offset: number) => {
    setBrickOffset(offset);
    localStorage.setItem('beadforge_brick_offset', String(offset));
  }, []);

  // Color mapping hook
  const colorMapping = useColorMapping(pattern);

  // Count empty cells
  const emptyCellCount = useMemo(() => {
    return actions.countEmptyCells();
  }, [actions]);

  // Count cells with selected color
  const selectedColorCellCount = useMemo(() => {
    let count = 0;
    for (let i = 0; i < pattern.field.length; i++) {
      if (pattern.field[i] === selectedColor) {
        count++;
      }
    }
    return count;
  }, [pattern.field, selectedColor]);

  // Calculate pattern stats for modal
  const patternStats = useMemo((): StatsModalData | null => {
    if (!pattern) return null;

    const stats: StatsModalData = {
      name: pattern.name || 'Жгут',
      width: pattern.width,
      height: pattern.height,
      usedHeight: pattern.height,
      repeat: calculateRepeat(pattern),
      totalBeads: 0,
      colorCount: 0,
      colorDistribution: [],
    };

    // Count beads per color
    const colorCounts = new Map<number, number>();
    for (let i = 0; i < pattern.field.length; i++) {
      const colorIndex = pattern.field[i];
      if (colorIndex !== SKIP_COLOR_INDEX) {
        colorCounts.set(colorIndex, (colorCounts.get(colorIndex) || 0) + 1);
        stats.totalBeads++;
      }
    }

    // Calculate used height (first non-empty row from top)
    let usedHeight = pattern.height;
    for (let y = pattern.height - 1; y >= 0; y--) {
      let hasColor = false;
      for (let x = 0; x < pattern.width; x++) {
        if (pattern.field[y * pattern.width + x] !== 0) {
          hasColor = true;
          break;
        }
      }
      if (hasColor) {
        usedHeight = y + 1;
        break;
      }
    }
    stats.usedHeight = usedHeight;

    // Build color distribution
    stats.colorCount = colorCounts.size;
    colorCounts.forEach((count, colorIndex) => {
      const color = pattern.colors[colorIndex];
      if (color) {
        stats.colorDistribution.push({
          name: color.name || `Колір ${colorIndex}`,
          color: `rgb(${color.r}, ${color.g}, ${color.b})`,
          count,
          percentage: stats.totalBeads > 0 ? (count / stats.totalBeads) * 100 : 0,
        });
      }
    });

    // Sort by count descending
    stats.colorDistribution.sort((a, b) => b.count - a.count);

    return stats;
  }, [pattern]);

  // Toggle sidebar - expanding enables edit mode, collapsing disables it
  const handleSidebarToggle = useCallback(() => {
    setSidebarCollapsed(prev => {
      const newCollapsed = !prev;
      // Expanding enables edit mode, collapsing disables it
      setEditModeEnabled(!newCollapsed);
      return newCollapsed;
    });
  }, []);

  // Refs for synchronized scrolling
  const draftScrollRef = useRef<HTMLDivElement>(null);
  const correctedScrollRef = useRef<HTMLDivElement>(null);
  const simulationScrollRef = useRef<HTMLDivElement>(null);
  const isScrollSyncing = useRef(false);

  // Synchronized scroll handler
  const handleSyncScroll = useCallback((scrollTop: number, scrollLeft: number, source: 'draft' | 'corrected' | 'simulation') => {
    if (isScrollSyncing.current) return;
    isScrollSyncing.current = true;

    const refs = {
      draft: draftScrollRef,
      corrected: correctedScrollRef,
      simulation: simulationScrollRef,
    };

    // Sync all other panels
    Object.entries(refs).forEach(([key, ref]) => {
      if (key !== source && ref.current) {
        ref.current.scrollTop = scrollTop;
        ref.current.scrollLeft = scrollLeft;
      }
    });

    // Reset flag after a short delay to allow the scroll events to settle
    requestAnimationFrame(() => {
      isScrollSyncing.current = false;
    });
  }, []);

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

      // Handle edit mode - only allow editing when explicitly enabled
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
      }
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
    <div className="flex h-screen overflow-hidden">
      <Navigation />
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Header */}
        <header className="flex h-12 items-center justify-between border-b bg-white px-4">
        <div className="flex items-center gap-4">
          <Link href="/" className="text-xl font-bold text-primary-600 hover:text-primary-700">
            BeadForge
          </Link>
          <span className="text-gray-400">|</span>
          <span className="text-sm text-gray-600">{pattern.name || 'Жгут'}</span>
        </div>
      </header>

      <Toolbar
        zoom={zoom}
        onZoomChange={setZoom}
        onClear={() => setShowClearConfirm(true)}
        onMirrorH={() => actions.mirrorHorizontal()}
        onMirrorV={() => actions.mirrorVertical()}
        onSave={() => actions.save()}
        onLoad={actions.load}
        onNew={() => setShowNewDialog(true)}
        onShowStats={() => setShowStatsModal(true)}
        onSaveJBB={() => actions.saveJBB()}
        onLoadJBB={actions.loadJBB}
        showColorMapping={true}
        colorMappingHasWarning={colorMapping.hasDuplicateMappings}
        colorMappingWarningCount={colorMapping.duplicateMappingCount}
        onColorMappingClick={() => setShowColorMappingPanel(true)}
        panelVisibility={panelVisibility}
        onPanelVisibilityChange={handlePanelVisibilityChange}
      />

      <div className="flex flex-1 overflow-hidden">
        {/* Collapsible Edit Sidebar */}
        <aside
          className={`shrink-0 border-r bg-white transition-all duration-200 ${
            sidebarCollapsed ? 'w-12' : 'w-56'
          }`}
        >
          {/* Header - always visible */}
          <div
            className={`flex h-10 items-center border-b ${
              sidebarCollapsed
                ? 'justify-center cursor-pointer hover:bg-green-50'
                : 'justify-between px-3 bg-green-50'
            }`}
            onClick={sidebarCollapsed ? handleSidebarToggle : undefined}
            title={sidebarCollapsed ? 'Відкрити редагування' : undefined}
          >
            {sidebarCollapsed ? (
              <span className="text-xl" title="Відкрити редагування">✏️</span>
            ) : (
              <>
                <span className="text-xs font-semibold uppercase tracking-wider text-green-700">
                  ✏️ Редагування
                </span>
                <button
                  onClick={handleSidebarToggle}
                  className="rounded p-1 text-gray-400 hover:bg-green-100 hover:text-gray-600"
                  title="Закрити редагування"
                >
                  ✕
                </button>
              </>
            )}
          </div>

          {/* Content - only visible when expanded */}
          {!sidebarCollapsed && (
            <div className="overflow-y-auto p-3" style={{ height: 'calc(100% - 40px)' }}>
              {/* Drawing Tools */}
              <div className="mb-4">
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Інструменти
                </h3>
                <div className="flex gap-1">
                  <button
                    onClick={() => setTool('pencil')}
                    className={`flex-1 rounded px-2 py-1.5 text-xs transition-colors ${
                      tool === 'pencil'
                        ? 'bg-primary-500 text-white'
                        : 'bg-gray-100 hover:bg-gray-200'
                    }`}
                    title="Олівець"
                  >
                    ✏️
                  </button>
                  <button
                    onClick={() => setTool('fill')}
                    className={`flex-1 rounded px-2 py-1.5 text-xs transition-colors ${
                      tool === 'fill'
                        ? 'bg-primary-500 text-white'
                        : 'bg-gray-100 hover:bg-gray-200'
                    }`}
                    title="Заливка"
                  >
                    🪣
                  </button>
                  <button
                    onClick={() => setTool('pipette')}
                    className={`flex-1 rounded px-2 py-1.5 text-xs transition-colors ${
                      tool === 'pipette'
                        ? 'bg-primary-500 text-white'
                        : 'bg-gray-100 hover:bg-gray-200'
                    }`}
                    title="Піпетка"
                  >
                    💧
                  </button>
                </div>
              </div>

              {/* Color Palette */}
              <div className="mb-4">
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Кольори
                </h3>
                {/* Skip button */}
                <button
                  onClick={() => setSelectedColor(SKIP_COLOR_INDEX)}
                  className={`mb-2 w-full flex items-center justify-center gap-2 rounded border-2 px-2 py-1.5 text-xs transition-colors ${
                    selectedColor === SKIP_COLOR_INDEX
                      ? 'border-primary-500 bg-gray-100'
                      : 'border-gray-300 bg-white hover:bg-gray-50'
                  }`}
                  title="Пропуск (не озвучується)"
                >
                  <span className="flex h-5 w-5 items-center justify-center rounded-full border border-gray-400 text-gray-500 text-[10px] font-bold">
                    ✕
                  </span>
                  <span>Пропуск</span>
                </button>
                <ColorPalette
                  colors={pattern.colors}
                  selectedColor={selectedColor}
                  onColorSelect={(colorIndex) => {
                    // Handle replace mode
                    if (replaceMode !== null && colorIndex !== replaceMode) {
                      actions.replaceColor(replaceMode, colorIndex);
                      // Adjust selected color if needed (indices shift after removal)
                      if (selectedColor === replaceMode) {
                        setSelectedColor(colorIndex > replaceMode ? colorIndex - 1 : colorIndex);
                      } else if (selectedColor > replaceMode) {
                        setSelectedColor(selectedColor - 1);
                      }
                      setReplaceMode(null);
                    } else {
                      setSelectedColor(colorIndex);
                      // Exit replace mode if clicking the same color
                      if (replaceMode === colorIndex) {
                        setReplaceMode(null);
                      }
                    }
                  }}
                  onCustomColorAdd={(color) => {
                    const newIndex = actions.addColor(color);
                    setSelectedColor(newIndex);
                    setReplaceMode(null); // Cancel replace mode when adding color
                  }}
                  replaceMode={replaceMode}
                />

                {/* Replace mode indicator */}
                {replaceMode !== null && (
                  <div className="mt-2 rounded bg-blue-50 border border-blue-200 p-2">
                    <p className="text-xs text-blue-700">
                      Оберіть колір для заміни #{replaceMode + 1}
                    </p>
                    <button
                      onClick={() => setReplaceMode(null)}
                      className="mt-1 text-xs text-blue-600 hover:text-blue-800 underline"
                    >
                      Скасувати
                    </button>
                  </div>
                )}

                {/* Color management buttons (only for regular colors) */}
                {selectedColor !== SKIP_COLOR_INDEX && selectedColor !== EMPTY_COLOR_INDEX && selectedColor < pattern.colors.length && pattern.colors.length > 1 && (
                  <div className="mt-2 flex gap-1">
                    <button
                      onClick={() => setShowDeleteConfirm(true)}
                      className="flex-1 rounded bg-red-50 border border-red-200 px-2 py-1.5 text-xs text-red-700 hover:bg-red-100 transition-colors"
                      title="Видалити колір з палітри"
                    >
                      🗑️ Видалити
                    </button>
                    <button
                      onClick={() => setReplaceMode(selectedColor)}
                      className={`flex-1 rounded border px-2 py-1.5 text-xs transition-colors ${
                        replaceMode === selectedColor
                          ? 'bg-blue-500 text-white border-blue-500'
                          : 'bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100'
                      }`}
                      title="Замінити на інший колір"
                    >
                      🔄 Замінити
                    </button>
                  </div>
                )}
              </div>

              {/* Sample Patterns */}
              <div className="border-t pt-3">
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Приклади
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

              <div className="mt-4 border-t pt-3">
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Інформація
                </h3>
                <p className="text-xs text-gray-600">
                  Розмір: {pattern.width} × {pattern.height}
                </p>
                <p className="text-xs text-gray-600">
                  Колір: {selectedColor === SKIP_COLOR_INDEX ? 'Пропуск' : (pattern.colors[selectedColor]?.name || `#${selectedColor}`)}
                </p>
                {selectedColor !== SKIP_COLOR_INDEX && selectedColor !== EMPTY_COLOR_INDEX && pattern.colors[selectedColor] && (
                  <p className="text-xs text-gray-600 font-mono">
                    RGB: {pattern.colors[selectedColor].r}, {pattern.colors[selectedColor].g}, {pattern.colors[selectedColor].b}
                  </p>
                )}
                <p className="text-xs text-gray-600">
                  Комірок: {selectedColorCellCount}
                </p>

                {/* Empty cells warning */}
                {emptyCellCount > 0 && (
                  <div className="mt-2 rounded bg-yellow-50 border border-yellow-200 p-2">
                    <p className="text-xs text-yellow-700 flex items-center gap-1">
                      <span>⚠️</span>
                      <span>Незафарбованих комірок: {emptyCellCount}</span>
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </aside>

        {/* Canvas Area - overflow-hidden to prevent page scroll */}
        <main className="flex flex-1 gap-4 overflow-hidden bg-gray-200 p-4">
          {panelVisibility.draft && (
            <CanvasPanel
              title="Чернетка (редагування)"
              pattern={pattern}
              zoom={zoom}
              viewType="draft"
              onBeadClick={handleBeadClick}
              onBeadDrag={handleBeadDrag}
              highlightedBeads={highlightedBeads}
              completedBeads={completedBeads}
              scrollContainerRef={draftScrollRef}
              onScroll={(top, left) => handleSyncScroll(top, left, 'draft')}
            />
          )}

          {panelVisibility.corrected && (
            <CanvasPanel
              title="Виправлений вигляд"
              pattern={pattern}
              zoom={zoom}
              viewType="corrected"
              brickOffset={brickOffset}
              onBrickOffsetChange={handleBrickOffsetChange}
              onBeadClick={handleBeadClick}
              onBeadDrag={handleBeadDrag}
              highlightedBeads={highlightedBeads}
              completedBeads={completedBeads}
              scrollContainerRef={correctedScrollRef}
              onScroll={(top, left) => handleSyncScroll(top, left, 'corrected')}
            />
          )}

          {panelVisibility.simulation && (
            <CanvasPanel
              title="Симуляція"
              pattern={pattern}
              zoom={zoom}
              viewType="simulation"
              shift={shift}
              onShiftChange={setShift}
              brickOffset={brickOffset}
              scrollContainerRef={simulationScrollRef}
              onScroll={(top, left) => handleSyncScroll(top, left, 'simulation')}
            />
          )}
        </main>

        {/* TTS Panel */}
        {panelVisibility.tts && (
          <aside className="w-80 shrink-0 overflow-y-auto border-l bg-white">
            <TTSPanel
              pattern={pattern}
              onTTSStateChange={handleTTSStateChange}
              onCompletedBeadsChange={setCompletedBeads}
              onNavigationModeChange={setTtsNavigationMode}
              navigateToPosition={ttsNavigateTarget}
              onNavigateComplete={() => setTtsNavigateTarget(null)}
              colorMappings={colorMapping.mappings}
              colorMappingTTSMode={colorMapping.ttsMode}
              onColorMappingTTSModeChange={colorMapping.setTTSMode}
            />
          </aside>
        )}
      </div>

      {/* New Pattern Dialog */}
      <NewPatternDialog
        isOpen={showNewDialog}
        onClose={() => setShowNewDialog(false)}
        onCreate={handleCreatePattern}
      />

      {/* Color Mapping Panel */}
      <ColorMappingPanel
        isOpen={showColorMappingPanel}
        onClose={() => setShowColorMappingPanel(false)}
        mappings={colorMapping.mappings}
        ttsMode={colorMapping.ttsMode}
        onUpdateMapping={colorMapping.updateMapping}
        onResetToAuto={colorMapping.resetToAuto}
        onResetAllToAuto={colorMapping.resetAllToAuto}
        onSetTTSMode={colorMapping.setTTSMode}
        getColorCount={colorMapping.getColorCount}
        totalBeadCount={colorMapping.totalBeadCount}
        duplicateIndices={colorMapping.duplicateMappingIndices}
      />

      {/* Clear Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showClearConfirm}
        onClose={() => setShowClearConfirm(false)}
        onConfirm={() => actions.clear()}
        title="Очистити схему?"
        message="Всі бісерини будуть видалені. Цю дію неможливо скасувати."
        confirmText="Очистити"
        cancelText="Скасувати"
        variant="danger"
      />

      {/* Stats Modal */}
      <StatsModal
        isOpen={showStatsModal}
        onClose={() => setShowStatsModal(false)}
        stats={patternStats}
      />

      {/* Delete Color Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={() => {
          actions.removeColor(selectedColor);
          setSelectedColor(0);
          setShowDeleteConfirm(false);
        }}
        title="Видалити колір?"
        message={`Колір "${pattern.colors[selectedColor]?.name || `#${selectedColor + 1}`}" буде видалено з палітри. Всі комірки з цим кольором стануть незафарбованими.`}
        confirmText="Видалити"
        cancelText="Скасувати"
        variant="danger"
      />
      </div>
    </div>
  );
}
