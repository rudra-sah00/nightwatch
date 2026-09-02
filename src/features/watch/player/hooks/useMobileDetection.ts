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
  isTouchPrimaryDevice,
  /**
   * @deprecated Prefer `useIsTouchUi` — the name describes what is actually
   * detected (touch-primary input), not a screen size.
   */
  useIsTouchUi as useMobileDetection,
  useIsTouchUi,
} from '@/platforms/mobile/use-touch-ui';
