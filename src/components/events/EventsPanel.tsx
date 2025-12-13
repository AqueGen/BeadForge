'use client';

import { useState } from 'react';
import {
  Trash2,
  Edit2,
  Plus,
  ChevronDown,
  ChevronRight,
  Zap,
} from 'lucide-react';
import type { CellEvent, PatternEvents } from '@/types/cellEvents';
import { getEventSoundName } from '@/config/eventSounds';

// ============================================================
// Types
// ============================================================

interface EventsPanelProps {
  events: PatternEvents;
  onAddEvent: (position: number) => void;
  onEditEvent: (position: number, eventIndex: number) => void;
  onRemoveEvent: (position: number, eventId: string) => void;
  onNavigateToPosition?: (position: number) => void;
}

// ============================================================
// Helper to get display name with proper translation
// ============================================================

function getEventLabel(event: CellEvent): string {
  switch (event.type) {
    case 'sound':
      return `🔊 ${getEventSoundName(event.soundId)}`;
    case 'action':
      return event.actionType === 'pause' ? '⏸️ Пауза' : '💾 Чекпоінт';
    case 'text':
      const preview = event.message.slice(0, 25);
      return `💬 "${preview}${event.message.length > 25 ? '...' : ''}"`;
  }
}

// ============================================================
// Component
// ============================================================

export function EventsPanel({
  events,
  onAddEvent,
  onEditEvent,
  onRemoveEvent,
  onNavigateToPosition,
}: EventsPanelProps) {
  const [expandedPositions, setExpandedPositions] = useState<Set<number>>(new Set());

  const positions = Object.keys(events)
    .map(Number)
    .filter((pos) => events[pos].length > 0)
    .sort((a, b) => a - b);

  const totalEvents = positions.reduce((sum, pos) => sum + events[pos].length, 0);

  const togglePosition = (position: number) => {
    setExpandedPositions((prev) => {
      const next = new Set(prev);
      if (next.has(position)) {
        next.delete(position);
      } else {
        next.add(position);
      }
      return next;
    });
  };

  const expandAll = () => {
    setExpandedPositions(new Set(positions));
  };

  const collapseAll = () => {
    setExpandedPositions(new Set());
  };

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-gray-200">
        <div className="flex items-center gap-2">
          <Zap size={16} className="text-amber-500" />
          <span className="text-xs text-gray-500 bg-amber-100 px-2 py-0.5 rounded-full">
            {totalEvents}
          </span>
        </div>

        {positions.length > 0 && (
          <div className="flex items-center gap-1 text-[10px]">
            <button
              onClick={expandAll}
              className="text-gray-400 hover:text-gray-600 px-1"
              title="Розгорнути все"
            >
              Всі
            </button>
            <span className="text-gray-300">|</span>
            <button
              onClick={collapseAll}
              className="text-gray-400 hover:text-gray-600 px-1"
              title="Згорнути все"
            >
              Згорнути
            </button>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {positions.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full p-6 text-center">
            <Zap size={28} className="text-gray-300 mb-3" />
            <p className="text-gray-400 text-xs mb-1">
              Немає подій
            </p>
            <p className="text-gray-400 text-[10px] max-w-[180px]">
              Натисніть на комірку в редакторі, щоб додати подію
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {positions.map((position) => {
              const positionEvents = events[position];
              const isExpanded = expandedPositions.has(position);

              return (
                <div key={position} className="bg-white">
                  {/* Position header */}
                  <button
                    onClick={() => togglePosition(position)}
                    className="
                      w-full flex items-center gap-2 px-3 py-2
                      hover:bg-amber-50 transition-colors
                      text-left
                    "
                  >
                    {isExpanded ? (
                      <ChevronDown size={14} className="text-gray-400" />
                    ) : (
                      <ChevronRight size={14} className="text-gray-400" />
                    )}

                    <span className="text-gray-700 text-xs font-medium">
                      #{position}
                    </span>

                    <span className="text-[10px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">
                      {positionEvents.length}
                    </span>

                    {onNavigateToPosition && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onNavigateToPosition(position);
                        }}
                        className="
                          ml-auto text-[10px] text-blue-500 hover:text-blue-600
                          px-1.5 py-0.5 hover:bg-blue-50 rounded
                        "
                        title="Перейти до позиції"
                      >
                        →
                      </button>
                    )}
                  </button>

                  {/* Events list */}
                  {isExpanded && (
                    <div className="pl-6 pr-2 pb-2 space-y-1">
                      {positionEvents.map((event, index) => (
                        <div
                          key={event.id}
                          className="
                            flex items-center gap-1.5 p-1.5
                            bg-gray-50 rounded border border-gray-200
                          "
                        >
                          {/* Event info */}
                          <div className="flex-1 min-w-0">
                            <span className="text-[11px] text-gray-600 truncate block">
                              {getEventLabel(event)}
                            </span>
                          </div>

                          {/* Actions */}
                          <div className="flex items-center">
                            <button
                              onClick={() => onEditEvent(position, index)}
                              className="
                                p-1 rounded text-gray-400 hover:text-gray-600
                                hover:bg-gray-200 transition-colors
                              "
                              title="Редагувати"
                            >
                              <Edit2 size={12} />
                            </button>
                            <button
                              onClick={() => onRemoveEvent(position, event.id)}
                              className="
                                p-1 rounded text-gray-400 hover:text-red-500
                                hover:bg-red-50 transition-colors
                              "
                              title="Видалити"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </div>
                      ))}

                      {/* Add event button */}
                      <button
                        onClick={() => onAddEvent(position)}
                        className="
                          w-full flex items-center justify-center gap-1 p-1.5
                          text-[10px] text-gray-400 hover:text-amber-600
                          border border-dashed border-gray-300 hover:border-amber-400
                          rounded transition-colors hover:bg-amber-50
                        "
                      >
                        <Plus size={12} />
                        Додати
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer with stats */}
      {totalEvents > 0 && (
        <div className="p-2 border-t border-gray-200 text-[10px] text-gray-400">
          <div className="flex items-center justify-between">
            <span>Позицій: {positions.length}</span>
            <span>Подій: {totalEvents}</span>
          </div>
        </div>
      )}
    </div>
  );
}

export default EventsPanel;
