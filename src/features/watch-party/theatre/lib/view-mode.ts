'use client';

import { create } from 'zustand';

/**
 * Watch-party view modes, cycled with `V`.
 *
 * `2d`     — the normal player. Always the starting mode; a party is created and
 *            joined exactly as it is today, with no 3D cost at all.
 * `3d`     — full theatre: room, avatars, walk around, sit down.
 * `cinema` — 3D scene but locked to the screen, filling the frame. For people
 *            who want the room's atmosphere without looking away from the film.
 */
export type TheatreViewMode = '2d' | '3d' | 'cinema';

/** V cycles in this order, wrapping back to 2d. */
const CYCLE: readonly TheatreViewMode[] = ['2d', '3d', 'cinema'];

export type AssetPhase = 'idle' | 'downloading' | 'ready' | 'error';

interface TheatreViewState {
  /** Has the user opted in from watch-party settings? */
  enabled: boolean;
  /** Asset download progress, 0..1 */
  progress: number;
  phase: AssetPhase;
  mode: TheatreViewMode;

  enable: () => void;
  disable: () => void;
  setPhase: (phase: AssetPhase) => void;
  setProgress: (progress: number) => void;
  /** Advance the view cycle. No-op until assets are ready. */
  cycle: () => void;
  setMode: (mode: TheatreViewMode) => void;
}

export const useTheatreView = create<TheatreViewState>((set, get) => ({
  enabled: false,
  progress: 0,
  phase: 'idle',
  mode: '2d',

  enable: () => set({ enabled: true }),

  // Turning 3D off must also drop the view back to 2d, or the user is stranded
  // in a scene whose assets we are no longer maintaining.
  disable: () =>
    set({ enabled: false, mode: '2d', phase: 'idle', progress: 0 }),

  setPhase: (phase) => set({ phase }),
  setProgress: (progress) => set({ progress }),

  cycle: () => {
    const { phase, mode } = get();
    if (phase !== 'ready') return;
    const next = CYCLE[(CYCLE.indexOf(mode) + 1) % CYCLE.length];
    set({ mode: next });
  },

  setMode: (mode) => {
    if (mode !== '2d' && get().phase !== 'ready') return;
    set({ mode });
  },
}));

/** Human label for the toast / HUD. */
export function viewModeLabel(mode: TheatreViewMode): string {
  if (mode === '3d') return '3D theatre';
  if (mode === 'cinema') return 'Screen focus';
  return '2D player';
}
