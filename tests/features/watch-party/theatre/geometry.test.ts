import { Box3, type Mesh, MeshStandardMaterial, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import {
  AUDITORIUM_METRICS,
  buildAuditorium,
  buildRecliner,
  buildSeating,
  buildStarfield,
  CHAIR_BACK,
  CHAIR_FRONT,
  CHAIR_HALF_WIDTH,
  CHAIR_HEIGHT,
  CHAIR_SEAT_TOP,
  disposeBuilt,
  disposeStarfield,
  disposeTheatreMaterials,
  GeometryBatcher,
  REAR_DETAIL_FACE_Z,
  theatreMaterials,
  updateStarfield,
} from '@/features/watch-party/theatre/lib/geometry';
import {
  FLOORS,
  ROOM,
  SCREEN,
  SEAT_X,
  SEATED_AVATAR_LIFT,
  SEATS,
  SPAWN,
  STAIRS,
} from '@/features/watch-party/theatre/lib/layout';

/** World bounds of a set of built meshes. */
function bounds(meshes: readonly Mesh[]): Box3 {
  const box = new Box3();
  for (const mesh of meshes) {
    mesh.geometry.computeBoundingBox();
    const bb = mesh.geometry.boundingBox;
    if (bb) box.union(bb);
  }
  return box;
}

describe('GeometryBatcher', () => {
  it('groups by material so draw calls track materials, not objects', () => {
    const a = new MeshStandardMaterial();
    const b = new MeshStandardMaterial();
    const batcher = new GeometryBatcher();

    for (let i = 0; i < 50; i += 1) batcher.box(a, 1, 1, 1, i, 0, 0);
    for (let i = 0; i < 30; i += 1) batcher.box(b, 1, 1, 1, i, 0, 0);

    expect(batcher.pending).toBe(80);
    expect(batcher.materialCount).toBe(2);

    const meshes = batcher.build();
    // 80 primitives, 2 draw calls. This is the whole point of the class.
    expect(meshes).toHaveLength(2);

    disposeBuilt(meshes);
    a.dispose();
    b.dispose();
  });

  it('empties itself on build, so a second build does not duplicate geometry', () => {
    const mat = new MeshStandardMaterial();
    const batcher = new GeometryBatcher();
    batcher.box(mat, 1, 1, 1, 0, 0, 0);

    expect(batcher.build()).toHaveLength(1);
    expect(batcher.pending).toBe(0);
    expect(batcher.build()).toHaveLength(0);

    mat.dispose();
  });

  it('bakes the transform into the vertices rather than the mesh matrix', () => {
    const mat = new MeshStandardMaterial();
    const batcher = new GeometryBatcher();
    batcher.box(mat, 2, 2, 2, 10, 5, -3);
    const [mesh] = batcher.build();

    // The mesh sits at the origin; the offset lives in the buffer.
    expect(mesh.position.toArray()).toEqual([0, 0, 0]);
    mesh.geometry.computeBoundingBox();
    const centre = new Vector3();
    mesh.geometry.boundingBox?.getCenter(centre);
    expect(centre.x).toBeCloseTo(10, 5);
    expect(centre.y).toBeCloseTo(5, 5);
    expect(centre.z).toBeCloseTo(-3, 5);

    disposeBuilt([mesh]);
    mat.dispose();
  });

  it('freezes matrices and stays out of the shadow pass entirely', () => {
    const mat = new MeshStandardMaterial();
    const batcher = new GeometryBatcher();
    batcher.box(mat, 1, 1, 1, 0, 0, 0);
    const [mesh] = batcher.build();

    expect(mesh.matrixAutoUpdate).toBe(false);
    expect(mesh.castShadow).toBe(false);
    /*
      Was `true`. The room received shadows from the single directional key light,
      which no longer casts — a 1024x1024 depth pass over the whole room every frame
      bought contact shadows under the avatars and nothing else. With nothing
      casting, `receiveShadow` is a shader branch that can never produce anything.
    */
    expect(mesh.receiveShadow).toBe(false);

    disposeBuilt([mesh]);
    mat.dispose();
  });

  it('orients a cylinder on each axis', () => {
    const mat = new MeshStandardMaterial();
    const axes = (['x', 'y', 'z'] as const).map((axis) => {
      const batcher = new GeometryBatcher();
      batcher.cylinder(mat, 0.1, 4, 0, 0, 0, axis, 8);
      const [mesh] = batcher.build();
      mesh.geometry.computeBoundingBox();
      const size = new Vector3();
      mesh.geometry.boundingBox?.getSize(size);
      disposeBuilt([mesh]);
      return { axis, size };
    });

    // The long dimension must follow the requested axis.
    expect(axes[0].size.x).toBeCloseTo(4, 3);
    expect(axes[1].size.y).toBeCloseTo(4, 3);
    expect(axes[2].size.z).toBeCloseTo(4, 3);

    mat.dispose();
  });
});

describe('materials', () => {
  it('shares one palette, so the chairs batch with the room', () => {
    expect(theatreMaterials()).toBe(theatreMaterials());
  });

  it('rebuilds after disposal rather than handing back dead materials', () => {
    /*
      The palette is memoised across remounts, which is what stops entering 3D
      twice from silently doubling the draw calls. Disposal has to clear that memo
      too — returning the disposed instance would blank every surface.
    */
    const before = theatreMaterials();
    disposeTheatreMaterials();
    const after = theatreMaterials();
    expect(after).not.toBe(before);
    expect(after.wall.metalness).toBeDefined();
  });

  it('keeps metalness below the point where a surface goes black', () => {
    /*
      A metallic surface has almost no diffuse response — it shows its
      surroundings instead. With a weak environment anything near 1.0 renders
      near black however many lights hit it. Blender specifies 1.0 for the brass
      nosing and 0.85 for the rail; both are held down here deliberately, and
      this is the regression guard for putting them back.
    */
    const M = theatreMaterials();
    for (const m of Object.values(M)) {
      expect(m.metalness, m.constructor.name).toBeLessThanOrEqual(0.8);
    }
  });

  it('keeps emissive trim below the level where it clips to flat white', () => {
    // Blender's emission strengths (2.5 cove, 1.35 step marker) are path-tracer
    // radiance figures. Carried over literally every strip read as cream plastic.
    const M = theatreMaterials();
    for (const m of [M.ledWarm, M.glowStep, M.glowCove, M.glowSconce]) {
      expect(m.emissiveIntensity).toBeLessThanOrEqual(1.2);
      expect(m.emissiveIntensity).toBeGreaterThan(0);
    }
  });
});

describe('auditorium geometry', () => {
  it('draws the whole room in far fewer calls than the glb blockout', () => {
    const meshes = buildAuditorium();
    /*
      22 as built. The Blender blockout this replaces measured 307 draw calls
      across 19 materials — its coffered ceiling alone was 229 objects sharing 4
      materials. Batching bounds the count by materials instead of objects, so
      adding detail is close to free.

      The ceiling is the headroom here, not the limit: the scene budget in
      THEATRE_3D.md §8 is under 80 draw calls for everything, including the
      chairs, the avatars and the screen.
    */
    expect(meshes.length).toBeLessThanOrEqual(24);
    expect(meshes.length).toBeGreaterThan(5);
    disposeBuilt(meshes);
  });

  it('stays inside the room shell from layout.ts', () => {
    const meshes = buildAuditorium();
    const box = bounds(meshes);

    // Walls sit ON the boundary and have thickness, so allow half of one.
    expect(box.min.x).toBeGreaterThanOrEqual(ROOM.minX - 0.1);
    expect(box.max.x).toBeLessThanOrEqual(ROOM.maxX + 0.1);
    expect(box.min.z).toBeGreaterThanOrEqual(-0.1);
    expect(box.max.z).toBeLessThanOrEqual(ROOM.maxZ + 0.1);
    // Nothing above the tray, and the floor slab reaches 0.30 below datum.
    expect(box.max.y).toBeLessThanOrEqual(AUDITORIUM_METRICS.trayY + 0.35);
    expect(box.min.y).toBeGreaterThanOrEqual(-0.35);

    disposeBuilt(meshes);
  });

  it('leaves the screen aperture clear for the video plane', () => {
    /*
      The masking surround is built as four pieces around the picture. If any of
      them crossed the aperture the video would be occluded, which is the one
      thing this geometry must never do.
    */
    const meshes = buildAuditorium();
    const M = theatreMaterials();
    const masking = meshes.find((m) => m.material === M.dark);
    expect(masking).toBeDefined();
    if (!masking) return;

    const pos = masking.geometry.getAttribute('position');
    let inside = 0;
    for (let i = 0; i < pos.count; i += 1) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      const z = pos.getZ(i);
      // Strictly inside the aperture, and in front of the wall plane.
      if (
        Math.abs(x) < SCREEN.maxX - 0.01 &&
        y > SCREEN.bottomY + 0.01 &&
        y < SCREEN.topY - 0.01 &&
        z < SCREEN.z
      ) {
        inside += 1;
      }
    }
    expect(inside).toBe(0);

    disposeBuilt(meshes);
  });

  it('keeps the speaker towers clear of the screen and the skirting', () => {
    /*
      The cabinet has to fit a slot: the screen ends at 3.50 and the wall plinth
      mouldings stand proud of the 3.94 wall face to 3.84. An earlier build was
      centred at 3.62 and 0.40 wide, so it cut 0.08 across the picture AND buried
      itself 0.10 into the skirting.
    */
    const inner =
      AUDITORIUM_METRICS.speakerX - AUDITORIUM_METRICS.speakerWidth / 2;
    const outer =
      AUDITORIUM_METRICS.speakerX + AUDITORIUM_METRICS.speakerWidth / 2;
    const skirtingFace = AUDITORIUM_METRICS.wallFace - 0.1;

    expect(inner).toBeGreaterThan(SCREEN.maxX);
    expect(outer).toBeLessThanOrEqual(skirtingFace + 1e-6);
    expect(outer).toBeLessThan(ROOM.maxX);
  });

  it('puts the rear wall detail in front of the wall and clear of the walk limit', () => {
    // Battens and the niche stand off the inner face; nothing may poke into the
    // wall itself or out past where the player can stand.
    expect(AUDITORIUM_METRICS.rearFace).toBeLessThan(ROOM.maxZ);
    expect(AUDITORIUM_METRICS.battenTop).toBeLessThan(ROOM.ceilingY);
  });

  it('stops the player before the rear wall detail, not at the wall plane', () => {
    /*
      The handrail is the frontmost thing on that wall — 0.16 deep, centred 0.08
      off the 8.38 face, so its face is at 8.22, a quarter of a metre proud of the
      wall. `TheatreColliders` uses REAR_DETAIL_FACE_Z for exactly this reason: a
      collider on the wall plane let you walk through the rail and the battens.

      This scans the built room for the true frontmost vertex behind the rear
      platform, so the constant cannot drift away from the geometry it guards.
    */
    const meshes = buildAuditorium();
    let frontmost = Number.POSITIVE_INFINITY;

    for (const mesh of meshes) {
      const pos = mesh.geometry.getAttribute('position');
      for (let i = 0; i < pos.count; i += 1) {
        const z = pos.getZ(i);
        const y = pos.getY(i);
        // Rear-wall detail only. The y floor is 0.1 above the deck, not level
        // with it: the carpet inlay tape sits at 0.454 and its far edge reaches
        // z 7.925, which is floor trim rather than anything on the wall.
        if (
          z > ROOM.maxZ - 0.6 &&
          y > FLOORS.rearPlatform.y + 0.1 &&
          Math.abs(pos.getX(i)) < ROOM.maxX - 0.2
        ) {
          frontmost = Math.min(frontmost, z);
        }
      }
    }

    expect(frontmost).toBeLessThan(ROOM.maxZ);
    expect(REAR_DETAIL_FACE_Z).toBeLessThanOrEqual(frontmost + 1e-6);

    // And the spawn point plus a body radius must still fit in front of it.
    expect(SPAWN.z + 0.35).toBeLessThan(REAR_DETAIL_FACE_Z);

    disposeBuilt(meshes);
  });

  it('stands wall detail on the floor beneath it, not on datum', () => {
    /*
      The room has two levels and the wall detail crosses the step. Pilasters at
      z 5.5 and 7.4 and the framed panel at 6.45 stand on the rear platform. An
      earlier build based all of them on datum, which buried their feet 0.45 under
      the deck and dropped the panel's lower rail to 0.73 above it instead of 1.18.

      Nothing below a platform-side floor level may carry wall geometry, so this
      samples the built room in the band under the platform surface and behind the
      step, and expects only the floor slab itself there.
    */
    const meshes = buildAuditorium();
    const M = theatreMaterials();

    const detail = meshes.filter(
      (m) => m.material === M.pilaster || m.material === M.moulding,
    );
    expect(detail.length).toBeGreaterThan(0);

    for (const mesh of detail) {
      const pos = mesh.geometry.getAttribute('position');
      let buried = 0;
      for (let i = 0; i < pos.count; i += 1) {
        const y = pos.getY(i);
        const z = pos.getZ(i);
        // Behind the step, and below the platform surface it should sit on.
        if (
          z > FLOORS.rearPlatform.minZ + 0.2 &&
          y < FLOORS.rearPlatform.y - 0.01
        ) {
          buried += 1;
        }
      }
      expect(buried, 'wall detail below the rear platform').toBe(0);
    }

    disposeBuilt(meshes);
  });
});

