/**
 * Player device detection.
 *
 * Returns whether the current device is touch-primary. This drives player
 * *behaviour* — tap-to-seek zones, tap-to-toggle controls, the fullscreen
 * strategy (orientation lock vs the Fullscreen API) and the ambient canvas.
 *
 * It does **not** drive the control arrangement. That is CSS, via the
 * `touch-ui:` / `pointer-ui:` variants keyed on `data-touch-ui` on `<html>`,
 * which a blocking head script resolves before the first paint. Keeping layout
 * in CSS and behaviour in React means phones never paint the pointer
 * arrangement, and there is exactly one thing deciding the arrangement —
 * viewport width no longer gets a vote.
 *
 * @see {@link module:platforms/mobile/touch-ui-script} for the pre-paint script.
 */
export {
  /**
   * @deprecated Prefer `useIsTouchUi` from `@/platforms/mobile` — the name
   * describes what is actually detected (touch-primary input), not a screen size.
   *
   * This alias is the only thing this module re-exports, because it is the only
   * name anything imports from this path. `isTouchPrimaryDevice` and
   * `useIsTouchUi` were re-exported here too and never imported from here; both
   * are available from `@/platforms/mobile`.
   */
  useIsTouchUi as useMobileDetection,
} from '@/platforms/mobile/use-touch-ui';
