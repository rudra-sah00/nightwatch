import type { AnimationClip, Object3D } from 'three';
import { Bone, Color, Mesh, MeshStandardMaterial, SkinnedMesh } from 'three';
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
      // shadows are per-instance state, not shared with the source
      child.castShadow = true;
      child.receiveShadow = false;
      // skinned bounds are wrong after cloning unless recomputed
      child.frustumCulled = false;
    }
  });
  return instance;
}

/** Fingers are invisible at conversational distance in a dim room. */
const FINGER_PATTERN = /(thumb|index|middle|ring|pinky|pinkie)/i;

/**
 * Detach finger bones to cut per-frame skinning cost.
 *
 * A Mixamo rig ships ~65 bones, well over half of them fingers. With 8+ avatars
 * on screen that is real CPU time spent on geometry nobody can resolve. Bones
 * are only detached, never deleted, so any clip that targets them simply has no
 * effect rather than throwing.
 *
 * Call this on the SOURCE model once, before instantiating, so every clone
 * inherits the reduced skeleton.
 */
export function stripFingerBones(root: Object3D): number {
  const doomed: Bone[] = [];
  root.traverse((child) => {
    if (child instanceof Bone && FINGER_PATTERN.test(child.name)) {
      doomed.push(child);
    }
  });
  let removed = 0;
  for (const bone of doomed) {
    // skip any whose parent is itself being removed; detaching the top of a
    // finger chain takes its children with it
    if (bone.parent && !doomed.includes(bone.parent as Bone)) {
      bone.parent.remove(bone);
      removed += 1;
    }
  }
  return removed;
}

export function countBones(root: Object3D): number {
  let n = 0;
  root.traverse((child) => {
    if (child instanceof Bone) n += 1;
  });
  return n;
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
