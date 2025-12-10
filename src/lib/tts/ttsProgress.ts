/**
 * TTS Progress Storage
 * Handles localStorage persistence for TTS reading progress and checkpoints
 */

import { TTSProgress } from '@/types';

const STORAGE_KEY = 'beadforge_tts_progress';
const MAX_AGE_DAYS = 30; // Auto-cleanup old progress after 30 days

/**
 * Generate a stable pattern ID from pattern content for TTS progress tracking.
 * ALWAYS uses a content-based hash (dimensions + field data) so that progress
 * persists across page reloads, even if the pattern object gets a new UUID.
 *
 * Note: We intentionally ignore pattern.id because UUIDs are regenerated on reload,
 * but the pattern content remains the same.
 */
export function generatePatternId(pattern: { id?: string; width: number; height: number; field: Uint8Array | number[] }): string {
  // Always create a content-based hash from pattern data for stable identification
  // Use more field data for better uniqueness (first 200 bytes or full field if smaller)
  const sampleSize = Math.min(pattern.field.length, 200);
  const fieldSample = Array.from(pattern.field).slice(0, sampleSize).join(',');
  return `${pattern.width}x${pattern.height}_${hashCode(fieldSample)}`;
}

/**
 * Simple hash function for strings
 */
function hashCode(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(36);
}

/**
 * Get all stored progress entries
 */
function getAllProgress(): Record<string, TTSProgress> {
  if (typeof window === 'undefined') return {};

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
}

/**
 * Save all progress entries
 */
function saveAllProgress(progress: Record<string, TTSProgress>): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
  } catch (error) {
    console.error('Failed to save TTS progress:', error);
  }
}

/**
 * Get progress for a specific pattern
 */
export function getProgress(patternId: string): TTSProgress | null {
  const allProgress = getAllProgress();
  const progress = allProgress[patternId];

  if (!progress) return null;

  // Check if progress is too old
  const ageMs = Date.now() - progress.lastUpdated;
  const maxAgeMs = MAX_AGE_DAYS * 24 * 60 * 60 * 1000;

  if (ageMs > maxAgeMs) {
    // Clean up old progress
    deleteProgress(patternId);
    return null;
  }

  return progress;
}

/**
 * Save progress for a pattern (checkpoint)
 */
export function saveProgress(
  patternId: string,
  position: number,
  completedBeads: number
): TTSProgress {
  const progress: TTSProgress = {
    patternId,
    position,
    completedBeads,
    lastUpdated: Date.now(),
  };

  const allProgress = getAllProgress();
  allProgress[patternId] = progress;
  saveAllProgress(allProgress);

  return progress;
}

/**
 * Update just the position (for quick updates during playback)
 */
export function updatePosition(patternId: string, position: number, completedBeads: number): void {
  const allProgress = getAllProgress();

  if (allProgress[patternId]) {
    allProgress[patternId].position = position;
    allProgress[patternId].completedBeads = completedBeads;
    allProgress[patternId].lastUpdated = Date.now();
    saveAllProgress(allProgress);
  } else {
    saveProgress(patternId, position, completedBeads);
  }
}

/**
 * Delete progress for a pattern (reset)
 */
export function deleteProgress(patternId: string): void {
  const allProgress = getAllProgress();
  delete allProgress[patternId];
  saveAllProgress(allProgress);
}

/**
 * Reset all progress (clear all patterns)
 */
export function resetAllProgress(): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.error('Failed to reset TTS progress:', error);
  }
}

/**
 * Clean up old progress entries
 */
export function cleanupOldProgress(): number {
  const allProgress = getAllProgress();
  const now = Date.now();
  const maxAgeMs = MAX_AGE_DAYS * 24 * 60 * 60 * 1000;
  let cleaned = 0;

  for (const [patternId, progress] of Object.entries(allProgress)) {
    if (now - progress.lastUpdated > maxAgeMs) {
      delete allProgress[patternId];
      cleaned++;
    }
  }

  if (cleaned > 0) {
    saveAllProgress(allProgress);
  }

  return cleaned;
}

/**
 * Check if there's saved progress for a pattern
 */
export function hasProgress(patternId: string): boolean {
  return getProgress(patternId) !== null;
}
