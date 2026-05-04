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
  const saved: { el: HTMLMediaElement; vol: number; wasPlaying: boolean }[] =
    [];
  for (const el of document.querySelectorAll<HTMLMediaElement>(
    'video, audio',
  )) {
    const wasPlaying = !el.paused;
    saved.push({ el, vol: el.volume, wasPlaying });
    // Pause video elements entirely to prevent PiP from activating
    if (el instanceof HTMLVideoElement && wasPlaying) {
      el.pause();
    } else {
      el.volume = Math.max(0, el.volume * factor);
    }
  }
  return () => {
    for (const { el, vol, wasPlaying } of saved) {
      try {
        el.volume = vol;
        if (el instanceof HTMLVideoElement && wasPlaying) {
          el.play().catch(() => {});
        }
      } catch {
        // Element may have been removed
      }
    }
  };
}
