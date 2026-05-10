import { apiFetch } from '@/lib/fetch';
import type { MusicTrack } from '../api';
import { addToUserQueue } from '../api';
import type { EngineContext } from './types';

export function getNextIndex(ctx: EngineContext): number | null {
  const { queue, queueIndex, repeat, shuffle } = ctx.state;
  if (queue.length === 0) return null;
  if (shuffle && ctx.shuffledOrder.length > 0) {
    const pos = ctx.shuffledOrder.indexOf(queueIndex);
    const next = pos + 1;
    if (next >= ctx.shuffledOrder.length) {
      return repeat === 'all' ? ctx.shuffledOrder[0] : null;
    }
    return ctx.shuffledOrder[next];
  }
  const next = queueIndex + 1;
  if (next >= queue.length) {
    return repeat === 'all' ? 0 : null;
  }
  return next;
}

export function getPrevIndex(ctx: EngineContext): number | null {
  const { queue, queueIndex, shuffle } = ctx.state;
  if (queue.length === 0) return null;
  if (shuffle && ctx.shuffledOrder.length > 0) {
    const currentPos = ctx.shuffledOrder.indexOf(queueIndex);
    if (currentPos <= 0) return null;
    return ctx.shuffledOrder[currentPos - 1];
  }
  if (queueIndex <= 0) return null;
  return queueIndex - 1;
}

export function generateShuffleOrder(
  length: number,
  currentIndex: number,
): number[] {
  const indices = Array.from({ length }, (_, i) => i).filter(
    (i) => i !== currentIndex,
  );
  for (let i = indices.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }
  return [currentIndex, ...indices];
}

export function addToQueue(ctx: EngineContext, track: MusicTrack): void {
  const queue = [...ctx.state.queue, track];
  ctx.update({ queue });
  if (ctx.state.shuffle && ctx.shuffledOrder.length > 0) {
    const currentPos = ctx.shuffledOrder.indexOf(ctx.state.queueIndex);
    const remaining = Math.max(0, ctx.shuffledOrder.length - currentPos - 1);
    const insertAt = currentPos + 1 + Math.floor(Math.random() * remaining);
    ctx.shuffledOrder.splice(
      Math.min(Math.max(0, insertAt), ctx.shuffledOrder.length),
      0,
      queue.length - 1,
    );
  }
  addToUserQueue(track).catch(() => {});
}

export function playNextInQueue(ctx: EngineContext, track: MusicTrack): void {
  const { queue, queueIndex } = ctx.state;
  const newQueue = [...queue];
  const insertIdx = queueIndex + 1;
  newQueue.splice(insertIdx, 0, track);
  ctx.update({ queue: newQueue });
  if (ctx.state.shuffle && ctx.shuffledOrder.length > 0) {
    ctx.shuffledOrder = ctx.shuffledOrder.map((i) =>
      i >= insertIdx ? i + 1 : i,
    );
    const currentPos = ctx.shuffledOrder.indexOf(queueIndex);
    ctx.shuffledOrder.splice(currentPos + 1, 0, insertIdx);
  }
  addToUserQueue(track).catch(() => {});
}

export function removeFromQueue(ctx: EngineContext, index: number): void {
  const { queue, queueIndex } = ctx.state;
  if (index < 0 || index >= queue.length || index === queueIndex) return;

  // Abort crossfade if removing its target
  if (ctx.crossfadeActive && ctx.nextAudio) {
    const nextIdx = getNextIndex(ctx);
    if (nextIdx === index) {
      ctx.crossfadeAborted = true;
      ctx.crossfadeActive = false;
      ctx.nextAudio.pause();
      ctx.nextAudio.src = '';
      ctx.setNextAudio(null);
    }
  }

  const newQueue = queue.filter((_, i) => i !== index);
  const newIndex = index < queueIndex ? queueIndex - 1 : queueIndex;
  ctx.update({ queue: newQueue, queueIndex: newIndex });

  if (ctx.state.shuffle && ctx.shuffledOrder.length > 0) {
    ctx.shuffledOrder = ctx.shuffledOrder
      .filter((i) => i !== index)
      .map((i) => (i > index ? i - 1 : i));
  }

  // Invalidate gapless pre-buffer
  if (ctx.nextAudio && !ctx.crossfadeActive) {
    ctx.nextAudio.pause();
    ctx.nextAudio.src = '';
    ctx.setNextAudio(null);
  }

  persistQueue(newQueue);
}

export async function loadQueue(ctx: EngineContext): Promise<void> {
  try {
    const { getUserQueue } = await import('../api');
    const tracks = await getUserQueue();
    if (tracks.length > 0) ctx.update({ queue: tracks });
  } catch {
    /* offline */
  }
}

function persistQueue(queue: MusicTrack[]): void {
  apiFetch('/api/music/queue', {
    method: 'PUT',
    body: JSON.stringify(queue),
  }).catch(() => {});
}
