'use client';

import { X, Pause, Play, Circle, Cylinder } from 'lucide-react';
import { useState, Suspense } from 'react';
import dynamic from 'next/dynamic';
import type { BeadPattern, BallPattern } from '@/types';
import type { ColorMapping } from '@/types/colorMapping';

// Dynamically import 3D viewers to avoid SSR issues
const Rope3DViewer = dynamic(
  () => import('./Rope3DViewer').then(mod => ({ default: mod.Rope3DViewer })),
  { ssr: false, loading: () => <LoadingState /> }
);

const Ball3DViewer = dynamic(
  () => import('./Ball3DViewer').then(mod => ({ default: mod.Ball3DViewer })),
  { ssr: false, loading: () => <LoadingState /> }
);

function LoadingState() {
  return (
    <div className="w-full h-full flex items-center justify-center bg-slate-900 rounded-lg">
      <div className="text-white text-center">
        <div className="animate-spin w-8 h-8 border-2 border-white border-t-transparent rounded-full mx-auto mb-2" />
        <p>Завантаження 3D...</p>
      </div>
    </div>
  );
}

interface Preview3DModalProps {
  pattern: BeadPattern | BallPattern;
  patternType: 'rope' | 'ball';
  colorMappings?: ColorMapping[];
  onClose: () => void;
}

export function Preview3DModal({ pattern, patternType, colorMappings, onClose }: Preview3DModalProps) {
  const [autoRotate, setAutoRotate] = useState(true);
  const [viewMode, setViewMode] = useState<'rope' | 'ball'>(patternType);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="relative w-[90vw] h-[80vh] max-w-4xl bg-slate-800 rounded-xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between px-4 py-3 bg-gradient-to-b from-slate-900/90 to-transparent">
          <h2 className="text-white font-medium">
            3D Перегляд: {pattern.name || (viewMode === 'rope' ? 'Жгут' : 'Шар')}
          </h2>
          <div className="flex items-center gap-2">
            {/* View mode toggle */}
            <div className="flex rounded-lg overflow-hidden border border-slate-600">
              <button
                onClick={() => setViewMode('rope')}
                className={`p-2 transition-colors ${
                  viewMode === 'rope'
                    ? 'bg-blue-500 text-white'
                    : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                }`}
                title="Жгут"
              >
                <Cylinder className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('ball')}
                className={`p-2 transition-colors ${
                  viewMode === 'ball'
                    ? 'bg-blue-500 text-white'
                    : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                }`}
                title="Шар"
              >
                <Circle className="w-4 h-4" />
              </button>
            </div>
            <button
              onClick={() => setAutoRotate(!autoRotate)}
              className={`p-2 rounded-lg transition-colors ${
                autoRotate
                  ? 'bg-blue-500 text-white'
                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              }`}
              title={autoRotate ? 'Зупинити обертання' : 'Автообертання'}
            >
              {autoRotate ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-lg bg-slate-700 text-slate-300 hover:bg-red-500 hover:text-white transition-colors"
              title="Закрити"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* 3D Viewer */}
        <div className="w-full h-full">
          <Suspense fallback={<LoadingState />}>
            {viewMode === 'rope' ? (
              <Rope3DViewer pattern={pattern as BeadPattern} colorMappings={colorMappings} autoRotate={autoRotate} />
            ) : (
              <Ball3DViewer pattern={pattern as BeadPattern} colorMappings={colorMappings} autoRotate={autoRotate} />
            )}
          </Suspense>
        </div>

        {/* Controls hint */}
        <div className="absolute bottom-0 left-0 right-0 z-10 px-4 py-2 bg-gradient-to-t from-slate-900/90 to-transparent">
          <p className="text-slate-400 text-xs text-center">
            Ліва кнопка миші - обертання | Колесо - масштаб | Права кнопка - переміщення
          </p>
        </div>
      </div>
    </div>
  );
}

export default Preview3DModal;
