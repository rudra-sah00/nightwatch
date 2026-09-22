'use client';

import { useThree } from '@react-three/fiber';
import { useEffect, useMemo } from 'react';
import type { Material, Object3D } from 'three';
import { Color, Mesh, MeshStandardMaterial } from 'three';
import { RoomEnvironment } from 'three-stdlib';
import { useTheatreGltf } from '../hooks/use-theatre-gltf';
import { CAFE_ENVIRONMENT_INTENSITY, finishFor } from '../lib/cafe-materials';

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
 * Its fixtures in `lib/lighting.ts` are the second part of that fix, and the
 * finishes in `lib/cafe-materials.ts` are the third: the asset ships 23 materials
 * and no textures at all, so without them every surface is flat colour that catches
 * no highlight from the lights now shining on it.
 *
 * Exported in the same world space as `room.glb` (verified against the published
 * asset: `Cafe_Shell` spans z 8.70..14.40 and `Cafe_Seller` sits at
 * (-1.55, 0.45, 13.42), matching `FLOORS.cafe` and the 0.45 m cafe floor), so it
 * mounts at identity with no transform — same as `TheatreRoom`.
 */
export function TheatreCafe({ url }: TheatreCafeProps) {
  const { scene } = useTheatreGltf(url);
  const gl = useThree((state) => state.gl);
  const rootScene = useThree((state) => state.scene);

  /**
   * Something for metals to reflect.
   *
   * A `metalness` surface in three.js is lit almost entirely by its environment, so
   * with none set the espresso machine would render nearly black — shinier settings
   * making it darker. `RoomEnvironment` is procedural: a few emissive boxes rendered
   * to a cube map, so it costs one PMREM pass at mount and downloads nothing, unlike
   * an HDRI.
   *
   * Applied to the whole scene rather than to the cafe alone, because `environment`
   * is a scene-level property in three. The auditorium gets a little specular life
   * out of it too, which is why the intensity is kept low — see
   * CAFE_ENVIRONMENT_INTENSITY.
   */
  useEffect(() => {
    const previousEnvironment = rootScene.environment;
    const previousIntensity = rootScene.environmentIntensity;

    // Imported lazily so the PMREM generator is not pulled into the initial bundle.
    let disposed = false;
    let generated: { dispose(): void } | null = null;

    (async () => {
      const { PMREMGenerator } = await import('three');
      if (disposed) return;
      const generator = new PMREMGenerator(gl);
      // three-stdlib exports RoomEnvironment as a factory returning a Scene, not
      // as a class — no `new`.
      const target = generator.fromScene(RoomEnvironment(), 0.04);
      generator.dispose();
      generated = target;
      rootScene.environment = target.texture;
      rootScene.environmentIntensity = CAFE_ENVIRONMENT_INTENSITY;
    })();

    return () => {
      disposed = true;
      rootScene.environment = previousEnvironment;
      rootScene.environmentIntensity = previousIntensity;
      generated?.dispose();
    };
  }, [gl, rootScene]);

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
      if (!(child instanceof Mesh)) return;

      // Static, like the auditorium: receives shadows, never casts, and its
      // matrices are frozen so it costs nothing per frame.
      child.castShadow = false;
      child.receiveShadow = true;
      child.matrixAutoUpdate = false;
      child.updateMatrix();

      // Ancestor chain, nearest first: the meshes are usually unnamed children of
      // the named object, so the finish has to be looked up by walking up.
      const names: string[] = [];
      for (
        let node: Object3D | null = child;
        node !== null;
        node = node.parent
      ) {
        if (node.name) names.push(node.name);
        if (node === scene) break;
      }

      const match = finishFor(names);
      if (!match) return;

      /*
        Cloned, never mutated in place. `useGLTF` caches this scene graph and hands
        the same materials to every later mount, so editing them would leak these
        finishes into any other consumer of the asset and would double-apply on a
        remount.
      */
      const apply = (material: Material): Material => {
        if (!(material instanceof MeshStandardMaterial)) return material;
        const next = material.clone();
        next.roughness = match.finish.roughness;
        next.metalness = match.finish.metalness;
        if (match.finish.emissive) {
          next.emissive = new Color(match.finish.emissive);
          next.emissiveIntensity = match.finish.emissiveIntensity ?? 1;
        }
        next.needsUpdate = true;
        return next;
      };

      // Preserve the single-vs-array shape the mesh was authored with.
      child.material = Array.isArray(child.material)
        ? child.material.map(apply)
        : apply(child.material);
    });
  }, [scene]);

  return <primitive object={scene} />;
}
