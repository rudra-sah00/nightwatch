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
 * party should cost nothing extra. Nobody pays for the room unless they asked
 * for the room.
 *
 * Progress is measured from actual bytes, and `ready` means every asset is
 * genuinely on the machine.
 *
 * The obvious implementation does not work. `useGLTF.preload()` delegates to
 * `useLoader.preload()`, which is FIRE AND FORGET — it returns `void`, not a
 * promise. `await useGLTF.preload(url)` therefore resolves on the next
 * microtask, so the previous version announced "3D theatre ready" and unlocked
 * `V` before a single byte had arrived, and the scene then loaded its models
 * while the user was already walking around in it.
 *
 * So the files are fetched explicitly here. Every asset is downloaded with
 * `fetch`, which gives both a real completion signal and a real byte count for
 * the progress bar. `useGLTF.preload` is still called afterwards to warm drei's
 * cache; that second request is served from the HTTP cache because the objects
 * are published `immutable`, so it costs no extra transfer.
 *
 * On completion the user is told they can press `V` — they are NOT dropped into
 * 3D automatically. Yanking someone's view mid-film because a download finished
 * would be hostile.
 */

/** Progress is only meaningful if we know the totals, so sizes are probed first. */
async function contentLength(url: string): Promise<number> {
  try {
    const res = await fetch(url, { method: 'HEAD' });
    const len = Number(res.headers.get('content-length'));
    return Number.isFinite(len) && len > 0 ? len : 0;
  } catch {
    return 0;
  }
}

/**
 * Download one asset, reporting bytes as they arrive.
 *
 * Streams via the body reader when available so a 13 MB room model moves the bar
 * continuously rather than jumping from 0 to 100 on completion. Falls back to a
 * plain await where streaming is unavailable.
 */
async function download(
  url: string,
  onBytes: (delta: number) => void,
  signal: AbortSignal,
): Promise<void> {
  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  const body = res.body;
  if (!body) {
    const buf = await res.arrayBuffer();
    onBytes(buf.byteLength);
    return;
  }
  const reader = body.getReader();
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value) onBytes(value.byteLength);
  }
}

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

    const controller = new AbortController();
    let cancelled = false;
    setPhase('downloading');
    setProgress(0);

    /**
     * EVERY asset is required before 3D unlocks, including the characters.
     *
     * There is no "critical vs deferred" split any more. Entering a theatre whose
     * chairs or avatars are still downloading means walking into a room that
     * visibly assembles itself around you, and a peer whose model has not arrived
     * simply is not there. Both are worse than waiting a few seconds.
     *
     * Every character model is fetched, not just the one this user picked: a peer
     * may have chosen the other body and cannot be drawn without it.
     */
    const urls = [
      assets.models.room,
      assets.models.chair,
      assets.models.cafe,
      ...avatarModels(assets),
    ].filter((u): u is string => typeof u === 'string' && u.length > 0);

    async function run() {
      try {
        const sizes = await Promise.all(urls.map(contentLength));
        if (cancelled) return;
        const total = sizes.reduce((a, b) => a + b, 0);

        let received = 0;
        let filesDone = 0;
        const bump = () => {
          if (cancelled) return;
          // Byte progress when the sizes are known, file count as a fallback for
          // a server that does not advertise content-length.
          setProgress(
            total > 0 ? Math.min(1, received / total) : filesDone / urls.length,
          );
        };

        await Promise.all(
          urls.map(async (url) => {
            await download(
              url,
              (delta) => {
                received += delta;
                bump();
              },
              controller.signal,
            );
            filesDone += 1;
            bump();
          }),
        );
        if (cancelled) return;

        // Warm drei's cache. Served from the HTTP cache — the objects are
        // published immutable — so this re-request costs no transfer.
        for (const url of urls) {
          useGLTF.preload(url);
        }

        setProgress(1);
        setPhase('ready');
        toast.success('3D theatre ready', {
          description: 'Press V to change view',
          duration: 6000,
        });
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
      controller.abort();
    };
  }, [enabled, assets, setPhase, setProgress]);

  // allow a fresh attempt after the user turns it off and on again
  useEffect(() => {
    if (!enabled) started.current = false;
  }, [enabled]);

  return { phase };
}
