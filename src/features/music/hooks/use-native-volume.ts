import { useCallback, useEffect, useRef, useState } from 'react';

interface NWVolumePlugin {
  getVolume: () => Promise<{ value: number }>;
  setVolume: (opts: { value: number }) => Promise<{ value: number }>;
}

// Lazy-loaded plugin singletons (registered once, reused across renders)
let nwVolumePlugin: NWVolumePlugin | null = null;
let volumesPluginPromise: Promise<
  typeof import('@ottimis/capacitor-volumes')
> | null = null;

async function getNWVolume(): Promise<NWVolumePlugin> {
  if (!nwVolumePlugin) {
    const { registerPlugin } = await import('@capacitor/core');
    nwVolumePlugin = registerPlugin<NWVolumePlugin>('NWVolume');
  }
  return nwVolumePlugin;
}

async function getVolumesPlugin() {
  if (!volumesPluginPromise) {
    volumesPluginPromise = import('@ottimis/capacitor-volumes');
  }
  return volumesPluginPromise;
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
        const plugin = await getNWVolume();
        const { value } = await plugin.getVolume();
        setVolumeState(value);
      } else {
        const { Volumes } = await getVolumesPlugin();
        const { value } = await Volumes.getVolumeLevel({ type: 3 });
        setVolumeState(value);
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
          const plugin = await getNWVolume();
          await plugin.setVolume({ value: v });
        } else {
          const { Volumes } = await getVolumesPlugin();
          await Volumes.setVolumeLevel({ value: v, type: 3 });
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
    (async () => {
      try {
        const { VolumeButtons } = await import(
          '@capacitor-community/volume-buttons'
        );
        if (!active) return;
        await VolumeButtons.watchVolume({}, () => {
          if (active && Date.now() - userSetRef.current > 500) getVolume();
        });
        if (!active) {
          VolumeButtons.clearWatch().catch(() => {});
          return;
        }
        cleanupRef.current = () => {
          VolumeButtons.clearWatch().catch(() => {});
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
