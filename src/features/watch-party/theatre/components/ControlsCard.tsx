'use client';

import { CONTROLS } from '../lib/controls';

/**
 * The controls card, and the hint that tells you it exists.
 *
 * A DOM overlay rather than something in the scene, for the same reason
 * `DanceWheel` is: it is information *about* the world, not part of it, so it must
 * not be dimmed by the auditorium's lighting, fogged by distance or occluded by a
 * chair.
 *
 * `pointer-events-none` throughout, and it never takes focus. The card is a
 * reference you can read while still walking, and the keys keep working underneath
 * it — which is also why it carries its own closing instruction instead of a close
 * button nobody could click while the pointer is locked.
 */

function Keycap({ label }: { label: string }) {
  return (
    <kbd className="inline-flex min-w-[1.75rem] items-center justify-center rounded-md border-2 border-white/25 bg-white/10 px-1.5 py-0.5 font-headline text-[11px] font-black uppercase tracking-widest text-white">
      {label}
    </kbd>
  );
}

export function ControlsCard({ open }: { open: boolean }) {
  if (!open) return null;

  return (
    <section
      aria-label="Controls"
      className="pointer-events-none absolute left-1/2 top-1/2 z-50 w-[min(24rem,calc(100%-2rem))] -translate-x-1/2 -translate-y-1/2 rounded-lg border-[3px] border-white/20 bg-black/85 p-5 backdrop-blur-sm"
    >
      <h2 className="mb-4 font-headline text-xs font-black uppercase tracking-[0.2em] text-white/90">
        Controls
      </h2>

      <dl className="flex flex-col gap-2.5">
        {CONTROLS.map((row) => (
          <div key={row.label} className="flex items-baseline gap-3">
            <dt className="flex shrink-0 gap-1">
              {row.keys.map((key) => (
                <Keycap key={key} label={key} />
              ))}
            </dt>
            <dd className="min-w-0 text-xs font-medium leading-snug text-white/80">
              {row.label}
              {row.note ? (
                <span className="block text-[10px] font-normal tracking-wide text-white/40">
                  {row.note}
                </span>
              ) : null}
            </dd>
          </div>
        ))}
      </dl>

      <p className="mt-4 border-t-2 border-white/10 pt-3 text-[10px] font-medium uppercase tracking-widest text-white/40">
        Press H or Escape to close
      </p>
    </section>
  );
}

/**
 * The permanent corner hint.
 *
 * Without it the card is a secret after its first showing — `H` is not a key
 * anybody guesses. Deliberately the quietest thing on screen: this sits over a film
 * somebody is trying to watch.
 */
export function ControlsHint({ hidden }: { hidden: boolean }) {
  if (hidden) return null;

  return (
    <div className="pointer-events-none absolute bottom-3 right-3 z-50 flex items-center gap-1.5 rounded-md bg-black/40 px-2 py-1 text-[10px] font-medium uppercase tracking-widest text-white/35">
      <kbd className="font-headline font-black text-white/60">H</kbd>
      Controls
    </div>
  );
}
