'use client';

import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo } from 'react';
import {
  buildAuditorium,
  buildStarfield,
  disposeBuilt,
  disposeStarfield,
  updateStarfield,
} from '../lib/geometry';

/**
 * Auditorium shell: floors and carpet inlays, stepped tray ceiling with its
 * starlight panel, walls with pilasters, framed panels, crown and plinth
 * mouldings, sconce fixtures, the screen masking surround, LCR speaker cabinets,
 * aisle stairs, and the battened rear wall with its handrail.
 *
 * Generated in code — there is no `room.glb`. What used to be a 2.3 MB Blender
 * export whose blockout measured 307 draw calls across 19 materials is now a batch
 * of primitives drawing in about a dozen calls and costing zero bytes of transfer.
 * Dimensions come from `layout.ts`, shared with the colliders and seat anchors.
 *
 * The screen aperture is deliberately left empty: `TheatreScreen` owns the video
 * plane, and nothing here may sit in front of it.
 */
export function TheatreRoom() {
  // Built once per mount. `useMemo` rather than module scope so leaving 3D
  // actually frees the buffers, and so a remount gets clean geometry rather than
  // meshes that may already have been disposed.
  const meshes = useMemo(() => buildAuditorium(), []);
  const stars = useMemo(() => buildStarfield(), []);

  useEffect(() => () => disposeBuilt(meshes), [meshes]);
  useEffect(() => () => disposeStarfield(stars), [stars]);

  /*
    Twinkle.

    Driven from the frame loop rather than a CSS-style animation because it writes
    into a material's colour, and the material is additive — so this scales the
    light each star ADDS rather than fading it toward grey.
  */
  useFrame((state) => {
    updateStarfield(stars, state.clock.elapsedTime);
  });

  return (
    <group name="auditorium">
      {meshes.map((mesh) => (
        <primitive key={mesh.uuid} object={mesh} />
      ))}
      <group name="starfield">
        {stars.map((tier) => (
          <primitive key={tier.mesh.uuid} object={tier.mesh} />
        ))}
      </group>
    </group>
  );
}
