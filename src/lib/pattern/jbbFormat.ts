/**
 * JBead .jbb File Format Parser and Serializer
 *
 * JBead is an open-source bead crochet design software.
 * The .jbb format uses S-expressions (Lisp-like syntax).
 *
 * Format structure:
 * (jbb
 *   (version 1)
 *   (author "...")
 *   (organization "...")
 *   (notes "...")
 *   (colors (rgb R G B) (rgb R G B) ...)
 *   (view ...)
 *   (model (row N N N ...) (row N N N ...) ...))
 *
 * Note: Color indices in model are 1-based (0 = background/transparent)
 */

import type { BeadPattern, BeadColor, BallPattern } from '@/types';
import { DEFAULT_COLORS, BALL_SIZE_CONFIGS } from '@/types';

/**
 * Generate a unique ID (replacement for uuid)
 */
function generateId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback for older environments
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// ============================================================
// S-Expression Parser
// ============================================================

type SExpr = string | SExpr[];

/**
 * Tokenize S-expression string
 */
function tokenize(input: string): string[] {
  const tokens: string[] = [];
  let i = 0;

  while (i < input.length) {
    const char = input[i];

    // Skip whitespace
    if (/\s/.test(char)) {
      i++;
      continue;
    }

    // Opening paren
    if (char === '(') {
      tokens.push('(');
      i++;
      continue;
    }

    // Closing paren
    if (char === ')') {
      tokens.push(')');
      i++;
      continue;
    }

    // String literal
    if (char === '"') {
      let str = '';
      i++; // Skip opening quote
      while (i < input.length && input[i] !== '"') {
        if (input[i] === '\\' && i + 1 < input.length) {
          i++;
          str += input[i];
        } else {
          str += input[i];
        }
        i++;
      }
      i++; // Skip closing quote
      tokens.push(`"${str}"`);
      continue;
    }

    // Symbol or number
    let token = '';
    while (i < input.length && !/[\s()]/.test(input[i])) {
      token += input[i];
      i++;
    }
    if (token) {
      tokens.push(token);
    }
  }

  return tokens;
}

/**
 * Parse tokens into S-expression tree
 */
function parseSExpr(tokens: string[]): { expr: SExpr; rest: string[] } {
  if (tokens.length === 0) {
    throw new Error('Unexpected end of input');
  }

  const token = tokens[0];
  const rest = tokens.slice(1);

  if (token === '(') {
    const list: SExpr[] = [];
    let remaining = rest;

    while (remaining.length > 0 && remaining[0] !== ')') {
      const result = parseSExpr(remaining);
      list.push(result.expr);
      remaining = result.rest;
    }

    if (remaining.length === 0) {
      throw new Error('Missing closing parenthesis');
    }

    return { expr: list, rest: remaining.slice(1) };
  }

  if (token === ')') {
    throw new Error('Unexpected closing parenthesis');
  }

  // String literal - remove quotes
  if (token.startsWith('"') && token.endsWith('"')) {
    return { expr: token.slice(1, -1), rest };
  }

  return { expr: token, rest };
}

/**
 * Parse S-expression string to tree
 */
function parse(input: string): SExpr {
  const tokens = tokenize(input);
  const result = parseSExpr(tokens);
  return result.expr;
}

/**
 * Get value from S-expression list by key
 */
function getField(list: SExpr[], key: string): SExpr | undefined {
  for (const item of list) {
    if (Array.isArray(item) && item[0] === key) {
      return item.length === 2 ? item[1] : item.slice(1);
    }
  }
  return undefined;
}

/**
 * Get string value from S-expression list by key
 */
function getString(list: SExpr[], key: string): string {
  const value = getField(list, key);
  return typeof value === 'string' ? value : '';
}

/**
 * Get boolean value from S-expression list by key
 */
function getBool(list: SExpr[], key: string): boolean {
  const value = getField(list, key);
  return value === 'true';
}

/**
 * Get number value from S-expression list by key
 */
function getNumber(list: SExpr[], key: string): number {
  const value = getField(list, key);
  return typeof value === 'string' ? parseInt(value, 10) : 0;
}

// ============================================================
// JBB Parser
// ============================================================

