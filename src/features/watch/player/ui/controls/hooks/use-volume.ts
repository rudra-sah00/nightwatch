import type React from 'react';
import { useCallback, useRef, useState } from 'react';

/** Options for {@link useVolume}. */
interface UseVolumeOptions {
  onVolumeChange: (volume: number) => void;
}

/**
 * Manages volume slider interaction: hover expansion, tap-to-set, and drag tracking.
 *
 * Pointer Events rather than `mousedown` plus global `mousemove`/`mouseup`, which is what
 * the slider used to do. Touch never synthesises those during a drag, so on phones,
 * tablets and touchscreen laptops the slider only responded to a discrete tap — the volume
 * jumped and fine adjustment was impossible. One pointer path covers mouse, touch and pen.
 *
 * `setPointerCapture` replaces the document-level listeners: moves keep arriving while the
 * pointer is held even once it leaves the slider, so a drag that strays vertically is not
 * lost, and there is nothing global to leak if the element unmounts mid-drag.
 *
 * @returns Hover/drag state, the slider ref, and pointer handlers to spread onto it. The
 *   slider needs `touch-action: none`, or the browser scrolls instead of reporting drags.
 */
export function useVolume({ onVolumeChange }: UseVolumeOptions) {
  const [isHovered, setIsHovered] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const sliderRef = useRef<HTMLDivElement>(null);
  /** Id of the captured pointer, so a second contact cannot fight the drag. */
  const activePointerRef = useRef<number | null>(null);

  const calculateVolume = useCallback(
    (clientX: number) => {
      if (!sliderRef.current) return;
      const rect = sliderRef.current.getBoundingClientRect();
      if (rect.width === 0) return;
      const percent = (clientX - rect.left) / rect.width;
      onVolumeChange(Math.max(0, Math.min(1, percent)));
    },
    [onVolumeChange],
  );

  const onPointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      // Primary button only: a right-click should not set the volume.
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      if (activePointerRef.current !== null) return;
      e.preventDefault();
      activePointerRef.current = e.pointerId;
      e.currentTarget.setPointerCapture?.(e.pointerId);
      setIsDragging(true);
      calculateVolume(e.clientX);
    },
    [calculateVolume],
  );

  /**
   * Volume applies continuously, unlike a seek: there is no expensive commit to defer, and
   * hearing the level as you drag is the point of the control.
   */
  const onPointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (activePointerRef.current !== e.pointerId) return;
      calculateVolume(e.clientX);
    },
    [calculateVolume],
  );

  const endDrag = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (activePointerRef.current !== e.pointerId) return;
    activePointerRef.current = null;
    e.currentTarget.releasePointerCapture?.(e.pointerId);
    setIsDragging(false);
  }, []);

  return {
    isHovered,
    setIsHovered,
    isDragging,
    sliderRef,
    /** Spread onto the slider element. Needs `touch-action: none` alongside. */
    pointerHandlers: {
      onPointerDown,
      onPointerMove,
      onPointerUp: endDrag,
      onPointerCancel: endDrag,
    },
  };
}
