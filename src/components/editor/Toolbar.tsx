'use client';

import { FC, useRef } from 'react';
import type { DrawingTool } from '@/types';
import { cn } from '@/lib/utils';

interface ToolbarProps {
  tool: DrawingTool;
  onToolChange: (tool: DrawingTool) => void;
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
        <ToolButton onClick={onNew} title="New Pattern">
          📄 New
        </ToolButton>
        <ToolButton onClick={handleLoadClick} title="Open Pattern (.beadforge)">
          📂 Open
        </ToolButton>
        <ToolButton onClick={onSave} title="Save Pattern (.beadforge)">
          💾 Save
        </ToolButton>
        <input
          ref={fileInputRef}
          type="file"
          accept=".beadforge,.json"
          onChange={handleFileChange}
          className="hidden"
        />
      </ToolbarGroup>

      {/* JBead Import/Export */}
      {(onLoadJBB || onSaveJBB) && (
        <ToolbarGroup>
          {onLoadJBB && (
            <ToolButton onClick={handleLoadJBBClick} title="Import JBead .jbb file">
              📥 JBB
            </ToolButton>
          )}
          {onSaveJBB && (
            <ToolButton onClick={onSaveJBB} title="Export to JBead .jbb format">
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

      {/* Drawing tools */}
      <ToolbarGroup>
        <ToolButton
          active={tool === 'pencil'}
          onClick={() => onToolChange('pencil')}
          title="Pencil Tool"
        >
          ✏️ Pencil
        </ToolButton>
        <ToolButton
          active={tool === 'fill'}
          onClick={() => onToolChange('fill')}
          title="Fill Tool"
        >
          🪣 Fill
        </ToolButton>
        <ToolButton
          active={tool === 'pipette'}
          onClick={() => onToolChange('pipette')}
          title="Color Picker"
        >
          💧 Pick
        </ToolButton>
      </ToolbarGroup>

      {/* Pattern operations */}
      <ToolbarGroup>
        <ToolButton onClick={onClear} title="Clear Pattern">
          🗑️ Clear
        </ToolButton>
        <ToolButton onClick={onMirrorH} title="Mirror Horizontal">
          ↔️ Mirror H
        </ToolButton>
        <ToolButton onClick={onMirrorV} title="Mirror Vertical">
          ↕️ Mirror V
        </ToolButton>
      </ToolbarGroup>

      {/* Zoom */}
      <ToolbarGroup>
        <ToolButton
          onClick={() => onZoomChange(Math.max(5, zoom - 5))}
          title="Zoom Out"
        >
          ➖
        </ToolButton>
        <span className="flex items-center px-2 text-sm text-gray-600">{zoom}px</span>
        <ToolButton
          onClick={() => onZoomChange(Math.min(50, zoom + 5))}
          title="Zoom In"
        >
          ➕
        </ToolButton>
      </ToolbarGroup>

      {/* Stats */}
      <div className="flex gap-1">
        <ToolButton onClick={onShowStats} title="Show Statistics">
          📊 Stats
        </ToolButton>
      </div>
    </div>
  );
};
