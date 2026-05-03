/**
 * Call media helpers — ringtone preload/playback, media ducking, duration timer.
 */
import type { MutableRefObject } from 'react';
import { desktopBridge } from '@/lib/electron-bridge';
import { duckMediaElements } from './call.utils';

// ── Ringtone ────────────────────────────────────────────────────────

export interface RingtoneRefs {
  incoming: HTMLAudioElement;
  outgoing: HTMLAudioElement;
}

/** Preload both ringtone audio elements. */
export function preloadRingtones(): RingtoneRefs {
  const incoming = new Audio('/incoming-call.mp3');
  incoming.loop = true;
  incoming.volume = 0.5;
  incoming.preload = 'auto';
  incoming.load();

  const outgoing = new Audio('/outgoing-call.mp3');
  outgoing.loop = true;
  outgoing.volume = 0.4;
  outgoing.preload = 'auto';
  outgoing.load();

  return { incoming, outgoing };
}

/** Start the appropriate ringtone for the given call state. Returns a stop fn. */
export function playRingtone(
  refs: RingtoneRefs,
  state: 'incoming' | 'outgoing',
): () => void {
  const audio = state === 'incoming' ? refs.incoming : refs.outgoing;
  audio.currentTime = 0;
  audio.play().catch(() => {});
  return () => {
    audio.pause();
    audio.currentTime = 0;
  };
}

/** Release ringtone resources. */
export function destroyRingtones(refs: RingtoneRefs) {
  refs.incoming.pause();
  refs.outgoing.pause();
}

// ── Media ducking ───────────────────────────────────────────────────

/**
 * Duck all media elements and notify the desktop bridge.
 * Returns a restore function.
 */
export function startMediaDucking(): () => void {
  const restore = duckMediaElements(0.2);
  window.dispatchEvent(new CustomEvent('dm-call:start'));
  desktopBridge.setCallActive(true);
  return () => {
    restore();
    window.dispatchEvent(new CustomEvent('dm-call:end'));
    desktopBridge.setCallActive(false);
  };
}

// ── Duration timer ──────────────────────────────────────────────────

/**
 * Start a 1-second interval that increments the call duration.
 * Returns a cleanup function.
 */
export function startDurationTimer(
  setter: React.Dispatch<React.SetStateAction<number>>,
  intervalRef: MutableRefObject<NodeJS.Timeout | null>,
): () => void {
  setter(0);
  intervalRef.current = setInterval(() => setter((d) => d + 1), 1000);
  return () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setter(0);
  };
}
