import {
  AdditiveBlending,
  InstancedMesh,
  MeshBasicMaterial,
  Object3D,
  Shape,
  ShapeGeometry,
} from 'three';
import { ROOM } from '../layout';

/**
 * Starlight ceiling, as three InstancedMeshes.
 *
 * Instanced rather than batched: the three tiers twinkle at different rates, so
 * each needs its own material to animate, and 630 stars as individual meshes would
 * cost more draw calls than the rest of the room put together.
 */

/** Tray inset and height, mirroring `auditorium.ts`. */
const TRAY_Y = ROOM.ceilingY + 0.3;
const TRAY_INSET_X = 1.05;
const TRAY_INSET_Z = 1.05;

/**
 * Small on purpose: past about 0.045 a star stops being a point of light and reads
 * as a visible hexagon, which is what made the first pass look like confetti.
 */
const TIERS = [
  { id: 'A', n: 90, r: [0.026, 0.036], level: 1.0, speed: 0.55, phase: 0.0 },
  { id: 'B', n: 200, r: [0.017, 0.023], level: 0.62, speed: 0.85, phase: 2.1 },
  { id: 'C', n: 340, r: [0.01, 0.015], level: 0.34, speed: 1.25, phase: 4.2 },
] as const;

function hexGeometry(): ShapeGeometry {
  const shape = new Shape();
  for (let i = 0; i < 6; i += 1) {
    const a = (Math.PI / 3) * i - Math.PI / 6;
    const x = Math.cos(a);
    const y = Math.sin(a);
    if (i === 0) shape.moveTo(x, y);
    else shape.lineTo(x, y);
  }
  shape.closePath();
  return new ShapeGeometry(shape);
}

/** One tier's animation parameters, read by the render loop. */
export interface StarTier {
  mesh: InstancedMesh;
  material: MeshBasicMaterial;
  level: number;
  speed: number;
  phase: number;
}

/**
 * Build the starfield.
 *
 * Positions are seeded, not `Math.random`: a sky that reshuffles on every refresh
 * looks like a bug even when the scatter is correct.
 */
export function buildStarfield(): StarTier[] {
  let seed = 7311;
  const srand = () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };

  const trayHalfW = ROOM.width / 2 - TRAY_INSET_X;
  const sx = trayHalfW - 0.12;
  const sz0 = TRAY_INSET_Z + 0.12;
  const sz1 = ROOM.maxZ - TRAY_INSET_Z - 0.12;

  const tiers: StarTier[] = [];
  const dummy = new Object3D();

  for (const t of TIERS) {
    const material = new MeshBasicMaterial({
      color: 0xffffff,
      blending: AdditiveBlending,
      transparent: true,
      depthWrite: false,
      toneMapped: false,
    });
    const mesh = new InstancedMesh(hexGeometry(), material, t.n);
    mesh.name = `Stars_${t.id}`;
    mesh.frustumCulled = false;
    mesh.matrixAutoUpdate = false;

    for (let i = 0; i < t.n; i += 1) {
      let x = -sx + srand() * sx * 2;
      let z = sz0 + srand() * (sz1 - sz0);
      // One in six joins a tight cluster on the previous point, which breaks up
      // the even scatter a plain uniform draw gives.
      if (i > 0 && srand() < 0.17) {
        x = Math.max(-sx, Math.min(sx, x + (srand() - 0.5) * 0.55));
        z = Math.max(sz0, Math.min(sz1, z + (srand() - 0.5) * 0.55));
      }
      dummy.position.set(x, TRAY_Y - 0.004, z);
      /*
        +PI/2, not -PI/2.

        ShapeGeometry lies in XY with its normal at +Z; rotating -PI/2 about X sends
        that normal to +Y, straight up into the panel, and MeshBasicMaterial is
        FrontSide by default — so every star was backface-culled. That is why an
        earlier build had a starfield in the scene graph and an empty ceiling on
        screen. This faces them down at the audience.
      */
      dummy.rotation.set(Math.PI / 2, 0, srand() * Math.PI * 2);
      dummy.scale.setScalar(t.r[0] + srand() * (t.r[1] - t.r[0]));
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;

    tiers.push({
      mesh,
      material,
      level: t.level,
      speed: t.speed,
      phase: t.phase,
    });
  }

  return tiers;
}

/**
 * Advance the twinkle.
 *
 * The material is additive, so this scales the light each star ADDS — a dim star
 * contributes less rather than turning grey.
 */
export function updateStarfield(
  tiers: readonly StarTier[],
  time: number,
): void {
  for (const tier of tiers) {
    const v =
      tier.level *
      (0.68 + 0.32 * (0.5 + 0.5 * Math.sin(time * tier.speed + tier.phase)));
    tier.material.color.setRGB(v, v * 0.985, v * 0.94);
  }
}

export function disposeStarfield(tiers: readonly StarTier[]): void {
  for (const tier of tiers) {
    tier.mesh.geometry.dispose();
    tier.material.dispose();
    tier.mesh.dispose();
  }
}