describe('recliner geometry', () => {
  it('matches the Blender chair envelope', () => {
    /*
      Blender's Chair_A3 measures 0.719 wide, 0.810 deep and 1.095 tall. The
      chair this replaced stood about 1.48 tall, which is why the rows read as a
      wall of blocks.
    */
    const batcher = new GeometryBatcher();
    buildRecliner(batcher, 0, 0, 0);
    const meshes = batcher.build();
    const box = bounds(meshes);

    expect(box.max.x - box.min.x).toBeCloseTo(0.719, 1);
    expect(CHAIR_HALF_WIDTH * 2).toBeCloseTo(0.718, 3);
    expect(box.max.y).toBeCloseTo(1.095, 1);
    expect(box.max.y).toBeCloseTo(CHAIR_HEIGHT, 2);
    expect(box.min.y).toBeGreaterThanOrEqual(-0.001);
    expect(box.min.z).toBeCloseTo(CHAIR_FRONT, 2);
    expect(box.max.z).toBeCloseTo(CHAIR_BACK, 1);
    expect(CHAIR_BACK - CHAIR_FRONT).toBeCloseTo(0.81, 3);

    disposeBuilt(meshes);
  });

  it('reclines backwards, not forwards', () => {
    /*
      The tilt sign was wrong in an earlier build: `place` derives z from
      ly * sin(tilt), so a negative tilt moved every higher piece toward -Z and
      the backrest leaned FORWARD over the occupant. The headrest must sit behind
      the seat cushion centre.
    */
    const batcher = new GeometryBatcher();
    buildRecliner(batcher, 0, 0, 0);
    const meshes = batcher.build();
    const M = theatreMaterials();

    const back = meshes.find((m) => m.material === M.seatBack);
    const cushion = meshes.find((m) => m.material === M.seatCushion);
    expect(back).toBeDefined();
    expect(cushion).toBeDefined();
    if (!back || !cushion) return;

    back.geometry.computeBoundingBox();
    cushion.geometry.computeBoundingBox();
    const backCentre = new Vector3();
    const cushionCentre = new Vector3();
    back.geometry.boundingBox?.getCenter(backCentre);
    cushion.geometry.boundingBox?.getCenter(cushionCentre);

    expect(backCentre.z).toBeGreaterThan(cushionCentre.z);

    disposeBuilt(meshes);
  });

  it('keeps the cup-holder inside the armrest it is sunk into', () => {
    // A first pass put a 0.042 ring on a 0.294 centre, which overhung the
    // armrest's 0.359 outer edge.
    const padCentre = 0.294;
    const padHalfWidth = 0.065;
    const cupRadius = 0.042;
    expect(cupRadius).toBeLessThanOrEqual(padHalfWidth);
    expect(padCentre + padHalfWidth).toBeCloseTo(CHAIR_HALF_WIDTH, 3);
  });

  it('matches the seated avatar lift to the cushion top', () => {
    // If these drift the avatars float above the cushion or sink into it.
    expect(CHAIR_SEAT_TOP).toBeCloseTo(0.42, 3);
    expect(SEATED_AVATAR_LIFT).toBeLessThan(CHAIR_SEAT_TOP);
  });

  it('builds all eight seats into one batch, not one mesh per seat', () => {
    const one = new GeometryBatcher();
    buildRecliner(one, 0, 0, 0);
    const single = one.build();

    const all = buildSeating();
    // Eight chairs, same material count — that is 8x fewer draw calls than
    // instancing a mesh per seat would cost.
    expect(all.length).toBe(single.length);

    disposeBuilt(single);
    disposeBuilt(all);
  });

  it('places a chair on every seat from layout.ts', () => {
    const meshes = buildSeating();
    const box = bounds(meshes);

    const leftmost = Math.min(...SEAT_X) - CHAIR_HALF_WIDTH;
    const rightmost = Math.max(...SEAT_X) + CHAIR_HALF_WIDTH;
    expect(box.min.x).toBeCloseTo(leftmost, 2);
    expect(box.max.x).toBeCloseTo(rightmost, 2);

    // Row A on the flat floor, row B up on the platform.
    expect(box.min.z).toBeCloseTo(SEATS[0].position.z + CHAIR_FRONT, 2);
    expect(box.max.y).toBeCloseTo(FLOORS.rearPlatform.y + CHAIR_HEIGHT, 1);

    disposeBuilt(meshes);
  });

  it('leaves a walkable gap between neighbouring chairs', () => {
    const pitch = SEAT_X[1] - SEAT_X[0];
    expect(pitch - CHAIR_HALF_WIDTH * 2).toBeGreaterThan(0.4);
  });

  it('keeps the outer chairs clear of the stair runs', () => {
    const outerEdge = Math.max(...SEAT_X) + CHAIR_HALF_WIDTH;
    expect(outerEdge).toBeLessThan(STAIRS.innerX);
  });
});

describe('starfield', () => {
  it('builds three instanced tiers rather than 630 meshes', () => {
    const tiers = buildStarfield();
    expect(tiers).toHaveLength(3);
    const total = tiers.reduce((n, t) => n + t.mesh.count, 0);
    expect(total).toBe(630);
    disposeStarfield(tiers);
  });

  it('is deterministic, so the sky does not reshuffle on refresh', () => {
    const a = buildStarfield();
    const b = buildStarfield();
    expect(Array.from(a[0].mesh.instanceMatrix.array)).toEqual(
      Array.from(b[0].mesh.instanceMatrix.array),
    );
    disposeStarfield(a);
    disposeStarfield(b);
  });

  it('twinkles by scaling what each star adds, never below zero', () => {
    const tiers = buildStarfield();
    for (const t of [0, 0.7, 1.9, 4.4]) {
      updateStarfield(tiers, t);
      for (const tier of tiers) {
        expect(tier.material.color.r).toBeGreaterThan(0);
        expect(tier.material.color.r).toBeLessThanOrEqual(tier.level);
      }
    }
    disposeStarfield(tiers);
  });
});
