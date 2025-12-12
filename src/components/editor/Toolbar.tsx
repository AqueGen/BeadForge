'use client';

import { FC, useRef } from 'react';
import type { DrawingTool } from '@/types';
import { cn } from '@/lib/utils';
import { ColorMappingButton } from './ColorMappingButton';

interface ToolbarProps {
  tool?: DrawingTool;
  onToolChange?: (tool: DrawingTool) => void;
  zoom: number;
  onZoomChange: (zoom: number) => void;
  onClear: () => void;
  onMirrorH: () => void;
  onMirrorV: () => void;
  onSave: () => void;
  onLoad: (file: File) => void;
  onNew: () => void;
  onShowStats: () => void;
  onSaveJBB?: () => void;
  onLoadJBB?: (file: File) => void;
  // Color mapping props
  showColorMapping?: boolean;
  colorMappingHasWarning?: boolean;
  colorMappingWarningCount?: number;
  onColorMappingClick?: () => void;
}

interface ToolButtonProps {
  active?: boolean;
  onClick: () => void;
  children: React.ReactNode;
  title?: string;
}

const ToolButton: FC<ToolButtonProps> = ({ active, onClick, children, title }) => (
  <button
    onClick={onClick}
    title={title}
    className={cn(
      'rounded border px-3 py-1.5 text-sm transition-colors',
      active
        ? 'border-primary-500 bg-primary-500 text-white'
        : 'border-gray-300 bg-white hover:border-primary-500 hover:bg-gray-50'
    )}
  >
    {children}
  </button>
);

const ToolbarGroup: FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="flex gap-1 border-r border-gray-200 pr-4">{children}</div>
);

export const Toolbar: FC<ToolbarProps> = ({
  tool,
  onToolChange,
  zoom,
  onZoomChange,
  onClear,
  onMirrorH,
  onMirrorV,
  onSave,
  onLoad,
  onNew,
  onShowStats,
  onSaveJBB,
  onLoadJBB,
  showColorMapping,
  colorMappingHasWarning,
  colorMappingWarningCount,
  onColorMappingClick,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const jbbInputRef = useRef<HTMLInputElement>(null);

  const handleLoadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onLoad(file);
      e.target.value = '';
    }
  };

  const handleLoadJBBClick = () => {
    jbbInputRef.current?.click();
  };

  const handleJBBFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && onLoadJBB) {
      onLoadJBB(file);
      e.target.value = '';
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-4 border-b bg-white px-4 py-2">
      {/* File operations */}
      <ToolbarGroup>
        <ToolButton onClick={onNew} title="Нова схема">
          📄 Нова
        </ToolButton>
        <ToolButton onClick={handleLoadClick} title="Відкрити схему (.beadforge, .jbb)">
          📂 Відкрити
        </ToolButton>
        <ToolButton onClick={onSave} title="Зберегти схему (.beadforge)">
          💾 Зберегти
        </ToolButton>
        <input
          ref={fileInputRef}
          type="file"
          accept=".beadforge,.json,.jbb"
          onChange={handleFileChange}
          className="hidden"
        />
      </ToolbarGroup>

      {/* JBead Import/Export */}
      {(onLoadJBB || onSaveJBB) && (
        <ToolbarGroup>
          {onLoadJBB && (
            <ToolButton onClick={handleLoadJBBClick} title="Імпорт JBead .jbb файлу">
              📥 JBB
            </ToolButton>
          )}
          {onSaveJBB && (
            <ToolButton onClick={onSaveJBB} title="Експорт у формат JBead .jbb">
              📤 JBB
            </ToolButton>
          )}
          <input
            ref={jbbInputRef}
            type="file"
            accept=".jbb"
            onChange={handleJBBFileChange}
            className="hidden"
          />
        </ToolbarGroup>
      )}

      {/* Drawing tools - only shown if tool props are provided */}
      {tool !== undefined && onToolChange && (
        <ToolbarGroup>
          <ToolButton
            active={tool === 'pencil'}
            onClick={() => onToolChange('pencil')}
            title="Олівець"
          >
            ✏️ Олівець
          </ToolButton>
          <ToolButton
            active={tool === 'fill'}
            onClick={() => onToolChange('fill')}
            title="Заливка"
          >
            🪣 Заливка
          </ToolButton>
          <ToolButton
            active={tool === 'pipette'}
            onClick={() => onToolChange('pipette')}
            title="Піпетка"
          >
            💧 Піпетка
          </ToolButton>
        </ToolbarGroup>
      )}

      {/* Pattern operations */}
      <ToolbarGroup>
        <ToolButton onClick={onClear} title="Очистити схему">
          🗑️ Очистити
        </ToolButton>
        <ToolButton onClick={onMirrorH} title="Віддзеркалити горизонтально">
          ↔️ Дзеркало Г
        </ToolButton>
        <ToolButton onClick={onMirrorV} title="Віддзеркалити вертикально">
          ↕️ Дзеркало В
        </ToolButton>
      </ToolbarGroup>

      {/* Zoom */}
      <ToolbarGroup>
        <ToolButton
          onClick={() => onZoomChange(Math.max(5, zoom - 5))}
          title="Зменшити"
        >
          ➖
        </ToolButton>
        <span className="flex items-center px-2 text-sm text-gray-600">{zoom}px</span>
        <ToolButton
          onClick={() => onZoomChange(Math.min(50, zoom + 5))}
          title="Збільшити"
        >
          ➕
        </ToolButton>
      </ToolbarGroup>

      {/* Stats */}
      <div className="flex gap-1">
        <ToolButton onClick={onShowStats} title="Показати статистику">
          📊 Статистика
        </ToolButton>
      </div>

      {/* Color Mapping */}
      {showColorMapping && onColorMappingClick && (
        <div className="flex gap-1">
          <ColorMappingButton
            hasWarning={colorMappingHasWarning || false}
            warningCount={colorMappingWarningCount}
            onClick={onColorMappingClick}
          />
        </div>
      )}
    </div>
  );
};
