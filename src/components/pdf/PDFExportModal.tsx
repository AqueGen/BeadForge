'use client';

import { FC, useState, useCallback } from 'react';
import { BaseModal } from '@/components/ui/Modals';
import { BeadPattern } from '@/types';
import {
  downloadPatternPDF,
  estimatePageCount,
  PrintMode,
  PDFExportOptions,
} from '@/lib/pdf';

interface PDFExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  pattern: BeadPattern;
}

export const PDFExportModal: FC<PDFExportModalProps> = ({
  isOpen,
  onClose,
  pattern,
}) => {
  const [isExporting, setIsExporting] = useState(false);
  const [options, setOptions] = useState<Partial<PDFExportOptions>>({
    printMode: 'fullColor',
    paperSize: 'a4',
    includeGrid: true,
    includeRLE: true,
    includeTitlePage: true,
    cellSize: 4,
    showRowNumbers: true,
    showCheckboxes: true,
  });

  const estimatedPages = estimatePageCount(pattern, options);

  const handleExport = useCallback(async () => {
    setIsExporting(true);
    try {
      await downloadPatternPDF(pattern, options);
      onClose();
    } catch (error) {
      console.error('PDF export failed:', error);
      alert('Помилка експорту PDF');
    } finally {
      setIsExporting(false);
    }
  }, [pattern, options, onClose]);

  const updateOption = <K extends keyof PDFExportOptions>(
    key: K,
    value: PDFExportOptions[K]
  ) => {
    setOptions(prev => ({ ...prev, [key]: value }));
  };

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title="Експорт у PDF"
      maxWidth="max-w-lg"
    >
      <div className="p-4 space-y-4">
        {/* Pattern Info */}
        <div className="text-sm text-gray-600 bg-gray-50 rounded p-3">
          <div className="font-medium text-gray-900 mb-1">{pattern.name || 'Без назви'}</div>
          <div className="flex gap-4">
            <span>{pattern.width} × {pattern.height} бісерин</span>
            <span>~{estimatedPages} стор.</span>
          </div>
        </div>

        {/* Print Mode */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Режим друку
          </label>
          <div className="grid grid-cols-3 gap-2">
            {[
              { value: 'fullColor' as PrintMode, label: '🎨 Кольоровий', desc: 'Повнокольорові клітинки' },
              { value: 'economical' as PrintMode, label: '📝 Економний', desc: 'Менше чорнила' },
              { value: 'blackWhite' as PrintMode, label: '🔲 Ч/Б', desc: 'Тільки букви' },
            ].map(mode => (
              <button
                key={mode.value}
                onClick={() => updateOption('printMode', mode.value)}
                className={`p-2 rounded border text-center transition-colors ${
                  options.printMode === mode.value
                    ? 'border-primary-500 bg-primary-50 text-primary-700'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="text-lg">{mode.label.split(' ')[0]}</div>
                <div className="text-xs text-gray-500">{mode.label.split(' ')[1]}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Cell Size */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Розмір клітинки: {options.cellSize} мм
          </label>
          <input
            type="range"
            min="2"
            max="8"
            step="0.5"
            value={options.cellSize}
            onChange={e => updateOption('cellSize', parseFloat(e.target.value))}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
          />
          <div className="flex justify-between text-xs text-gray-400 mt-1">
            <span>2 мм (дрібно)</span>
            <span>8 мм (крупно)</span>
          </div>
        </div>

        {/* Content Options */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Вміст
          </label>
          <div className="space-y-2">
            {[
              { key: 'includeTitlePage' as const, label: 'Титульна сторінка', desc: 'Метадані, легенда кольорів' },
              { key: 'includeGrid' as const, label: 'Сітка схеми', desc: 'Візуальне представлення' },
              { key: 'includeRLE' as const, label: 'Таблиця послідовності', desc: 'Кількість бісерин підряд' },
              { key: 'showRowNumbers' as const, label: 'Номери рядів', desc: 'Зліва від сітки' },
              { key: 'showCheckboxes' as const, label: 'Чеклист прогресу', desc: 'Поля для відміток' },
            ].map(item => (
              <label
                key={item.key}
                className="flex items-start gap-3 p-2 rounded hover:bg-gray-50 cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={options[item.key] as boolean}
                  onChange={e => updateOption(item.key, e.target.checked)}
                  className="mt-1 h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                />
                <div>
                  <div className="text-sm font-medium text-gray-900">{item.label}</div>
                  <div className="text-xs text-gray-500">{item.desc}</div>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-between items-center pt-3 border-t">
          <div className="text-sm text-gray-500">
            ~{estimatedPages} {estimatedPages === 1 ? 'сторінка' : estimatedPages < 5 ? 'сторінки' : 'сторінок'}
          </div>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="rounded border px-4 py-2 text-sm hover:bg-gray-50"
              disabled={isExporting}
            >
              Скасувати
            </button>
            <button
              onClick={handleExport}
              disabled={isExporting}
              className="rounded bg-primary-500 px-4 py-2 text-sm text-white hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isExporting ? (
                <>
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Генерація...
                </>
              ) : (
                '📄 Завантажити PDF'
              )}
            </button>
          </div>
        </div>
      </div>
    </BaseModal>
  );
};
