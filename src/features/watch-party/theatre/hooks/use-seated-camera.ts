'use client';

import { useFrame, useThree } from '@react-three/fiber';
import { useCallback, useEffect, useRef } from 'react';
import { Euler, Vector3 } from 'three';
import {
  clampToSeatView,
  getSeat,
  type Seat,
  type SeatId,
} from '../lib/layout';

/** Radians per pixel of pointer drag. */
const LOOK_SENSITIVITY = 0.0026;
/** Higher converges faster. Frame-rate independent via exponential decay. */
const SMOOTHING = 9;

interface UseSeatedCameraOptions {
  /** Seat the local player occupies, or null when standing. */
  seatId: SeatId | null;
  /** Disable while a menu or chat input has focus. */
  enabled?: boolean;
}

/**
 * Drives the camera from a seat's baked eye anchor, clamping look direction to
 * a realistic seated head cone.
 *
 * Without the clamp you can spin 360° while sitting in a chair, which reads as
 * a floating camera and destroys the sense of being a person in a room. The
 * per-seat cone comes from `layout.ts` and was validated against the real
 * screen geometry — from every seat both screen edges fall inside it, so the
 * clamp never fights the thing you are there to watch.
 */
export function useSeatedCamera({
  seatId,
  enabled = true,
}: UseSeatedCameraOptions) {
  const camera = useThree((s) => s.camera);
  const gl = useThree((s) => s.gl);

  const seatRef = useRef<Seat | null>(null);
  // target = where input wants to look; current = smoothed, what we render
  const targetYaw = useRef(0);
  const targetPitch = useRef(0);
  const currentYaw = useRef(0);
  const currentPitch = useRef(0);
  const dragging = useRef(false);

  // re-centre on the seat's neutral aim whenever the seat changes
  useEffect(() => {
    if (!seatId) {
      seatRef.current = null;
      return;
    }
    const seat = getSeat(seatId);
    seatRef.current = seat;
    targetYaw.current = seat.view.yaw;
    targetPitch.current = seat.view.pitch;
    currentYaw.current = seat.view.yaw;
    currentPitch.current = seat.view.pitch;
  }, [seatId]);

  const onPointerDown = useCallback(
    (e: PointerEvent) => {
      if (!enabled || !seatRef.current) return;
      if (e.button !== 0) return;
      dragging.current = true;
    },
    [enabled],
  );

  const onPointerUp = useCallback(() => {
    dragging.current = false;
  }, []);

  const onPointerMove = useCallback(
    (e: PointerEvent) => {
      const seat = seatRef.current;
      if (!enabled || !seat || !dragging.current) return;
      // dragging right should look right: yaw decreases as x increases
      const nextYaw = targetYaw.current - e.movementX * LOOK_SENSITIVITY;
      const nextPitch = targetPitch.current - e.movementY * LOOK_SENSITIVITY;
      const clamped = clampToSeatView(seat, nextYaw, nextPitch);
      targetYaw.current = clamped.yaw;
      targetPitch.current = clamped.pitch;
    },
    [enabled],
  );

  useEffect(() => {
    const el = gl.domElement;
    el.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointermove', onPointerMove);
    return () => {
      el.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointermove', onPointerMove);
    };
  }, [gl, onPointerDown, onPointerUp, onPointerMove]);

  const eye = useRef(new Vector3());
  const euler = useRef(new Euler(0, 0, 0, 'YXZ'));

  useFrame((_, delta) => {
    const seat = seatRef.current;
    if (!seat) return;

    // exponential smoothing, independent of frame rate
    const k = 1 - Math.exp(-SMOOTHING * delta);
    currentYaw.current += (targetYaw.current - currentYaw.current) * k;
    currentPitch.current += (targetPitch.current - currentPitch.current) * k;

    eye.current.set(seat.eye.x, seat.eye.y, seat.eye.z);
    camera.position.lerp(eye.current, k);

    // YXZ so yaw applies before pitch and the horizon never rolls
    euler.current.set(currentPitch.current, currentYaw.current, 0, 'YXZ');
    camera.quaternion.setFromEuler(euler.current);
  });

  return {
    /** Re-centre the view on the screen, e.g. bound to a key. */
    recentre: useCallback(() => {
      const seat = seatRef.current;
      if (!seat) return;
      targetYaw.current = seat.view.yaw;
      targetPitch.current = seat.view.pitch;
    }, []),
  };
}
