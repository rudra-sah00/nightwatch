// Lightweight haptic helper for UI components.
// Lazy-loads @capacitor/haptics only on native mobile — zero cost on web/desktop.

let _haptics: typeof import('@capacitor/haptics') | null = null;

const isNative =
  typeof window !== 'undefined' &&
  window.Capacitor?.isNativePlatform?.() === true;

if (isNative) {
  import('@capacitor/haptics').then((m) => {
    _haptics = m;
  });
}

export function hapticLight() {
  _haptics?.Haptics.impact({ style: _haptics.ImpactStyle.Light });
}

export function hapticMedium() {
  _haptics?.Haptics.impact({ style: _haptics.ImpactStyle.Medium });
}

export function hapticSuccess() {
  _haptics?.Haptics.notification({ type: _haptics.NotificationType.Success });
}

export function hapticError() {
  _haptics?.Haptics.notification({ type: _haptics.NotificationType.Error });
}
