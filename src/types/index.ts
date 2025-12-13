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

/**
 * Represents a range of highlighted beads for TTS visualization
 */
export interface HighlightedBeads {
  /** Bead positions as (x, y) coordinates */
  positions: Point[];
  /** Color index of highlighted beads */
  colorIndex: number;
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
// Special Color Constants
// ============================================================

/**
 * Special color index for "skip" cells
 * Skip cells are not announced by TTS and render as empty circle with X
 * Used for pattern boundaries and empty spaces
 */
export const SKIP_COLOR_INDEX = 255;

/**
 * Special color index for "empty/uncolored" cells
 * Empty cells are shown with checkerboard pattern and trigger warning
 * Used when a color is deleted from the palette
 */
export const EMPTY_COLOR_INDEX = 254;

// ============================================================
// Default Values
// ============================================================

// Import colors from central config
import { DEFAULT_COLORS as CONFIG_COLORS, FREE_COLORS } from '@/config/colors';

/**
 * Default color palette for pattern editor
 * @see src/config/colors.ts for full configuration
 */
export const DEFAULT_COLORS: BeadColor[] = CONFIG_COLORS;

/**
 * Free tier colors (6 colors)
 * @see src/config/colors.ts for tier configuration
 */
export { FREE_COLORS };

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
export type TTSVoiceSource = 'auto' | 'builtin' | 'system';

export interface TTSSettings {
  language: TTSLanguage;
  speed: TTSSpeed;
  voiceGender: TTSVoiceGender;
  pauseBetweenColors: number; // milliseconds
  mode: TTSMode;
  format: TTSFormat;
  volume: number; // 0-1
  voiceSource: TTSVoiceSource; // 'auto' = try builtin first, 'builtin' = only audio files, 'system' = only system TTS
  builtinVoiceId?: string; // Selected built-in voice ID (e.g., 'ru-female-default')
  systemVoiceName?: string; // Selected system voice name
}

export interface TTSState {
  isPlaying: boolean;
  isPaused: boolean;
  currentPosition: number;
  currentGroupCount: number; // Number of beads in current group (1 for individual mode)
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
  language: 'uk',
  speed: 'normal',
  voiceGender: 'female',
  pauseBetweenColors: 500,
  mode: 'auto',
  format: 'individual',
  volume: 1,
  voiceSource: 'auto', // Try builtin audio first, fallback to system TTS
};

export const TTS_SPEED_RATES: Record<TTSSpeed, number> = {
  slow: 0.7,
  normal: 1.0,
  fast: 1.3,
};

// ============================================================
// Audio TTS Types (Pre-recorded audio files)
// ============================================================

/**
 * Voice configuration for pre-recorded audio
 */
export interface AudioVoiceConfig {
  id: string;              // e.g., 'female-default', 'male-speaker1'
  name: string;            // Display name, e.g., 'Алёна', 'David'
  language: TTSLanguage;
  gender: TTSVoiceGender;
  isDefault?: boolean;
}

/**
 * Audio file manifest for a voice
 */
export interface AudioVoiceManifest {
  voiceId: string;
  language: TTSLanguage;
  gender: TTSVoiceGender;
  name: string;
  colors: Record<string, string>; // colorKey -> filename (without extension)
  numbers?: Record<string, string>; // "1"-"99" for grouped format
  format: 'mp3' | 'ogg' | 'wav';
}

/**
 * Available voices registry
 */
export interface AudioVoicesRegistry {
  voices: AudioVoiceConfig[];
  manifests: Record<string, AudioVoiceManifest>; // voiceId -> manifest
}

/**
 * Audio TTS playback state
 */
export interface AudioTTSState {
  isLoaded: boolean;
  loadError?: string;
  availableVoices: AudioVoiceConfig[];
  currentVoice?: AudioVoiceConfig;
}

// ============================================================
// TTS Progress & Checkpoint Types
// ============================================================

/**
 * TTS reading progress for a pattern
 * Used for checkpoints, resume, and visual highlighting
 */
export interface TTSProgress {
  patternId: string;           // Unique pattern identifier
  position: number;            // Current bead position (1-based)
  completedBeads: number;      // Total beads completed (for dimming)
  lastUpdated: number;         // Timestamp for cleanup/validation
}

/**
 * Navigation mode state for TTS panel
 */
export interface TTSNavigationMode {
  enabled: boolean;            // Is navigation mode active
  selectedPosition: number | null;  // Position selected by user click
}

// ============================================================
// Ball Pattern Types (Beaded Ball / Шарик)
// ============================================================

/**
 * Pattern type discriminator
 */
export type PatternType = 'rope' | 'ball';

/**
 * Ball size configuration
 * Maps diameter (cm) to bead dimensions
 */
export interface BallSizeConfig {
  diameter: number;      // Diameter in cm (3, 4, 5, 6, etc.)
  circumference: number; // Total beads around circumference
  wedgeBase: number;     // Beads at wedge base (circumference / 6)
  wedgeHeight: number;   // Number of rows in wedge
}

/**
 * Predefined ball size configurations
 * Values based on JBead JBB file analysis for accurate sphere geometry
 *
 * JBB spheres use a rectangular grid where:
 * - circumference = total beads around equator (grid width)
 * - wedgeBase = circumference / 6 (beads per wedge at equator)
 * - wedgeHeight = height / 2 (rows from equator to pole)
 * - total grid height = 2 * wedgeHeight (pole to pole)
 */
export const BALL_SIZE_CONFIGS: BallSizeConfig[] = [
  // Estimated based on JBB scaling patterns
  { diameter: 3, circumference: 66, wedgeBase: 11, wedgeHeight: 20 },
  // From JBB: Sphere_4см.jbb = 86 width × 50 height
  { diameter: 4, circumference: 86, wedgeBase: 14, wedgeHeight: 25 },
  // Interpolated between 4cm and 6cm
  { diameter: 5, circumference: 96, wedgeBase: 16, wedgeHeight: 26 },
  // From JBB: Sphere_6см.jbb = 110 width × 55 height
  { diameter: 6, circumference: 110, wedgeBase: 18, wedgeHeight: 27 },
];

/**
 * Get ball size config by diameter
 */
export function getBallSizeConfig(diameter: number): BallSizeConfig | undefined {
  return BALL_SIZE_CONFIGS.find(c => c.diameter === diameter);
}

/**
 * Ball pattern data structure
 * Represents a beaded ball with 6 wedges in zigzag layout
 */
export interface BallPattern {
  id: string;
  name: string;
  author?: string;
  notes?: string;
  type: 'ball';

