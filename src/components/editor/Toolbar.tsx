'use client';

import { FC, useRef } from 'react';
import type { DrawingTool } from '@/types';
import { cn } from '@/lib/utils';
import { ColorMappingButton } from './ColorMappingButton';

export interface PanelVisibility {
  draft: boolean;
  corrected: boolean;
  simulation: boolean;
  tts: boolean;
  beading: boolean;
}

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
  onExportPDF?: () => void;
  onShow3D?: () => void;
  // Color mapping props
  showColorMapping?: boolean;
  colorMappingHasWarning?: boolean;
  colorMappingWarningCount?: number;
  onColorMappingClick?: () => void;
  // Panel visibility props
  panelVisibility?: PanelVisibility;
  onPanelVisibilityChange?: (panel: keyof PanelVisibility) => void;
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

interface ToggleButtonProps {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  title?: string;
}

const ToggleButton: FC<ToggleButtonProps> = ({ active, onClick, children, title }) => (
  <button
    onClick={onClick}
    title={title}
    className={cn(
      'rounded border px-2 py-1 text-xs transition-colors',
      active
        ? 'border-primary-500 bg-primary-100 text-primary-700'
        : 'border-gray-300 bg-gray-100 text-gray-400 hover:bg-gray-200'
    )}
  >
    {children}
  </button>
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
  onExportPDF,
  onShow3D,
  showColorMapping,
  colorMappingHasWarning,
  colorMappingWarningCount,
  onColorMappingClick,
  panelVisibility,
  onPanelVisibilityChange,
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
          📄
        </ToolButton>
        <ToolButton onClick={handleLoadClick} title="Відкрити схему (.beadforge, .jbb)">
          📂
        </ToolButton>
        <ToolButton onClick={onSave} title="Зберегти схему (.beadforge)">
          💾
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
              📥
            </ToolButton>
          )}
          {onSaveJBB && (
            <ToolButton onClick={onSaveJBB} title="Експорт у формат JBead .jbb">
              📤
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
            ✏️
          </ToolButton>
          <ToolButton
            active={tool === 'fill'}
            onClick={() => onToolChange('fill')}
            title="Заливка"
          >
            🪣
          </ToolButton>
          <ToolButton
            active={tool === 'pipette'}
            onClick={() => onToolChange('pipette')}
            title="Піпетка"
          >
            💧
          </ToolButton>
        </ToolbarGroup>
      )}

      {/* Pattern operations */}
      <ToolbarGroup>
        <ToolButton onClick={onClear} title="Очистити схему">
          🗑️
        </ToolButton>
        <ToolButton onClick={onMirrorH} title="Віддзеркалити горизонтально">
          ↔️
        </ToolButton>
        <ToolButton onClick={onMirrorV} title="Віддзеркалити вертикально">
          ↕️
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

      {/* Stats & Export */}
      <div className="flex gap-1">
        <ToolButton onClick={onShowStats} title="Показати статистику">
          📊
        </ToolButton>
        {onExportPDF && (
          <ToolButton onClick={onExportPDF} title="Експорт у PDF">
            🖨️
          </ToolButton>
        )}
        {onShow3D && (
          <ToolButton onClick={onShow3D} title="3D перегляд">
            🧊
          </ToolButton>
        )}
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

      {/* Panel Visibility Toggles */}
      {panelVisibility && onPanelVisibilityChange && (
        <div className="flex gap-1 ml-auto">
          <ToggleButton
            active={panelVisibility.draft}
            onClick={() => onPanelVisibilityChange('draft')}
            title="Показати/сховати чернетку"
          >
            ✏️
          </ToggleButton>
          <ToggleButton
            active={panelVisibility.corrected}
            onClick={() => onPanelVisibilityChange('corrected')}
            title="Показати/сховати виправлений вигляд"
          >
            👁️
          </ToggleButton>
          <ToggleButton
            active={panelVisibility.simulation}
            onClick={() => onPanelVisibilityChange('simulation')}
            title="Показати/сховати симуляцію"
          >
            🎯
          </ToggleButton>
          <ToggleButton
            active={panelVisibility.tts}
            onClick={() => onPanelVisibilityChange('tts')}
            title="Показати/сховати TTS панель"
          >
            🔊
          </ToggleButton>
          <ToggleButton
            active={panelVisibility.beading}
            onClick={() => onPanelVisibilityChange('beading')}
            title="Показати/сховати панель набору"
          >
            📋
          </ToggleButton>
        </div>
      )}
    </div>
  );
};
