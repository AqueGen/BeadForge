/**
 * ColorMappingPanel
 *
 * Panel for configuring color mappings for TTS.
 * Shows pattern colors with mapping options and modifier checkboxes.
 */

import { FC, useState, useMemo } from 'react';
import type { ColorMapping, ColorModifiers, TTSMode } from '@/types/colorMapping';
import { VOICED_COLORS, MODIFIER_VOICES, getVoicedColor } from '@/lib/pattern';
import { getActiveModifierKeys } from '@/types/colorMapping';

interface ColorMappingPanelProps {
  /** Whether the panel is open */
  isOpen: boolean;
  /** Close handler */
  onClose: () => void;
  /** Color mappings */
  mappings: ColorMapping[];
  /** TTS mode */
  ttsMode: TTSMode;
  /** Update a mapping */
  onUpdateMapping: (
    originalIndex: number,
    mappedColorIndex: number,
    modifiers: ColorModifiers
  ) => void;
  /** Reset mapping to auto */
  onResetToAuto: (originalIndex: number) => void;
  /** Reset all to auto */
  onResetAllToAuto: () => void;
  /** Set TTS mode */
  onSetTTSMode: (mode: TTSMode) => void;
  /** Get bead count for color */
  getColorCount: (originalIndex: number) => number;
  /** Total bead count */
  totalBeadCount?: number;
}

