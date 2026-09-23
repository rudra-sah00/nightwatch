import { MeshStandardMaterial } from 'three';

/**
 * The auditorium's material palette.
 *
 * Colours are converted from the Blender scene this replaces, which stores base
 * colours LINEAR while `MeshStandardMaterial.color` is sRGB — so every value here
 * is the sRGB equivalent of Blender's, not a copy of it. Where a Blender material
 * was textured (carpet, walnut veneer, brown planks) it is represented by a flat
 * tone: this scene ships no texture files, and the whole point of generating the
 * room in code is that there is nothing to download.
 *
 * Two things in here were bugs before they were decisions.
 *
 * `metalness`: a metallic surface has almost no diffuse response — it shows its
 * surroundings instead. With a weak environment there is little to show, so
 * anything much above 0.4 renders near black however many lights hit it. Blender
 * specifies 1.0 for the brass nosing and the speaker chassis; both are held to
 * 0.70-0.75 here, because at 1.0 they read as black lips rather than brass ones.
 *
 * `emissiveIntensity`: Blender's emission strength is a radiance figure for a
 * path tracer. Carried over literally (2.5 for the cove LEDs, 1.35 for the step
 * markers) every strip clipped to flat cream plastic in this tone-mapped forward
 * renderer. The hues are kept, pushed a touch more saturated, and the levels cut
 * to where a strip still reads as a source.
 */
export interface TheatreMaterials {
  // shell
  wall: MeshStandardMaterial;
  pilaster: MeshStandardMaterial;
  moulding: MeshStandardMaterial;
  ceiling: MeshStandardMaterial;
  trayReveal: MeshStandardMaterial;
  floor: MeshStandardMaterial;
  floorInlay: MeshStandardMaterial;
  riser: MeshStandardMaterial;
  dark: MeshStandardMaterial;
  sconce: MeshStandardMaterial;
  batten: MeshStandardMaterial;
  felt: MeshStandardMaterial;
  railMetal: MeshStandardMaterial;
  nosing: MeshStandardMaterial;

  // speakers
  speaker: MeshStandardMaterial;
  speakerDark: MeshStandardMaterial;
  grille: MeshStandardMaterial;

  // seating
  seatPlinth: MeshStandardMaterial;
  seatFrame: MeshStandardMaterial;
  seatWood: MeshStandardMaterial;
  seatCushion: MeshStandardMaterial;
  seatBack: MeshStandardMaterial;
  seatWell: MeshStandardMaterial;
  seatPiping: MeshStandardMaterial;

  // emissive trim
  glowSconce: MeshStandardMaterial;
  glowCove: MeshStandardMaterial;
  glowStep: MeshStandardMaterial;
  ledWarm: MeshStandardMaterial;
  star: MeshStandardMaterial;
}

