'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Hook that reads and writes the device's system media volume on Capacitor
 * native platforms (iOS / Android) and listens for hardware volume-button presses.
 *
 * **Platform behavior:**
 * - **iOS** — Volume is read-only; `setSystemVolume` updates local state but
 *   the OS ignores programmatic `setVolumeLevel` calls.
 * - **Android** — Full read/write support. The plugin maps the 0–1 float to
 *   a 0–10 integer scale internally.
 * - **Web / Electron** — Returns `null` so the caller can fall back to the
 *   in-app `HTMLAudioElement.volume` slider.
 *
 * @returns `null` on non-native platforms, or an object with:
 *   - `volume` — current system volume (0–1), or `null` before the first read.
 *   - `setSystemVolume` — async setter to update the system volume.
 *
 * @example
 * ```tsx
 * const sys = useSystemVolume();
 * // sys is null on web — use engine volume instead
 * const vol = sys?.volume ?? engineVolume;
 * ```
 */
export function useSystemVolume() {
  const [volume, setVolume] = useState<number | null>(null);
  const watchingRef = useRef(false);

  const isNative =
    typeof window !== 'undefined' &&
    window.Capacitor?.isNativePlatform?.() === true;

  // Read initial volume + start watching hardware buttons
  useEffect(() => {
    if (!isNative) return;

    let cancelled = false;

    const init = async () => {
      try {
        const { Volumes } = await import('@ottimis/capacitor-volumes');
        const { value } = await Volumes.getVolumeLevel();
        if (!cancelled) setVolume(value);
      } catch {
        /* plugin unavailable */
      }

      try {
        const { VolumeButtons } = await import(
          '@capacitor-community/volume-buttons'
        );
        watchingRef.current = true;
        await VolumeButtons.watchVolume({}, async (result, err) => {
          if (err || cancelled) return;
          // After a button press, re-read the actual system volume
          try {
            const { Volumes: Vol } = await import('@ottimis/capacitor-volumes');
            const { value } = await Vol.getVolumeLevel();
            if (!cancelled) setVolume(value);
          } catch {
            // Estimate: nudge ±0.0625 (1/16 steps)
            setVolume((prev) => {
              if (prev === null) return prev;
              const delta = result.direction === 'up' ? 0.0625 : -0.0625;
              return Math.max(0, Math.min(1, prev + delta));
            });
          }
        });
      } catch {
        /* plugin unavailable */
      }
    };

    init();

    return () => {
      cancelled = true;
      if (watchingRef.current) {
        import('@capacitor-community/volume-buttons')
          .then(({ VolumeButtons }) => VolumeButtons.clearWatch())
          .catch(() => {});
        watchingRef.current = false;
      }
    };
  }, [isNative]);

  // Set system volume (Android only; iOS ignores setVolumeLevel)
  const setSystemVolume = useCallback(
    async (v: number) => {
      setVolume(v);
      if (!isNative) return;
      try {
        const { Volumes } = await import('@ottimis/capacitor-volumes');
        // Plugin expects 0-10 integer on Android
        await Volumes.setVolumeLevel({ value: Math.round(v * 10) });
      } catch {
        /* iOS or plugin unavailable — slider still reflects the value */
      }
    },
    [isNative],
  );

  if (!isNative) return null;
  return { volume, setSystemVolume };
}
