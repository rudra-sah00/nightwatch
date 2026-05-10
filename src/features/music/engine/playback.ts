import type { MusicTrack } from '../api';
import { getSongRecommendations, getStreamUrl } from '../api';
import type { EngineContext } from './types';

export async function fadeOut(
  ctx: EngineContext,
  duration = 500,
): Promise<void> {
  if (!ctx.audio.src || ctx.audio.paused) return;
  const steps = 20;
  const stepTime = duration / steps;
  for (let i = steps; i >= 0; i--) {
    ctx.audio.volume = (i / steps) * ctx.state.volume;
    await new Promise((r) => setTimeout(r, stepTime));
  }
  ctx.audio.pause();
  ctx.audio.volume = ctx.state.volume;
}

export async function playTrack(
  ctx: EngineContext,
  track: MusicTrack,
  startAt?: number,
): Promise<void> {
  const myPlayId = ctx.playId;

  ctx.update({
    currentTrack: track,
    isPlaying: false,
    progress: 0,
    duration: 0,
  });

  try {
    await fadeOut(ctx, 300);
    if (ctx.playId !== myPlayId) return;

    const url = await getStreamUrl(track.id);
    if (ctx.playId !== myPlayId) return;

    if (ctx.audioContext?.state === 'suspended') ctx.audioContext.resume();

    ctx.audio.src = url;
    ctx.audio.volume = 0;
    await ctx.audio.play();
    if (ctx.playId !== myPlayId) return;

    ctx.update({ isPlaying: true });

    // Seek + notify transfer listener
    if (startAt && startAt > 0) {
      const doSeek = () => {
        if (ctx.audio.duration > 0) {
          ctx.audio.currentTime = (startAt / 100) * ctx.audio.duration;
          ctx.update({ progress: startAt });
        }
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('music:transfer-playing'));
        }
      };
      if (ctx.audio.duration > 0) doSeek();
      else ctx.audio.addEventListener('loadedmetadata', doSeek, { once: true });
    } else if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('music:transfer-playing'));
    }

    // Fade in
    const steps = 20;
    for (let i = 1; i <= steps; i++) {
      if (ctx.playId !== myPlayId) return;
      ctx.audio.volume = (i / steps) * ctx.state.volume;
      await new Promise((r) => setTimeout(r, 15));
    }
  } catch {
    if (ctx.playId !== myPlayId) return;
    // Retry once
    try {
      await new Promise((r) => setTimeout(r, 1000));
      if (ctx.playId !== myPlayId) return;
      const url = await getStreamUrl(track.id);
      if (ctx.playId !== myPlayId) return;
      ctx.audio.src = url;
      ctx.audio.volume = ctx.state.volume;
      await ctx.audio.play();
      if (ctx.playId !== myPlayId) return;
      ctx.update({ isPlaying: true });
    } catch {
      if (ctx.playId === myPlayId) ctx.update({ isPlaying: false });
    }
  }
}

export async function autoContinue(
  ctx: EngineContext,
  onStop: () => void,
  onPlay: (track: MusicTrack) => Promise<void>,
): Promise<void> {
  const track = ctx.state.currentTrack;
  if (!track) {
    onStop();
    return;
  }
  try {
    const recs = await getSongRecommendations(track.id);
    if (recs.length > 0) {
      ctx.update({ queue: recs, queueIndex: 0 });
      await onPlay(recs[0]);
      return;
    }
  } catch {
    /* fall through */
  }
  onStop();
}
