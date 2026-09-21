'use client';

import { type ThreeEvent, useFrame } from '@react-three/fiber';
import { useCallback, useEffect, useMemo, useRef } from 'react';
import type { RectAreaLight, VideoTexture } from 'three';
import { Color } from 'three';
import { SCREEN } from '../lib/layout';

interface TheatreScreenProps {
  texture: VideoTexture | null;
  /**
   * Toggle playback. Omitted in read-only contexts, in which case the screen is
   * not interactive at all rather than being a button that does nothing.
   */
  onTogglePlay?: () => void;
}

/** How fast the screen light chases the picture. Too high and it strobes. */
const LIGHT_LERP = 3.5;

/**
 * The projection screen, and the room's primary light source.
 *
 * Geometry comes from `layout.ts` so it matches the physical trim and masking
 * exported in `room.glb` — the screen plane is a separate mesh here because it
 * needs a live texture, while the bezel and masking are baked into the room.
 *
 * The light is driven from the video rather than being static. A cinema's
 * illumination comes almost entirely off the screen, so a fixed fill makes the
 * room look flat and wrong during dark scenes. Colour is sampled coarsely on the
 * CPU from a tiny canvas; a full GPU readback per frame would cost more than the
 * effect is worth.
 */
export function TheatreScreen({ texture, onTogglePlay }: TheatreScreenProps) {
  const light = useRef<RectAreaLight>(null);

  // 16x9 is plenty to derive an average — we only need a colour, not an image
  const sampler = useMemo(() => {
    if (typeof document === 'undefined') return null;
    const canvas = document.createElement('canvas');
    canvas.width = 16;
    canvas.height = 9;
    return {
      canvas,
      ctx: canvas.getContext('2d', { willReadFrequently: true }),
    };
  }, []);

  const current = useMemo(() => new Color('#cfe0ff'), []);
  const target = useMemo(() => new Color('#cfe0ff'), []);
  const frame = useRef(0);

  useEffect(() => {
    if (texture) texture.needsUpdate = true;
  }, [texture]);

  useFrame((_, delta) => {
    const l = light.current;
    if (!l) return;

    // Sample every 4th frame: the eye cannot follow faster than this and it
    // keeps a readPixels-class operation off the critical path.
    frame.current += 1;
    if (texture && sampler?.ctx && frame.current % 4 === 0) {
      const video = texture.image as HTMLVideoElement | undefined;
      if (video && video.readyState >= 2) {
        try {
          sampler.ctx.drawImage(video, 0, 0, 16, 9);
          const { data } = sampler.ctx.getImageData(0, 0, 16, 9);
          let r = 0;
          let g = 0;
          let b = 0;
          for (let i = 0; i < data.length; i += 4) {
            r += data[i];
            g += data[i + 1];
            b += data[i + 2];
          }
          const n = data.length / 4;
          target.setRGB(r / n / 255, g / n / 255, b / n / 255);
        } catch {
          // Tainted canvas on a cross-origin stream without CORS. Keep the last
          // colour rather than killing the render loop.
        }
      }
    }

    const k = 1 - Math.exp(-LIGHT_LERP * delta);
    current.lerp(target, k);
    l.color.copy(current);
    // Dark scenes should dim the room, not just tint it
    const luma = 0.2126 * current.r + 0.7152 * current.g + 0.0722 * current.b;
    l.intensity = 2 + luma * 9;
  });

  const interactive = Boolean(onTogglePlay);

  /**
   * Click the picture to play/pause, the same gesture as the 2D player.
   *
   * `stopPropagation` matters: without it the click also reaches the canvas,
   * which `usePointerLook` treats as "re-acquire the mouse", so pausing would
   * silently grab the pointer at the same time.
   */
  const handleClick = useCallback(
    (e: ThreeEvent<MouseEvent>) => {
      if (!onTogglePlay) return;
      e.stopPropagation();
      onTogglePlay();
    },
    [onTogglePlay],
  );

  const handleOver = useCallback(() => {
    if (interactive) document.body.style.cursor = 'pointer';
  }, [interactive]);

  const handleOut = useCallback(() => {
    if (interactive) document.body.style.cursor = '';
  }, [interactive]);

  // Leaving the cursor as a pointer after unmount would strand it that way over
  // the whole page.
  useEffect(() => {
    return () => {
      document.body.style.cursor = '';
    };
  }, []);

  return (
    <group name="theatre-screen">
      {/*
        biome-ignore lint/a11y/noStaticElementInteractions: <mesh> is a
        react-three-fiber scene object, not a DOM element. There is no HTML node
        here to attach a role or keyboard handler to — R3F dispatches this from a
        raycast against the 3D plane. Keyboard users get the same action from the
        2D player controls, which stay mounted underneath the canvas.
      */}
      <mesh
        position={[0, SCREEN.centreY, SCREEN.z]}
        onClick={interactive ? handleClick : undefined}
        onPointerOver={interactive ? handleOver : undefined}
        onPointerOut={interactive ? handleOut : undefined}
      >
        <planeGeometry args={[SCREEN.width, SCREEN.height]} />
        {texture ? (
          // basic, not standard: the screen emits light, it does not receive it
          <meshBasicMaterial map={texture} toneMapped={false} />
        ) : (
          <meshBasicMaterial color="#0b0d12" />
        )}
      </mesh>

      <rectAreaLight
        ref={light}
        position={[0, SCREEN.centreY, SCREEN.z + 0.08]}
        width={SCREEN.width}
        height={SCREEN.height}
        intensity={4}
        color="#cfe0ff"
      />
    </group>
  );
}
