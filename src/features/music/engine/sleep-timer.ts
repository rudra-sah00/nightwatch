import type { EngineContext } from './types';

export function setSleepTimer(
  ctx: EngineContext,
  minutes: number,
  onFire: () => void,
): void {
  clearSleepTimer(ctx);
  if (minutes <= 0) return;
  const end = Date.now() + minutes * 60 * 1000;
  ctx.update({ sleepTimerEnd: end });
  ctx.sleepTimerHandle = setTimeout(
    () => {
      onFire();
      ctx.update({ sleepTimerEnd: null });
    },
    minutes * 60 * 1000,
  );
}

export function clearSleepTimer(ctx: EngineContext): void {
  if (ctx.sleepTimerHandle) {
    clearTimeout(ctx.sleepTimerHandle);
    ctx.sleepTimerHandle = null;
  }
  ctx.update({ sleepTimerEnd: null });
}

/** Fallback check for frozen tabs — call from progress timer. */
export function checkSleepTimerExpired(ctx: EngineContext): boolean {
  return !!(ctx.state.sleepTimerEnd && Date.now() >= ctx.state.sleepTimerEnd);
}
