'use client';

import { useFrame } from '@react-three/fiber';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  type AnimationAction,
  type AnimationClip,
  AnimationMixer,
  LoopOnce,
  LoopRepeat,
  type Object3D,
} from 'three';
import {
  type AvatarState,
  canTransition,
  clipNameFor,
  FADE_SECONDS,
  isOneShot,
  nextAfter,
} from '../lib/animation';
import { findClip, indexClips } from '../lib/avatar-instance';

interface UseAvatarAnimationOptions {
  /** The cloned avatar instance this mixer drives. */
  root: Object3D | null;
  /** Clips from the source glb — safe to share, actions are per-mixer. */
  clips: readonly AnimationClip[];
  /** Starting state. */
  initial?: AvatarState;
}

interface UseAvatarAnimationResult {
  state: AvatarState;
  /** Request a transition. Returns false if the move is illegal or unavailable. */
  play: (next: AvatarState, danceClip?: string) => boolean;
  /** Bypass the transition table — use for network-authoritative snaps. */
  force: (next: AvatarState, danceClip?: string) => boolean;
  /** Clip names that were requested but missing from the glb. */
  missing: readonly string[];
}

/**
 * One AnimationMixer per avatar, with crossfaded transitions.
 *
 * Mixers are intentionally not shared: each avatar advances its own clock so
 * remote players can be in different states at different phases.
 */
export function useAvatarAnimation({
  root,
  clips,
  initial = 'idle',
}: UseAvatarAnimationOptions): UseAvatarAnimationResult {
  const [state, setState] = useState<AvatarState>(initial);
  const mixerRef = useRef<AnimationMixer | null>(null);
  const currentRef = useRef<AnimationAction | null>(null);
  const stateRef = useRef<AvatarState>(initial);
  const missingRef = useRef<Set<string>>(new Set());
  const [missing, setMissing] = useState<readonly string[]>([]);

  const clipIndex = useMemo(() => indexClips(clips), [clips]);

  const mixer = useMemo(() => {
    if (!root) return null;
    return new AnimationMixer(root);
  }, [root]);

  useEffect(() => {
    mixerRef.current = mixer;
    return () => {
      mixer?.stopAllAction();
      if (root) mixer?.uncacheRoot(root);
    };
  }, [mixer, root]);

  const startClip = useCallback(
    (next: AvatarState, danceClip?: string): boolean => {
      const activeMixer = mixerRef.current;
      if (!activeMixer) return false;

      const name = clipNameFor(next, danceClip);
      if (!name) return false;

      const clip = findClip(clipIndex, name);
      if (!clip) {
        // Missing clips must not throw — the avatar is a placeholder until a
        // rigged one is chosen, so degrade to holding the current pose.
        if (!missingRef.current.has(name)) {
          missingRef.current.add(name);
          setMissing([...missingRef.current]);
        }
        return false;
      }

      const action = activeMixer.clipAction(clip);
      const fade = FADE_SECONDS[next];

      if (isOneShot(next)) {
        action.setLoop(LoopOnce, 1);
        action.clampWhenFinished = true;
      } else {
        action.setLoop(LoopRepeat, Number.POSITIVE_INFINITY);
        action.clampWhenFinished = false;
      }

      const previous = currentRef.current;
      action.reset().setEffectiveTimeScale(1).setEffectiveWeight(1);
      if (previous && previous !== action) {
        previous.fadeOut(fade);
        action.fadeIn(fade).play();
      } else {
        action.play();
      }

      currentRef.current = action;
      stateRef.current = next;
      setState(next);
      return true;
    },
    [clipIndex],
  );

  const play = useCallback(
    (next: AvatarState, danceClip?: string) => {
      if (!canTransition(stateRef.current, next)) return false;
      return startClip(next, danceClip);
    },
    [startClip],
  );

  const force = useCallback(
    (next: AvatarState, danceClip?: string) => startClip(next, danceClip),
    [startClip],
  );

  // enter the initial state once the mixer exists
  useEffect(() => {
    if (!mixer) return;
    startClip(initial);
  }, [mixer, initial, startClip]);

  // one-shot clips hand over to their follow-up state
  useEffect(() => {
    const activeMixer = mixerRef.current;
    if (!activeMixer) return;
    function onFinished() {
      const follow = nextAfter(stateRef.current);
      if (follow) startClip(follow);
    }
    activeMixer.addEventListener('finished', onFinished);
    return () => {
      activeMixer.removeEventListener('finished', onFinished);
    };
  }, [startClip]);

  useFrame((_, delta) => {
    mixerRef.current?.update(delta);
  });

  return { state, play, force, missing };
}
