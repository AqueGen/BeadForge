/**
 * Color Mapping Types
 *
 * Types for mapping imported pattern colors to voiced colors with modifiers.
 */

import type { BeadColor } from './index';

// ============================================================
// Modifier Types
// ============================================================

/** Brightness modifier: light or dark */
export type BrightnessModifier = 'light' | 'dark' | null;

/** Transparency modifier */
export type TransparencyModifier = 'transparent' | null;

/** Finish/texture modifier */
export type FinishModifier = 'matte' | 'glossy' | 'pearl' | 'metallic' | null;

/** Saturation modifier */
export type SaturationModifier = 'pastel' | 'bright' | null;

/** All modifiers for a color */
export interface ColorModifiers {
  brightness: BrightnessModifier;
  transparency: TransparencyModifier;
  finish: FinishModifier;
  saturation: SaturationModifier;
}

/** Default empty modifiers */
export const DEFAULT_MODIFIERS: ColorModifiers = {
  brightness: null,
  transparency: null,
  finish: null,
  saturation: null,
};

// ============================================================
// Color Mapping Types
// ============================================================

/** Mapping from original color to voiced color with modifiers */
export interface ColorMapping {
  /** Index in pattern.colors array */
  originalIndex: number;
  /** Original RGB color from pattern */
  originalColor: BeadColor;
  /** Index of the voiced base color (0-15) */
  mappedColorIndex: number;
  /** Applied modifiers */
  modifiers: ColorModifiers;
  /** Whether this mapping was auto-generated or user-set */
  isAutoMapped: boolean;
}

/** TTS voicing mode */
export type TTSMode = 'colorOnly' | 'full';

/** Color settings stored with pattern */
export interface PatternColorSettings {
  /** Color mappings for each pattern color */
  mappings: ColorMapping[];
  /** TTS mode: color only or full (with modifiers) */
  ttsMode: TTSMode;
}

// ============================================================
// Voiced Color Definition
// ============================================================

/** A base color that has voice recording */
export interface VoicedColor {
  /** Index (0-15 for base colors) */
  index: number;
  /** Internal key for audio file lookup */
  key: string;
  /** Ukrainian name */
  nameUk: string;
  /** Russian name */
  nameRu: string;
  /** English name */
  nameEn: string;
  /** Representative RGB value */
  rgb: BeadColor;
}

/** Modifier voice definition */
export interface ModifierVoice {
  /** Modifier key */
  key: string;
  /** Ukrainian name */
  nameUk: string;
  /** Russian name */
  nameRu: string;
  /** English name */
  nameEn: string;
}

// ============================================================
// Helper Functions
// ============================================================

/** Check if modifiers are empty */
export function hasNoModifiers(modifiers: ColorModifiers): boolean {
  return (
    modifiers.brightness === null &&
    modifiers.transparency === null &&
    modifiers.finish === null &&
    modifiers.saturation === null
  );
}

/** Get list of active modifier keys in voice order */
export function getActiveModifierKeys(modifiers: ColorModifiers): string[] {
  const keys: string[] = [];

  // Order: brightness, finish, transparency, saturation
  if (modifiers.brightness) keys.push(modifiers.brightness);
  if (modifiers.finish) keys.push(modifiers.finish);
  if (modifiers.transparency) keys.push(modifiers.transparency);
  if (modifiers.saturation) keys.push(modifiers.saturation);

  return keys;
}

/** Create a copy of modifiers */
export function cloneModifiers(modifiers: ColorModifiers): ColorModifiers {
  return { ...modifiers };
}
