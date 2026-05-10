import { getStreamUrl } from '../api';
import { connectAudioToDestination, connectEqualizer } from './equalizer';
import type { EngineContext } from './types';

export function abortCrossfade(ctx: EngineContext): void {
  ctx.crossfadeAborted = true;
  ctx.crossfadeActive = false;
  if (ctx.nextAudio) {
    ctx.nextAudio.pause();
    ctx.nextAudio.src = '';
    ctx.setNextAudio(null);
  }
}

export async function startCrossfade(
  ctx: EngineContext,
  nextIdx: number,
  onComplete: () => void,
  onFallback: () => void,
): Promise<void> {
  const nextTrack = ctx.state.queue[nextIdx];
  if (!nextTrack) return;

  ctx.crossfadeActive = true;
  ctx.crossfadeAborted = false;
  const myPlayId = ctx.playId;

  const isAborted = () => ctx.crossfadeAborted || ctx.playId !== myPlayId;

  try {
    const url = await getStreamUrl(nextTrack.id);
    if (isAborted()) return;

    const audio = new Audio();
    if (ctx.audioContext) audio.crossOrigin = 'anonymous';
    audio.src = url;
    audio.volume = 0;
    ctx.setNextAudio(audio);

    connectAudioToDestination(ctx, audio);

    await audio.play();
    if (isAborted()) {
      audio.pause();
      audio.src = '';
      ctx.setNextAudio(null);
      return;
    }

    const duration = ctx.state.crossfadeDuration * 1000;
    const steps = 30;
    const stepTime = duration / steps;

    for (let i = 0; i <= steps; i++) {
      if (isAborted()) {
        if (ctx.nextAudio) {
          ctx.nextAudio.pause();
          ctx.nextAudio.src = '';
          ctx.setNextAudio(null);
        }
        return;
      }
      // Pause crossfade progression while playback is paused
      while (!ctx.state.isPlaying && !ctx.crossfadeAborted) {
        await new Promise((r) => setTimeout(r, 100));
      }
      if (isAborted()) {
        if (ctx.nextAudio) {
          ctx.nextAudio.pause();
          ctx.nextAudio.src = '';
          ctx.setNextAudio(null);
        }
        return;
      }
      const ratio = i / steps;
      ctx.audio.volume = (1 - ratio) * ctx.state.volume;
      if (ctx.nextAudio) ctx.nextAudio.volume = ratio * ctx.state.volume;
      await new Promise((r) => setTimeout(r, stepTime));
    }

    if (isAborted()) {
      if (ctx.nextAudio) {
        ctx.nextAudio.pause();
        ctx.nextAudio.src = '';
        ctx.setNextAudio(null);
      }
      return;
    }

    // Swap: disconnect old source, promote nextAudio
    const oldSource = ctx.sourceNodes.get(ctx.audio);
    if (oldSource) {
      try {
        oldSource.disconnect();
      } catch {
        /* already disconnected */
      }
    }
    ctx.audio.pause();
    ctx.audio.src = '';
    ctx.setAudio(ctx.nextAudio!);
    ctx.setNextAudio(null);
    connectEqualizer(ctx);
    ctx.crossfadeActive = false;
    ctx.update({
      currentTrack: nextTrack,
      queueIndex: nextIdx,
      duration: ctx.audio.duration || 0,
      progress: 0,
    });
    onComplete();
  } catch {
    if (ctx.nextAudio) {
      ctx.nextAudio.pause();
      ctx.nextAudio.src = '';
      ctx.setNextAudio(null);
    }
    ctx.crossfadeActive = false;
    if (ctx.audio.ended) onFallback();
  }
}