export interface JBBData {
  version: number;
  author: string;
  organization: string;
  notes: string;
  colors: BeadColor[];
  view: {
    draftVisible: boolean;
    correctedVisible: boolean;
    simulationVisible: boolean;
    reportVisible: boolean;
    selectedTool: string;
    selectedColor: number;
    zoom: number;
    scroll: number;
    shift: number;
    drawColors: boolean;
    drawSymbols: boolean;
    symbols: string;
  };
  model: number[][]; // 2D array of color indices (1-based)
}

/**
 * Parse .jbb file content to JBBData
 */
export function parseJBB(content: string): JBBData {
  const tree = parse(content);

  if (!Array.isArray(tree) || tree[0] !== 'jbb') {
    throw new Error('Invalid JBB file: missing jbb root element');
  }

  const jbb = tree as SExpr[];

  // Parse version
  const version = getNumber(jbb, 'version') || 1;

  // Parse metadata
  const author = getString(jbb, 'author');
  const organization = getString(jbb, 'organization');
  const notes = getString(jbb, 'notes');

  // Parse colors
  const colorsField = getField(jbb, 'colors');
  const colors: BeadColor[] = [];

  if (Array.isArray(colorsField)) {
    for (const item of colorsField) {
      if (Array.isArray(item) && item[0] === 'rgb') {
        const r = parseInt(item[1] as string, 10);
        const g = parseInt(item[2] as string, 10);
        const b = parseInt(item[3] as string, 10);
        colors.push({ r, g, b });
      }
    }
  }

  // Parse view settings
  const viewField = getField(jbb, 'view');
  const viewList = Array.isArray(viewField) ? viewField : [];

  const view = {
    draftVisible: getBool(viewList, 'draft-visible'),
    correctedVisible: getBool(viewList, 'corrected-visible'),
    simulationVisible: getBool(viewList, 'simulation-visible'),
    reportVisible: getBool(viewList, 'report-visible'),
    selectedTool: getString(viewList, 'selected-tool') || 'pencil',
    selectedColor: getNumber(viewList, 'selected-color') || 1,
    zoom: getNumber(viewList, 'zoom') || 2,
    scroll: getNumber(viewList, 'scroll') || 0,
    shift: getNumber(viewList, 'shift') || 0,
    drawColors: getBool(viewList, 'draw-colors'),
    drawSymbols: getBool(viewList, 'draw-symbols'),
    symbols: getString(viewList, 'symbols') || '',
  };

  // Parse model (pattern data)
  const modelField = getField(jbb, 'model');
  const model: number[][] = [];

  if (Array.isArray(modelField)) {
    for (const item of modelField) {
      if (Array.isArray(item) && item[0] === 'row') {
        const row = item.slice(1).map((n) => parseInt(n as string, 10));
        model.push(row);
      }
    }
  }

  return {
    version,
    author,
    organization,
    notes,
    colors,
    view,
    model,
  };
}

/**
 * Convert JBBData to BeadPattern
 */
export function jbbToBeadPattern(jbb: JBBData, name?: string): BeadPattern {
  const height = jbb.model.length;
  const width = height > 0 ? jbb.model[0].length : 0;

  // Create field from model data
  // JBB indices are 0-based into colors array
  // JBB rows are stored top-to-bottom, we store bottom-to-top
  const field = new Uint8Array(width * height);

  for (let y = 0; y < height; y++) {
    const row = jbb.model[height - 1 - y]; // Reverse row order
    for (let x = 0; x < width; x++) {
      // JBB index directly maps to colors array index
      // JBB 0 = colors[0], JBB 1 = colors[1], etc.
      field[y * width + x] = row[x] || 0;
    }
  }

  // Use JBB colors or default colors
  const colors: BeadColor[] =
    jbb.colors.length > 0 ? jbb.colors : [...DEFAULT_COLORS];

  return {
    id: generateId(),
    name: name || jbb.author || 'Imported Pattern',
    author: jbb.author || undefined,
    notes: jbb.notes || undefined,
    width,
    height,
    field,
    colors,
    createdAt: new Date(),
    updatedAt: new Date(),
    isPublic: false,
  };
}

// ============================================================
// JBB Serializer
// ============================================================

/**
 * Escape string for S-expression output
 */
