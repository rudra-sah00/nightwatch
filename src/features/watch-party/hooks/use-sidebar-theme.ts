'use client';

import type React from 'react';
import { useState } from 'react';

export type SidebarTheme = 'default' | 'pink' | 'purple' | 'ocean' | 'custom';

const STORAGE_KEY = 'wp-sidebar-theme';
const STORAGE_COLOR_KEY = 'wp-sidebar-custom-color';
const DEFAULT_CUSTOM_COLOR = '#a78bfa';

// ---------------------------------------------------------------------------
// Custom theme: derive all --wp-* vars from a single hex accent colour
// ---------------------------------------------------------------------------
function hexToRgb(hex: string): [number, number, number] {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!m) return [167, 139, 250]; // purple fallback
  return [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)];
}

export function buildCustomVars(hex: string): React.CSSProperties {
  const [r, g, b] = hexToRgb(hex);
  const a = `${r}, ${g}, ${b}`;
  // dark bg derived from accent — divide to ~5 % brightness
  const br = Math.round(r / 10);
  const bg = Math.round(g / 12);
  const bb = Math.round(b / 9);
  return {
    '--wp-sidebar-bg': `rgba(${br}, ${bg}, ${bb}, 0.97)`,
    '--wp-sidebar-border': `rgba(${a}, 0.20)`,
    '--wp-tab-bg': `rgba(${br * 2}, ${bg * 2}, ${bb * 2}, 0.70)`,
    '--wp-tab-border': `rgba(${a}, 0.18)`,
    '--wp-tab-pill': `rgba(${a}, 0.18)`,
    '--wp-accent': `rgb(${a})`,
    '--wp-accent-soft': `rgba(${a}, 0.08)`,
    '--wp-accent-subtle': `rgba(${a}, 0.15)`,
    '--wp-accent-muted': `rgba(${a}, 0.26)`,
    '--wp-footer-bg': `rgba(${Math.round(br / 2)}, ${Math.round(bg / 2)}, ${Math.round(bb / 2)}, 0.95)`,
    '--wp-footer-border': `rgba(${a}, 0.12)`,
    '--wp-divider': `rgba(${a}, 0.12)`,
    '--wp-input-bg': `rgba(${a}, 0.07)`,
    '--wp-input-focus': `rgba(${a}, 0.18)`,
    '--wp-input-ring': `rgba(${a}, 0.40)`,
    '--wp-badge': `rgb(${a})`,
    '--wp-badge-ring': `rgba(${br}, ${bg}, ${bb}, 1)`,
    '--wp-btn-bg': `rgba(${a}, 0.08)`,
    '--wp-btn-hover': `rgba(${a}, 0.16)`,
    '--wp-btn-border': `rgba(${a}, 0.18)`,
    '--wp-btn-device-bg': `rgba(${br * 4}, ${bg * 4}, ${bb * 4}, 0.80)`,
    '--wp-btn-device-active': `rgba(${a}, 0.28)`,
    '--wp-send-btn': `rgba(${a}, 0.85)`,
    '--wp-send-btn-hover': `rgb(${a})`,
    '--wp-typing-avatar': `linear-gradient(135deg, rgb(${a}), rgba(${a}, 0.60))`,
  } as React.CSSProperties;
}

// ---------------------------------------------------------------------------

function readTheme(): SidebarTheme {
  if (typeof window === 'undefined') return 'default';
  const stored = localStorage.getItem(STORAGE_KEY) as SidebarTheme | null;
  return stored ?? 'default';
}

function readColor(): string {
  if (typeof window === 'undefined') return DEFAULT_CUSTOM_COLOR;
  return localStorage.getItem(STORAGE_COLOR_KEY) ?? DEFAULT_CUSTOM_COLOR;
}

function save(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* private-mode quota */
  }
}

/**
 * Persists the watch-party sidebar colour theme + optional custom accent to
 * localStorage. When `theme === 'custom'`, `customVars` contains inline CSS
 * custom properties derived from `customColor` — apply them as `style` on the
 * sidebar root element.
 */
export function useSidebarTheme() {
  const [theme, setThemeState] = useState<SidebarTheme>(readTheme);
  const [customColor, setCustomColorState] = useState<string>(readColor);

  function setTheme(next: SidebarTheme) {
    setThemeState(next);
    save(STORAGE_KEY, next);
  }

  function setCustomColor(hex: string) {
    setCustomColorState(hex);
    save(STORAGE_COLOR_KEY, hex);
  }

  const customVars: React.CSSProperties | undefined =
    theme === 'custom' ? buildCustomVars(customColor) : undefined;

  return { theme, setTheme, customColor, setCustomColor, customVars };
}
