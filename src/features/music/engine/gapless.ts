import { getStreamUrl } from '../api';
import type { EngineContext } from './types';

export async function preBufferNext(
  ctx: EngineContext,
  nextIdx: number,
): Promise<void> {
  const nextTrack = ctx.state.queue[nextIdx];
  if (!nextTrack) return;
  try {
    const url = await getStreamUrl(nextTrack.id);
    const audio = new Audio();
    if (ctx.audioContext) audio.crossOrigin = 'anonymous';
    audio.preload = 'auto';
    audio.src = url;
    audio.volume = ctx.state.volume;
    ctx.setNextAudio(audio);
  } catch {
    ctx.setNextAudio(null);
  }
}

export function invalidatePreBuffer(ctx: EngineContext): void {
  if (ctx.nextAudio && !ctx.crossfadeActive) {
    ctx.nextAudio.pause();
    ctx.nextAudio.src = '';
    ctx.setNextAudio(null);
  }
}
