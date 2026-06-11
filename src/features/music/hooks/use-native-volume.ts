import { useCallback, useEffect, useRef, useState } from 'react';

interface CapacitorPlugin {
  [method: string]: (...args: unknown[]) => Promise<unknown>;
}

function getPlugin(name: string): CapacitorPlugin | null {
  const cap = (window as { Capacitor?: { Plugins?: Record<string, unknown> } })
    .Capacitor;
  return (cap?.Plugins?.[name] as CapacitorPlugin) || null;
}

/**
 * Hook that bridges to native system volume on Capacitor (iOS/Android).
 * Falls back to no-op on web. Returns volume (0-1) and setVolume.
 * Listens to hardware volume button presses for instant slider sync.
 */
export function useNativeVolume(enabled: boolean) {
  const [volume, setVolumeState] = useState(0.5);
  const cleanupRef = useRef<(() => void) | null>(null);
  const userSetRef = useRef(0);

  const isNative =
    typeof window !== 'undefined' && !!window.Capacitor?.isNativePlatform?.();
  const isIos =
    typeof window !== 'undefined' &&
    window.Capacitor?.getPlatform?.() === 'ios';

  const getVolume = useCallback(async () => {
    if (!isNative) return;
    try {
      if (isIos) {
        const plugin = getPlugin('NWVolume');
        if (!plugin) return;
        const result = (await plugin.getVolume()) as { value: number };
        setVolumeState(result.value);
      } else {
        const plugin = getPlugin('Volumes');
        if (!plugin) return;
        const result = (await plugin.getVolumeLevel({ type: 3 })) as {
          value: number;
        };
        setVolumeState(result.value);
      }
    } catch {
      /* native plugin unavailable */
    }
  }, [isNative, isIos]);

  const setVolume = useCallback(
    async (v: number) => {
      userSetRef.current = Date.now();
      setVolumeState(v);
      if (!isNative) return;
      try {
        if (isIos) {
          const plugin = getPlugin('NWVolume');
          if (!plugin) return;
          await plugin.setVolume({ value: v });
        } else {
          const plugin = getPlugin('Volumes');
          if (!plugin) return;
          await plugin.setVolumeLevel({ value: v, type: 3 });
        }
      } catch {
        /* native plugin unavailable */
      }
    },
    [isNative, isIos],
  );

  useEffect(() => {
    if (!enabled || !isNative) return;
    getVolume();

    let active = true;
    const plugin = getPlugin('VolumeButtons');
    if (!plugin) return;

    (async () => {
      try {
        if (!active) return;
        await plugin.watchVolume({}, () => {
          if (active && Date.now() - userSetRef.current > 500) getVolume();
        });
        if (!active) {
          plugin.clearWatch().catch(() => {});
          return;
        }
        cleanupRef.current = () => {
          plugin.clearWatch().catch(() => {});
        };
      } catch {
        /* volume buttons plugin unavailable */
      }
    })();

    return () => {
      active = false;
      cleanupRef.current?.();
      cleanupRef.current = null;
    };
  }, [enabled, isNative, getVolume]);

  return { volume, setVolume, isNative };
}