function create(): TheatreMaterials {
  return {
    wall: new MeshStandardMaterial({ color: 0x4a1218, roughness: 0.85 }),
    pilaster: new MeshStandardMaterial({ color: 0xb3ac9e, roughness: 0.45 }),
    moulding: new MeshStandardMaterial({ color: 0xc2bbae, roughness: 0.36 }),
    ceiling: new MeshStandardMaterial({ color: 0x050507, roughness: 0.94 }),
    trayReveal: new MeshStandardMaterial({ color: 0x6e6659, roughness: 0.55 }),
    floor: new MeshStandardMaterial({ color: 0xab9880, roughness: 0.92 }),
    floorInlay: new MeshStandardMaterial({ color: 0x3e3222, roughness: 0.9 }),
    riser: new MeshStandardMaterial({ color: 0x1a1412, roughness: 0.8 }),
    dark: new MeshStandardMaterial({ color: 0x0a0a0c, roughness: 0.95 }),
    sconce: new MeshStandardMaterial({
      color: 0x14100d,
      roughness: 0.42,
      metalness: 0.25,
    }),
    // Blender BW_Batten / BW_Felt, from the rear wall assembly.
    batten: new MeshStandardMaterial({ color: 0x36322f, roughness: 0.55 }),
    felt: new MeshStandardMaterial({ color: 0x272524, roughness: 0.92 }),
    // Blender BW_Metal, metalness 0.85 there. See the note above.
    railMetal: new MeshStandardMaterial({
      color: 0x5a554e,
      roughness: 0.32,
      metalness: 0.7,
    }),
    // Blender NEO_StairNosing: brass, metalness 1.0 there.
    nosing: new MeshStandardMaterial({
      color: 0xceb17c,
      roughness: 0.32,
      metalness: 0.75,
    }),

    // Blender NEO_SpeakerCab.
    speaker: new MeshStandardMaterial({ color: 0x282624, roughness: 0.38 }),
    speakerDark: new MeshStandardMaterial({
      color: 0x0e0e0e,
      roughness: 0.48,
      metalness: 0.15,
    }),
    grille: new MeshStandardMaterial({ color: 0x2a2a2a, roughness: 0.88 }),

    seatPlinth: new MeshStandardMaterial({
      color: 0x1a1512,
      roughness: 0.62,
      metalness: 0.08,
    }),
    seatFrame: new MeshStandardMaterial({
      color: 0x241e1a,
      roughness: 0.55,
      metalness: 0.12,
    }),
    // Blender CHAIR_Frame is an American walnut veneer. Visible trim only, and
    // kept dark: a lighter walnut read as pale slabs in a room this dim.
    seatWood: new MeshStandardMaterial({ color: 0x3e2b1e, roughness: 0.42 }),
    // Blender CHAIR_Upholstery / CHAIR_Headrest, red leather.
    seatCushion: new MeshStandardMaterial({ color: 0x5c2b30, roughness: 0.62 }),
    seatBack: new MeshStandardMaterial({ color: 0x4a2228, roughness: 0.66 }),
    seatWell: new MeshStandardMaterial({ color: 0x0c0a09, roughness: 0.9 }),
    seatPiping: new MeshStandardMaterial({
      color: 0x9b8763,
      roughness: 0.32,
      metalness: 0.45,
    }),

    glowSconce: new MeshStandardMaterial({
      color: 0x2a1d10,
      emissive: 0xffb469,
      emissiveIntensity: 1.15,
    }),
    glowCove: new MeshStandardMaterial({
      color: 0x241c12,
      emissive: 0xffd9a8,
      emissiveIntensity: 0.85,
    }),
    // Blender NEO_StepMarker: emission (1.00, 0.82, 0.58) at strength 1.35.
    glowStep: new MeshStandardMaterial({
      color: 0x241c12,
      emissive: 0xffc98a,
      emissiveIntensity: 0.45,
    }),
    // Blender BW_LEDWarm (1.00, 0.66, 0.32) at strength 2.5. Also stands in for
    // NEO_SpeakerLED, which is close enough that a second material — and the
    // draw call behind it — is not worth the difference.
    ledWarm: new MeshStandardMaterial({
      color: 0x1d160d,
      emissive: 0xff9a3c,
      emissiveIntensity: 0.7,
    }),
    /*
      Starfield ceiling.

      Additive and unlit, so it adds light rather than receiving it: the star
      panel is the darkest surface in the room and any diffuse response would
      grey the stars out against it.
    */
    star: new MeshStandardMaterial({
      color: 0x000000,
      emissive: 0xfff4e0,
      emissiveIntensity: 1.0,
      roughness: 1,
    }),
  };
}

let cached: TheatreMaterials | null = null;

/**
 * The shared palette.
 *
 * One instance for the whole feature, because draw calls are bounded by material
 * count (see `GeometryBatcher`): if the chairs built their own copies they would
 * not batch with the room and every seat would cost its own calls.
 *
 * Memoised across remounts rather than created per scene. Entering 3D, leaving
 * and entering again must not build a second palette — that would silently double
 * the draw calls while looking identical.
 */
export function theatreMaterials(): TheatreMaterials {
  if (!cached) cached = create();
  return cached;
}

/** Drop the palette. For tests; the app shares it for the page's lifetime. */
export function disposeTheatreMaterials(): void {
  if (!cached) return;
  for (const material of Object.values(cached)) material.dispose();
  cached = null;
}
