'use client';

import { Capacitor, registerPlugin } from '@capacitor/core';
import { useCallback, useEffect, useRef, useState } from 'react';

/** Native iOS volume plugin using MPVolumeView (registered locally). */
const NWVolume = registerPlugin<{
  getVolume: () => Promise<{ value: number }>;
  setVolume: (opts: { value: number }) => Promise<{ value: number }>;
}>('NWVolume');

/**
 * Hook that reads and writes the device's system media volume on Capacitor
 * native platforms (iOS / Android) and listens for hardware volume-button presses.
 *
 * - **iOS** — Uses native `NWVolumePlugin` (MPVolumeView) for both get and set.
 * - **Android** — Uses `@ottimis/capacitor-volumes` (0–10 integer scale).
 * - **Web / Electron** — Returns `null` so the caller falls back to in-app volume.
 */
export function useSystemVolume() {
  const [volume, setVolume] = useState<number | null>(null);
  const watchingRef = useRef(false);

  const isNative =
    typeof window !== 'undefined' &&
    window.Capacitor?.isNativePlatform?.() === true;

  const isIOS = isNative && Capacitor.getPlatform() === 'ios';

  useEffect(() => {
    if (!isNative) return;
    let cancelled = false;

    const readVolume = async () => {
      try {
        if (isIOS) {
          const { value } = await NWVolume.getVolume();
          if (!cancelled) setVolume(value);
        } else {
          const { Volumes } = await import('@ottimis/capacitor-volumes');
          const { value } = await Volumes.getVolumeLevel();
          if (!cancelled) setVolume(value);
        }
      } catch {
        /* plugin unavailable */
      }
    };

    const init = async () => {
      await readVolume();
      try {
        const { VolumeButtons } = await import(
          '@capacitor-community/volume-buttons'
        );
        watchingRef.current = true;
        await VolumeButtons.watchVolume({}, async (_result, err) => {
          if (err || cancelled) return;
          await readVolume();
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
  }, [isNative, isIOS]);

  const setSystemVolume = useCallback(
    async (v: number) => {
      setVolume(v);
      if (!isNative) return;
      try {
        if (isIOS) {
          await NWVolume.setVolume({ value: v });
        } else {
          const { Volumes } = await import('@ottimis/capacitor-volumes');
          await Volumes.setVolumeLevel({ value: Math.round(v * 10) });
        }
      } catch {
        /* plugin unavailable — slider still reflects the value */
      }
    },
    [isNative, isIOS],
  );

  if (!isNative) return null;
  return { volume, setSystemVolume };
}
