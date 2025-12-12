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
}

export const ColorPalette: FC<ColorPaletteProps> = ({
  colors,
  selectedColor,
  onColorSelect,
  showAllColors = true, // TODO: Change to false when tier system is implemented
  showColorPicker = true, // Temporary: always show color picker
  onCustomColorAdd,
}) => {
  const [showPicker, setShowPicker] = useState(false);
  const [customColor, setCustomColor] = useState('#ff0000');
  const pickerRef = useRef<HTMLInputElement>(null);

  // Get color definition info for tier display
  const getColorInfo = (index: number): ColorDefinition | undefined => {
    return COLOR_PALETTE[index];
  };

  // Filter colors based on tier
  const displayColors = showAllColors
    ? colors
    : colors.filter((_, index) => isColorFree(index));

  const handleAddCustomColor = () => {
    if (!onCustomColorAdd) return;

    // Parse hex color
    const hex = customColor.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);

    onCustomColorAdd({ r, g, b, name: `Custom ${customColor}` });
    setShowPicker(false);
  };

  return (
    <div className="space-y-2">
      {/* Color grid */}
      <div className="grid grid-cols-4 gap-1">
        {displayColors.map((color, displayIndex) => {
          // Map display index to actual color index when filtering
          const actualIndex = showAllColors
            ? displayIndex
            : COLOR_PALETTE.findIndex((c) => c.isFree && colors[displayIndex] === color) !== -1
              ? displayIndex
              : displayIndex;

          const colorInfo = getColorInfo(actualIndex);
          const isFree = colorInfo?.isFree ?? true;
          const isPaid = !isFree;

          return (
            <button
              key={actualIndex}
              onClick={() => onColorSelect(actualIndex)}
              title={colorInfo?.nameUk || color.name || `Color ${actualIndex}`}
              className={cn(
                'relative h-9 w-9 rounded border-2 transition-all hover:scale-110',
                actualIndex === selectedColor
                  ? 'border-primary-500 ring-2 ring-primary-500'
                  : 'border-gray-300',
                isPaid && !showAllColors && 'opacity-50 cursor-not-allowed'
              )}
              style={{ backgroundColor: colorToRgba(color) }}
              disabled={isPaid && !showAllColors}
            >
              {/* Paid indicator (lock icon) */}
              {isPaid && (
                <span
                  className="absolute -top-1 -right-1 text-[8px] bg-yellow-400 rounded-full w-3 h-3 flex items-center justify-center"
                  title="Платна версія"
                >
                  🔒
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
                  className="w-10 h-8 rounded border cursor-pointer"
                />
                <div
                  className="flex-1 h-8 rounded border"
                  style={{ backgroundColor: customColor }}
                />
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
