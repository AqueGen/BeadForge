/**
 * BeadForge Type Definitions
 */

// ============================================================
// Core Domain Types
// ============================================================

/**
 * Represents a single color in the bead palette
 */
export interface BeadColor {
  r: number;
  g: number;
  b: number;
  a?: number;
  name?: string;
  symbol?: string; // For B&W printing
}

/**
 * Main pattern data structure
 */
export interface BeadPattern {
  id: string;
  name: string;
  author?: string;
  notes?: string;

  /** Width = Circumference (beads per spiral turn), typically 3-50 */
  width: number;

  /** Height = number of rows, up to 1000 */
  height: number;

  /** Field data: each value is a color index (0-255) */
  field: Uint8Array;

  /** Color palette (up to 255 colors) */
  colors: BeadColor[];

  createdAt: Date;
  updatedAt: Date;
  isPublic: boolean;

  // Marketplace fields
  price?: number;
  previewUrl?: string;
}

/**
 * Serializable version of BeadPattern for API/storage
 */
export interface BeadPatternDto {
  id: string;
  name: string;
  author?: string;
  notes?: string;
  width: number;
  height: number;
  /** Base64 encoded field data */
  field: string;
  colors: BeadColor[];
  createdAt: string;
  updatedAt: string;
  isPublic: boolean;
  price?: number;
  previewUrl?: string;
}

// ============================================================
// Editor Types
// ============================================================

export type DrawingTool = 'pencil' | 'fill' | 'pipette' | 'select' | 'line' | 'rectangle';

export interface EditorSettings {
  zoom: number;
  scroll: number;
  shift: number;
  selectedColor: number;
  tool: DrawingTool;
  showGrid: boolean;
  rowMarkerInterval: number;
}

export interface Selection {
  x: number;
  y: number;
  width: number;
  height: number;
  data?: Uint8Array;
}

export interface Point {
  x: number;
  y: number;
}

// ============================================================
// Calculation Types
// ============================================================

/**
 * Run of same-color beads for stringing list
 */
export interface BeadRun {
  colorIndex: number;
  count: number;
}

/**
 * Pattern statistics
 */
export interface PatternStats {
  width: number;
  height: number;
  usedHeight: number;
  repeat: number;
  totalBeads: number;
  estimatedLengthMm: number;
  estimatedWeightGrams: number;
  beadCounts: Map<number, number>;
}

// ============================================================
// API Types
// ============================================================

export interface CreatePatternRequest {
  name?: string;
  author?: string;
  width: number;
  height: number;
}

export interface UpdatePatternRequest {
  name?: string;
  author?: string;
  notes?: string;
  isPublic?: boolean;
  price?: number;
}

export interface SetBeadRequest {
  x: number;
  y: number;
  colorIndex: number;
}

export interface SetBeadsRequest {
  beads: SetBeadRequest[];
}

export interface ApiResponse<T> {
  data?: T;
  error?: string;
}

// ============================================================
// View Types
// ============================================================

export type ViewType = 'draft' | 'corrected' | 'simulation';

export interface ViewConfig {
  type: ViewType;
  zoom: number;
  scroll: number;
  shift: number;
  showGrid: boolean;
}

// ============================================================
// Default Values
// ============================================================

export const DEFAULT_COLORS: BeadColor[] = [
  { r: 255, g: 255, b: 255, name: 'White' },
  { r: 0, g: 0, b: 0, name: 'Black' },
  { r: 255, g: 0, b: 0, name: 'Red' },
  { r: 0, g: 128, b: 0, name: 'Green' },
  { r: 0, g: 0, b: 255, name: 'Blue' },
  { r: 255, g: 255, b: 0, name: 'Yellow' },
  { r: 255, g: 165, b: 0, name: 'Orange' },
  { r: 128, g: 0, b: 128, name: 'Purple' },
  { r: 255, g: 192, b: 203, name: 'Pink' },
  { r: 0, g: 255, b: 255, name: 'Cyan' },
  { r: 165, g: 42, b: 42, name: 'Brown' },
  { r: 128, g: 128, b: 128, name: 'Gray' },
  { r: 192, g: 192, b: 192, name: 'Silver' },
  { r: 255, g: 215, b: 0, name: 'Gold' },
  { r: 0, g: 0, b: 128, name: 'Navy' },
  { r: 128, g: 0, b: 0, name: 'Maroon' },
];

export const DEFAULT_EDITOR_SETTINGS: EditorSettings = {
  zoom: 20,
  scroll: 0,
  shift: 0,
  selectedColor: 1,
  tool: 'pencil',
  showGrid: true,
  rowMarkerInterval: 10,
};

// ============================================================
// TTS (Text-to-Speech) Types
// ============================================================

export type TTSLanguage = 'ru' | 'uk' | 'en';
export type TTSSpeed = 'slow' | 'normal' | 'fast';
export type TTSVoiceGender = 'male' | 'female';
export type TTSMode = 'auto' | 'manual';
export type TTSFormat = 'individual' | 'grouped';

export interface TTSSettings {
  language: TTSLanguage;
  speed: TTSSpeed;
  voiceGender: TTSVoiceGender;
  pauseBetweenColors: number; // milliseconds
  mode: TTSMode;
  format: TTSFormat;
  volume: number; // 0-1
}

export interface TTSState {
  isPlaying: boolean;
  isPaused: boolean;
  currentPosition: number;
  totalBeads: number;
  currentColorName: string;
  isSupported: boolean;
}

export interface TTSBeadItem {
  colorIndex: number;
  colorName: string;
  position: number; // 1-based position in stringing order
}

export interface TTSGroupedItem {
  colorIndex: number;
  colorName: string;
  count: number;
  startPosition: number;
}

export const DEFAULT_TTS_SETTINGS: TTSSettings = {
  language: 'ru',
  speed: 'normal',
  voiceGender: 'female',
  pauseBetweenColors: 500,
  mode: 'auto',
  format: 'individual',
  volume: 1,
};

export const TTS_SPEED_RATES: Record<TTSSpeed, number> = {
  slow: 0.7,
  normal: 1.0,
  fast: 1.3,
};
