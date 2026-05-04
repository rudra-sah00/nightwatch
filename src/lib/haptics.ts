/**
 * Haptic feedback helpers for UI components.
 *
 * Uses static Capacitor imports — pre-loaded on native, no-op on web/desktop.
 * Each function is safe to call on any platform.
 *
 * @module haptics
 */

import { Capacitor } from '@capacitor/core';
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';

const isNative = Capacitor.isNativePlatform();

/** Trigger a light impact haptic. Ideal for subtle button taps. */
export function hapticLight() {
  if (isNative) Haptics.impact({ style: ImpactStyle.Light }).catch(() => {});
}

/** Trigger a medium impact haptic. Ideal for standard interactions. */
export function hapticMedium() {
  if (isNative) Haptics.impact({ style: ImpactStyle.Medium }).catch(() => {});
}

/** Trigger a success notification haptic. */
export function hapticSuccess() {
  if (isNative)
    Haptics.notification({ type: NotificationType.Success }).catch(() => {});
}

/** Trigger an error notification haptic. */
export function hapticError() {
  if (isNative)
    Haptics.notification({ type: NotificationType.Error }).catch(() => {});
}
