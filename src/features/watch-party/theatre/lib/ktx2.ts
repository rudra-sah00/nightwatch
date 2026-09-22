'use client';

import type { WebGLRenderer } from 'three';
import type { GLTFLoader } from 'three-stdlib';
import { KTX2Loader } from 'three-stdlib';

/**
 * KTX2 / Basis Universal support for the theatre assets.
 *
 * WHY THIS EXISTS
 *
 * The `v3` asset set ships its textures as KTX2 (`KHR_texture_basisu`) instead of
 * JPEG and PNG. `GLTFLoader` cannot read that extension on its own — it throws
 * when it meets a `KHR_texture_basisu` image and no KTX2 loader has been attached
 * — so every consumer of a theatre model has to go through `useTheatreGltf`.
 *
 * WHY IT IS WORTH THE PLUMBING
 *
 * JPEG and PNG are decompressed to raw RGBA on the GPU, so their file size says
 * nothing about what they cost once resident. Measured on the published `v2` set:
 * 425 MB of texture memory for a scene with ~12,000 triangles, including a single
 * character carrying two 4096² maps for 179 MB by itself. KTX2 stays compressed in
 * VRAM — UASTC at 1 byte per pixel against RGBA8's 4, ETC1S at half that — which
 * took the same scene to 53 MB, an 8x reduction, with the resolutions unchanged
 * except for two assets that were plainly oversized.
 *
 * TRANSCODER
 *
 * The Basis transcoder is a wasm module that cannot be bundled: `KTX2Loader`
 * fetches it by URL at runtime. `public/basis/` holds the copy that ships with
 * three, so the version can never drift from the loader that reads it.
 */

/** Where the wasm transcoder is served from. Must end in a slash. */
const TRANSCODER_PATH = '/basis/';

let loader: KTX2Loader | null = null;
let supportDetected = false;

/**
 * The single shared loader.
 *
 * One instance for the whole scene: it owns a worker pool and a wasm module, and
 * creating one per model would pay for both several times over.
 */
function ktx2Loader(): KTX2Loader {
  if (!loader) {
    loader = new KTX2Loader().setTranscoderPath(TRANSCODER_PATH);
  }
  return loader;
}

/**
 * Tell the loader which compressed formats this GPU accepts.
 *
 * Mandatory, not an optimisation: without it `KTX2Loader` throws
 * "Missing initialization with detectSupport" on the first transcode. It needs a
 * live renderer, which only exists inside the Canvas — which is why this is
 * called from `useTheatreGltf` rather than at module scope.
 *
 * Idempotent, so every model can call it.
 */
export function detectKtx2Support(gl: WebGLRenderer): void {
  if (supportDetected) return;
  ktx2Loader().detectSupport(gl);
  supportDetected = true;
}

/**
 * Whether a renderer has been seen yet.
 *
 * `useTheatrePreload` runs before the Canvas exists, so it cannot warm drei's
 * cache on the very first entry — parsing a KTX2 model without
 * {@link detectKtx2Support} would reject, and drei caches the rejection.
 */
export function isKtx2Ready(): boolean {
  return supportDetected;
}

/** Attach the shared loader. Passed to drei's `useGLTF` as `extendLoader`. */
export function attachKtx2(gltfLoader: GLTFLoader): void {
  gltfLoader.setKTX2Loader(ktx2Loader());
}
