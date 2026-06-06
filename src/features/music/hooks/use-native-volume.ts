import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Hook that bridges to native system volume on Capacitor (iOS/Android).
 * Falls back to no-op on web. Returns volume (0-1) and setVolume.
 * Listens to hardware volume button presses for instant slider sync.
 */
export function useNativeVolume(enabled: boolean) {
  const [volume, setVolumeState] = useState(0.5);
  const cleanupRef = useRef<(() => void) | null>(null);

  const isNative =
    typeof window !== 'undefined' && !!window.Capacitor?.isNativePlatform?.();
  const isIos =
    typeof window !== 'undefined' &&
    window.Capacitor?.getPlatform?.() === 'ios';

  // Get current volume from native
  const getVolume = useCallback(async () => {
    if (!isNative) return;
    try {
      if (isIos) {
        const { registerPlugin } = await import('@capacitor/core');
        const NWVolume = registerPlugin<{
          getVolume: () => Promise<{ value: number }>;
          setVolume: (opts: { value: number }) => Promise<{ value: number }>;
        }>('NWVolume');
        const { value } = await NWVolume.getVolume();
        setVolumeState(value);
      } else {
        const { Volumes } = await import('@ottimis/capacitor-volumes');
        const { value } = await Volumes.getVolumeLevel({ type: 3 });
        setVolumeState(value / 10);
      }
    } catch {}
  }, [isNative, isIos]);

  // Set system volume
  const setVolume = useCallback(
    async (v: number) => {
      setVolumeState(v);
      if (!isNative) return;
      try {
        if (isIos) {
          const { registerPlugin } = await import('@capacitor/core');
          const NWVolume = registerPlugin<{
            getVolume: () => Promise<{ value: number }>;
            setVolume: (opts: { value: number }) => Promise<{ value: number }>;
          }>('NWVolume');
          await NWVolume.setVolume({ value: v });
        } else {
          const { Volumes } = await import('@ottimis/capacitor-volumes');
          await Volumes.setVolumeLevel({ value: Math.round(v * 10), type: 3 });
        }
      } catch {}
    },
    [isNative, isIos],
  );

  // Listen for hardware volume button presses → instant sync
  useEffect(() => {
    if (!enabled || !isNative) return;
    getVolume();

    let active = true;
    (async () => {
      try {
        const { VolumeButtons } = await import(
          '@capacitor-community/volume-buttons'
        );
        await VolumeButtons.watchVolume({}, () => {
          // Button pressed — immediately read the new system volume
          if (active) getVolume();
        });
        cleanupRef.current = () => {
          VolumeButtons.clearWatch().catch(() => {});
        };
      } catch {}
    })();

    return () => {
      active = false;
      cleanupRef.current?.();
      cleanupRef.current = null;
    };
  }, [enabled, isNative, getVolume]);

  return { volume, setVolume, isNative };
}