  /** Ball diameter in cm */
  diameter: number;

  /** Derived from diameter */
  circumference: number;  // Total beads around
  wedgeBase: number;      // Beads at widest point of wedge
  wedgeHeight: number;    // Rows in each wedge

  /**
   * Field data for the full development (развёртка)
   * Layout: 6 wedges up + 6 wedges down in zigzag
   * Width = circumference (6 * wedgeBase)
   * Height = 2 * wedgeHeight (top + bottom wedges)
   */
  width: number;   // = circumference
  height: number;  // = 2 * wedgeHeight
  field: Uint8Array;

  /** Color palette (shared with BeadPattern) */
  colors: BeadColor[];

  createdAt: Date;
  updatedAt: Date;
  isPublic: boolean;

  price?: number;
  previewUrl?: string;
}

/**
 * Serializable version of BallPattern for API/storage
 */
export interface BallPatternDto {
  id: string;
  name: string;
  author?: string;
  notes?: string;
  type: 'ball';
  diameter: number;
  circumference: number;
  wedgeBase: number;
  wedgeHeight: number;
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

/**
 * Wedge position in the ball development
 */
export type WedgePosition = 'top' | 'bottom';

/**
 * Single wedge info for rendering/editing
 */
export interface WedgeInfo {
  index: number;           // 0-5
  position: WedgePosition; // 'top' or 'bottom'
  startX: number;          // X offset in field
  startY: number;          // Y offset in field
  base: number;            // Width at base
  height: number;          // Number of rows
}

// ============================================================
// Color Mapping Types (re-export)
// ============================================================

export * from './colorMapping';