/** Single color mapping row */
const ColorMappingRow: FC<{
  mapping: ColorMapping;
  beadCount: number;
  onUpdate: (mappedColorIndex: number, modifiers: ColorModifiers) => void;
  onReset: () => void;
}> = ({ mapping, beadCount, onUpdate, onReset }) => {
  const [expanded, setExpanded] = useState(false);
  const voicedColor = getVoicedColor(mapping.mappedColorIndex);

  const handleColorChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onUpdate(parseInt(e.target.value, 10), mapping.modifiers);
  };

  const handleModifierChange = (
    key: keyof ColorModifiers,
    value: string | null
  ) => {
    const newModifiers = { ...mapping.modifiers, [key]: value };
    onUpdate(mapping.mappedColorIndex, newModifiers);
  };

  // Generate voice preview text
  const voicePreview = useMemo(() => {
    if (!voicedColor) return '—';
    const parts = [voicedColor.nameUk];
    const modifierKeys = getActiveModifierKeys(mapping.modifiers);
    modifierKeys.forEach((key) => {
      const mod = MODIFIER_VOICES.find((m) => m.key === key);
      if (mod) parts.push(mod.nameUk);
    });
    return parts.join(' ');
  }, [voicedColor, mapping.modifiers]);

  const { r, g, b } = mapping.originalColor;
  const originalColorStyle = `rgb(${r}, ${g}, ${b})`;

  return (
    <div className="border rounded-lg p-3 bg-white">
      {/* Main row */}
      <div className="flex items-center gap-3">
        {/* Original color swatch */}
        <div
          className="w-8 h-8 rounded border border-gray-300 shrink-0"
          style={{ backgroundColor: originalColorStyle }}
          title={`RGB(${r}, ${g}, ${b})`}
        />

        {/* Bead count */}
        <span className="text-xs text-gray-500 w-16 shrink-0">
          {beadCount} шт
        </span>

        {/* Arrow */}
        <span className="text-gray-400">→</span>

        {/* Voiced color select */}
        <select
          value={mapping.mappedColorIndex}
          onChange={handleColorChange}
          className="flex-1 px-2 py-1.5 border rounded text-sm min-w-0"
        >
          {VOICED_COLORS.map((vc) => (
            <option key={vc.index} value={vc.index}>
              {vc.nameUk}
            </option>
          ))}
        </select>

        {/* Auto indicator */}
        {mapping.isAutoMapped && (
          <span className="text-xs text-gray-400" title="Автоматичний маппінг">
            auto
          </span>
        )}

        {/* Expand button */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="p-1.5 text-gray-500 hover:bg-gray-100 rounded"
          title={expanded ? 'Згорнути' : 'Модифікатори'}
        >
          <svg
            className={`w-4 h-4 transition-transform ${expanded ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {/* Reset button */}
        {!mapping.isAutoMapped && (
          <button
            onClick={onReset}
            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded"
            title="Скинути до авто"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        )}
      </div>

      {/* Expanded modifiers */}
      {expanded && (
        <div className="mt-3 pt-3 border-t space-y-2">
          {/* Brightness */}
          <div className="flex items-center gap-2 text-sm">
            <span className="w-24 text-gray-600">Яскравість:</span>
            <label className="flex items-center gap-1">
              <input
                type="radio"
                name={`brightness-${mapping.originalIndex}`}
                checked={mapping.modifiers.brightness === null}
                onChange={() => handleModifierChange('brightness', null)}
              />
              <span>—</span>
            </label>
            <label className="flex items-center gap-1">
              <input
                type="radio"
                name={`brightness-${mapping.originalIndex}`}
                checked={mapping.modifiers.brightness === 'light'}
                onChange={() => handleModifierChange('brightness', 'light')}
              />
              <span>світлий</span>
            </label>
            <label className="flex items-center gap-1">
              <input
                type="radio"
                name={`brightness-${mapping.originalIndex}`}
                checked={mapping.modifiers.brightness === 'dark'}
                onChange={() => handleModifierChange('brightness', 'dark')}
              />
              <span>темний</span>
            </label>
          </div>

          {/* Finish */}
          <div className="flex items-center gap-2 text-sm flex-wrap">
            <span className="w-24 text-gray-600">Покриття:</span>
            <label className="flex items-center gap-1">
              <input
                type="radio"
                name={`finish-${mapping.originalIndex}`}
                checked={mapping.modifiers.finish === null}
                onChange={() => handleModifierChange('finish', null)}
              />
              <span>—</span>
            </label>
            <label className="flex items-center gap-1">
              <input
                type="radio"
                name={`finish-${mapping.originalIndex}`}
                checked={mapping.modifiers.finish === 'matte'}
                onChange={() => handleModifierChange('finish', 'matte')}
              />
              <span>матовий</span>
            </label>
            <label className="flex items-center gap-1">
              <input
                type="radio"
                name={`finish-${mapping.originalIndex}`}
                checked={mapping.modifiers.finish === 'glossy'}
                onChange={() => handleModifierChange('finish', 'glossy')}
              />
              <span>глянц</span>
            </label>
            <label className="flex items-center gap-1">
              <input
                type="radio"
                name={`finish-${mapping.originalIndex}`}
                checked={mapping.modifiers.finish === 'pearl'}
                onChange={() => handleModifierChange('finish', 'pearl')}
              />
              <span>перлам</span>
            </label>
            <label className="flex items-center gap-1">
              <input
                type="radio"
                name={`finish-${mapping.originalIndex}`}
                checked={mapping.modifiers.finish === 'metallic'}
                onChange={() => handleModifierChange('finish', 'metallic')}
              />
              <span>металік</span>
            </label>
          </div>

          {/* Transparency */}
          <div className="flex items-center gap-2 text-sm">
            <span className="w-24 text-gray-600">Прозорість:</span>
            <label className="flex items-center gap-1">
              <input
                type="checkbox"
                checked={mapping.modifiers.transparency === 'transparent'}
                onChange={(e) =>
                  handleModifierChange('transparency', e.target.checked ? 'transparent' : null)
                }
              />
              <span>прозорий</span>
            </label>
          </div>

          {/* Saturation */}
          <div className="flex items-center gap-2 text-sm">
            <span className="w-24 text-gray-600">Насиченість:</span>
            <label className="flex items-center gap-1">
              <input
                type="radio"
                name={`saturation-${mapping.originalIndex}`}
                checked={mapping.modifiers.saturation === null}
                onChange={() => handleModifierChange('saturation', null)}
              />
              <span>—</span>
            </label>
            <label className="flex items-center gap-1">
              <input
                type="radio"
                name={`saturation-${mapping.originalIndex}`}
                checked={mapping.modifiers.saturation === 'pastel'}
                onChange={() => handleModifierChange('saturation', 'pastel')}
              />
              <span>пастель</span>
            </label>
            <label className="flex items-center gap-1">
              <input
                type="radio"
                name={`saturation-${mapping.originalIndex}`}
                checked={mapping.modifiers.saturation === 'bright'}
                onChange={() => handleModifierChange('saturation', 'bright')}
              />
              <span>яскравий</span>
            </label>
          </div>

          {/* Voice preview */}
          <div className="flex items-center gap-2 text-sm pt-2 border-t">
            <span className="w-24 text-gray-600">Озвучка:</span>
            <span className="font-medium text-primary-600">&ldquo;{voicePreview}&rdquo;</span>
          </div>
        </div>
      )}
    </div>
  );
};

export const ColorMappingPanel: FC<ColorMappingPanelProps> = ({
  isOpen,
  onClose,
  mappings,
  ttsMode,
  onUpdateMapping,
  onResetToAuto,
  onResetAllToAuto,
  onSetTTSMode,
  getColorCount,
  totalBeadCount,
}) => {
  if (!isOpen) return null;

  const totalBeads = totalBeadCount ?? mappings.reduce((sum, m) => sum + getColorCount(m.originalIndex), 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-lg max-h-[90vh] flex flex-col rounded-lg bg-gray-50 shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b bg-white rounded-t-lg">
          <h2 className="text-lg font-semibold">Налаштування кольорів</h2>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* TTS Mode */}
        <div className="px-4 py-3 border-b bg-white">
          <div className="flex items-center gap-4 text-sm">
            <span className="text-gray-600">Режим озвучки:</span>
            <label className="flex items-center gap-1.5">
              <input
                type="radio"
                name="ttsMode"
                checked={ttsMode === 'colorOnly'}
                onChange={() => onSetTTSMode('colorOnly')}
              />
              <span>Тільки колір</span>
            </label>
            <label className="flex items-center gap-1.5">
              <input
                type="radio"
                name="ttsMode"
                checked={ttsMode === 'full'}
                onChange={() => onSetTTSMode('full')}
              />
              <span>Повна інформація</span>
            </label>
          </div>
        </div>

        {/* Stats */}
        <div className="px-4 py-2 bg-gray-100 text-sm text-gray-600">
          Кольорів: {mappings.length} | Бісерин: {totalBeads}
        </div>

        {/* Color list */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
          {mappings.map((mapping) => (
            <ColorMappingRow
              key={mapping.originalIndex}
              mapping={mapping}
              beadCount={getColorCount(mapping.originalIndex)}
              onUpdate={(mappedColorIndex, modifiers) =>
                onUpdateMapping(mapping.originalIndex, mappedColorIndex, modifiers)
              }
              onReset={() => onResetToAuto(mapping.originalIndex)}
            />
          ))}

          {mappings.length === 0 && (
            <div className="text-center text-gray-500 py-8">
              Немає кольорів у схемі
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-4 py-3 border-t bg-white rounded-b-lg">
          <button
            onClick={onResetAllToAuto}
            className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded"
          >
            Скинути все до авто
          </button>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-primary-500 text-white text-sm font-medium rounded hover:bg-primary-600"
          >
            Готово
          </button>
        </div>
      </div>
    </div>
  );
};
