'use client';

import { useState, useCallback } from 'react';
import { Header } from '@/components/layout/Header';
import { Toolbar } from '@/components/editor/Toolbar';
import { ColorPalette } from '@/components/editor/ColorPalette';
import { CanvasPanel } from '@/components/editor/CanvasPanel';
import { TTSPanel } from '@/components/tts';
import { usePattern } from '@/hooks/usePattern';
import { getSamplePatternList } from '@/lib/pattern';
import { DEFAULT_COLORS, type DrawingTool } from '@/types';

const SAMPLE_PATTERNS = getSamplePatternList();

export default function EditorPage() {
  const { pattern, actions } = usePattern(8, 100);
  const [selectedColor, setSelectedColor] = useState(1);
  const [tool, setTool] = useState<DrawingTool>('pencil');
  const [zoom, setZoom] = useState(20);
  const [shift, setShift] = useState(0);

  const handleBeadClick = useCallback(
    (x: number, y: number) => {
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
    [tool, selectedColor, actions, pattern]
  );

  const handleBeadDrag = useCallback(
    (x: number, y: number) => {
      if (tool === 'pencil') {
        actions.setBead(x, y, selectedColor);
      }
    },
    [tool, selectedColor, actions]
  );

  return (
    <div className="flex min-h-screen flex-col">
      <Header patternName={pattern.name} />

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
        onNew={() => actions.reset()}
        onShowStats={() => {
          const stats = actions.getStats();
          alert(
            `Width: ${stats.width}\nHeight: ${stats.usedHeight}/${stats.height}\nRepeat: ${stats.repeat}\nTotal beads: ${stats.totalBeads}`
          );
        }}
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

          {/* Sample Patterns */}
          <div className="mt-6 border-t pt-4">
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500">
              Sample Patterns
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
              Info
            </h3>
            <p className="text-xs text-gray-600">
              Size: {pattern.width} × {pattern.height}
            </p>
            <p className="text-xs text-gray-600">Tool: {tool}</p>
            <p className="text-xs text-gray-600">
              Color: {DEFAULT_COLORS[selectedColor]?.name || `#${selectedColor}`}
            </p>
          </div>
        </aside>

        {/* Canvas Area */}
        <main className="flex flex-1 gap-4 overflow-auto bg-gray-200 p-4">
          <CanvasPanel
            title="Draft View (Edit)"
            pattern={pattern}
            zoom={zoom}
            viewType="draft"
            onBeadClick={handleBeadClick}
            onBeadDrag={handleBeadDrag}
          />

          <CanvasPanel
            title="Corrected View"
            pattern={pattern}
            zoom={zoom}
            viewType="corrected"
          />

          <CanvasPanel
            title="Simulation"
            pattern={pattern}
            zoom={zoom}
            viewType="simulation"
            shift={shift}
            onShiftChange={setShift}
          />
        </main>

        {/* TTS Panel */}
        <aside className="w-80 border-l bg-white">
          <TTSPanel pattern={pattern} />
        </aside>
      </div>
    </div>
  );
}
