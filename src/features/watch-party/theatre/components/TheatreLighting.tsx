'use client';

import { useEffect, useRef } from 'react';
import type { DirectionalLight } from 'three';
import { ROOM, SCREEN } from '../lib/layout';
import { ensureRectAreaLights } from '../lib/rect-area-light';

/**
 * The auditorium light rig.
 *
 * `TheatreScreen` owns the primary light — a RectAreaLight driven by the picture,
 * which is what makes a cinema read as a cinema. Everything here is secondary
 * fill, and exists for three reasons the screen light cannot cover:
 *
 *  1. RectAreaLight casts no shadows in three.js. The Canvas enables `shadows`
 *     and avatars set `castShadow`, so without a shadow-capable light every
 *     character floats with no contact cue and reads as pasted on.
 *  2. The screen goes black during dark scenes and fades between shots. If the
 *     screen were the only source the room would strobe from lit to invisible.
 *  3. A real auditorium has step lights and aisle strips that stay on during the
 *     film precisely so people can walk without falling over.
 *
 * Intensities are deliberately low. This is a dim room by design — the goal is
 * "I can see where I am walking and who is next to me", not a lit interior.
 * Raising AMBIENT is the single knob for overall visibility.
 */

/** Overall floor of visibility. The one value to raise if the room reads too dark. */
const AMBIENT = 0.22;
/** Warm bounce off seat fabric and carpet. */
const AMBIENT_COLOUR = '#3a3026';

/** Gentle top-down gradient so the ceiling is not the same value as the floor. */
const HEMI_INTENSITY = 0.28;
const HEMI_SKY = '#2a3550';
const HEMI_GROUND = '#1a1410';

/** Shadow-casting key. Low and cool, hung above and behind the audience. */
const KEY_INTENSITY = 0.42;
const KEY_COLOUR = '#aab6d4';

/** Warm aisle strips near the floor, one per side wall. */
const AISLE_INTENSITY = 1.6;
const AISLE_COLOUR = '#ffa64d';
const AISLE_DISTANCE = 5.0;
const AISLE_Y = 0.35;

export function TheatreLighting() {
  // RectAreaLight needs its LTC tables before the first render that contains
  // one, otherwise TheatreScreen's light silently emits nothing.
  ensureRectAreaLights();

  const key = useRef<DirectionalLight>(null);

  useEffect(() => {
    const l = key.current;
    if (!l) return;
    // Frame the shadow camera tightly around the room. An oversized frustum
    // spreads the same texels over more world space and the contact shadows
    // under avatars turn to mush.
    const cam = l.shadow.camera;
    cam.left = -ROOM.width / 2 - 0.5;
    cam.right = ROOM.width / 2 + 0.5;
    cam.top = ROOM.maxZ / 2 + 1.0;
    cam.bottom = -ROOM.maxZ / 2 - 1.0;
    cam.near = 0.5;
    cam.far = 14;
    cam.updateProjectionMatrix();
    l.shadow.bias = -0.0015;
    l.shadow.normalBias = 0.02;
  }, []);

  return (
    <group name="theatre-lighting">
      <ambientLight intensity={AMBIENT} color={AMBIENT_COLOUR} />
      <hemisphereLight
        intensity={HEMI_INTENSITY}
        color={HEMI_SKY}
        groundColor={HEMI_GROUND}
      />

      {/* Key light: above the rear of the room aiming at the screen wall, so
          avatars are lit from behind-above like a real projector throw. */}
      <directionalLight
        ref={key}
        position={[1.5, ROOM.ceilingY - 0.2, ROOM.maxZ - 1.5]}
        target-position={[0, 0, SCREEN.z]}
        intensity={KEY_INTENSITY}
        color={KEY_COLOUR}
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
      />

      {/* Aisle strips. Point lights with a finite distance rather than more
          ambient: they pick out the steps and give the walls some falloff. */}
      <pointLight
        position={[ROOM.minX + 0.35, AISLE_Y, ROOM.maxZ * 0.45]}
        intensity={AISLE_INTENSITY}
        color={AISLE_COLOUR}
        distance={AISLE_DISTANCE}
        decay={2}
      />
      <pointLight
        position={[ROOM.maxX - 0.35, AISLE_Y, ROOM.maxZ * 0.45]}
        intensity={AISLE_INTENSITY}
        color={AISLE_COLOUR}
        distance={AISLE_DISTANCE}
        decay={2}
      />
    </group>
  );
}
