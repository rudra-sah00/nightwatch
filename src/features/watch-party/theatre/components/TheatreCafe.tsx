'use client';

import { useEffect, useMemo } from 'react';
import { Mesh } from 'three';
import { useTheatreGltf } from '../hooks/use-theatre-gltf';

interface TheatreCafeProps {
  /** cafe.glb url from the backend manifest */
  url: string;
}

/**
 * The cafe behind the auditorium's glazed gate: shell, counter, back bar, popcorn
 * and espresso machines, stock, tables, menu board, pendant lamps and the seller.
 *
 * This was the reason the cafe read as a dark void. `cafe.glb` has been in the
 * manifest and in the preloader's blocking download list since 3D shipped —
 * `use-theatre-preload.ts` will not unlock `V` until all of it is on the machine —
 * but nothing ever added it to the scene. Walking through the doors put you on the
 * cafe floor collider with no geometry around you, so there was nothing to light.
 * Its fixtures in `lib/lighting.ts` are the other half of the fix.
 *
 * Exported in the same world space as `room.glb` (verified against the published
 * asset: `Cafe_Shell` spans z 8.70..14.40 and `Cafe_Seller` sits at
 * (-1.55, 0.45, 13.42), matching `FLOORS.cafe` and the 0.45 m cafe floor), so it
 * mounts at identity with no transform — same as `TheatreRoom`.
 */
export function TheatreCafe({ url }: TheatreCafeProps) {
  const { scene } = useTheatreGltf(url);

  /**
   * `cafe.glb` carries its own copy of the gate.
   *
   * The doorway sits on the boundary between the two models and was exported into
   * both, so mounting this asset as-is puts a second frame and a second pair of
   * leaves in the same millimetres as the room's — z-fighting on the glass, and
   * worse, a shut pair that never animates. `TheatreRoom` owns the hinges and
   * swings `Gate_Leaf_L` / `Gate_Leaf_R`, so the duplicates here would stay closed
   * across the opening while the real leaves swung through them.
   *
   * Hidden rather than deleted: `useGLTF` caches and shares this scene graph, so
   * removing nodes would mutate the cached asset for every later consumer.
   */
  const duplicated = useMemo(
    () =>
      ['Gate_Frame', 'Gate_Leaf_L', 'Gate_Leaf_R']
        .map((name) => scene.getObjectByName(name))
        .filter((node): node is NonNullable<typeof node> => node != null),
    [scene],
  );

  useEffect(() => {
    for (const node of duplicated) node.visible = false;
    return () => {
      // Restore on unmount, since the scene graph is cached and shared.
      for (const node of duplicated) node.visible = true;
    };
  }, [duplicated]);

  useEffect(() => {
    scene.traverse((child) => {
      if (child instanceof Mesh) {
        // Static, like the auditorium: receives shadows, never casts, and its
        // matrices are frozen so it costs nothing per frame.
        child.castShadow = false;
        child.receiveShadow = true;
        child.matrixAutoUpdate = false;
        child.updateMatrix();
      }
    });
  }, [scene]);

  return <primitive object={scene} />;
}
