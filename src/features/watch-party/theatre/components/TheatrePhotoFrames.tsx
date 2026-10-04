'use client';

import { useEffect, useState } from 'react';
import { SRGBColorSpace, type Texture, TextureLoader } from 'three';
import { AUDITORIUM_METRICS, PANEL_Z } from '../lib/geometry';
import { FLOORS, ROOM } from '../lib/layout';

/**
 * TEMPORARY — personal photos hung in the six side-wall panels.
 *
 * Images live in `public/theatre-love/` (excluded from git via
 * `.git/info/exclude`, not `.gitignore`). Remove this component and its mount in
 * `TheatreRoom` to undo. Set `ENABLED` to false to switch it off without
 * deleting anything.
 */
const ENABLED = true;

/** Left wall front→back, then right wall front→back. */
const PHOTOS = [
  '/theatre-love/pc1.webp',
  '/theatre-love/pc2.webp',
  '/theatre-love/pc3.webp',
  '/theatre-love/pc4.webp',
  '/theatre-love/pc5.webp',
  '/theatre-love/pc6.webp',
] as const;

/*
  Frame opening, from the panel mouldings in `auditorium.ts`: rails at floor +1.18
  and +3.02, stiles at ±0.45, all 0.035 thick. That leaves ~0.86 × 1.80 inside —
  taller than a 3:4 photo — so a mat fills the opening and the photo is centred on
  it, uncropped.
*/
const OPEN_W = 0.86;
const OPEN_H = 1.8;
const CENTRE_ABOVE_FLOOR = 2.1;
const PHOTO_W = 0.78;
const PHOTO_H = PHOTO_W * (4 / 3);

/** Just proud of the wall, behind the moulding's 0.044 face. */
const MAT_INSET = 0.006;
const PHOTO_INSET = 0.012;

export function TheatrePhotoFrames() {
  if (!ENABLED) return null;
  return <Frames />;
}

function Frames() {
  /*
    Loaded by hand rather than with drei's `useTexture`, which suspends and then
    THROWS on a 404 — and a throw here would take down the whole theatre. The
    photos are deliberately kept out of git, so on any machine or deploy without
    them each frame simply stays as its empty mat.
  */
  const [textures, setTextures] = useState<(Texture | null)[]>(() =>
    PHOTOS.map(() => null),
  );

  useEffect(() => {
    let cancelled = false;
    const loader = new TextureLoader();
    const loaded: Texture[] = [];
    PHOTOS.forEach((url, i) => {
      loader.load(
        url,
        (t) => {
          t.colorSpace = SRGBColorSpace;
          t.anisotropy = 4;
          loaded.push(t);
          if (cancelled) {
            t.dispose();
            return;
          }
          setTextures((prev) => prev.map((p, j) => (j === i ? t : p)));
        },
        undefined,
        () => {
          // Missing photo: leave the frame empty.
        },
      );
    });
    return () => {
      cancelled = true;
      for (const t of loaded) t.dispose();
    };
  }, []);

  const slots = [-1, 1].flatMap((side) => PANEL_Z.map((z) => ({ side, z })));

  return (
    <group name="photo-frames">
      {slots.map(({ side, z }, i) => {
        const floor =
          z >= FLOORS.rearPlatform.minZ ? FLOORS.rearPlatform.y : ROOM.floorY;
        const y = floor + CENTRE_ABOVE_FLOOR;
        const wallX = side * AUDITORIUM_METRICS.wallFace;
        // PlaneGeometry faces +Z; turn it to face into the room from either wall.
        const rotY = side < 0 ? Math.PI / 2 : -Math.PI / 2;
        const photo = textures[i];
        // No photo, no change to the room — the panel stays exactly as built.
        if (!photo) return null;
        return (
          <group key={PHOTOS[i]} position={[0, y, z]}>
            <mesh
              position={[wallX - side * MAT_INSET, 0, 0]}
              rotation={[0, rotY, 0]}
            >
              <planeGeometry args={[OPEN_W, OPEN_H]} />
              <meshStandardMaterial color="#3a1420" roughness={0.9} />
            </mesh>
            <mesh
              position={[wallX - side * PHOTO_INSET, 0, 0]}
              rotation={[0, rotY, 0]}
            >
              <planeGeometry args={[PHOTO_W, PHOTO_H]} />
              {/* Unlit so the photos stay visible when the house lights dim. */}
              <meshBasicMaterial
                map={photo}
                toneMapped={false}
                color="#e6e6e6"
              />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}
