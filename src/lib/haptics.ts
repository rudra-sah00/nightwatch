// Haptic helper for UI components.
// Uses static imports — pre-loaded on native, no-op on web/desktop.

import { Capacitor } from '@capacitor/core';
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';

const isNative = Capacitor.isNativePlatform();

export function hapticLight() {
  if (isNative) Haptics.impact({ style: ImpactStyle.Light });
}

export function hapticMedium() {
  if (isNative) Haptics.impact({ style: ImpactStyle.Medium });
}

export function hapticSuccess() {
  if (isNative) Haptics.notification({ type: NotificationType.Success });
}

export function hapticError() {
  if (isNative) Haptics.notification({ type: NotificationType.Error });
}
