import { describe, expect, it } from 'vitest';
import { DANCE_LABELS } from '@/features/watch-party/theatre/hooks/use-dance-menu';
import {
  AVATAR_CLIPS,
  DANCE_CLIPS,
} from '@/features/watch-party/theatre/lib/animation';

/**
 * The clip registry, against what the published characters actually contain.
 *
 * Read out of `theatre/v3/models/avatar-boy.glb` and `avatar-girl.glb` on
 * 2026-09-23 — both carry the identical ten, which the manifest requires because
 * the animation state machine is shared across characters and looks clips up by
 * name:
 *
 *   Dance.Bounce  Dance.Sway  Dance.Twist  Emote.Cheer  Emote.Clap
 *   Idle  SitDown  SitIdle  StandUp  Walk
 *
 * Kept here as a literal so a rename in the glb fails a test instead of silently
 * degrading to a still avatar: `findClip` looks names up tolerantly and returns
 * null when it misses, and a null clip plays nothing at all.
 */
const PUBLISHED_CLIPS = [
  'Dance.Bounce',
  'Dance.Sway',
  'Dance.Twist',
  'Emote.Cheer',
  'Emote.Clap',
  'Idle',
  'SitDown',
  'SitIdle',
  'StandUp',
  'Walk',
] as const;

describe('clip registry', () => {
  it('only asks for clips the characters actually ship', () => {
    const published = new Set<string>(PUBLISHED_CLIPS);
    for (const clip of DANCE_CLIPS) {
      expect(published.has(clip), `${clip} is not in the glb`).toBe(true);
    }
    for (const clip of Object.values(AVATAR_CLIPS)) {
      expect(published.has(clip), `${clip} is not in the glb`).toBe(true);
    }
  });

  it('offers every performable clip the glb carries', () => {
    /*
      The regression this exists for. `Emote.Cheer` and `Emote.Clap` were authored
      and shipped inside both characters from the start and never registered, so
      every client downloaded them and the wheel offered three options out of five.
    */
    const performable = PUBLISHED_CLIPS.filter(
      (c) => c.startsWith('Dance.') || c.startsWith('Emote.'),
    );
    expect([...DANCE_CLIPS].sort()).toEqual([...performable].sort());
  });

  it('labels every option, so the wheel never draws a raw clip name', () => {
    for (const clip of DANCE_CLIPS) {
      expect(DANCE_LABELS[clip], `${clip} has no label`).toBeTruthy();
    }
  });

  it('keeps the first three indices where they were', () => {
    /*
      The chosen clip travels over RTM as an INDEX into this array, not as a name,
      so reordering it changes what every already-running client renders. Appending
      is the only safe edit: an older client receiving an index it does not have
      falls back to the first clip rather than breaking.
    */
    expect(DANCE_CLIPS[0]).toBe('Dance.Sway');
    expect(DANCE_CLIPS[1]).toBe('Dance.Bounce');
    expect(DANCE_CLIPS[2]).toBe('Dance.Twist');
  });

  it('lists each clip once', () => {
    expect(new Set(DANCE_CLIPS).size).toBe(DANCE_CLIPS.length);
  });

  it('never offers a locomotion or seating clip as a performance', () => {
    // Sitting is driven by the seat claim and walking by the controller; offering
    // either on the wheel would fight whatever owns that state.
    for (const clip of DANCE_CLIPS) {
      expect(Object.values(AVATAR_CLIPS)).not.toContain(clip);
    }
  });
});
