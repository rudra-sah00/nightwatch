/**
 * Subtitle settings types, constants, and utilities
 */

import {
  getCachedLocalStorage,
  setCachedLocalStorage,
} from '@/lib/storage-cache';

export interface SubtitleSettings {
  fontSize: string;
  fontFamily: string;
  backgroundColor: string;
  textColor: string;
  textShadow: string;
  opacity: number;
}

export const SUBTITLE_FONT_SIZES = [
  { label: 'Small', value: '1rem' },
  { label: 'Medium', value: '1.25rem' },
  { label: 'Large', value: '1.5rem' },
  { label: 'Extra Large', value: '2rem' },
] as const;

export const SUBTITLE_FONTS = [
  // Modern Web Fonts (Google Fonts - Popular 2026)
  { label: 'Roboto', value: "'Roboto', sans-serif" },
  { label: 'Open Sans', value: "'Open Sans', sans-serif" },
  { label: 'Montserrat', value: "'Montserrat', sans-serif" },
  { label: 'Poppins', value: "'Poppins', sans-serif" },
  { label: 'Inter', value: "'Inter', sans-serif" },
  { label: 'Lato', value: "'Lato', sans-serif" },
  { label: 'Nunito', value: "'Nunito', sans-serif" },
  { label: 'Raleway', value: "'Raleway', sans-serif" },
  { label: 'Oswald', value: "'Oswald', sans-serif" },
  { label: 'Merriweather', value: "'Merriweather', serif" },
  { label: 'Playfair Display', value: "'Playfair Display', serif" },
  { label: 'Fira Sans', value: "'Fira Sans', sans-serif" },
  { label: 'Source Sans Pro', value: "'Source Sans Pro', sans-serif" },
  { label: 'Bebas Neue', value: "'Bebas Neue', sans-serif" },
  // Fallback to system fonts
  { label: 'System Default', value: 'system-ui, -apple-system, sans-serif' },
] as const;

export const BACKGROUND_COLORS = [
  { label: 'Black', value: 'rgba(0, 0, 0, 0.75)' },
  { label: 'Dark Gray', value: 'rgba(40, 40, 40, 0.85)' },
  { label: 'Transparent', value: 'transparent' },
  { label: 'Semi-Transparent', value: 'rgba(0, 0, 0, 0.5)' },
] as const;

export const TEXT_COLORS = [
  { label: 'White', value: 'white' },
  { label: 'Yellow', value: '#ffff00' },
  { label: 'Cyan', value: '#00ffff' },
  { label: 'Light Green', value: '#90ee90' },
] as const;

export const TEXT_SHADOWS = [
  { label: 'None', value: 'none' },
  { label: 'Drop Shadow', value: '2px 2px 4px rgba(0, 0, 0, 0.8)' },
  {
    label: 'Outline',
    value: '1px 1px 0 #000, -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000',
  },
  {
    label: 'Glow',
    value: '0 0 8px rgba(0, 0, 0, 0.9), 0 0 16px rgba(0, 0, 0, 0.6)',
  },
] as const;

const STORAGE_KEY = 'watch-subtitle-settings';
const STORAGE_VERSION = 'v1';

export const defaultSubtitleSettings: SubtitleSettings = {
  fontSize: '1.25rem',
  fontFamily: "'Roboto', sans-serif", // Default to popular web font
  backgroundColor: 'rgba(0, 0, 0, 0.75)',
  textColor: 'white',
  textShadow: 'none',
  opacity: 1,
};

/**
 * Load subtitle settings from localStorage
 */
export function loadSubtitleSettings(): SubtitleSettings {
  if (typeof window === 'undefined') return defaultSubtitleSettings;

  try {
    const saved = getCachedLocalStorage(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      // Invalidate if version mismatch or missing version
      if (parsed._v !== STORAGE_VERSION) {
        return defaultSubtitleSettings;
      }
      return { ...defaultSubtitleSettings, ...parsed };
    }
  } catch (_e) {
    // Ignore load error
  }
  return defaultSubtitleSettings;
}

/**
 * Save subtitle settings to localStorage
 */
export function saveSubtitleSettings(settings: SubtitleSettings): void {
  if (typeof window === 'undefined') return;

  try {
    const dataToSave = { ...settings, _v: STORAGE_VERSION };
    setCachedLocalStorage(STORAGE_KEY, JSON.stringify(dataToSave));
  } catch (_e) {
    // Ignore save error
  }
}

import { loadSubtitleFonts } from './load-subtitle-fonts';

/**
 * Apply subtitle settings to CSS custom properties
 */
export function applySubtitleSettings(settings: SubtitleSettings): void {
  if (typeof document === 'undefined') return;

  // Lazy-load Google Fonts when subtitle settings are applied
  loadSubtitleFonts();

  const root = document.documentElement;
  root.style.setProperty('--subtitle-font-size', settings.fontSize);
  root.style.setProperty('--subtitle-font-family', settings.fontFamily);
  root.style.setProperty('--subtitle-bg-color', settings.backgroundColor);
  root.style.setProperty('--subtitle-text-color', settings.textColor);
  root.style.setProperty('--subtitle-text-shadow', settings.textShadow);
  root.style.setProperty('--subtitle-opacity', String(settings.opacity));
}
