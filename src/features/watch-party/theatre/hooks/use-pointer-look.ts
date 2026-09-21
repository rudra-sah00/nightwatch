'use client';

import { useThree } from '@react-three/fiber';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Euler, MathUtils } from 'three';

/**
 * Pointer-locked mouse look for the walking camera.
 *
 * Without this the camera yaw never changes: `useAvatarControls` reads
 * `camera.getWorldDirection()` to make WASD camera-relative, but nothing ever
 * rotated the camera, so you could only ever walk in the one direction you
 * spawned facing.
 *
 * Pointer Lock rather than drag-to-look, because this is a first-person room you
 * stand in. Locking hides the cursor and delivers unbounded `movementX/Y`, so
 * you can spin past the edge of the window — a drag implementation stops dead at
 * the viewport boundary.
 *
 * Rotation is stored as our own yaw/pitch pair and written to the camera, never
 * accumulated from `camera.rotation`. Reading the camera back each frame lets
 * float error and any other writer (the seated camera) feed into the control
 * loop and drift.
 */

/** Radians of rotation per pixel of mouse travel. */
const SENSITIVITY = 0.0022;

/**
 * Pitch limit. Slightly under a right angle: at exactly 90° the forward vector
 * becomes parallel to world up and the yaw basis in `useAvatarControls`
 * degenerates, which makes movement direction flip unpredictably.
 */
const PITCH_LIMIT = MathUtils.degToRad(85);

interface UsePointerLookOptions {
  /** Only capture the mouse while free-walking. */
  enabled: boolean;
}

export function usePointerLook({ enabled }: UsePointerLookOptions) {
  const camera = useThree((s) => s.camera);
  const gl = useThree((s) => s.gl);

  const yaw = useRef(0);
  const pitch = useRef(0);
  const [locked, setLocked] = useState(false);

  // Seed from wherever the camera is currently aimed, so enabling look does not
  // snap the view. YXZ is the FPS order: yaw about world up, then pitch.
  const seeded = useRef(false);
  useEffect(() => {
    if (!enabled || seeded.current) return;
    seeded.current = true;
    const e = new Euler().setFromQuaternion(camera.quaternion, 'YXZ');
    yaw.current = e.y;
    pitch.current = e.x;
  }, [enabled, camera]);

  const requestLock = useCallback(() => {
    const el = gl.domElement;
    if (document.pointerLockElement === el) return;
    // Chrome rejects the promise if the document is not engaged yet; that is not
    // an error worth surfacing, the click handler will retry.
    void Promise.resolve(el.requestPointerLock()).catch(() => undefined);
  }, [gl]);

  useEffect(() => {
    if (!enabled) {
      if (document.pointerLockElement) document.exitPointerLock();
      setLocked(false);
      return;
    }

    const el = gl.domElement;
    el.style.cursor = 'none';

    function onMove(e: MouseEvent) {
      if (document.pointerLockElement !== el) return;
      yaw.current -= e.movementX * SENSITIVITY;
      pitch.current = MathUtils.clamp(
        pitch.current - e.movementY * SENSITIVITY,
        -PITCH_LIMIT,
        PITCH_LIMIT,
      );
      camera.rotation.order = 'YXZ';
      camera.rotation.set(pitch.current, yaw.current, 0);
    }

    function onLockChange() {
      setLocked(document.pointerLockElement === el);
    }

    // Auto-lock on entry. Browsers that demand a gesture will reject this and
    // the pointerdown listener below picks it up on the user's first click.
    requestLock();

    el.addEventListener('pointerdown', requestLock);
    document.addEventListener('mousemove', onMove);
    document.addEventListener('pointerlockchange', onLockChange);

    return () => {
      el.style.cursor = '';
      el.removeEventListener('pointerdown', requestLock);
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('pointerlockchange', onLockChange);
      if (document.pointerLockElement === el) document.exitPointerLock();
    };
  }, [enabled, gl, camera, requestLock]);

  return { locked, requestLock };
}
