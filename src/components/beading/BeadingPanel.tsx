'use client';

import React, { useMemo, useEffect, useRef, useState, useCallback } from 'react';
import { BeadPattern } from '@/types';
import {
  createColorLetterMappings,
  getLetterForColorIndex,
  getContrastingTextColor,
  ColorLetterMapping,
} from '@/lib/pdf/colorLetterMapping';

interface BeadingPanelProps {
  pattern: BeadPattern;
  className?: string;
  /** Current TTS position for synchronization */
  ttsPosition?: number;
  /** Whether TTS is currently playing */
  ttsPlaying?: boolean;
  /** Callback when user clicks on a row */
  onRowClick?: (row: number) => void;
}

type ViewMode = 'grid' | 'rle';

export function BeadingPanel({
  pattern,
  className = '',
  ttsPosition,
  ttsPlaying,
  onRowClick,
}: BeadingPanelProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('rle');
  const [scale, setScale] = useState(1);
  const [checkedRows, setCheckedRows] = useState<Set<number>>(new Set());
  const containerRef = useRef<HTMLDivElement>(null);
  const activeRowRef = useRef<HTMLDivElement>(null);

  // Create color letter mappings
  const colorMappings = useMemo(() => {
    return createColorLetterMappings(pattern.colors, pattern.field);
  }, [pattern.colors, pattern.field]);

  // Calculate current row from TTS position (convert 1-based TTS to 0-based)
  const currentRow = useMemo(() => {
    if (ttsPosition === undefined || ttsPosition < 1) return null;
    const pos0 = ttsPosition - 1; // Convert to 0-based field index
    return Math.floor(pos0 / pattern.width);
  }, [ttsPosition, pattern.width]);

  // Auto-scroll to current row when TTS position changes
  useEffect(() => {
    if (currentRow !== null && activeRowRef.current && ttsPlaying) {
      activeRowRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }
  }, [currentRow, ttsPlaying]);

  // Generate RLE data
  const rleData = useMemo(() => {
    const runs: { letter: string; count: number; colorIndex: number; startPos: number }[] = [];
    let currentColorIndex = -1;
    let currentCount = 0;
    let startPos = 0;

    for (let i = 0; i < pattern.field.length; i++) {
      const colorIndex = pattern.field[i];

      if (colorIndex === currentColorIndex) {
        currentCount++;
      } else {
        if (currentCount > 0) {
          const letter = getLetterForColorIndex(colorMappings, currentColorIndex);
          runs.push({ letter, count: currentCount, colorIndex: currentColorIndex, startPos });
        }
        currentColorIndex = colorIndex;
        currentCount = 1;
        startPos = i;
      }
    }

    if (currentCount > 0) {
      const letter = getLetterForColorIndex(colorMappings, currentColorIndex);
      runs.push({ letter, count: currentCount, colorIndex: currentColorIndex, startPos });
    }

    return runs;
  }, [pattern.field, colorMappings]);

  const handleRowCheck = useCallback((row: number) => {
    setCheckedRows(prev => {
      const next = new Set(prev);
      if (next.has(row)) {
        next.delete(row);
      } else {
        next.add(row);
      }
      return next;
    });
  }, []);

  const handleRowClick = useCallback((row: number) => {
    onRowClick?.(row);
  }, [onRowClick]);

  const cellSize = 20 * scale;
  const fontSize = Math.max(8, 12 * scale);

  return (
    <div className={`flex flex-col h-full bg-white ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between border-b px-3 py-2 bg-gray-50">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">📋 Набір</span>
          {currentRow !== null && (
            <span className="text-xs text-gray-500">
              Ряд {currentRow + 1} / {pattern.height}
            </span>
          )}
        </div>

        {/* View Mode Toggle */}
        <div className="flex items-center gap-2">
          <div className="flex border rounded overflow-hidden">
            <button
              onClick={() => setViewMode('rle')}
              className={`px-2 py-1 text-xs ${
                viewMode === 'rle'
                  ? 'bg-primary-500 text-white'
                  : 'bg-white hover:bg-gray-100'
              }`}
              title="Послідовність"
            >
              ≡
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`px-2 py-1 text-xs ${
                viewMode === 'grid'
                  ? 'bg-primary-500 text-white'
                  : 'bg-white hover:bg-gray-100'
              }`}
              title="Сітка"
            >
              ⊞
            </button>
          </div>

          {/* Scale Controls */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => setScale(s => Math.max(0.5, s - 0.25))}
              className="px-1.5 py-0.5 text-xs border rounded hover:bg-gray-100"
              title="Зменшити"
            >
              −
            </button>
            <span className="text-xs text-gray-500 w-10 text-center">
              {Math.round(scale * 100)}%
            </span>
            <button
              onClick={() => setScale(s => Math.min(2, s + 0.25))}
              className="px-1.5 py-0.5 text-xs border rounded hover:bg-gray-100"
              title="Збільшити"
            >
              +
            </button>
          </div>
        </div>
      </div>

      {/* Color Legend */}
      <div className="flex flex-wrap gap-1 px-3 py-2 border-b bg-gray-50 text-xs">
        {colorMappings.map(mapping => (
          <div
            key={mapping.colorIndex}
            className="flex items-center gap-1 px-1.5 py-0.5 rounded border"
            style={{
              backgroundColor: `rgb(${mapping.color.r}, ${mapping.color.g}, ${mapping.color.b})`,
              color: getContrastingTextColor(mapping.color) === 'white' ? '#fff' : '#000',
            }}
          >
            <span className="font-bold">{mapping.letter}</span>
            <span className="opacity-75">({mapping.count})</span>
          </div>
        ))}
      </div>

      {/* Content */}
      <div ref={containerRef} className="flex-1 overflow-auto p-2">
        {viewMode === 'grid' ? (
          <GridView
            pattern={pattern}
            colorMappings={colorMappings}
            cellSize={cellSize}
            fontSize={fontSize}
            currentRow={currentRow}
            ttsPosition={ttsPosition}
            checkedRows={checkedRows}
            onRowCheck={handleRowCheck}
            onRowClick={handleRowClick}
            activeRowRef={activeRowRef}
          />
        ) : (
          <RLEView
            rleData={rleData}
            colorMappings={colorMappings}
            pattern={pattern}
            cellSize={cellSize}
            fontSize={fontSize}
            ttsPosition={ttsPosition}
          />
        )}
      </div>
    </div>
  );
}

// Grid View Component
interface GridViewProps {
  pattern: BeadPattern;
  colorMappings: ColorLetterMapping[];
  cellSize: number;
  fontSize: number;
  currentRow: number | null;
  ttsPosition?: number;
  checkedRows: Set<number>;
  onRowCheck: (row: number) => void;
  onRowClick: (row: number) => void;
  activeRowRef: React.RefObject<HTMLDivElement>;
}

function GridView({
  pattern,
  colorMappings,
  cellSize,
  fontSize,
  currentRow,
  ttsPosition,
  checkedRows,
  onRowCheck,
  onRowClick,
  activeRowRef,
}: GridViewProps) {
  return (
    <div className="space-y-0.5">
      {Array.from({ length: pattern.height }, (_, row) => {
        const isCurrentRow = currentRow === row;
        const isChecked = checkedRows.has(row);
        // Convert 1-based TTS position to 0-based column
        const currentCol = ttsPosition !== undefined && ttsPosition >= 1 && isCurrentRow
          ? (ttsPosition - 1) % pattern.width
          : null;

        return (
          <div
            key={row}
            ref={isCurrentRow ? activeRowRef : null}
            className={`flex items-center gap-1 ${
              isCurrentRow ? 'bg-yellow-100 rounded' : ''
            } ${isChecked ? 'opacity-50' : ''}`}
          >
            {/* Row Number */}
            <div
              className="w-8 text-right text-xs text-gray-500 shrink-0 cursor-pointer hover:text-primary-600"
              onClick={() => onRowClick(row)}
              title={`Перейти до ряду ${row + 1}`}
            >
              {row + 1}
            </div>

            {/* Cells */}
            <div className="flex">
              {Array.from({ length: pattern.width }, (_, col) => {
                const fieldIndex = row * pattern.width + col;
                const colorIndex = pattern.field[fieldIndex];
                const color = pattern.colors[colorIndex];
                const letter = getLetterForColorIndex(colorMappings, colorIndex);
                const isCurrentCell = currentCol === col;

                return (
                  <div
                    key={col}
                    className={`flex items-center justify-center border ${
                      isCurrentCell ? 'ring-2 ring-primary-500 ring-offset-1' : 'border-gray-300'
                    }`}
                    style={{
                      width: cellSize,
                      height: cellSize,
                      backgroundColor: color
                        ? `rgb(${color.r}, ${color.g}, ${color.b})`
                        : '#f3f4f6',
                      fontSize: fontSize,
                      fontWeight: 'bold',
                      color: color
                        ? getContrastingTextColor(color) === 'white' ? '#fff' : '#000'
                        : '#000',
                    }}
                  >
                    {cellSize >= 14 && letter}
                  </div>
                );
              })}
            </div>

            {/* Checkbox */}
            <div className="w-6 shrink-0 flex items-center justify-center">
              <input
                type="checkbox"
                checked={isChecked}
                onChange={() => onRowCheck(row)}
                className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

// RLE View Component
interface RLEViewProps {
  rleData: { letter: string; count: number; colorIndex: number; startPos: number }[];
  colorMappings: ColorLetterMapping[];
  pattern: BeadPattern;
  cellSize: number;
  fontSize: number;
  ttsPosition?: number;
}

function RLEView({
  rleData,
  colorMappings,
  pattern,
  cellSize,
  fontSize,
  ttsPosition,
}: RLEViewProps) {
  // Find which RLE item contains the current TTS position
  const currentRLEIndex = useMemo(() => {
    if (ttsPosition === undefined || ttsPosition < 1) return -1;

    // Convert 1-based TTS position to 0-based field index
    const pos0 = ttsPosition - 1;

    for (let i = 0; i < rleData.length; i++) {
      const item = rleData[i];
      if (pos0 >= item.startPos && pos0 < item.startPos + item.count) {
        return i;
      }
    }
    return -1;
  }, [rleData, ttsPosition]);

  const itemWidth = Math.max(cellSize * 1.5, 24);

  return (
    <div className="flex flex-wrap gap-0.5">
      {rleData.map((item, index) => {
        const mapping = colorMappings.find(m => m.colorIndex === item.colorIndex);
        const color = mapping?.color || { r: 200, g: 200, b: 200 };
        const isCurrent = index === currentRLEIndex;

        return (
          <div
            key={index}
            className={`flex items-center justify-center border ${
              isCurrent ? 'ring-2 ring-primary-500' : 'border-gray-300'
            }`}
            style={{
              minWidth: itemWidth,
              height: cellSize * 1.2,
              backgroundColor: `rgb(${color.r}, ${color.g}, ${color.b})`,
              fontSize: fontSize,
              fontWeight: 'bold',
              color: getContrastingTextColor(color) === 'white' ? '#fff' : '#000',
              padding: '0 4px',
            }}
            title={`${item.count} × ${item.letter}`}
          >
            {item.count > 1 ? item.count : ''}
          </div>
        );
      })}
    </div>
  );
}