function escapeString(str: string): string {
  return str.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

/**
 * Convert BeadPattern to JBB format string
 */
export function beadPatternToJBB(pattern: BeadPattern): string {
  const lines: string[] = [];

  lines.push('(jbb');
  lines.push('    (version 1)');
  lines.push(`    (author "${escapeString(pattern.author || '')}")`);
  lines.push('    (organization "")');
  lines.push(`    (notes "${escapeString(pattern.notes || '')}")`);

  // Colors
  lines.push('    (colors');
  for (const color of pattern.colors) {
    lines.push(`        (rgb ${color.r} ${color.g} ${color.b})`);
  }
  lines.push('    )');

  // View settings (default values)
  lines.push('    (view');
  lines.push('        (draft-visible true)');
  lines.push('        (corrected-visible true)');
  lines.push('        (simulation-visible true)');
  lines.push('        (report-visible true)');
  lines.push('        (selected-tool "pencil")');
  lines.push('        (selected-color 1)');
  lines.push('        (zoom 2)');
  lines.push('        (scroll 0)');
  lines.push('        (shift 0)');
  lines.push('        (draw-colors true)');
  lines.push('        (draw-symbols false)');
  lines.push(
    '        (symbols "·abcdefghijklmnopqrstuvwxyz+-/\\\\*"))'
  );

  // Model (pattern data)
  lines.push('    (model');

  // Convert field to rows (reversed order, 0-based to 1-based)
  for (let y = pattern.height - 1; y >= 0; y--) {
    const rowValues: number[] = [];
    for (let x = 0; x < pattern.width; x++) {
      // Convert 0-based to 1-based index
      const colorIndex = pattern.field[y * pattern.width + x];
      rowValues.push(colorIndex + 1);
    }
    lines.push(`        (row ${rowValues.join(' ')})`);
  }

  lines.push('    ))');

  return lines.join('\n');
}

// ============================================================
// High-level API
// ============================================================

/**
 * Load .jbb file content and convert to BeadPattern
 */
export function loadJBB(content: string, filename?: string): BeadPattern {
  const jbb = parseJBB(content);
  const name = filename?.replace(/\.jbb$/i, '') || undefined;
  return jbbToBeadPattern(jbb, name);
}

/**
 * Save BeadPattern to .jbb format string
 */
export function saveJBB(pattern: BeadPattern): string {
  return beadPatternToJBB(pattern);
}

/**
 * Download pattern as .jbb file
 */
export function downloadJBB(pattern: BeadPattern, filename?: string): void {
  const content = saveJBB(pattern);
  const blob = new Blob([content], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = filename || `${pattern.name || 'pattern'}.jbb`;
  a.click();

  URL.revokeObjectURL(url);
}

// ============================================================
// Ball Pattern JBB Support
// ============================================================

/**
 * Detect if JBB data represents a ball/sphere pattern
 * Ball patterns typically have aspect ratio close to 2:1 (width:height)
 * and dimensions matching known ball size configs
 */
export function isJBBBallPattern(jbb: JBBData): boolean {
  const height = jbb.model.length;
  const width = height > 0 ? jbb.model[0].length : 0;

  // Check if dimensions match known ball configs
  for (const config of BALL_SIZE_CONFIGS) {
    if (width === config.circumference && Math.abs(height - config.wedgeHeight * 2) <= 2) {
      return true;
    }
  }

  // Heuristic: ball patterns have width/height ratio around 1.7-2.2
  // and width is typically > 60 beads
  const ratio = width / height;
  return width >= 60 && ratio >= 1.5 && ratio <= 2.5;
}

/**
 * Find the best matching ball config for given dimensions
 */
function findBallConfigForDimensions(width: number, height: number): { diameter: number; circumference: number; wedgeBase: number; wedgeHeight: number } {
  // First, try exact match
  for (const config of BALL_SIZE_CONFIGS) {
    if (width === config.circumference) {
      return config;
    }
  }

  // Find closest match by circumference
  let bestConfig = BALL_SIZE_CONFIGS[0];
  let minDiff = Math.abs(width - bestConfig.circumference);

  for (const config of BALL_SIZE_CONFIGS) {
    const diff = Math.abs(width - config.circumference);
    if (diff < minDiff) {
      minDiff = diff;
      bestConfig = config;
    }
  }

  // If dimensions don't match any config, create custom config
  if (minDiff > 10) {
    return {
      diameter: Math.round(width / 18), // Approximate diameter from circumference
      circumference: width,
      wedgeBase: Math.round(width / 6),
      wedgeHeight: Math.round(height / 2),
    };
  }

  return bestConfig;
}

/**
 * Convert JBBData to BallPattern
 * Ball patterns use full rectangular grid from JBB
 */
export function jbbToBallPattern(jbb: JBBData, name?: string): BallPattern {
  const height = jbb.model.length;
  const width = height > 0 ? jbb.model[0].length : 0;

  // Find matching ball config
  const config = findBallConfigForDimensions(width, height);

  // Create field from model data
  // JBB rows are stored top-to-bottom, we store bottom-to-top
  const field = new Uint8Array(width * height);

  for (let y = 0; y < height; y++) {
    const row = jbb.model[height - 1 - y]; // Reverse row order
    for (let x = 0; x < width; x++) {
      // JBB index directly maps to colors array index
      field[y * width + x] = row[x] || 0;
    }
  }

  // Use JBB colors or default colors
  const colors: BeadColor[] =
    jbb.colors.length > 0 ? jbb.colors : [...DEFAULT_COLORS];

  return {
    id: generateId(),
    name: name || jbb.author || 'Imported Ball Pattern',
    author: jbb.author || undefined,
    notes: jbb.notes || undefined,
    type: 'ball',
    diameter: config.diameter,
    circumference: config.circumference,
    wedgeBase: config.wedgeBase,
    wedgeHeight: Math.round(height / 2),
    width,
    height,
    field,
    colors,
    createdAt: new Date(),
    updatedAt: new Date(),
    isPublic: false,
  };
}

/**
 * Load .jbb file content and convert to BallPattern
 */
export function loadJBBBall(content: string, filename?: string): BallPattern {
  const jbb = parseJBB(content);
  const name = filename?.replace(/\.jbb$/i, '') || undefined;
  return jbbToBallPattern(jbb, name);
}

/**
 * Convert BallPattern to JBB format string
 */
export function ballPatternToJBB(pattern: BallPattern): string {
  const lines: string[] = [];

  lines.push('(jbb');
  lines.push('    (version 1)');
  lines.push(`    (author "${escapeString(pattern.author || '')}")`);
  lines.push('    (organization "")');
  lines.push(`    (notes "${escapeString(pattern.notes || '')}")`);

  // Colors
  lines.push('    (colors');
  for (const color of pattern.colors) {
    lines.push(`        (rgb ${color.r} ${color.g} ${color.b})`);
  }
  lines.push('    )');

  // View settings (default values)
  lines.push('    (view');
  lines.push('        (draft-visible true)');
  lines.push('        (corrected-visible true)');
  lines.push('        (simulation-visible true)');
  lines.push('        (report-visible true)');
  lines.push('        (selected-tool "pencil")');
  lines.push('        (selected-color 1)');
  lines.push('        (zoom 2)');
  lines.push('        (scroll 0)');
  lines.push('        (shift 0)');
  lines.push('        (draw-colors true)');
  lines.push('        (draw-symbols false)');
  lines.push(
    '        (symbols "·abcdefghijklmnopqrstuvwxyz+-/\\\\*"))'
  );

  // Model (pattern data)
  lines.push('    (model');

  // Convert field to rows (reversed order, 0-based to 1-based)
  for (let y = pattern.height - 1; y >= 0; y--) {
    const rowValues: number[] = [];
    for (let x = 0; x < pattern.width; x++) {
      // Convert 0-based to 1-based index
      const colorIndex = pattern.field[y * pattern.width + x];
      rowValues.push(colorIndex + 1);
    }
    lines.push(`        (row ${rowValues.join(' ')})`);
  }

  lines.push('    ))');

  return lines.join('\n');
}

/**
 * Save BallPattern to .jbb format string
 */
export function saveJBBBall(pattern: BallPattern): string {
  return ballPatternToJBB(pattern);
}

/**
 * Download ball pattern as .jbb file
 */
export function downloadJBBBall(pattern: BallPattern, filename?: string): void {
  const content = saveJBBBall(pattern);
  const blob = new Blob([content], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = filename || `${pattern.name || 'ball_pattern'}.jbb`;
  a.click();

  URL.revokeObjectURL(url);
}
