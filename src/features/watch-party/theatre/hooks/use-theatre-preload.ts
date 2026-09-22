'use client';

import { useGLTF } from '@react-three/drei';
import { useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { useTheatreDownloadToast } from '../components/TheatreDownloadToast';
import {
  describeDownloadError,
  downloadAll,
  isAbortError,
} from '../lib/asset-download';
import { attachKtx2, isKtx2Ready } from '../lib/ktx2';
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
 * microtask, so an earlier version announced "3D theatre ready" and unlocked
 * `V` before a single byte had arrived, and the scene then loaded its models
 * while the user was already walking around in it.
 *
 * So the files are fetched explicitly here, through `downloadAll`, which gives
 * both a real completion signal and a real byte count. `useGLTF.preload` is
 * still called afterwards to warm drei's cache; that second request is served
 * from the HTTP cache because the objects are published `immutable`, so it
 * costs no extra transfer.
 *
 * On completion the user is told they can press `V` — they are NOT dropped into
 * 3D automatically. Yanking someone's view mid-film because a download finished
 * would be hostile.
 */
export function useTheatrePreload() {
  const { data: assets, isError: manifestFailed, refetch } = useTheatreAssets();
  const enabled = useTheatreView((s) => s.enabled);
  const phase = useTheatreView((s) => s.phase);
  const retryNonce = useTheatreView((s) => s.retryNonce);
  const setPhase = useTheatreView((s) => s.setPhase);
  const setDownload = useTheatreView((s) => s.setDownload);
  const setAttempt = useTheatreView((s) => s.setAttempt);
  const fail = useTheatreView((s) => s.fail);

  useTheatreDownloadToast();

  /**
   * Assets already on the machine, preserved across retries.
   *
   * Without this, failing on the last file and hitting Retry would re-download
   * every character model that had already arrived.
   */
  const completed = useRef<Set<string>>(new Set());

  // A manifest that will not load is its own failure mode, separate from the
  // asset transfer, and needs its own recovery path.
  useEffect(() => {
    if (!enabled || !manifestFailed) return;
    fail('Could not reach the asset server');
  }, [enabled, manifestFailed, fail]);

  useEffect(() => {
    if (!enabled || !assets) return;

    const controller = new AbortController();
    let cancelled = false;

    /**
     * The characters are all that is left to download.
     *
     * The room, the chair and the cafe used to be here too, and the rule was that
     * EVERY asset had to land before 3D unlocked — walking into a room that
     * visibly assembles itself around you is worse than waiting. That rule now
     * costs almost nothing to keep: the room is generated in code, so the only
     * transfer is the character models.
     *
     * Every published model is fetched, not just the one this user picked: a peer
     * may have chosen the other body and cannot be drawn without it.
     */
    const urls = avatarModels(assets).filter(
      (u): u is string => typeof u === 'string' && u.length > 0,
    );

    if (urls.length === 0) {
      fail('No assets published');
      return;
    }

    setPhase('downloading');
    setAttempt(1);

    /**
     * Which retry generation this run belongs to.
     *
     * A download aborted by Retry can still resolve or report progress a tick
     * later, after the replacement run has started. Without this check that
     * stale result would overwrite the new run's byte count, or worse announce
     * 'ready' for a batch the user had already restarted.
     */
    const generation = retryNonce;
    const stale = () =>
      cancelled || useTheatreView.getState().retryNonce !== generation;

    async function run() {
      try {
        const result = await downloadAll({
          urls,
          signal: controller.signal,
          completed: completed.current,
          onProgress: (p) => {
            if (stale()) return;
            setDownload({
              progress: p.fraction,
              receivedBytes: p.receivedBytes,
              totalBytes: p.totalBytes,
              filesDone: p.filesDone,
              fileCount: p.fileCount,
            });
          },
          onRetry: (_url, attempt) => {
            if (stale()) return;
            setAttempt(attempt);
          },
        });
        if (stale()) return;

        completed.current = result.completed;

        /*
          Warm drei's cache. Served from the HTTP cache — the objects are
          published immutable — so this re-request costs no transfer.

          Skipped until a Canvas has existed once. From v3 the textures are KTX2,
          and parsing one before `detectKtx2Support` has seen a renderer rejects —
          which drei would then cache, so every later load of that url would fail
          from the cache rather than retry. The renderer only exists inside the
          Canvas, and on first entry that has not mounted yet. Nothing is lost:
          the bytes are already on the machine, so the parse simply happens on
          first use instead of here.
        */
        if (isKtx2Ready()) {
          for (const url of urls) {
            useGLTF.preload(url, false, false, attachKtx2);
          }
        }

        setAttempt(1);
        setPhase('ready');
        toast.success('3D theatre ready', {
          description: 'Press V to change view',
          duration: 6000,
        });
      } catch (err) {
        // An abort is how this effect cleans up. It is not a failure and must
        // not overwrite the phase, or unmounting would show an error card.
        if (stale() || isAbortError(err)) return;
        fail(describeDownloadError(err));
      }
    }

    void run();

    return () => {
      cancelled = true;
      controller.abort();
    };
    // retryNonce is the retry trigger: bumping it re-runs this effect, which
    // resumes from `completed` rather than starting the transfer over.
  }, [enabled, assets, retryNonce, setPhase, setDownload, setAttempt, fail]);

  /**
   * Re-fetch the manifest when the user retries after it was the thing that
   * failed. Without this, Retry would loop on a cached rejection.
   */
  useEffect(() => {
    if (retryNonce > 0 && manifestFailed) void refetch();
  }, [retryNonce, manifestFailed, refetch]);

  // A fresh opt-in should start clean rather than resume a half-finished set
  // from a previous session in the same page.
  useEffect(() => {
    if (!enabled) completed.current = new Set();
  }, [enabled]);

  return { phase };
}
