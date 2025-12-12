'use client';

import { FC, ReactNode } from 'react';

// =============================================================================
// Base Modal
// =============================================================================

interface BaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  maxWidth?: string;
}

export const BaseModal: FC<BaseModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  maxWidth = 'max-w-md',
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className={`w-full ${maxWidth} rounded-lg bg-white shadow-xl`}>
        {/* Header */}
        <div className="flex items-center justify-between border-b px-4 py-3">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button
            onClick={onClose}
            className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        {/* Content */}
        {children}
      </div>
    </div>
  );
};

// =============================================================================
// Confirm Dialog
// =============================================================================

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'info';
}

export const ConfirmDialog: FC<ConfirmDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Підтвердити',
  cancelText = 'Скасувати',
  variant = 'danger',
}) => {
  if (!isOpen) return null;

  const confirmButtonClass =
    variant === 'danger'
      ? 'bg-red-500 hover:bg-red-600'
      : variant === 'warning'
        ? 'bg-orange-500 hover:bg-orange-600'
        : 'bg-primary-500 hover:bg-primary-600';

  const handleConfirm = () => {
    onConfirm();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-sm rounded-lg bg-white p-6 shadow-xl">
        <h2 className="mb-2 text-lg font-semibold">{title}</h2>
        <p className="mb-6 text-gray-600">{message}</p>
        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded border px-4 py-2 text-sm hover:bg-gray-50"
          >
            {cancelText}
          </button>
          <button
            onClick={handleConfirm}
            className={`rounded px-4 py-2 text-sm text-white ${confirmButtonClass}`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

// =============================================================================
// Stats Modal
// =============================================================================

interface ColorDistributionItem {
  name: string;
  color: string;
  count: number;
  percentage: number;
}

interface StatsModalData {
  name: string;
  width: number;
  height: number;
  usedHeight: number;
  repeat: number;
  totalBeads: number;
  colorCount: number;
  colorDistribution: ColorDistributionItem[];
}

interface StatsModalProps {
  isOpen: boolean;
  onClose: () => void;
  stats: StatsModalData | null;
}

export const StatsModal: FC<StatsModalProps> = ({ isOpen, onClose, stats }) => {
  if (!isOpen || !stats) return null;

  return (
    <BaseModal isOpen={isOpen} onClose={onClose} title="Статистика схеми" maxWidth="max-w-lg">
      <div className="p-4 space-y-4">
        {/* Pattern name */}
        <div className="pb-3 border-b">
          <span className="text-sm text-gray-500">Назва:</span>
          <p className="font-medium">{stats.name || 'Без назви'}</p>
        </div>

        {/* Dimensions */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <span className="text-sm text-gray-500">Ширина (обхват):</span>
            <p className="text-xl font-bold text-primary-600">{stats.width}</p>
          </div>
          <div>
            <span className="text-sm text-gray-500">Висота (ряди):</span>
            <p className="text-xl font-bold text-primary-600">
              {stats.usedHeight}
              {stats.usedHeight !== stats.height && (
                <span className="text-sm font-normal text-gray-400"> / {stats.height}</span>
              )}
            </p>
          </div>
        </div>

        {/* Beads info */}
        <div className="grid grid-cols-2 gap-4 pt-3 border-t">
          <div>
            <span className="text-sm text-gray-500">Рапорт:</span>
            <p className="text-xl font-bold text-primary-600">{stats.repeat}</p>
          </div>
          <div>
            <span className="text-sm text-gray-500">Всього бісерин:</span>
            <p className="text-xl font-bold text-primary-600">{stats.totalBeads}</p>
          </div>
        </div>

        {/* Color distribution */}
        <div className="pt-3 border-t">
          <span className="text-sm text-gray-500">Кольори ({stats.colorCount}):</span>
          <div className="mt-2 space-y-1.5 max-h-48 overflow-y-auto">
            {stats.colorDistribution.map((item, index) => (
              <div key={index} className="flex items-center gap-2 text-sm">
                <div
                  className="w-5 h-5 rounded border border-gray-300 shrink-0"
                  style={{ backgroundColor: item.color }}
                />
                <span className="flex-1 truncate">{item.name}</span>
                <span className="text-gray-600 font-medium">{item.count}</span>
                <span className="text-gray-400 w-12 text-right">
                  {item.percentage.toFixed(1)}%
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Close button */}
        <div className="pt-3 border-t flex justify-end">
          <button
            onClick={onClose}
            className="rounded bg-primary-500 px-4 py-2 text-sm text-white hover:bg-primary-600"
          >
            Закрити
          </button>
        </div>
      </div>
    </BaseModal>
  );
};

export type { StatsModalData };
