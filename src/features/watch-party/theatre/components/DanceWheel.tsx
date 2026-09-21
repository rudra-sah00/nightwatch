'use client';

import { DANCE_LABELS } from '../hooks/use-dance-menu';
import { DANCE_CLIPS } from '../lib/animation';
import { WHEEL_DEAD_ZONE_PX, wheelOptionAngle } from '../lib/dance-rules';

/** Distance from centre to an option, px. */
const RADIUS = 92;

/**
 * The radial dance picker, shown while D is held.
 *
 * A DOM overlay rather than something in the scene: it is a menu about the world,
 * not part of it, so it must not be dimmed by the auditorium's lighting, fogged by
 * distance, or occluded by a chair. It is also drawn at the cursor, which is a
 * screen-space idea.
 *
 * `pointer-events-none` throughout. Selection comes from the cursor's angle
 * relative to the centre (see `wheelSelection`), not from hovering a DOM node —
 * hover would make the thin gaps between options into dead spots and would break
 * the moment the wheel opened near a screen edge.
 */
export function DanceWheel({
  open,
  origin,
  hovered,
}: {
  open: boolean;
  origin: { x: number; y: number };
  hovered: number | null;
}) {
  if (!open) return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-50" aria-hidden="true">
      {/* Dead-zone ring: shows that releasing here cancels. */}
      <div
        className="absolute rounded-full border border-dashed border-white/25"
        style={{
          left: origin.x - WHEEL_DEAD_ZONE_PX,
          top: origin.y - WHEEL_DEAD_ZONE_PX,
          width: WHEEL_DEAD_ZONE_PX * 2,
          height: WHEEL_DEAD_ZONE_PX * 2,
        }}
      />

      {DANCE_CLIPS.map((clip, i) => {
        const angle = wheelOptionAngle(i, DANCE_CLIPS.length);
        // Screen Y grows downward, so up is -cos.
        const x = origin.x + Math.sin(angle) * RADIUS;
        const y = origin.y - Math.cos(angle) * RADIUS;
        const active = hovered === i;
        return (
          <div
            key={clip}
            className={`absolute -translate-x-1/2 -translate-y-1/2 whitespace-nowrap rounded-full px-3 py-1.5 font-headline text-[11px] font-black uppercase tracking-widest transition-transform ${
              active
                ? 'scale-110 bg-white text-black shadow-lg'
                : 'bg-black/75 text-white/70'
            }`}
            style={{ left: x, top: y }}
          >
            {DANCE_LABELS[clip] ?? clip}
          </div>
        );
      })}

      <div
        className="absolute -translate-x-1/2 whitespace-nowrap text-center font-medium text-[10px] text-white/50"
        style={{ left: origin.x, top: origin.y + RADIUS + 34 }}
      >
        {hovered === null ? 'release to cancel' : 'release to dance'}
      </div>
    </div>
  );
}
