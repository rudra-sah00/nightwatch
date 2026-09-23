import type { AnimationClip, Object3D } from 'three';
import { Color, Mesh, MeshStandardMaterial, SkinnedMesh } from 'three';
import { clone as cloneSkinned } from 'three/examples/jsm/utils/SkeletonUtils.js';

/**
 * Per-avatar instancing for skinned characters.
 *
 * `Object3D.clone()` DOES NOT work for a SkinnedMesh — the copy keeps a
 * reference to the original Skeleton, so every "independent" avatar ends up
 * sharing one pose and they all animate in lockstep. This is the single most
 * common bug when putting multiple characters in a three.js scene.
 *
 * `SkeletonUtils.clone()` rebuilds the bone hierarchy and rebinds the skeleton,
 * which is what actually gives you an independently posable copy.
 */
export function instantiateAvatar(source: Object3D): Object3D {
  const instance = cloneSkinned(source);
  instance.traverse((child) => {
    if (child instanceof SkinnedMesh) {
      /*
        Neither cast nor receive. The scene has no shadow-casting light any more,
        so `castShadow` would flag the mesh for a depth pass that never runs —
        harmless but misleading, and it comes straight back to life the moment
        anyone re-enables `shadows` on the Canvas without meaning to.
      */
      child.castShadow = false;
      child.receiveShadow = false;
      // skinned bounds are wrong after cloning unless recomputed
      child.frustumCulled = false;
    }
  });
  return instance;
}

/**
 * Index clips by name for O(1) lookup by the state machine.
 * Names are normalised because exporters differ on casing and on the
 * `mixamo.com|` / `Armature|` prefixes they prepend to track names.
 */
export function indexClips(
  clips: readonly AnimationClip[],
): Map<string, AnimationClip> {
  const map = new Map<string, AnimationClip>();
  for (const clip of clips) {
    map.set(normaliseClipName(clip.name), clip);
  }
  return map;
}

export function normaliseClipName(name: string): string {
  return name.replace(/^.*\|/, '').replace(/\s+/g, '').toLowerCase();
}

/** Look up a clip tolerantly — exporters mangle names. */
export function findClip(
  index: Map<string, AnimationClip>,
  wanted: string,
): AnimationClip | null {
  return index.get(normaliseClipName(wanted)) ?? null;
}

/**
 * Per-user identity palette, mirroring the ID_* materials in the Blender file.
 * Eight hues chosen to stay distinguishable in a dim room.
 */
export const IDENTITY_COLOURS: readonly string[] = [
  '#3b82f6', // blue
  '#06b6d4', // cyan
  '#22c55e', // green
  '#f97316', // orange
  '#ec4899', // pink
  '#a855f7', // purple
  '#ef4444', // red
  '#eab308', // yellow
];

/**
 * Stable, order-independent hash of a user id.
 *
 * Every client must derive the same appearance for the same person without any
 * coordination, so anything that varies per user (colour, which character model
 * they get) has to come from the id itself rather than join order or an index
 * into a local list.
 */
export function identityHash(userId: string): number {
  let hash = 0;
  for (let i = 0; i < userId.length; i += 1) {
    hash = (hash * 31 + userId.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

/**
 * Pick one of several avatar models for a user, deterministically.
 *
 * Returns null when given no urls so callers can fall back to the manifest's
 * single `avatar`. The same person resolves to the same character on every
 * client, which is what stops an avatar changing identity as peers reconnect.
 */
export function avatarUrlFor(
  urls: readonly string[],
  userId: string,
): string | null {
  if (urls.length === 0) return null;
  return urls[identityHash(userId) % urls.length];
}

/** Stable colour for a user id — same person is the same colour for everyone. */
export function identityColour(userId: string): string {
  const index = identityHash(userId) % IDENTITY_COLOURS.length;
  return IDENTITY_COLOURS[index];
}

/**
 * Tint an avatar instance's shirt so players are telling apart at a glance.
 *
 * Materials are CLONED first. The glb's materials are shared across every
 * instance, so mutating them in place would recolour all avatars at once — the
 * same class of bug as cloning a SkinnedMesh without rebinding its skeleton.
 */
export function applyIdentityColour(root: Object3D, userId: string): void {
  const colour = new Color(identityColour(userId));
  root.traverse((child) => {
    if (!(child instanceof Mesh) && !(child instanceof SkinnedMesh)) return;
    const mats = Array.isArray(child.material)
      ? child.material
      : [child.material];
    const next = mats.map((m) => {
      if (!(m instanceof MeshStandardMaterial)) return m;
      if (m.name !== 'AVATAR_Identity') return m;
      const clone = m.clone();
      clone.color.copy(colour);
      return clone;
    });
    child.material = Array.isArray(child.material) ? next : next[0];
  });
}
