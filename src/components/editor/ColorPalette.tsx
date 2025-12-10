'use client';

import { FC } from 'react';
import type { BeadColor } from '@/types';
import { colorToRgba, cn } from '@/lib/utils';

interface ColorPaletteProps {
  colors: BeadColor[];
  selectedColor: number;
  onColorSelect: (index: number) => void;
}

export const ColorPalette: FC<ColorPaletteProps> = ({
  colors,
  selectedColor,
  onColorSelect,
}) => {
  return (
    <div className="grid grid-cols-4 gap-1">
      {colors.map((color, index) => (
        <button
          key={index}
          onClick={() => onColorSelect(index)}
          title={color.name || `Color ${index}`}
          className={cn(
            'h-9 w-9 rounded border-2 transition-all hover:scale-110',
            index === selectedColor
              ? 'border-primary-500 ring-2 ring-primary-500'
              : 'border-gray-300'
          )}
          style={{ backgroundColor: colorToRgba(color) }}
        />
      ))}
    </div>
  );
};
