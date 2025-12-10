'use client';

import React, { useEffect, useCallback, useState } from 'react';
import type { BeadPattern, TTSLanguage, TTSSpeed, TTSMode, TTSFormat } from '@/types';
import { UI_TRANSLATIONS, getAvailableLanguages, getAvailableVoicesInfo, loadVoices } from '@/lib/tts';
import { useTTS } from '@/hooks';

interface TTSPanelProps {
  pattern: BeadPattern;
  className?: string;
}

export function TTSPanel({ pattern, className = '' }: TTSPanelProps) {
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

  const [voicesInfo, setVoicesInfo] = useState<Record<TTSLanguage, { count: number; names: string[] }>>({
    ru: { count: 0, names: [] },
    uk: { count: 0, names: [] },
    en: { count: 0, names: [] },
  });

  const t = UI_TRANSLATIONS[settings.language];
  const currentVoiceCount = voicesInfo[settings.language]?.count || 0;

  // Load voices info
  useEffect(() => {
    const loadVoicesInfo = async () => {
      await loadVoices();
      setVoicesInfo(getAvailableVoicesInfo());
    };
    loadVoicesInfo();
  }, []);

  // Initialize with pattern
  useEffect(() => {
    initializeWithPattern(pattern);
  }, [pattern, initializeWithPattern]);

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
      if (!isNaN(position)) {
        goToPosition(position);
      }
    },
    [goToPosition]
  );

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
                {lang.nativeName} ({voicesInfo[lang.code]?.count || 0})
              </option>
            ))}
          </select>
        </div>

        {/* Voice availability warning */}
        {currentVoiceCount === 0 && (
          <div className="p-2 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-700">
            ⚠️ {settings.language === 'uk'
              ? 'Українські голоси не знайдено. Встановіть у Windows Settings → Time & Language → Speech'
              : settings.language === 'ru'
              ? 'Русские голоса не найдены. Установите в Windows Settings → Time & Language → Speech'
              : 'No voices found for this language. Install in Windows Settings → Time & Language → Speech'}
          </div>
        )}

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

        {/* Voice */}
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-gray-700">{t.voice}</label>
          <select
            value={settings.voiceGender}
            onChange={(e) =>
              updateSettings({ voiceGender: e.target.value as 'male' | 'female' })
            }
            className="px-2 py-1 border rounded text-sm"
          >
            <option value="female">{t.female}</option>
            <option value="male">{t.male}</option>
          </select>
        </div>

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
