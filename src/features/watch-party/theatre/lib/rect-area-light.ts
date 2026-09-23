/**
 * One-time setup for `RectAreaLight`.
 *
 * three.js ships RectAreaLight support out of the shader by default: the light
 * is evaluated with linearly-transformed cosine tables that live in two lookup
 * textures, and those textures are NOT loaded unless you ask for them. Until
 * `RectAreaLightUniformsLib.init()` has run, a `<rectAreaLight>` is a valid
 * object in the graph, reports its intensity, casts no error — and contributes
 * exactly zero light.
 *
 * That failure mode is silent and it cost us a black auditorium: `TheatreScreen`
 * lights the room from the picture, so with the LTC tables missing the only
 * remaining light was a 0.08 ambient and the entire theatre rendered nearly
 * black while looking correct in Blender.
 *
 * Must run before the first render that contains a RectAreaLight, because the
 * uniforms are read when the material's program is compiled. Calling it more
 * than once is harmless but pointless, so the work is latched.
 */
import { RectAreaLightUniformsLib } from 'three/examples/jsm/lights/RectAreaLightUniformsLib.js';

let initialised = false;

/** Load the LTC lookup tables RectAreaLight needs. Idempotent. */
export function ensureRectAreaLights(): void {
  if (initialised) return;
  initialised = true;
  RectAreaLightUniformsLib.init();
}
