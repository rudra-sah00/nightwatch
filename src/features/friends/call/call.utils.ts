/** Format seconds into m:ss display. */
export function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

/**
 * Duck all <video> and <audio> elements on the page during a call.
 * Returns a restore function that resets original volumes.
 */
export function duckMediaElements(factor: number): () => void {
  const saved: { el: HTMLMediaElement; vol: number }[] = [];
  for (const el of document.querySelectorAll<HTMLMediaElement>(
    'video, audio',
  )) {
    saved.push({ el, vol: el.volume });
    el.volume = Math.max(0, el.volume * factor);
  }
  return () => {
    for (const { el, vol } of saved) {
      try {
        el.volume = vol;
      } catch {
        // Element may have been removed
      }
    }
  };
}
