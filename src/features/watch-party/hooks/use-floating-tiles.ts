import { useCallback, useRef, useState } from 'react';

/** localStorage key for persisted tile layouts. */
const STORAGE_KEY = 'wp-floating-tiles';
/** Minimum tile width in pixels. */
const MIN_W = 120;
/** Minimum tile height in pixels. */
const MIN_H = 90;
/** Default tile width in pixels for newly spawned tiles. */
const DEFAULT_W = 180;
/** Default tile height in pixels for newly spawned tiles. */
const DEFAULT_H = 135;

/**
 * Describes the position, size, and stacking order of a single floating tile.
 *
 * Positions are stored as percentages of the parent container so that tiles
 * scale correctly when the window is resized.
 */
export interface TileLayout {
  /** Horizontal offset as a percentage of container width (0–100). */
  x: number;
  /** Vertical offset as a percentage of container height (0–100). */
  y: number;
  /** Tile width in pixels. */
  width: number;
  /** Tile height in pixels. */
  height: number;
  /** CSS `z-index` — higher values render on top. */
  zIndex: number;
}

/**
 * Reads persisted tile layouts from localStorage.
 *
 * @returns A record mapping participant IDs to their saved {@link TileLayout}.
 */
function loadLayouts(): Record<string, TileLayout> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

/**
 * Persists tile layouts to localStorage.
 *
 * @param layouts - The full layout map to save.
 */
function saveLayouts(layouts: Record<string, TileLayout>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(layouts));
  } catch {
    /* quota exceeded */
  }
}

/**
 * Manages floating video tile positions, sizes, z-order, and localStorage
 * persistence for the watch party floating participant overlay.
 *
 * Tiles that have never been positioned receive a default cascading layout
 * so they don't stack on top of each other.
 *
 * @returns Helpers to read, update, and re-order tile layouts, plus size constraints.
 */
export function useFloatingTiles() {
  const [layouts, setLayouts] =
    useState<Record<string, TileLayout>>(loadLayouts);
  const topZRef = useRef(
    Math.max(1, ...Object.values(loadLayouts()).map((l) => l.zIndex)),
  );

  const getLayout = useCallback(
    (id: string, index: number): TileLayout =>
      layouts[id] ?? {
        x: 1 + (index % 4) * 15,
        y: 1 + Math.floor(index / 4) * 20,
        width: DEFAULT_W,
        height: DEFAULT_H,
        zIndex: index + 1,
      },
    [layouts],
  );

  const updateLayout = useCallback((id: string, patch: Partial<TileLayout>) => {
    setLayouts((prev) => {
      const current = prev[id] ?? {
        x: 1,
        y: 1,
        width: DEFAULT_W,
        height: DEFAULT_H,
        zIndex: 1,
      };
      const next = { ...prev, [id]: { ...current, ...patch } };
      saveLayouts(next);
      return next;
    });
  }, []);

  const bringToFront = useCallback(
    (id: string) => {
      topZRef.current += 1;
      updateLayout(id, { zIndex: topZRef.current });
    },
    [updateLayout],
  );

  return { getLayout, updateLayout, bringToFront, MIN_W, MIN_H };
}
