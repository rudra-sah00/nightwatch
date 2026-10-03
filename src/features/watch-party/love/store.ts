import { create } from 'zustand';

/**
 * TEMPORARY — state for the `/my-girl` surprise.
 *
 * A store rather than component state because three places need it: the chat
 * hook that catches the command, the overlay that plays the film and shows the
 * question, and the 3D theatre screen that borrows the film's <video> as its
 * texture. They sit in unrelated parts of the tree.
 */

/** Exact chat text that triggers the surprise. Case-insensitive, trimmed. */
export const LOVE_COMMAND = '/my-girl';
export const LOVE_VIDEO_URL = '/theatre-love/for-her.mp4';

export type LovePhase = 'idle' | 'playing' | 'question' | 'answered';
export type LoveAnswer = 'yes' | 'also-yes';

interface LoveState {
  phase: LovePhase;
  /** Who typed the command. They see "waiting for her answer" instead of buttons. */
  initiatorId: string | null;
  answer: { userName: string; answer: LoveAnswer } | null;
  /** The film's <video>, published so the 3D screen can texture from it. */
  videoEl: HTMLVideoElement | null;
  start: (initiatorId: string) => void;
  toQuestion: () => void;
  setAnswer: (userName: string, answer: LoveAnswer) => void;
  reset: () => void;
  setVideoEl: (el: HTMLVideoElement | null) => void;
}

export const useLoveSurprise = create<LoveState>((set) => ({
  phase: 'idle',
  initiatorId: null,
  answer: null,
  videoEl: null,
  start: (initiatorId) => set({ phase: 'playing', initiatorId, answer: null }),
  toQuestion: () =>
    set((s) => (s.phase === 'playing' ? { phase: 'question' } : s)),
  setAnswer: (userName, answer) =>
    set({ phase: 'answered', answer: { userName, answer } }),
  reset: () => set({ phase: 'idle', initiatorId: null, answer: null }),
  setVideoEl: (videoEl) => set({ videoEl }),
}));

export function isLoveCommand(text: string): boolean {
  return text.trim().toLowerCase() === LOVE_COMMAND;
}
