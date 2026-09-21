'use client';

import { useGLTF } from '@react-three/drei';
import { useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { useTheatreView } from '../lib/view-mode';
import { avatarModels } from '../types';
import { useTheatreAssets } from './use-theatre-assets';

/**
 * Downloads the theatre assets once the user opts in, never before.
 *
 * This is the whole point of gating 3D behind a settings toggle: a normal watch
 * party should cost nothing extra. Nobody pays for a 2.3 MB room model unless
 * they asked for the room.
 *
 * On completion the user is told they can press `V` — they are NOT dropped into
 * 3D automatically. Yanking someone's view mid-film because a download finished
 * would be hostile.
 */
export function useTheatrePreload() {
  const { data: assets } = useTheatreAssets();
  const enabled = useTheatreView((s) => s.enabled);
  const phase = useTheatreView((s) => s.phase);
  const setPhase = useTheatreView((s) => s.setPhase);
  const setProgress = useTheatreView((s) => s.setProgress);
  const started = useRef(false);

  useEffect(() => {
    if (!enabled || !assets) return;
    if (started.current) return;
    started.current = true;

    let cancelled = false;
    setPhase('downloading');
    setProgress(0);

    // room + chair are required to render anything; cafe and the characters can
    // arrive later, so they are fetched but not gated on.
    //
    // EVERY character model is fetched, not just the one this user picked. A
    // peer can choose a different body, and we cannot render them without their
    // model — discovering that mid-party would mean a stall, or an avatar that
    // silently never appears. The preference decides what YOU look like to
    // others, not what this client is capable of drawing.
    const critical = [assets.models.room, assets.models.chair];
    const deferred = [assets.models.cafe, ...avatarModels(assets)];

    let done = 0;
    function step() {
      done += 1;
      if (!cancelled) setProgress(done / critical.length);
    }

    async function run() {
      try {
        await Promise.all(
          critical.map(async (url) => {
            await useGLTF.preload(url);
            step();
          }),
        );
        if (cancelled) return;
        setPhase('ready');
        toast.success('3D theatre ready', {
          description: 'Press V to change view',
          duration: 6000,
        });
        // warm the rest in the background; failures here are not fatal
        for (const url of deferred) {
          try {
            await useGLTF.preload(url);
          } catch {
            // ignore — cafe/avatar load lazily on first use instead
          }
        }
      } catch {
        if (cancelled) return;
        setPhase('error');
        started.current = false; // allow a retry on re-toggle
        toast.error('Could not load 3D theatre', {
          description: 'Check your connection and try again.',
        });
      }
    }
    void run();

    return () => {
      cancelled = true;
    };
  }, [enabled, assets, setPhase, setProgress]);

  // allow a fresh attempt after the user turns it off and on again
  useEffect(() => {
    if (!enabled) started.current = false;
  }, [enabled]);

  return { phase };
}
