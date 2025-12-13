'use client';

import { useState, useEffect } from 'react';
import { X, Volume2, Pause, Save, MessageSquare, Play } from 'lucide-react';
import type {
  CellEvent,
  CellEventType,
  EventSoundId,
  CellActionType,
} from '@/types/cellEvents';
import {
  createSoundEvent,
  createActionEvent,
  createTextEvent,
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
  onSave: (event: CellEvent) => void;
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

  // Get sounds by category
  const techniqueSounds = getEventSoundsByCategory('technique');
  const signalSounds = getEventSoundsByCategory('signal');

  // Initialize form when editing
  useEffect(() => {
    if (editingEvent) {
      setEventType(editingEvent.type);

      if (editingEvent.type === 'sound') {
        setSoundId(editingEvent.soundId);
      } else if (editingEvent.type === 'action') {
        setActionType(editingEvent.actionType);
      } else if (editingEvent.type === 'text') {
        setTextMessage(editingEvent.message);
        setTextDuration(editingEvent.duration || 5000);
      }
    } else {
      // Reset to defaults for new event
      setEventType('sound');
      setSoundId('біп');
      setActionType('pause');
      setTextMessage('');
      setTextDuration(5000);
    }
  }, [editingEvent, isOpen]);

  const handleSave = () => {
    let event: CellEvent;

    switch (eventType) {
      case 'sound':
        event = editingEvent?.type === 'sound'
          ? { ...editingEvent, soundId }
          : createSoundEvent(soundId);
        break;

      case 'action':
        event = editingEvent?.type === 'action'
          ? { ...editingEvent, actionType }
          : createActionEvent(actionType);
        break;

      case 'text':
        if (!textMessage.trim()) {
          alert('Введіть текст повідомлення');
          return;
        }
        event = editingEvent?.type === 'text'
          ? { ...editingEvent, message: textMessage.trim(), duration: textDuration }
          : createTextEvent(textMessage.trim(), textDuration);
        break;

      default:
        return;
    }

    onSave(event);
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
      <div className="relative bg-slate-800 rounded-lg shadow-xl border border-slate-700 w-full max-w-md mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-700">
          <h2 className="text-lg font-semibold text-slate-100">
            {editingEvent ? 'Редагувати подію' : 'Додати подію'}
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

        {/* Content */}
        <div className="p-4 space-y-4">
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
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 p-4 border-t border-slate-700">
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
            onClick={handleSave}
            className="
              px-4 py-2 text-sm text-white bg-blue-600
              hover:bg-blue-500 rounded-lg transition-colors
            "
          >
            {editingEvent ? 'Зберегти' : 'Додати'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default EventEditorModal;
