'use client';

import type React from 'react';
import { useCallback, useRef, useState } from 'react';

/** Options for {@link useDragSeek}. */
interface UseDragSeekOptions {
  /**
   * Converts a 0–1 fraction of the bar's width into the time to seek to.
   *
   * Kept as a callback rather than taking a duration so the DVR window, whose bounds
   * move as segments land, can map the same gesture against live `seekable`.
   */
  getTimeFromFraction: (fraction: number) => number;
  /** Commits the seek. Called at most once per gesture. */
  onSeek: (time: number) => void;
  /** When true, the bar reports position but never seeks. */
  disabled?: boolean;
}

/**
 * The shared drag gesture behind every seek bar: preview while dragging, commit once on
 * release.
 *
 * Both scrub bars previously committed a real seek on every move event — `mousemove` on
 * desktop, `touchmove` on mobile — which is 60–120+ `currentTime` writes per second of
 * drag. Each write emits `seeking`, which makes hls.js abort the fragments in flight and,
 * on open-GOP content, re-prime the buffer; a burst exhausts `fragLoadingMaxRetry` and
 * escalates to a fatal decode error. Every seek but the last was wasted work, because the
 * browser coalesces intermediate `seeked` events anyway.
 *
 * So movement updates a local fraction used purely for rendering, and exactly one seek is
 * issued on `pointerup`.
 *
 * Pointer Events rather than mouse + touch pairs: one code path covers mouse, touch and
 * pen, which is what removes the duplicated implementations. `setPointerCapture` routes
 * every subsequent move to the bar even once the pointer leaves it, so a drag no longer
 * dies when the cursor strays above the bar — previously `mouseleave` also killed the
 * preview mid-gesture.
 *
 * A tap needs no special handling: `pointerdown` followed by `pointerup` at the same place
 * commits that position, which is why the trailing `onClick` seek both bars carried could
 * be dropped. It only ever added a redundant second seek at the end of a drag.
 *
 * @returns The bar ref, the drag/hover fractions to render from, and pointer handlers to
 *   spread onto the bar element. Set `touch-action: none` on that element, or the browser
 *   will scroll the page instead of reporting the drag.
 */
export function useDragSeek({
  getTimeFromFraction,
  onSeek,
  disabled = false,
}: UseDragSeekOptions) {
  const barRef = useRef<HTMLDivElement>(null);
  /** Non-null only while a drag is in progress. Renders the preview position. */
  const [dragFraction, setDragFraction] = useState<number | null>(null);
  /** Non-null while a mouse hovers the bar, for the thumbnail preview. */
  const [hoverFraction, setHoverFraction] = useState<number | null>(null);
  /** Id of the captured pointer, so a second finger cannot hijack the gesture. */
  const activePointerRef = useRef<number | null>(null);

  const fractionFromClientX = useCallback((clientX: number) => {
    const bar = barRef.current;
    if (!bar) return 0;
    const rect = bar.getBoundingClientRect();
    if (rect.width === 0) return 0;
    return Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
  }, []);

  const onPointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      // Primary button only: a right-click should not scrub.
      if (disabled || (e.pointerType === 'mouse' && e.button !== 0)) return;
      // Ignore additional contacts once a drag owns the bar.
      if (activePointerRef.current !== null) return;

      activePointerRef.current = e.pointerId;
      // Capture so moves keep arriving after the pointer leaves the bar.
      e.currentTarget.setPointerCapture?.(e.pointerId);
      setDragFraction(fractionFromClientX(e.clientX));
    },
    [disabled, fractionFromClientX],
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      const fraction = fractionFromClientX(e.clientX);
      // Hover preview is a mouse affordance; on touch the finger covers the thumbnail.
      if (e.pointerType === 'mouse') setHoverFraction(fraction);
      if (activePointerRef.current !== e.pointerId) return;
      // Preview only. The seek happens on release.
      setDragFraction(fraction);
    },
    [fractionFromClientX],
  );

  const onPointerUp = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (activePointerRef.current !== e.pointerId) return;
      activePointerRef.current = null;
      e.currentTarget.releasePointerCapture?.(e.pointerId);
      setDragFraction(null);
      if (disabled) return;
      // The one and only seek for this gesture.
      onSeek(getTimeFromFraction(fractionFromClientX(e.clientX)));
    },
    [disabled, onSeek, getTimeFromFraction, fractionFromClientX],
  );

  /**
   * A cancelled pointer (the OS taking over for a system gesture, or the element being
   * removed) must abandon the gesture rather than commit it — the user did not choose the
   * position it happened to stop at.
   */
  const onPointerCancel = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (activePointerRef.current !== e.pointerId) return;
      activePointerRef.current = null;
      e.currentTarget.releasePointerCapture?.(e.pointerId);
      setDragFraction(null);
    },
    [],
  );

  /** Hides the thumbnail when the mouse leaves, but never interrupts a drag. */
  const onPointerLeave = useCallback(() => {
    if (activePointerRef.current !== null) return;
    setHoverFraction(null);
  }, []);

  return {
    barRef,
    isDragging: dragFraction !== null,
    dragFraction,
    hoverFraction,
    /** Spread onto the bar element. Needs `touch-action: none` alongside. */
    pointerHandlers: {
      onPointerDown,
      onPointerMove,
      onPointerUp,
      onPointerCancel,
      onPointerLeave,
    },
  };
}
