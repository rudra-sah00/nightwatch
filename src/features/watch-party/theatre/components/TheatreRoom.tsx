'use client';

import { useGLTF } from '@react-three/drei';
import { useEffect, useMemo } from 'react';
import { Mesh } from 'three';
import { GATE } from '../lib/layout';

interface TheatreRoomProps {
  /** room.glb url from the backend manifest */
  url: string;
  /** 0 shut, 1 fully open — swings the two cafe door leaves. */
  gateProgress?: number;
}

/**
 * Auditorium shell: walls, floors, coffered ceiling, screen trim and masking,
 * 7.1 speaker cabinets, aisle stairs, wall panels and sconces.
 *
 * Exported from Blender with +Y up, so glb coordinates already match the values
 * in `lib/layout.ts` — no rotation correction here. If this model ever appears
 * rotated 90°, the export lost `export_yup`, and the fix belongs in the export,
 * not in a transform on this component.
 */
export function TheatreRoom({ url, gateProgress = 0 }: TheatreRoomProps) {
  const { scene } = useGLTF(url);

  /**
   * The two cafe door leaves, which are the only moving parts of the room.
   *
   * Found by name because they are nodes inside a single glb, not separate
   * assets. Their node translations sit on the hinge jambs (x = ∓1.27), so a
   * plain Y rotation swings them correctly with no pivot correction.
   */
  const leaves = useMemo(() => {
    const left = scene.getObjectByName('Gate_Leaf_L') ?? null;
    const right = scene.getObjectByName('Gate_Leaf_R') ?? null;
    return { left, right };
  }, [scene]);

  useEffect(() => {
    scene.traverse((child) => {
      if (child instanceof Mesh) {
        // The room is static: it receives shadows but never casts them, which
        // keeps it out of the shadow pass entirely.
        child.castShadow = false;
        child.receiveShadow = true;
        child.matrixAutoUpdate = false;
        child.updateMatrix();
      }
    });

    // ...except the doors. The traverse above freezes every mesh matrix, which
    // is right for a static room and would silently make the leaves unmovable —
    // rotation would be set every frame and never reach the GPU.
    for (const leaf of [leaves.left, leaves.right]) {
      if (!leaf) continue;
      leaf.matrixAutoUpdate = true;
      leaf.traverse((child) => {
        child.matrixAutoUpdate = true;
      });
    }
  }, [scene, leaves]);

  useEffect(() => {
    const angle = ((GATE.openDegrees * Math.PI) / 180) * gateProgress;
    /*
      Opposite signs because the leaves are mirrored.

      Left hinges at x = -1.27 with its slab running toward +x, right hinges at
      +1.27 running toward -x. Rotating by θ about Y sends a local +x point to
      (cos θ, -sin θ) in xz, so the left leaf needs a negative angle to swing
      into the cafe at +z, and the right leaf a positive one.
    */
    if (leaves.left) leaves.left.rotation.y = -angle;
    if (leaves.right) leaves.right.rotation.y = angle;
  }, [leaves, gateProgress]);

  return <primitive object={scene} />;
}
