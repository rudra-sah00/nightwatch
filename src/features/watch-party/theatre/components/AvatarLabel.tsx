'use client';

import { Html } from '@react-three/drei';
import { identityColour } from '../lib/avatar-instance';
import { STANDING_EYE_HEIGHT } from '../lib/layout';

interface AvatarLabelProps {
  userId: string;
  name?: string;
  /** Latest chat line from this user, or null. */
  message?: string | null;
}

/**
 * Name tag and speech bubble above an avatar.
 *
 * Uses drei's `Html` rather than `Text`. `Text` renders real 3D glyphs via
 * troika, which means shipping a font and paying SDF generation cost per string
 * — for short labels that never need to be occluded by geometry, a DOM overlay
 * is cheaper, sharper at small sizes, and styles with the app's existing classes.
 *
 * `occlude` is deliberately off: a name you cannot read because a chair is in the
 * way defeats the point of having it.
 */
export function AvatarLabel({ userId, name, message }: AvatarLabelProps) {
  const colour = identityColour(userId);
  const label = name ?? userId.slice(0, 8);

  return (
    <Html
      position={[0, STANDING_EYE_HEIGHT + 0.28, 0]}
      center
      distanceFactor={8}
      zIndexRange={[20, 0]}
      style={{ pointerEvents: 'none', userSelect: 'none' }}
    >
      <div className="flex flex-col items-center gap-1">
        {message ? (
          <div className="max-w-[220px] rounded-lg bg-black/80 px-2.5 py-1.5 text-center text-[13px] leading-snug text-white shadow-lg">
            {message}
          </div>
        ) : null}
        <div
          className="whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-bold tracking-wide text-black/85"
          style={{ backgroundColor: colour }}
        >
          {label}
        </div>
      </div>
    </Html>
  );
}
