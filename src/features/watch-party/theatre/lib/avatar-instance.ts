import type { AnimationClip, Object3D } from 'three';
import { Bone, SkinnedMesh } from 'three';
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
