'use client';

import { useState, useEffect } from 'react';
import { X, Volume2, Pause, Save, MessageSquare, Play, Plus, Trash2 } from 'lucide-react';
import type {
  CellEvent,
  CellEventType,
  EventSoundId,
  CellActionType,
  EventTiming,
} from '@/types/cellEvents';
import {
  createSoundEvent,
  createActionEvent,
  createTextEvent,
  getEventDisplayName,
} from '@/types/cellEvents';
import {
  getEventSoundsByCategory,
  playEventSound,
} from '@/config/eventSounds';

// ============================================================
// Types
// ============================================================

interface EventEditorModalProps {
  isOpen: boolean;
  position: number;
  editingEvent: CellEvent | null;
  onSave: (events: CellEvent | CellEvent[]) => void;
  onClose: () => void;
}

// ============================================================
// Component
// ============================================================

export function EventEditorModal({
  isOpen,
  position,
  editingEvent,
  onSave,
  onClose,
}: EventEditorModalProps) {
  // Form state
  const [eventType, setEventType] = useState<CellEventType>('sound');
  const [soundId, setSoundId] = useState<EventSoundId>('біп');
  const [actionType, setActionType] = useState<CellActionType>('pause');
  const [textMessage, setTextMessage] = useState('');
  const [textDuration, setTextDuration] = useState(5000);
  const [timing, setTiming] = useState<EventTiming>('before');

  // Pending events list (for multi-add mode)
  const [pendingEvents, setPendingEvents] = useState<CellEvent[]>([]);

  // Get sounds by category
  const techniqueSounds = getEventSoundsByCategory('technique');
  const signalSounds = getEventSoundsByCategory('signal');

  // Check if we're in edit mode (editing existing event)
  const isEditMode = editingEvent !== null;

  // Initialize form when editing or opening
  useEffect(() => {
    if (editingEvent) {
      setEventType(editingEvent.type);
      setTiming(editingEvent.timing || 'before');

      if (editingEvent.type === 'sound') {
        setSoundId(editingEvent.soundId);
      } else if (editingEvent.type === 'action') {
        setActionType(editingEvent.actionType);
      } else if (editingEvent.type === 'text') {
        setTextMessage(editingEvent.message);
        setTextDuration(editingEvent.duration || 5000);
      }
    } else {
      // Reset to defaults for new events
      resetForm();
      setPendingEvents([]);
    }
  }, [editingEvent, isOpen]);

  const resetForm = () => {
    setEventType('sound');
    setSoundId('біп');
    setActionType('pause');
    setTextMessage('');
    setTextDuration(5000);
    setTiming('before');
  };

  // Create event from current form state
  const createEventFromForm = (): CellEvent | null => {
    switch (eventType) {
      case 'sound':
        return createSoundEvent(soundId, timing);

      case 'action':
        return createActionEvent(actionType, timing);

      case 'text':
        if (!textMessage.trim()) {
          return null;
        }
        return createTextEvent(textMessage.trim(), textDuration, timing);

      default:
        return null;
    }
  };

  // Handle adding event to pending list
  const handleAddToPending = () => {
    const event = createEventFromForm();
    if (!event) {
      if (eventType === 'text') {
        alert('Введіть текст повідомлення');
      }
      return;
    }

    setPendingEvents((prev) => [...prev, event]);
    resetForm();
  };

  // Handle removing event from pending list
  const handleRemoveFromPending = (eventId: string) => {
    setPendingEvents((prev) => prev.filter((e) => e.id !== eventId));
  };

  // Handle saving (edit mode - single event)
  const handleSaveEdit = () => {
    if (!editingEvent) return;

    let event: CellEvent;

    switch (eventType) {
      case 'sound':
        event = { ...editingEvent, soundId, timing } as CellEvent;
        break;

      case 'action':
        event = { ...editingEvent, actionType, timing } as CellEvent;
        break;

      case 'text':
        if (!textMessage.trim()) {
          alert('Введіть текст повідомлення');
          return;
        }
        event = { ...editingEvent, message: textMessage.trim(), duration: textDuration, timing } as CellEvent;
        break;

      default:
        return;
    }

    onSave(event);
    onClose();
  };

  // Handle saving all pending events
  const handleSaveAll = () => {
    // If there's something in the form, add it first
    const currentEvent = createEventFromForm();

    const eventsToSave = [...pendingEvents];
    if (currentEvent) {
      eventsToSave.push(currentEvent);
    }

    if (eventsToSave.length === 0) {
      alert('Додайте хоча б одну подію');
      return;
    }

    onSave(eventsToSave);
    onClose();
  };

  const handlePreviewSound = async (id: EventSoundId) => {
    try {
      await playEventSound(id, 'uk');
    } catch (error) {
      console.warn('Failed to preview sound:', error);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-slate-800 rounded-lg shadow-xl border border-slate-700 w-full max-w-md mx-4 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-700 shrink-0">
          <h2 className="text-lg font-semibold text-slate-100">
            {isEditMode ? 'Редагувати подію' : 'Додати події'}
          </h2>
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-400">
              Позиція: {position}
            </span>
            <button
              onClick={onClose}
              className="p-1 text-slate-400 hover:text-slate-200 rounded hover:bg-slate-700"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Content - scrollable */}
        <div className="p-4 space-y-4 overflow-y-auto flex-1">
          {/* Pending events list (only in add mode) */}
          {!isEditMode && pendingEvents.length > 0 && (
            <div className="bg-slate-900/50 rounded-lg p-3 border border-slate-600">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-slate-400">
                  Додані події ({pendingEvents.length})
                </span>
              </div>
              <div className="space-y-1">
                {pendingEvents.map((event) => (
                  <div
                    key={event.id}
                    className="flex items-center gap-2 p-2 bg-slate-800 rounded border border-slate-700"
                  >
                    <span className="flex-1 text-xs text-slate-300 truncate">
                      {getEventDisplayName(event)}
                    </span>
                    <button
                      onClick={() => handleRemoveFromPending(event.id)}
                      className="p-1 text-slate-500 hover:text-red-400 rounded hover:bg-slate-700"
                      title="Видалити"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Form section header (only in add mode) */}
          {!isEditMode && pendingEvents.length > 0 && (
            <div className="border-t border-slate-700 pt-4">
              <span className="text-xs font-medium text-slate-400">
                Додати ще одну подію:
              </span>
            </div>
          )}

          {/* Event type selector */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Тип події
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => setEventType('sound')}
                className={`
                  flex flex-col items-center gap-1 p-3 rounded-lg border transition-colors
                  ${eventType === 'sound'
                    ? 'border-blue-500 bg-blue-500/10 text-blue-400'
                    : 'border-slate-600 hover:border-slate-500 text-slate-400'}
                `}
              >
                <Volume2 size={20} />
                <span className="text-xs">Звук</span>
              </button>

              <button
                onClick={() => setEventType('action')}
                className={`
                  flex flex-col items-center gap-1 p-3 rounded-lg border transition-colors
                  ${eventType === 'action'
                    ? 'border-blue-500 bg-blue-500/10 text-blue-400'
                    : 'border-slate-600 hover:border-slate-500 text-slate-400'}
                `}
              >
                <Pause size={20} />
                <span className="text-xs">Дія</span>
              </button>

              <button
                onClick={() => setEventType('text')}
                className={`
                  flex flex-col items-center gap-1 p-3 rounded-lg border transition-colors
                  ${eventType === 'text'
                    ? 'border-blue-500 bg-blue-500/10 text-blue-400'
                    : 'border-slate-600 hover:border-slate-500 text-slate-400'}
                `}
              >
                <MessageSquare size={20} />
                <span className="text-xs">Текст</span>
              </button>
            </div>
          </div>

          {/* Event-specific options */}
          {eventType === 'sound' && (
            <div className="space-y-3">
              {/* Techniques */}
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-2">
                  Техніки бісероплетіння
                </label>
                <div className="space-y-1">
                  {techniqueSounds.map((sound) => (
                    <div
                      key={sound.id}
                      className={`
                        flex items-center gap-2 p-2 rounded cursor-pointer transition-colors
                        ${soundId === sound.id
                          ? 'bg-blue-500/20 border border-blue-500/50'
                          : 'hover:bg-slate-700 border border-transparent'}
                      `}
                      onClick={() => setSoundId(sound.id)}
                    >
                      <input
                        type="radio"
                        name="soundId"
                        checked={soundId === sound.id}
                        onChange={() => setSoundId(sound.id)}
                        className="accent-blue-500"
                      />
                      <span className="flex-1 text-sm text-slate-200">
                        {sound.nameUk}
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handlePreviewSound(sound.id);
                        }}
                        className="p-1 text-slate-400 hover:text-blue-400 rounded hover:bg-slate-600"
                        title="Прослухати"
                      >
                        <Play size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Signals */}
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-2">
                  Сигнальні звуки
                </label>
                <div className="space-y-1">
                  {signalSounds.map((sound) => (
                    <div
                      key={sound.id}
                      className={`
                        flex items-center gap-2 p-2 rounded cursor-pointer transition-colors
                        ${soundId === sound.id
                          ? 'bg-blue-500/20 border border-blue-500/50'
                          : 'hover:bg-slate-700 border border-transparent'}
                      `}
                      onClick={() => setSoundId(sound.id)}
                    >
                      <input
                        type="radio"
                        name="soundId"
                        checked={soundId === sound.id}
                        onChange={() => setSoundId(sound.id)}
                        className="accent-blue-500"
                      />
                      <span className="flex-1 text-sm text-slate-200">
                        {sound.nameUk}
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handlePreviewSound(sound.id);
                        }}
                        className="p-1 text-slate-400 hover:text-blue-400 rounded hover:bg-slate-600"
                        title="Прослухати"
                      >
                        <Play size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {eventType === 'action' && (
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Тип дії
              </label>
              <div className="space-y-2">
                <div
                  className={`
                    flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors
                    ${actionType === 'pause'
                      ? 'bg-blue-500/20 border border-blue-500/50'
                      : 'hover:bg-slate-700 border border-slate-600'}
                  `}
                  onClick={() => setActionType('pause')}
                >
                  <input
                    type="radio"
                    name="actionType"
                    checked={actionType === 'pause'}
                    onChange={() => setActionType('pause')}
                    className="accent-blue-500"
                  />
                  <Pause size={18} className="text-slate-300" />
                  <div>
                    <p className="text-sm font-medium text-slate-200">Пауза</p>
                    <p className="text-xs text-slate-400">
                      Призупинити озвучення. Потрібно натиснути &quot;Продовжити&quot;
                    </p>
                  </div>
                </div>

                <div
                  className={`
                    flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors
                    ${actionType === 'checkpoint'
                      ? 'bg-blue-500/20 border border-blue-500/50'
                      : 'hover:bg-slate-700 border border-slate-600'}
                  `}
                  onClick={() => setActionType('checkpoint')}
                >
                  <input
                    type="radio"
                    name="actionType"
                    checked={actionType === 'checkpoint'}
                    onChange={() => setActionType('checkpoint')}
                    className="accent-blue-500"
                  />
                  <Save size={18} className="text-slate-300" />
                  <div>
                    <p className="text-sm font-medium text-slate-200">Чекпоінт</p>
                    <p className="text-xs text-slate-400">
                      Зберегти прогрес. Можна продовжити з цього місця пізніше
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {eventType === 'text' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Текст повідомлення
                </label>
                <textarea
                  value={textMessage}
                  onChange={(e) => setTextMessage(e.target.value)}
                  placeholder="Введіть повідомлення для відображення..."
                  className="
                    w-full px-3 py-2 bg-slate-900 border border-slate-600
                    rounded-lg text-slate-100 placeholder-slate-500
                    focus:outline-none focus:border-blue-500
                    resize-none
                  "
                  rows={3}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Тривалість показу: {(textDuration / 1000).toFixed(1)} сек
                </label>
                <input
                  type="range"
                  min={1000}
                  max={15000}
                  step={500}
                  value={textDuration}
                  onChange={(e) => setTextDuration(Number(e.target.value))}
                  className="w-full accent-blue-500"
                />
                <div className="flex justify-between text-xs text-slate-500 mt-1">
                  <span>1 сек</span>
                  <span>15 сек</span>
                </div>
              </div>
            </div>
          )}

          {/* Timing selector */}
          <div className="border-t border-slate-700 pt-4">
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Коли виконувати
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setTiming('before')}
                className={`
                  flex items-center justify-center gap-2 p-3 rounded-lg border transition-colors
                  ${timing === 'before'
                    ? 'border-amber-500 bg-amber-500/10 text-amber-400'
                    : 'border-slate-600 hover:border-slate-500 text-slate-400'}
                `}
              >
                <span className="text-lg">⏪</span>
                <div className="text-left">
                  <p className="text-xs font-medium">До озвучки</p>
                  <p className="text-[10px] opacity-70">Виконати перед кольором</p>
                </div>
              </button>

              <button
                onClick={() => setTiming('after')}
                className={`
                  flex items-center justify-center gap-2 p-3 rounded-lg border transition-colors
                  ${timing === 'after'
                    ? 'border-amber-500 bg-amber-500/10 text-amber-400'
                    : 'border-slate-600 hover:border-slate-500 text-slate-400'}
                `}
              >
                <span className="text-lg">⏩</span>
                <div className="text-left">
                  <p className="text-xs font-medium">Після озвучки</p>
                  <p className="text-[10px] opacity-70">Виконати після кольору</p>
                </div>
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-2 p-4 border-t border-slate-700 shrink-0">
          {isEditMode ? (
            // Edit mode - simple save/cancel
            <>
              <div />
              <div className="flex gap-2">
                <button
                  onClick={onClose}
                  className="
                    px-4 py-2 text-sm text-slate-300
                    hover:bg-slate-700 rounded-lg transition-colors
                  "
                >
                  Скасувати
                </button>
                <button
                  onClick={handleSaveEdit}
                  className="
                    px-4 py-2 text-sm text-white bg-blue-600
                    hover:bg-blue-500 rounded-lg transition-colors
                  "
                >
                  Зберегти
                </button>
              </div>
            </>
          ) : (
            // Add mode - add more + save all
            <>
              <button
                onClick={handleAddToPending}
                className="
                  flex items-center gap-1.5 px-3 py-2 text-sm text-slate-300
                  border border-slate-600 hover:border-slate-500
                  hover:bg-slate-700 rounded-lg transition-colors
                "
              >
                <Plus size={16} />
                Ще одну
              </button>
              <div className="flex gap-2">
                <button
                  onClick={onClose}
                  className="
                    px-4 py-2 text-sm text-slate-300
                    hover:bg-slate-700 rounded-lg transition-colors
                  "
                >
                  Скасувати
                </button>
                <button
                  onClick={handleSaveAll}
                  className="
                    flex items-center gap-1.5 px-4 py-2 text-sm text-white bg-blue-600
                    hover:bg-blue-500 rounded-lg transition-colors
                  "
                >
                  <Save size={16} />
                  Зберегти {pendingEvents.length > 0 ? `(${pendingEvents.length + 1})` : ''}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default EventEditorModal;
