'use client';

import { CONTROLS } from '../lib/controls';

/**
 * The keys, as one quiet line of text.
 *
 * Always on screen while 3D is up, and that is the whole mechanism — there is no
 * card, no popup and no button. Two earlier attempts are worth remembering so they
 * are not rebuilt: a card that opened by itself on a first visit put a popup between
 * the viewer and the room they had just walked into, and a button to open that card
 * on demand was still a box with a border in the corner of a film.
 *
 * Borderless text is the convention this follows, the same as the dance wheel's
 * "release to cancel" label and the floating chat transcript: no background, no
 * border, low opacity, and a `text-shadow` so it stays legible over a bright frame
 * (`FloatingChat` does the same).
 *
 * `pointer-events-none`, because nothing here is clickable — it is a label, not a
 * control, so it never competes with the scene for the cursor and does not care
 * whether the pointer is locked.
 *
 * Rendered from `lib/controls.ts`, which `controls.test.ts` asserts covers every
 * binding the hooks actually read.
 */
export function ControlsHint() {
  return (
    <div
      className="pointer-events-none absolute bottom-3 left-1/2 z-50 flex max-w-[calc(100%-1.5rem)] -translate-x-1/2 flex-wrap items-center justify-center gap-x-4 gap-y-1 text-[11px] font-medium tracking-wide text-white/45"
      style={{ textShadow: '0 1px 3px rgba(0,0,0,0.95)' }}
    >
      {CONTROLS.map((row) => (
        <span key={row.label} className="whitespace-nowrap">
          <span className="font-headline font-black uppercase tracking-widest text-white/70">
            {row.keys.join(' ')}
          </span>{' '}
          {row.label}
        </span>
      ))}
    </div>
  );
}
