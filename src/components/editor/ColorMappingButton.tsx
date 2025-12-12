/**
 * ColorMappingButton
 *
 * Toolbar button that shows color mapping status and opens the mapping panel.
 * Shows warning indicator when colors need mapping attention.
 */

import { FC } from 'react';

interface ColorMappingButtonProps {
  /** Whether there are unmapped or invalid colors */
  hasWarning: boolean;
  /** Number of colors that need attention */
  warningCount?: number;
  /** Click handler to open mapping panel */
  onClick: () => void;
  /** Whether the button is disabled */
  disabled?: boolean;
}

export const ColorMappingButton: FC<ColorMappingButtonProps> = ({
  hasWarning,
  warningCount = 0,
  onClick,
  disabled = false,
}) => {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`
        relative flex items-center gap-1.5 px-3 py-1.5 rounded text-sm font-medium
        transition-colors
        ${
          disabled
            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
            : hasWarning
            ? 'bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-300'
            : 'bg-green-50 text-green-700 hover:bg-green-100 border border-green-300'
        }
      `}
      title={
        hasWarning
          ? `${warningCount} колір(ів) потребують налаштування`
          : 'Усі кольори налаштовані'
      }
    >
      {/* Palette Icon */}
      <svg
        className="w-4 h-4"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01"
        />
      </svg>

      <span>Кольори</span>

      {/* Warning/OK indicator */}
      {hasWarning ? (
        <span className="flex items-center justify-center w-5 h-5 bg-amber-500 text-white text-xs font-bold rounded-full">
          {warningCount > 9 ? '9+' : warningCount}
        </span>
      ) : (
        <svg
          className="w-4 h-4 text-green-600"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M5 13l4 4L19 7"
          />
        </svg>
      )}
    </button>
  );
};
