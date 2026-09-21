'use client';

import { useGLTF } from '@react-three/drei';
import { useEffect } from 'react';
import { Mesh } from 'three';

interface TheatreRoomProps {
  /** room.glb url from the backend manifest */
  url: string;
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
export function TheatreRoom({ url }: TheatreRoomProps) {
  const { scene } = useGLTF(url);

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
  }, [scene]);

  return <primitive object={scene} />;
}
