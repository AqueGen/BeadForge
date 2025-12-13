'use client';

import { FC, useState, useRef } from 'react';
import type { BeadColor } from '@/types';
import { colorToRgba, cn } from '@/lib/utils';
import { COLOR_PALETTE, isColorFree, type ColorDefinition } from '@/config/colors';

interface ColorPaletteProps {
  colors: BeadColor[];
  selectedColor: number;
  onColorSelect: (index: number) => void;
  /** Show all colors (paid mode) or only free */
  showAllColors?: boolean;
  /** Enable color picker for custom colors */
  showColorPicker?: boolean;
  /** Callback when custom color is added */
  onCustomColorAdd?: (color: BeadColor) => void;
  /** Color index being replaced (replace mode) */
  replaceMode?: number | null;
}

export const ColorPalette: FC<ColorPaletteProps> = ({
  colors,
  selectedColor,
  onColorSelect,
  showAllColors = true,
  showColorPicker = true,
  onCustomColorAdd,
  replaceMode = null,
}) => {
  const [showPicker, setShowPicker] = useState(false);
  const [showSystemColors, setShowSystemColors] = useState(false);
  const [customColor, setCustomColor] = useState('#ff0000');
  const pickerRef = useRef<HTMLInputElement>(null);

  // Get color definition info for tier display
  const getColorInfo = (index: number): ColorDefinition | undefined => {
    return COLOR_PALETTE[index];
  };

  // Check if a system color is already in the palette (by RGB match)
  const isColorInPalette = (sysColor: ColorDefinition): boolean => {
    return colors.some(
      (c) => c.r === sysColor.rgb.r && c.g === sysColor.rgb.g && c.b === sysColor.rgb.b
    );
  };

  // Get system colors not yet in palette
  const availableSystemColors = COLOR_PALETTE.filter((c) => !isColorInPalette(c));

  // Filter colors based on tier
  const displayColors = showAllColors
    ? colors
    : colors.filter((_, index) => isColorFree(index));

  // Parse hex color to RGB
  const parseHexColor = (hex: string): BeadColor => {
    const cleanHex = hex.replace('#', '');
    return {
      r: parseInt(cleanHex.substring(0, 2), 16),
      g: parseInt(cleanHex.substring(2, 4), 16),
      b: parseInt(cleanHex.substring(4, 6), 16),
    };
  };

  // Get current custom color as RGB
  const customColorRgb = parseHexColor(customColor);

  const handleAddCustomColor = () => {
    if (!onCustomColorAdd) return;

    const rgb = parseHexColor(customColor);
    onCustomColorAdd({ ...rgb, name: `Свій (${rgb.r},${rgb.g},${rgb.b})` });
    setShowPicker(false);
  };

  const handleAddSystemColor = (colorDef: ColorDefinition) => {
    if (!onCustomColorAdd) return;
    onCustomColorAdd({ ...colorDef.rgb, name: colorDef.nameUk });
  };

  return (
    <div className="space-y-2">
      {/* Color grid with RGB values */}
      <div className="grid grid-cols-4 gap-1">
        {displayColors.map((color, displayIndex) => {
          const actualIndex = displayIndex;
          const colorInfo = getColorInfo(actualIndex);
          const isFree = colorInfo?.isFree ?? true;
          const isPaid = !isFree;
          const isCustom = actualIndex >= COLOR_PALETTE.length;
          const isBeingReplaced = replaceMode === actualIndex;
          const isReplacementTarget = replaceMode !== null && replaceMode !== actualIndex;

          return (
            <button
              key={actualIndex}
              onClick={() => onColorSelect(actualIndex)}
              title={
                isBeingReplaced
                  ? 'Цей колір буде замінено'
                  : isReplacementTarget
                    ? `Замінити на ${colorInfo?.nameUk || color.name || `Колір ${actualIndex}`}`
                    : colorInfo?.nameUk || color.name || `Color ${actualIndex}`
              }
              className={cn(
                'relative flex items-center justify-center p-0.5 rounded border-2 transition-all hover:scale-105',
                isBeingReplaced
                  ? 'border-orange-500 ring-2 ring-orange-300 bg-orange-50 animate-pulse'
                  : isReplacementTarget
                    ? 'border-blue-400 hover:border-blue-500 hover:ring-1 hover:ring-blue-300'
                    : actualIndex === selectedColor
                      ? 'border-primary-500 ring-1 ring-primary-500 bg-primary-50'
                      : 'border-gray-200 hover:border-gray-300',
                isPaid && !showAllColors && 'opacity-50 cursor-not-allowed'
              )}
              disabled={isPaid && !showAllColors}
            >
              {/* Color swatch */}
              <div
                className="w-full h-7 rounded-sm border border-gray-300"
                style={{ backgroundColor: colorToRgba(color) }}
              />
              {/* Paid indicator */}
              {isPaid && (
                <span
                  className="absolute -top-1 -right-1 text-[8px] bg-yellow-400 rounded-full w-3 h-3 flex items-center justify-center"
                  title="Платна версія"
                >
                  🔒
                </span>
              )}
              {/* Custom color indicator */}
              {isCustom && !isBeingReplaced && (
                <span
                  className="absolute -top-1 -left-1 text-[8px] bg-blue-400 rounded-full w-3 h-3 flex items-center justify-center text-white"
                  title="Свій колір"
                >
                  +
                </span>
              )}
              {/* Replace mode indicator */}
              {isBeingReplaced && (
                <span
                  className="absolute -top-1 -right-1 text-[8px] bg-orange-500 rounded-full w-4 h-4 flex items-center justify-center text-white"
                  title="Буде замінено"
                >
                  🔄
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Tier info */}
      {!showAllColors && (
        <p className="text-[10px] text-gray-500 text-center">
          6 кольорів • <span className="text-yellow-600">🔒 ще 10 у PRO</span>
        </p>
      )}

      {/* System colors section */}
      {showColorPicker && availableSystemColors.length > 0 && (
        <div className="pt-2 border-t">
          {!showSystemColors ? (
            <button
              onClick={() => setShowSystemColors(true)}
              className="w-full flex items-center justify-center gap-2 px-2 py-1.5 text-xs bg-blue-50 hover:bg-blue-100 text-blue-700 rounded transition-colors"
            >
              <span>📦</span>
              <span>Системні кольори ({availableSystemColors.length})</span>
            </button>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-600">Додати системний колір:</span>
                <button
                  onClick={() => setShowSystemColors(false)}
                  className="text-xs text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>
              <div className="grid grid-cols-4 gap-1">
                {availableSystemColors.map((colorDef) => (
                  <button
                    key={colorDef.index}
                    onClick={() => handleAddSystemColor(colorDef)}
                    title={`Додати ${colorDef.nameUk}`}
                    className="relative flex items-center justify-center p-0.5 rounded border-2 border-blue-200 hover:border-blue-400 transition-all hover:scale-105"
                  >
                    <div
                      className="w-full h-6 rounded-sm border border-gray-300"
                      style={{ backgroundColor: colorToRgba(colorDef.rgb) }}
                    />
                    <span
                      className="absolute -top-1 -right-1 text-[8px] bg-blue-500 rounded-full w-3 h-3 flex items-center justify-center text-white"
                      title="Додати"
                    >
                      +
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Color picker section */}
      {showColorPicker && (
        <div className="pt-2 border-t">
          {!showPicker ? (
            <button
              onClick={() => setShowPicker(true)}
              className="w-full flex items-center justify-center gap-2 px-2 py-1.5 text-xs bg-gray-100 hover:bg-gray-200 rounded transition-colors"
            >
              <span>🎨</span>
              <span>Свій колір</span>
            </button>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <input
                  ref={pickerRef}
                  type="color"
                  value={customColor}
                  onChange={(e) => setCustomColor(e.target.value)}
                  className="w-10 h-10 rounded border cursor-pointer"
                />
                <div className="flex-1">
                  <div
                    className="h-7 rounded border border-gray-300"
                    style={{ backgroundColor: customColor }}
                  />
                  {/* Show RGB of selected custom color */}
                  <div className="text-[10px] text-gray-600 font-mono mt-0.5">
                    RGB: {customColorRgb.r}, {customColorRgb.g}, {customColorRgb.b}
                  </div>
                </div>
              </div>
              <div className="flex gap-1">
                <button
                  onClick={() => setShowPicker(false)}
                  className="flex-1 px-2 py-1 text-xs border rounded hover:bg-gray-50"
                >
                  Скасувати
                </button>
                <button
                  onClick={handleAddCustomColor}
                  className="flex-1 px-2 py-1 text-xs bg-primary-500 text-white rounded hover:bg-primary-600"
                  disabled={!onCustomColorAdd}
                  title={!onCustomColorAdd ? 'Функція додавання кольорів недоступна' : undefined}
                >
                  Додати
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
