import { describe, expect, it } from 'vitest';
import {
  CONTROLS,
  claimedKeys,
} from '@/features/watch-party/theatre/lib/controls';

/**
 * The hint line is the only place the room's keys are written down, so the thing
 * worth testing is that it stays true: every binding listed, nothing listed that the
 * player underneath already owns.
 */

/** What the theatre actually binds, across its five keyboard hooks. */
const THEATRE_BINDINGS = [
  'W',
  'A',
  'S',
  'D',
  'Shift',
  'E',
  'R',
  'V',
  'Enter',
] as const;

/**
 * What the video player binds. It stays mounted and keyboard-live beneath the
 * scene — the theatre renders inside `Player.Root` so the film keeps playing — so a
 * clash here would fire both actions at once.
 */
const PLAYER_BINDINGS = [
  'Space',
  'K',
  'J',
  'L',
  'M',
  'F',
  'C',
  'N',
  'Escape',
] as const;

describe('CONTROLS', () => {
  it('documents every key the theatre binds', () => {
    const claimed = new Set(claimedKeys());
    for (const key of THEATRE_BINDINGS) {
      expect(claimed.has(key), `${key} is bound but not on the card`).toBe(
        true,
      );
    }
  });

  it('claims no key the video player underneath already owns', () => {
    /*
      `F` is the case that makes this worth pinning: it is the player's fullscreen
      toggle, and it was deliberately passed over for sitting because a theatre
      binding on it would fire both actions.
    */
    const claimed = new Set(claimedKeys());
    for (const key of PLAYER_BINDINGS) {
      expect(claimed.has(key), `${key} belongs to the player`).toBe(false);
    }
  });

  it('lists each key once', () => {
    const keys = claimedKeys();
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('keeps every label to a single word, so the line does not wrap into the film', () => {
    for (const row of CONTROLS) {
      expect(row.label.length).toBeGreaterThan(0);
      expect(row.label.trim().split(/\s+/)).toHaveLength(1);
      expect(row.keys.length).toBeGreaterThan(0);
    }
  });

  it('leads with walking, which is the one thing everybody tries first', () => {
    expect(CONTROLS[0].keys).toEqual(['W', 'A', 'S', 'D']);
  });

  it('documents the two keys nobody guesses', () => {
    // `R` and `V` are the reason this card exists. `WASD` people try; these two
    // announce themselves nowhere else in the room.
    const rows = CONTROLS.filter(
      (r) => r.keys.includes('R') || r.keys.includes('V'),
    );
    expect(rows).toHaveLength(2);
    for (const row of rows) expect(row.label.length).toBeGreaterThan(3);
  });
});
