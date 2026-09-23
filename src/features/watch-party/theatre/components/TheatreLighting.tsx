'use client';

import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import type { DirectionalLight, PointLight, RectAreaLight } from 'three';
import { ROOM, SCREEN } from '../lib/layout';
import {
  AMBIENT,
  AMBIENT_COLOUR,
  approach,
  COVES,
  HEMI,
  HEMI_GROUND,
  HEMI_SKY,
  KEY,
  KEY_COLOUR,
  levelValue,
  POINT_FIXTURES,
  targetLevel,
} from '../lib/lighting';
import { ensureRectAreaLights } from '../lib/rect-area-light';

/**
 * The auditorium light rig.
 *
 * All positions and colours live in `lib/lighting.ts`, which also explains why
 * this rig has to exist at all: the 52 fixtures in the Blender scene are not in
 * the room geometry and cannot be — glTF carried lights only through
 * `KHR_lights_punctual`, which the export omits and which cannot describe an
 * area light anyway. The room's emissive LED strips glow but illuminate nothing,
 * because three.js has no global illumination to bounce them.
 *
 * `TheatreScreen` owns one further light, a `RectAreaLight` driven by the
 * picture. That one is the primary source once the film is running; everything
 * here is the house rig around it.
 *
 * Two modes, per the brief: lights up while walking, dimmed once seated or in
 * screen-focus mode. Intensities are written every frame from a single smoothed
 * scalar, so the change is a fade rather than a cut.
 */
interface TheatreLightingProps {
  /** Seated viewers get the film-running look. */
  seated: boolean;
  /** Screen-focus mode is also a committed viewing state. */
  cinema: boolean;
}

export function TheatreLighting({ seated, cinema }: TheatreLightingProps) {
  // RectAreaLight needs its LTC lookup tables before the first render that
  // contains one, or both the coves here and the screen light in TheatreScreen
  // silently emit nothing. This is latched, so calling it here is enough for
  // the whole scene.
  ensureRectAreaLights();

  const key = useRef<DirectionalLight>(null);
  const points = useRef<(PointLight | null)[]>([]);
  const coves = useRef<(RectAreaLight | null)[]>([]);
  const ambient = useRef<{ intensity: number } | null>(null);
  const hemi = useRef<{ intensity: number } | null>(null);

  const target = targetLevel({ seated, cinema });

  /**
   * Start already at the right level instead of fading in from house lights.
   *
   * Someone who enters the party in screen-focus mode should not watch the
   * house lights go down on arrival — they were never up.
   */
  const level = useRef(target);

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

  /**
   * Cove rotations are static, so they are applied once rather than per frame.
   * `rotation` is not settable as a prop array on `rectAreaLight` without R3F
   * re-creating the Euler each render, and a light that never moves should not
   * pay for that.
   */
  useEffect(() => {
    COVES.forEach((fixture, i) => {
      const l = coves.current[i];
      if (!l) return;
      l.rotation.set(...fixture.rotation);
    });
  }, []);

  useFrame((_, delta) => {
    const next = approach(level.current, target, delta);
    level.current = next;

    if (ambient.current) ambient.current.intensity = levelValue(AMBIENT, next);
    if (hemi.current) hemi.current.intensity = levelValue(HEMI, next);
    if (key.current) key.current.intensity = levelValue(KEY, next);

    for (let i = 0; i < POINT_FIXTURES.length; i += 1) {
      const l = points.current[i];
      if (l) l.intensity = levelValue(POINT_FIXTURES[i].level, next);
    }
    for (let i = 0; i < COVES.length; i += 1) {
      const l = coves.current[i];
      if (l) l.intensity = levelValue(COVES[i].level, next);
    }
  });

  // Mount at the level we are starting from, so the very first frame is right
  // even before useFrame has run once.
  const initial = useMemo(() => level.current, []);

  return (
    <group name="theatre-lighting">
      <ambientLight
        ref={ambient}
        intensity={levelValue(AMBIENT, initial)}
        color={AMBIENT_COLOUR}
      />
      <hemisphereLight
        ref={hemi}
        intensity={levelValue(HEMI, initial)}
        color={HEMI_SKY}
        groundColor={HEMI_GROUND}
      />

      {/* Shadow key: above the rear of the room aiming at the screen wall, so
          avatars are lit from behind-above like a real projector throw.

          No longer casts. It was the scene's only shadow caster, and a 1024x1024
          depth pass over the whole room every frame bought contact shadows under
          the avatars and nothing else — the room already never cast, only
          received. Dropped deliberately: nobody entering a browser theatre is
          looking for their own shadow, and this is the single largest per-frame
          cost the scene had. */}
      <directionalLight
        ref={key}
        position={[1.5, ROOM.ceilingY - 0.2, ROOM.maxZ - 1.5]}
        target-position={[0, 0, SCREEN.z]}
        intensity={levelValue(KEY, initial)}
        color={KEY_COLOUR}
      />

      {/* Ceiling downlights, sconces, step and exit glow. */}
      {POINT_FIXTURES.map((fixture, i) => (
        <pointLight
          key={fixture.id}
          ref={(l) => {
            points.current[i] = l;
          }}
          position={fixture.position}
          color={fixture.colour}
          intensity={levelValue(fixture.level, initial)}
          distance={fixture.distance}
          decay={2}
        />
      ))}

      {/* Cove uplight on the side walls. */}
      {COVES.map((fixture, i) => (
        <rectAreaLight
          key={fixture.id}
          ref={(l) => {
            coves.current[i] = l;
          }}
          position={fixture.position}
          width={fixture.width}
          height={fixture.height}
          color={fixture.colour}
          intensity={levelValue(fixture.level, initial)}
        />
      ))}
    </group>
  );
}
