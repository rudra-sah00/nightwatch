/**
 * Avatar animation state machine.
 *
 * Clip NAMES are indirected through `AVATAR_CLIPS` on purpose. The avatar is
 * not chosen yet (Ready Player Me vs a Mixamo character vs a custom rig), and
 * every source names its clips differently. Point this map at whatever the
 * chosen .glb actually contains and nothing else has to change.
 *
 * Assumes a Mixamo-compatible skeleton so that clips from different files are
 * interchangeable without per-clip retargeting.
 */

/** Logical states, independent of clip naming. */
export type AvatarState =
  | 'idle'
  | 'walk'
  | 'run'
  | 'sitDown'
  | 'sitIdle'
  | 'standUp'
  | 'dance';

/** Logical state -> clip name inside the avatar glb. */
export const AVATAR_CLIPS: Record<Exclude<AvatarState, 'dance'>, string> = {
  idle: 'Idle',
  walk: 'Walk',
  run: 'Run',
  sitDown: 'SitDown',
  sitIdle: 'SitIdle',
  standUp: 'StandUp',
};

/**
 * Dance clips are registered separately because there will be many and they
 * should lazy-load. Use IN-PLACE variants only — travelling clips walk the
 * avatar out of its chair.
 */
export const DANCE_CLIPS: readonly string[] = [
  'Dance.Hiphop',
  'Dance.Shuffle',
  'Dance.Twist',
  'Dance.Robot',
];

/** Crossfade duration in seconds, per destination state. */
export const FADE_SECONDS: Record<AvatarState, number> = {
  idle: 0.25,
  walk: 0.18,
  run: 0.18,
  sitDown: 0.15,
  sitIdle: 0.2,
  standUp: 0.15,
  dance: 0.3,
};

/**
 * States that play once and hold their last frame, then hand over.
 * Everything else loops.
 */
export const ONE_SHOT: Partial<Record<AvatarState, AvatarState>> = {
  sitDown: 'sitIdle',
  standUp: 'idle',
};

export function isOneShot(state: AvatarState): boolean {
  return state in ONE_SHOT;
}

/** Which state a one-shot advances to when it finishes. */
export function nextAfter(state: AvatarState): AvatarState | null {
  return ONE_SHOT[state] ?? null;
}

/** Legal transitions. Guards against e.g. walking straight out of a sit. */
const ALLOWED: Record<AvatarState, readonly AvatarState[]> = {
  idle: ['walk', 'run', 'sitDown', 'dance'],
  walk: ['idle', 'run', 'sitDown'],
  run: ['idle', 'walk'],
  sitDown: ['sitIdle'],
  sitIdle: ['standUp', 'dance'],
  standUp: ['idle'],
  dance: ['idle', 'sitIdle', 'walk'],
};

export function canTransition(from: AvatarState, to: AvatarState): boolean {
  if (from === to) return false;
  return ALLOWED[from].includes(to);
}

/** Resolve a logical state to the clip name to look for in the glb. */
export function clipNameFor(
  state: AvatarState,
  danceClip?: string,
): string | null {
  if (state === 'dance') return danceClip ?? DANCE_CLIPS[0] ?? null;
  return AVATAR_CLIPS[state] ?? null;
}
