import type { Material } from 'three';
import {
  BoxGeometry,
  type BufferGeometry,
  CylinderGeometry,
  Euler,
  Matrix4,
  Mesh,
  Quaternion,
  Vector3,
} from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

/** Optional Euler rotation, radians, applied before translation. */
export type Rotation = readonly [number, number, number];

/** Axis a cylinder runs along. */
export type CylinderAxis = 'x' | 'y' | 'z';

/**
 * Batches primitives per material and merges each group into a single mesh.
 *
 * The auditorium is roughly 700 boxes. One mesh each cost 307 draw calls across
 * only 19 materials — a measured figure from the Blender blockout this replaces —
 * to draw something static that shares a dozen surfaces. Baking each primitive's
 * transform into its vertices and filing it under its material means draw calls
 * are bounded by the number of MATERIALS, not the number of objects, which is
 * what keeps the room cheap as detail is added.
 *
 * The tradeoff: a batched primitive is no longer its own object, so anything that
 * must move, animate or be found by name has to be built outside a batch and pay
 * its own call. In this scene that is the screen and the instanced starfield.
 *
 * Geometry is generated, so nothing here is disposed by drei's GLTF cache the way
 * a loaded model would be. `disposeBuilt` is the counterpart every caller must
 * run on unmount, or re-entering 3D leaks a room's worth of buffers per visit.
 */
export class GeometryBatcher {
  private readonly batches = new Map<Material, BufferGeometry[]>();

  // Scratch objects, reused across every call. A room build runs this thousands
  // of times and each allocation would be garbage a microsecond later.
  private readonly matrix = new Matrix4();
  private readonly euler = new Euler();
  private readonly quaternion = new Quaternion();
  private readonly position = new Vector3();
  private readonly unitScale = new Vector3(1, 1, 1);

  /** Place a box, sized w x h x d, centred on (x, y, z). */
  box(
    material: Material,
    w: number,
    h: number,
    d: number,
    x: number,
    y: number,
    z: number,
    rotation?: Rotation,
  ): void {
    this.push(material, new BoxGeometry(w, h, d), x, y, z, rotation);
  }

  /**
   * Place a cylinder of `length` along `axis`, centred on (x, y, z).
   *
   * Everything else in this room is a box, and boxes were enough until the
   * speakers and the chairs: a square woofer reads as a vent, and a cushion with
   * a sharp square edge reads as a crate however it is shaded. Round geometry
   * earns its vertices on cones, cushion rolls and bolsters, so this is the only
   * other primitive. 20 segments is about 76 triangles.
   *
   * `CylinderGeometry` runs along Y, so 'z' and 'x' tip it a quarter turn.
   */
  cylinder(
    material: Material,
    radius: number,
    length: number,
    x: number,
    y: number,
    z: number,
    axis: CylinderAxis = 'z',
    segments = 20,
  ): void {
    const geometry = new CylinderGeometry(radius, radius, length, segments);
    const rotation: Rotation =
      axis === 'z'
        ? [Math.PI / 2, 0, 0]
        : axis === 'x'
          ? [0, 0, Math.PI / 2]
          : [0, 0, 0];
    this.push(material, geometry, x, y, z, rotation);
  }

  private push(
    material: Material,
    geometry: BufferGeometry,
    x: number,
    y: number,
    z: number,
    rotation?: Rotation,
  ): void {
    if (rotation) {
      this.euler.set(rotation[0] || 0, rotation[1] || 0, rotation[2] || 0);
      this.quaternion.setFromEuler(this.euler);
      this.matrix.compose(
        this.position.set(x, y, z),
        this.quaternion,
        this.unitScale,
      );
    } else {
      this.matrix.makeTranslation(x, y, z);
    }
    geometry.applyMatrix4(this.matrix);

    const list = this.batches.get(material);
    if (list) list.push(geometry);
    else this.batches.set(material, [geometry]);
  }

  /** How many primitives are waiting, for tests and diagnostics. */
  get pending(): number {
    let total = 0;
    for (const list of this.batches.values()) total += list.length;
    return total;
  }

  /** Materials this batcher has collected geometry for. */
  get materialCount(): number {
    return this.batches.size;
  }

  /**
   * Merge each material group into one mesh and empty the batcher.
   *
   * Matrices are frozen: this geometry never moves, so leaving
   * `matrixAutoUpdate` on would recompute a world matrix per mesh per frame for
   * nothing. The room receives shadows but never casts them, which keeps it out
   * of the shadow pass entirely.
   */
  build(): Mesh[] {
    const meshes: Mesh[] = [];
    for (const [material, list] of this.batches) {
      if (list.length === 0) continue;
      const geometry =
        list.length === 1 ? list[0] : mergeGeometries(list, false);
      if (!geometry) continue;
      const mesh = new Mesh(geometry, material);
      mesh.castShadow = false;
      mesh.receiveShadow = true;
      mesh.matrixAutoUpdate = false;
      mesh.updateMatrix();
      meshes.push(mesh);
      // The merged copy owns the vertex data now; the sources are garbage.
      if (list.length > 1) for (const g of list) g.dispose();
    }
    this.batches.clear();
    return meshes;
  }
}

/**
 * Release geometry produced by `build()`.
 *
 * Materials are deliberately NOT disposed here — they are shared singletons from
 * `materials.ts`, reused by the room, the chairs and every remount, so disposing
 * them would blank the scene on the second entry into 3D.
 */
export function disposeBuilt(meshes: readonly Mesh[]): void {
  for (const mesh of meshes) mesh.geometry.dispose();
}
