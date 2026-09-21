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

/**
 * Which character body the user wants to appear as.
 *
 * This is a download decision as much as a cosmetic one. Each rigged character
 * is ~5-6 MB because it carries its own textures plus ten baked animation
 * clips, so fetching both would double the avatar cost for a choice the user
 * only ever makes once. The selected model is used for EVERY avatar in the
 * room, local and remote — peers are still told apart by the colour-coded name
 * tag above their head (see `identityColour`), which costs nothing to download.
 */
export type AvatarCharacter = 'man' | 'woman';

const CHARACTER_KEY = 'nightwatch.theatre.character';

function storedCharacter(): AvatarCharacter {
  // Guarded for SSR: this module is imported by client components that Next
  // still evaluates on the server during prerender.
  if (typeof window === 'undefined') return 'man';
  try {
    return window.localStorage.getItem(CHARACTER_KEY) === 'woman'
      ? 'woman'
      : 'man';
  } catch {
    // Private-mode Safari throws on localStorage access. A default is fine.
    return 'man';
  }
}

interface TheatreViewState {
  /** Has the user opted in from watch-party settings? */
  enabled: boolean;
  /** Asset download progress, 0..1 */
  progress: number;
  phase: AssetPhase;
  /** Bytes downloaded so far. Drives the MB readout on the download toast. */
  receivedBytes: number;
  /** Total bytes expected. 0 while unknown, or if no server advertises sizes. */
  totalBytes: number;
  /** Assets finished / assets in the batch, for "3 of 5". */
  filesDone: number;
  fileCount: number;
  /**
   * Which attempt an asset is on, 1 while all is well.
   *
   * Surfaced so a slow recovery looks like progress rather than a stall — a
   * retry can take several seconds of backoff during which no bytes move.
   */
  attempt: number;
  /** Short reason for a failed download, null when there is none. */
  error: string | null;
  /**
   * Whether to show the download progress card.
   *
   * False by default and only turned on by `showProgress()`, which the `V`
   * hotkey calls. The download is background work nobody asked to watch — a
   * notification pinned on screen for the whole transfer is noise. It appears
   * when you press `V` and find the room is not ready yet, which is the moment
   * you actually want to know how far along it is.
   */
  progressVisible: boolean;
  /** Bumped by `retry()`; the preloader watches it to start again. */
  retryNonce: number;
  mode: TheatreViewMode;
  /** Chosen character body. Decides which single avatar model is fetched. */
  character: AvatarCharacter;

  enable: () => void;
  disable: () => void;
  setPhase: (phase: AssetPhase) => void;
  setProgress: (progress: number) => void;
  /** One call for everything the download toast renders. */
  setDownload: (update: {
    progress: number;
    receivedBytes: number;
    totalBytes: number;
    filesDone: number;
    fileCount: number;
  }) => void;
  setAttempt: (attempt: number) => void;
  /** Reveal the progress card. Called when `V` is pressed before assets land. */
  showProgress: () => void;
  fail: (error: string) => void;
  /** Ask the preloader to try again, keeping assets already downloaded. */
  retry: () => void;
  /** Advance the view cycle. No-op until assets are ready. */
  cycle: () => void;
  setMode: (mode: TheatreViewMode) => void;
  setCharacter: (character: AvatarCharacter) => void;
}

/** Fields reset whenever a download starts or is abandoned. */
const DOWNLOAD_RESET = {
  progress: 0,
  receivedBytes: 0,
  totalBytes: 0,
  filesDone: 0,
  fileCount: 0,
  attempt: 1,
  error: null,
  progressVisible: false,
} as const;

export const useTheatreView = create<TheatreViewState>((set, get) => ({
  enabled: false,
  progress: 0,
  phase: 'idle',
  receivedBytes: 0,
  totalBytes: 0,
  filesDone: 0,
  fileCount: 0,
  attempt: 1,
  error: null,
  progressVisible: false,
  retryNonce: 0,
  mode: '2d',
  character: storedCharacter(),

  enable: () => set({ enabled: true }),

  // Turning 3D off must also drop the view back to 2d, or the user is stranded
  // in a scene whose assets we are no longer maintaining.
  disable: () =>
    set({ enabled: false, mode: '2d', phase: 'idle', ...DOWNLOAD_RESET }),

  setPhase: (phase) => set({ phase }),
  setProgress: (progress) => set({ progress }),

  setDownload: (update) => set(update),
  setAttempt: (attempt) => set({ attempt }),

  showProgress: () => set({ progressVisible: true }),

  fail: (error) => set({ phase: 'error', error }),

  /**
   * Retry without clearing progress.
   *
   * Assets already on the machine are kept by the preloader, so a retry after
   * four of five files succeeded resumes rather than re-downloading 30 MB.
   */
  retry: () =>
    set((s) => ({
      phase: 'downloading',
      error: null,
      attempt: 1,
      retryNonce: s.retryNonce + 1,
    })),

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

  /**
   * Switching body takes effect immediately and needs no re-download: every
   * character model is fetched up front precisely because peers may have picked
   * a different one. Only the broadcast changes, so other clients start drawing
   * you as the new body on your next pose message.
   */
  setCharacter: (character) => {
    if (get().character === character) return;
    try {
      window.localStorage.setItem(CHARACTER_KEY, character);
    } catch {
      // Not fatal — the choice just will not survive a reload.
    }
    set({ character });
  },
}));

/** Human label for the toast / HUD. */
export function viewModeLabel(mode: TheatreViewMode): string {
  if (mode === '3d') return '3D theatre';
  if (mode === 'cinema') return 'Screen focus';
  return '2D player';
}
