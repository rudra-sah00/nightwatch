'use client';

import { useRef } from 'react';
import { useFloatingTiles } from '../hooks/use-floating-tiles';
import type { AgoraParticipant } from '../media/hooks/useAgora';
import { FloatingTile } from './FloatingTile';

/** Props for the {@link FloatingParticipants} component. */
interface FloatingParticipantsProps {
  /** List of Agora participants to render as floating tiles. */
  participants: AgoraParticipant[];
}

/**
 * Overlay container that renders a {@link FloatingTile} for every watch party
 * participant when the sidebar is closed and the floating tiles setting is on.
 *
 * Positioned absolutely over the video player area. The container itself is
 * `pointer-events-none` so clicks pass through to the video; individual tiles
 * re-enable pointer events for drag/resize interaction.
 *
 * @param props - {@link FloatingParticipantsProps}
 */
export function FloatingParticipants({
  participants,
}: FloatingParticipantsProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { getLayout, updateLayout, bringToFront, MIN_W, MIN_H } =
    useFloatingTiles();

  if (participants.length === 0) return null;

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 z-20 pointer-events-none"
    >
      {participants.map((p, i) => (
        <div key={p.identity} className="pointer-events-auto">
          <FloatingTile
            participant={p}
            layout={getLayout(p.identity, i)}
            containerRef={containerRef}
            onDragEnd={(id, x, y) => updateLayout(id, { x, y })}
            onResizeEnd={(id, w, h) =>
              updateLayout(id, { width: w, height: h })
            }
            onFocus={bringToFront}
            minW={MIN_W}
            minH={MIN_H}
          />
        </div>
      ))}
    </div>
  );
}
