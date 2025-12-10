import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import type { BeadColor } from '@/types';

/**
 * Merge Tailwind classes with clsx
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Convert BeadColor to hex string
 */
export function colorToHex(color: BeadColor): string {
  return `#${color.r.toString(16).padStart(2, '0')}${color.g.toString(16).padStart(2, '0')}${color.b.toString(16).padStart(2, '0')}`;
}

/**
 * Convert BeadColor to CSS rgb/rgba string
 */
export function colorToRgba(color: BeadColor): string {
  if (color.a !== undefined && color.a < 255) {
    return `rgba(${color.r},${color.g},${color.b},${(color.a / 255).toFixed(2)})`;
  }
  return `rgb(${color.r},${color.g},${color.b})`;
}

/**
 * Parse hex string to BeadColor
 */
export function hexToColor(hex: string): BeadColor {
  const cleanHex = hex.replace('#', '');
  return {
    r: parseInt(cleanHex.slice(0, 2), 16),
    g: parseInt(cleanHex.slice(2, 4), 16),
    b: parseInt(cleanHex.slice(4, 6), 16),
  };
}

/**
 * Convert Uint8Array to base64
 */
export function uint8ArrayToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Convert base64 to Uint8Array
 */
export function base64ToUint8Array(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

/**
 * Clamp a number between min and max
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/**
 * Generate a unique ID
 */
export function generateId(): string {
  return crypto.randomUUID();
}
