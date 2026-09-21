/**
 * Avatar animation state machine.
 *
 * Clip NAMES are indirected through `AVATAR_CLIPS` on purpose, so the same
 * state machine drives any character whose glb happens to name its clips
 * differently. Point this map at whatever the chosen .glb contains and nothing
 * else has to change.
 *
 * The avatars are Mixamo characters and every clip is authored on the standard
 * `mixamorig:` skeleton, so one set of clips drives all of them without
 * per-character retargeting. Clip channels are addressed by bone NAME, which is
 * why a shorter character can play a taller character's walk and still plant
 * its feet: hips translation is stored as an offset from that rig's own rest
 * pose, not as an absolute height.
 *
 * There is deliberately no `run`. This is a cinema.
 */

/** Logical states, independent of clip naming. */
export type AvatarState =
  | 'idle'
  | 'walk'
  | 'sitDown'
  | 'sitIdle'
  | 'standUp'
  | 'dance';

/** Logical state -> clip name inside the avatar glb. */
export const AVATAR_CLIPS: Record<Exclude<AvatarState, 'dance'>, string> = {
  idle: 'Idle',
  walk: 'Walk',
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
  'Dance.Sway',
  'Dance.Bounce',
  'Dance.Twist',
];

/** Crossfade duration in seconds, per destination state. */
export const FADE_SECONDS: Record<AvatarState, number> = {
  idle: 0.25,
  walk: 0.18,
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
  idle: ['walk', 'sitDown', 'dance'],
  walk: ['idle', 'sitDown'],
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
