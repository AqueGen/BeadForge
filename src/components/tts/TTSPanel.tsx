'use client';

import React, { useEffect, useCallback, useState, useRef } from 'react';
import type { BeadPattern, TTSLanguage, TTSSpeed, TTSMode, TTSFormat, TTSVoiceSource, TTSProgress } from '@/types';
import {
  UI_TRANSLATIONS,
  getAvailableLanguages,
  getAvailableVoicesInfo,
  loadVoices,
  getAvailableAudioVoicesInfo,
  getAudioVoicesForLanguage,
  generatePatternId,
  getProgress,
  saveProgress,
  deleteProgress,
} from '@/lib/tts';
import { useTTS } from '@/hooks';
import { TTSRestorePanel } from './TTSRestorePanel';

interface TTSPanelProps {
  pattern: BeadPattern;
  className?: string;
  onTTSStateChange?: (position: number, groupCount: number, isPlaying: boolean) => void;
  onCompletedBeadsChange?: (completedBeads: number) => void;
  onNavigationModeChange?: (enabled: boolean) => void;
  onEditModeChange?: (enabled: boolean) => void;
  navigateToPosition?: number | null;
  onNavigateComplete?: () => void;
}

export function TTSPanel({
  pattern,
  className = '',
  onTTSStateChange,
  onCompletedBeadsChange,
  onNavigationModeChange,
  onEditModeChange,
  navigateToPosition,
  onNavigateComplete,
}: TTSPanelProps) {
  const {
    state,
    settings,
    play,
    pause,
    stop,
    next,
    previous,
    goToPosition,
    updateSettings,
    initializeWithPattern,
  } = useTTS();

  // System voices (Windows/Mac TTS)
  const [systemVoices, setSystemVoices] = useState<Record<TTSLanguage, { count: number; names: string[] }>>({
    ru: { count: 0, names: [] },
    uk: { count: 0, names: [] },
    en: { count: 0, names: [] },
  });

  // Built-in audio voices (pre-recorded)
  const [audioVoices] = useState(() => getAvailableAudioVoicesInfo());

  // Progress tracking
  const [completedBeads, setCompletedBeads] = useState(0);
  const [navigationMode, setNavigationMode] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [savedProgressToRestore, setSavedProgressToRestore] = useState<TTSProgress | null>(null);
  const patternIdRef = useRef<string>('');
  const initialLoadDoneRef = useRef(false);

  const t = UI_TRANSLATIONS[settings.language];
  const systemVoiceCount = systemVoices[settings.language]?.count || 0;
  const audioVoiceCount = audioVoices[settings.language]?.count || 0;

  // Load system voices info
  useEffect(() => {
    const loadVoicesInfo = async () => {
      await loadVoices();
      setSystemVoices(getAvailableVoicesInfo());
    };
    loadVoicesInfo();
  }, []);

  // Notify parent about TTS state changes for highlighting
  useEffect(() => {
    onTTSStateChange?.(state.currentPosition, state.currentGroupCount, state.isPlaying || state.isPaused);
  }, [state.currentPosition, state.currentGroupCount, state.isPlaying, state.isPaused, onTTSStateChange]);

  // Initialize with pattern
  useEffect(() => {
    initializeWithPattern(pattern);
  }, [pattern, initializeWithPattern]);

  // Check for saved progress when pattern changes (show restore panel instead of auto-restoring)
  // Run only once per pattern ID change
  useEffect(() => {
    const patternId = generatePatternId(pattern);

    // Skip if we already processed this pattern
    if (patternIdRef.current === patternId && initialLoadDoneRef.current) {
      console.log('[TTS] Skipping duplicate load for:', patternId);
      return;
    }

    patternIdRef.current = patternId;
    initialLoadDoneRef.current = true;

    // Debug: Show all saved progress in localStorage
    try {
      const allSaved = localStorage.getItem('beadforge_tts_progress');
      console.log('[TTS] All saved progress in localStorage:', allSaved);
    } catch {
      console.log('[TTS] Could not read localStorage');
    }

    const savedProgress = getProgress(patternId);
    console.log('[TTS] Initial load for Pattern ID:', patternId);
    console.log('[TTS] Pattern.id property:', pattern.id);
    console.log('[TTS] Pattern dimensions:', pattern.width, 'x', pattern.height);
    console.log('[TTS] Saved progress for this ID:', savedProgress);

    if (savedProgress && savedProgress.position > 1) {
      // Show restore panel instead of auto-restoring
      console.log('[TTS] ✅ Showing restore panel');
      setSavedProgressToRestore(savedProgress);
    } else {
      console.log('[TTS] ❌ No saved progress or position <= 1');
      setCompletedBeads(0);
      setSavedProgressToRestore(null);
    }
  }, [pattern]);  // Only depend on pattern, not on callbacks

  // Save progress on pause
  useEffect(() => {
    if (state.isPaused && state.currentPosition > 0) {
      const completed = state.currentPosition - 1;
      setCompletedBeads(completed);
      onCompletedBeadsChange?.(completed);
      saveProgress(patternIdRef.current, state.currentPosition, completed);
    }
  }, [state.isPaused, state.currentPosition, onCompletedBeadsChange]);

  // Update completed beads during playback (every position change) and auto-save
  useEffect(() => {
    if (state.isPlaying && state.currentPosition > 0) {
      const completed = state.currentPosition - 1;
      if (completed !== completedBeads) {
        setCompletedBeads(completed);
        onCompletedBeadsChange?.(completed);
        // Auto-save on every bead change (in case of power loss/crash)
        saveProgress(patternIdRef.current, state.currentPosition, completed);
      }
    }
  }, [state.isPlaying, state.currentPosition, completedBeads, onCompletedBeadsChange]);

  // Save progress in manual mode when position changes (next/previous)
  useEffect(() => {
    if (settings.mode === 'manual' && !state.isPlaying && state.currentPosition > 0) {
      const completed = state.currentPosition - 1;
      setCompletedBeads(completed);
      onCompletedBeadsChange?.(completed);
      saveProgress(patternIdRef.current, state.currentPosition, completed);
    }
  }, [settings.mode, state.isPlaying, state.currentPosition, onCompletedBeadsChange]);

  // Notify parent about navigation mode changes
  useEffect(() => {
    onNavigationModeChange?.(navigationMode);
  }, [navigationMode, onNavigationModeChange]);

  // Notify parent about edit mode changes
  useEffect(() => {
    onEditModeChange?.(editMode);
  }, [editMode, onEditModeChange]);

  // Handle navigation from bead click
  useEffect(() => {
    if (navigateToPosition !== null && navigateToPosition !== undefined && navigateToPosition > 0) {
      goToPosition(navigateToPosition);
      // Save progress when navigating via bead click
      const completed = navigateToPosition - 1;
      setCompletedBeads(completed);
      onCompletedBeadsChange?.(completed);
      saveProgress(patternIdRef.current, navigateToPosition, completed);
      onNavigateComplete?.();
    }
  }, [navigateToPosition, goToPosition, onNavigateComplete, onCompletedBeadsChange]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      switch (e.code) {
        case 'Space':
          e.preventDefault();
          if (state.isPlaying) {
            pause();
          } else {
            play();
          }
          break;
        case 'ArrowRight':
          e.preventDefault();
          next();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          previous();
          break;
        case 'Escape':
          e.preventDefault();
          stop();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [state.isPlaying, play, pause, next, previous, stop]);

  const handlePositionChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const position = parseInt(e.target.value, 10);
      if (!isNaN(position) && position > 0) {
        goToPosition(position);
        // Save progress when manually changing position
        const completed = position - 1;
        setCompletedBeads(completed);
        onCompletedBeadsChange?.(completed);
        saveProgress(patternIdRef.current, position, completed);
      }
    },
    [goToPosition, onCompletedBeadsChange]
  );

  // Toggle navigation mode (mutually exclusive with edit mode)
  const handleNavigationToggle = useCallback(() => {
    setNavigationMode((prev) => {
      const newValue = !prev;
      if (newValue) {
        setEditMode(false); // Turn off edit mode when enabling navigation
      }
      return newValue;
    });
  }, []);

  // Toggle edit mode (mutually exclusive with navigation mode)
  const handleEditToggle = useCallback(() => {
    setEditMode((prev) => {
      const newValue = !prev;
      if (newValue) {
        setNavigationMode(false); // Turn off navigation mode when enabling edit
      }
      return newValue;
    });
  }, []);

  // Reset progress handlers
  const handleResetClick = useCallback(() => {
    setShowResetConfirm(true);
  }, []);

  const handleResetConfirm = useCallback(() => {
    deleteProgress(patternIdRef.current);
    setCompletedBeads(0);
    onCompletedBeadsChange?.(0);
    goToPosition(1);
    setShowResetConfirm(false);
  }, [goToPosition, onCompletedBeadsChange]);

  const handleResetCancel = useCallback(() => {
    setShowResetConfirm(false);
  }, []);

  // Handle restore progress from restore panel
  const handleRestoreProgress = useCallback((position: number, restoredCompletedBeads: number) => {
    goToPosition(position);
    setCompletedBeads(restoredCompletedBeads);
    onCompletedBeadsChange?.(restoredCompletedBeads);
    setSavedProgressToRestore(null);
  }, [goToPosition, onCompletedBeadsChange]);

  // Handle dismiss restore panel (start fresh)
  const handleDismissRestorePanel = useCallback(() => {
    setCompletedBeads(0);
    onCompletedBeadsChange?.(0);
    setSavedProgressToRestore(null);
  }, [onCompletedBeadsChange]);

  if (!state.isSupported) {
    return (
      <div className={`bg-yellow-50 border border-yellow-200 rounded-lg p-4 ${className}`}>
        <p className="text-yellow-800">{t.notSupported}</p>
      </div>
    );
  }

  return (
    <div className={`bg-white border rounded-lg shadow-sm ${className}`}>
      {/* Header */}
      <div className="px-4 py-3 border-b bg-gray-50 rounded-t-lg">
        <h3 className="font-medium text-gray-900 flex items-center gap-2">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
          </svg>
          TTS - {t.currentColor}
        </h3>
      </div>

      {/* Restore Progress Panel */}
      {savedProgressToRestore && (
        <div className="p-3 border-b">
          <TTSRestorePanel
            pattern={pattern}
            savedProgress={savedProgressToRestore}
            onRestore={handleRestoreProgress}
            onDismiss={handleDismissRestorePanel}
          />
        </div>
      )}

      {/* Current Status */}
      <div className="px-4 py-3 border-b">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-sm text-gray-500">{t.position}: </span>
            <span className="font-mono font-medium">
              {state.currentPosition} {t.of} {state.totalBeads}
            </span>
          </div>
          <div className="text-lg font-medium text-primary-600">
            {state.currentColorName || '—'}
          </div>
        </div>

        {/* Progress bar */}
        <div className="mt-2 h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-primary-500 transition-all duration-300"
            style={{
              width: state.totalBeads > 0
                ? `${(state.currentPosition / state.totalBeads) * 100}%`
                : '0%',
            }}
          />
        </div>
      </div>

      {/* Main Controls */}
      <div className="px-4 py-3 border-b">
        <div className="flex items-center justify-center gap-2">
          {/* Previous */}
          <button
            onClick={previous}
            className="p-2 rounded-full hover:bg-gray-100 transition-colors"
            title={`${t.previous} (←)`}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          {/* Play/Pause */}
          <button
            onClick={state.isPlaying ? pause : play}
            className="p-3 rounded-full bg-primary-500 text-white hover:bg-primary-600 transition-colors"
            title={state.isPlaying ? `${t.pause} (Space)` : `${t.play} (Space)`}
          >
            {state.isPlaying ? (
              <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
                <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
              </svg>
            ) : (
              <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
            )}
          </button>

          {/* Stop */}
          <button
            onClick={stop}
            className="p-2 rounded-full hover:bg-gray-100 transition-colors"
            title={`${t.stop} (Esc)`}
          >
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
              <rect x="6" y="6" width="12" height="12" />
            </svg>
          </button>

          {/* Next */}
          <button
            onClick={next}
            className="p-2 rounded-full hover:bg-gray-100 transition-colors"
            title={`${t.next} (→)`}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        {/* Go to position */}
        <div className="mt-3 flex items-center gap-2 justify-center">
          <label className="text-sm text-gray-500">{t.goToPosition}:</label>
          <input
            type="number"
            min={1}
            max={state.totalBeads}
            value={state.currentPosition || ''}
            onChange={handlePositionChange}
            className="w-20 px-2 py-1 border rounded text-center text-sm"
          />
        </div>

        {/* Progress info and controls */}
        <div className="mt-3 pt-3 border-t">
          {/* Completed beads info */}
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="text-gray-500">
              {settings.language === 'uk' ? 'Завершено:' : settings.language === 'ru' ? 'Завершено:' : 'Completed:'}
            </span>
            <span className="font-mono font-medium text-green-600">
              {completedBeads} / {state.totalBeads}
            </span>
          </div>

          {/* Edit and Navigation mode toggles */}
          <div className="flex items-center gap-2 mb-2">
            <button
              onClick={handleEditToggle}
              className={`flex-1 px-3 py-2 text-sm rounded border transition-colors ${
                editMode
                  ? 'bg-green-500 text-white border-green-500'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              }`}
            >
              {settings.language === 'uk'
                ? (editMode ? '✏️ Редагування ВКЛ' : '✏️ Редагування')
                : settings.language === 'ru'
                  ? (editMode ? '✏️ Редактирование ВКЛ' : '✏️ Редактирование')
                  : (editMode ? '✏️ Edit ON' : '✏️ Edit Mode')}
            </button>
            <button
              onClick={handleNavigationToggle}
              className={`flex-1 px-3 py-2 text-sm rounded border transition-colors ${
                navigationMode
                  ? 'bg-blue-500 text-white border-blue-500'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              }`}
            >
              {settings.language === 'uk'
                ? (navigationMode ? '🎯 Навігація ВКЛ' : '🎯 Навігація')
                : settings.language === 'ru'
                  ? (navigationMode ? '🎯 Навигация ВКЛ' : '🎯 Навигация')
                  : (navigationMode ? '🎯 Navigation ON' : '🎯 Navigation')}
            </button>
          </div>

          {/* Edit mode hint */}
          {editMode && (
            <p className="text-xs text-green-600 mb-2">
              {settings.language === 'uk'
                ? 'Натисніть на бусину, щоб змінити її колір'
                : settings.language === 'ru'
                  ? 'Нажмите на бусину, чтобы изменить её цвет'
                  : 'Click on a bead to change its color'}
            </p>
          )}

          {/* Navigation mode hint */}
          {navigationMode && (
            <p className="text-xs text-blue-600 mb-2">
              {settings.language === 'uk'
                ? 'Натисніть на бусину на схемі, щоб перейти до неї'
                : settings.language === 'ru'
                  ? 'Нажмите на бусину на схеме, чтобы перейти к ней'
                  : 'Click on a bead in the pattern to jump to it'}
            </p>
          )}

          {/* Reset progress button */}
          {completedBeads > 0 && !showResetConfirm && (
            <button
              onClick={handleResetClick}
              className="w-full px-3 py-2 text-sm rounded border border-red-300 text-red-600 hover:bg-red-50 transition-colors"
            >
              {settings.language === 'uk'
                ? '🔄 Скинути прогрес'
                : settings.language === 'ru'
                  ? '🔄 Сбросить прогресс'
                  : '🔄 Reset Progress'}
            </button>
          )}

          {/* Reset confirmation */}
          {showResetConfirm && (
            <div className="p-2 bg-red-50 border border-red-200 rounded">
              <p className="text-sm text-red-700 mb-2">
                {settings.language === 'uk'
                  ? 'Ви впевнені? Весь прогрес буде втрачено.'
                  : settings.language === 'ru'
                    ? 'Вы уверены? Весь прогресс будет потерян.'
                    : 'Are you sure? All progress will be lost.'}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={handleResetConfirm}
                  className="flex-1 px-3 py-1 text-sm rounded bg-red-500 text-white hover:bg-red-600"
                >
                  {settings.language === 'uk' ? 'Так, скинути' : settings.language === 'ru' ? 'Да, сбросить' : 'Yes, reset'}
                </button>
                <button
                  onClick={handleResetCancel}
                  className="flex-1 px-3 py-1 text-sm rounded border border-gray-300 hover:bg-gray-50"
                >
                  {settings.language === 'uk' ? 'Скасувати' : settings.language === 'ru' ? 'Отмена' : 'Cancel'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Settings */}
      <div className="px-4 py-3 space-y-3">
        {/* Mode */}
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-gray-700">{t.mode}</label>
          <select
            value={settings.mode}
            onChange={(e) => updateSettings({ mode: e.target.value as TTSMode })}
            className="px-2 py-1 border rounded text-sm"
          >
            <option value="auto">{t.auto}</option>
            <option value="manual">{t.manual}</option>
          </select>
        </div>

        {/* Format */}
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-gray-700">{t.format}</label>
          <select
            value={settings.format}
            onChange={(e) => updateSettings({ format: e.target.value as TTSFormat })}
            className="px-2 py-1 border rounded text-sm"
          >
            <option value="individual">{t.individual}</option>
            <option value="grouped">{t.grouped}</option>
          </select>
        </div>

        {/* Language */}
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-gray-700">{t.language}</label>
          <select
            value={settings.language}
            onChange={(e) => updateSettings({ language: e.target.value as TTSLanguage })}
            className="px-2 py-1 border rounded text-sm"
          >
            {getAvailableLanguages().map((lang) => (
              <option key={lang.code} value={lang.code}>
                {lang.nativeName}
              </option>
            ))}
          </select>
        </div>

        {/* Voice Source */}
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-gray-700">
            {settings.language === 'uk' ? 'Джерело голосу' : settings.language === 'ru' ? 'Источник голоса' : 'Voice Source'}
          </label>
          <select
            value={settings.voiceSource || 'auto'}
            onChange={(e) => updateSettings({ voiceSource: e.target.value as TTSVoiceSource })}
            className="px-2 py-1 border rounded text-sm"
          >
            <option value="auto">
              {settings.language === 'uk' ? 'Авто' : settings.language === 'ru' ? 'Авто' : 'Auto'}
            </option>
            <option value="builtin">
              {settings.language === 'uk' ? 'Вбудовані' : settings.language === 'ru' ? 'Встроенные' : 'Built-in'}
            </option>
            <option value="system">
              {settings.language === 'uk' ? 'Системні' : settings.language === 'ru' ? 'Системные' : 'System'}
            </option>
          </select>
        </div>

        {/* Voice availability info */}
        <div className="p-2 bg-blue-50 border border-blue-200 rounded text-xs text-blue-700">
          {settings.language === 'uk' ? (
            <>
              🔊 Вбудовані голоси: {audioVoiceCount > 0 ? `✓ (${audioVoices[settings.language]?.names.join(', ')})` : '—'}
              <br />
              💻 Системні голоси: {systemVoiceCount > 0 ? `✓ (${systemVoiceCount})` : '—'}
            </>
          ) : settings.language === 'ru' ? (
            <>
              🔊 Встроенные голоса: {audioVoiceCount > 0 ? `✓ (${audioVoices[settings.language]?.names.join(', ')})` : '—'}
              <br />
              💻 Системные голоса: {systemVoiceCount > 0 ? `✓ (${systemVoiceCount})` : '—'}
            </>
          ) : (
            <>
              🔊 Built-in voices: {audioVoiceCount > 0 ? `✓ (${audioVoices[settings.language]?.names.join(', ')})` : '—'}
              <br />
              💻 System voices: {systemVoiceCount > 0 ? `✓ (${systemVoiceCount})` : '—'}
            </>
          )}
        </div>

        {/* Speed */}
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-gray-700">{t.speed}</label>
          <select
            value={settings.speed}
            onChange={(e) => updateSettings({ speed: e.target.value as TTSSpeed })}
            className="px-2 py-1 border rounded text-sm"
          >
            <option value="slow">{t.slow}</option>
            <option value="normal">{t.normal}</option>
            <option value="fast">{t.fast}</option>
          </select>
        </div>

        {/* Built-in Voice Selector */}
        {(settings.voiceSource === 'auto' || settings.voiceSource === 'builtin') && (
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-gray-700">
              {settings.language === 'uk' ? 'Вбудований голос' : settings.language === 'ru' ? 'Встроенный голос' : 'Built-in Voice'}
            </label>
            <select
              value={settings.builtinVoiceId || ''}
              onChange={(e) => updateSettings({ builtinVoiceId: e.target.value || undefined })}
              className="px-2 py-1 border rounded text-sm"
            >
              <option value="">
                {settings.language === 'uk' ? 'Авто' : settings.language === 'ru' ? 'Авто' : 'Auto'}
              </option>
              {getAudioVoicesForLanguage(settings.language).map((voice) => (
                <option key={voice.id} value={voice.id}>
                  {voice.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* System Voice Selector */}
        {(settings.voiceSource === 'auto' || settings.voiceSource === 'system') && systemVoiceCount > 0 && (
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-gray-700">
              {settings.language === 'uk' ? 'Системний голос' : settings.language === 'ru' ? 'Системный голос' : 'System Voice'}
            </label>
            <select
              value={settings.systemVoiceName || ''}
              onChange={(e) => updateSettings({ systemVoiceName: e.target.value || undefined })}
              className="px-2 py-1 border rounded text-sm max-w-[150px]"
            >
              <option value="">
                {settings.language === 'uk' ? 'Авто' : settings.language === 'ru' ? 'Авто' : 'Auto'}
              </option>
              {systemVoices[settings.language]?.names.map((name) => (
                <option key={name} value={name}>
                  {name.length > 20 ? name.substring(0, 20) + '...' : name}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Pause between colors */}
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-gray-700">{t.pauseBetweenColors}</label>
          <div className="flex items-center gap-2">
            <input
              type="range"
              min={100}
              max={2000}
              step={100}
              value={settings.pauseBetweenColors}
              onChange={(e) =>
                updateSettings({ pauseBetweenColors: parseInt(e.target.value, 10) })
              }
              className="w-24"
            />
            <span className="text-sm text-gray-500 w-12">
              {settings.pauseBetweenColors}ms
            </span>
          </div>
        </div>
      </div>

      {/* Keyboard shortcuts hint */}
      <div className="px-4 py-2 bg-gray-50 rounded-b-lg border-t">
        <p className="text-xs text-gray-500 text-center">
          Space: Play/Pause • ←/→: Prev/Next • Esc: Stop
        </p>
      </div>
    </div>
  );
}
