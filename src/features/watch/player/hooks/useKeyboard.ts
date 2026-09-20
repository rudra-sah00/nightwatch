'use client';

import { useTranslations } from 'next-intl';
import { type RefObject, useCallback, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { checkIsDesktop, desktopBridge } from '@/lib/electron-bridge';
import type { PlayerAction } from '../context/types';
import {
  SPEED_BOOST_HOLD_MS,
  usePlaybackSpeedBoost,
} from './usePlaybackSpeedBoost';

/**
 * Grace period after a Space `keyup` before the gesture is treated as finished.
 *
 * Key auto-repeat is not reported consistently. Some platforms send one `keydown` with
 * `repeat: true` on subsequent ticks and a single `keyup` on release; others (X11, and
 * some Electron/remote-input setups) send discrete `keydown`/`keyup` *pairs* for every
 * tick. Treating the first `keyup` as a release breaks badly on the second kind: every
 * repeat tick resolves as a tap, so holding Space machine-guns play/pause and never
 * reaches the hold threshold.
 *
 * So a `keyup` only *provisionally* ends the gesture. If another Space `keydown` lands
 * inside this window the key was never really released and the gesture continues. Must
 * exceed the fastest OS repeat interval (~15-30ms).
 */
const SPACE_RELEASE_SETTLE_MS = 70;

/** Options for {@link useKeyboard}. */
interface UseKeyboardOptions {
  videoRef: RefObject<HTMLVideoElement | null>;
  containerRef: RefObject<HTMLDivElement | null>;
  dispatch: React.Dispatch<PlayerAction>;
  isFullscreen: boolean;
  onBack: () => void;
  // Caption toggle
  currentSubtitleTrack: string | null;
  onToggleCaptions: () => void;
  // Next episode
  hasNextEpisode: boolean;
  onNextEpisode: () => void;
  disabled?: boolean; // For watch party guests (disables playback controls)
  isLive?: boolean; // Disables seek/skip shortcuts for live streams
  onInteraction?: () => void;
  onToggleFullscreen?: () => void;
  /**
   * Whether holding Space temporarily raises playback to 2x.
   *
   * Watch parties pass `false`: `useWatchPartyHostSync` broadcasts a `rate` event on
   * every `ratechange`, so a transient boost would spam the whole room with 2x then
   * back again.
   */
  allowSpeedBoost?: boolean;
}

/**
 * Registers global keyboard shortcuts for the video player.
 *
 * Supports Space/K (play/pause), J/L and arrows (seek), arrows up/down
 * (volume), M (mute), F (fullscreen), C (captions), N (next episode),
 * and Escape (exit fullscreen). Also listens for Electron desktop media
 * key commands when running as a native app.
 *
 * Space additionally supports YouTube-style hold-to-speed-up: holding it past
 * {@link SPEED_BOOST_HOLD_MS} raises playback to 2x until release. Play/pause is
 * therefore resolved on keyup, not keydown, so a hold does not also toggle playback.
 *
 * Uses a `useLatest` ref pattern so the keydown listener is registered
 * only once and always reads current handler values.
 *
 * @returns `togglePlay`, `toggleMute`, `toggleFullscreen`, `seek`, and `adjustVolume`.
 */
export function useKeyboard({
  videoRef,
  containerRef,
  dispatch,
  isFullscreen,
  onToggleCaptions,
  hasNextEpisode,
  onNextEpisode,
  disabled = false,
  isLive = false,
  onInteraction,
  onToggleFullscreen,
  allowSpeedBoost = true,
}: UseKeyboardOptions) {
  const t = useTranslations('watch.player');
  const seek = useCallback(
    (seconds: number) => {
      if (disabled) return;
      const video = videoRef.current;
      if (!video) return;
      if (!Number.isFinite(seconds) || !Number.isFinite(video.currentTime))
        return;

      if (isLive) {
        // DVR seek: clamp within the seekable/buffered range
        const src = video.seekable.length > 0 ? video.seekable : video.buffered;
        if (!src.length) return;
        const start = src.start(0);
        const end = src.end(src.length - 1);
        if (!Number.isFinite(start) || !Number.isFinite(end)) return;
        const currentTime = Number.isFinite(video.currentTime)
          ? video.currentTime
          : start;
        video.currentTime = Math.max(
          start,
          Math.min(end, currentTime + seconds),
        );
      } else {
        if (!Number.isFinite(video.duration)) return;
        const currentTime = Number.isFinite(video.currentTime)
          ? video.currentTime
          : 0;
        const duration = Number.isFinite(video.duration) ? video.duration : 0;
        video.currentTime = Math.max(
          0,
          Math.min(duration, currentTime + seconds),
        );
      }
    },
    [videoRef, disabled, isLive],
  );

  const adjustVolume = useCallback(
    (delta: number) => {
      const video = videoRef.current;
      if (!video) return;
      const newVolume = Math.max(0, Math.min(1, video.volume + delta));
      video.volume = newVolume;
      // Unmute when increasing volume while muted
      if (delta > 0 && video.muted) {
        video.muted = false;
        dispatch({ type: 'TOGGLE_MUTE' });
      }
      dispatch({ type: 'SET_VOLUME', volume: newVolume });
    },
    [videoRef, dispatch],
  );

  const togglePlay = useCallback(() => {
    if (disabled) return;
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      video.play().catch(() => {});
    } else {
      video.pause();
    }
  }, [videoRef, disabled]);

  const toggleMute = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = !video.muted;
    dispatch({ type: 'TOGGLE_MUTE' });
  }, [videoRef, dispatch]);

  const toggleFullscreen = useCallback(async () => {
    if (onToggleFullscreen) {
      onToggleFullscreen();
      return;
    }

    if (!containerRef.current) return;

    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else {
        await containerRef.current.requestFullscreen();
      }
    } catch {
      toast.error(t('fullscreenToggleFailed'));
    }
  }, [containerRef, onToggleFullscreen, t]);

  const { engageSpeedBoost, releaseSpeedBoost } = usePlaybackSpeedBoost({
    videoRef,
    dispatch,
    disabled,
    isLive,
    allowSpeedBoost,
  });

  // ── Space gesture machine (tap = play/pause, hold = 2x) ────────────────────
  /** A Space gesture is in progress (possibly spanning several auto-repeat ticks). */
  const gestureOpenRef = useRef(false);
  /** Pending provisional end-of-gesture; cancelled if another keydown arrives. */
  const settleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** Fires at the hold threshold to engage the boost. */
  const holdTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** The gesture became a hold, so its release must NOT toggle play/pause. */
  const holdConsumedRef = useRef(false);

  const clearGestureTimers = useCallback(() => {
    if (settleTimerRef.current) {
      clearTimeout(settleTimerRef.current);
      settleTimerRef.current = null;
    }
    if (holdTimerRef.current) {
      clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
    }
  }, []);

  /**
   * Abandon the gesture without firing its tap action.
   *
   * Used when focus leaves the page mid-hold: no keyup is ever delivered, and losing
   * focus must not be interpreted as a play/pause press.
   */
  const cancelSpaceGesture = useCallback(() => {
    clearGestureTimers();
    gestureOpenRef.current = false;
    holdConsumedRef.current = false;
    releaseSpeedBoost();
  }, [clearGestureTimers, releaseSpeedBoost]);

  // ── useLatest pattern (rule: advanced-use-latest) ──────────────────────────
  // ── useLatest pattern (rule: advanced-use-latest) ──────────────────────────
  // Store all handler callbacks in a stable ref so the effect only registers
  // once. Each keystroke reads from the ref — always current values, never
  // stale closures. Prevents listener re-registration on every state change.
  const handlersRef = useRef({
    videoRef,
    togglePlay,
    seek,
    adjustVolume,
    toggleMute,
    toggleFullscreen,
    onToggleCaptions,
    onNextEpisode,
    dispatch,
    isFullscreen,
    hasNextEpisode,
    disabled,
    isLive,
    onInteraction,
    onToggleFullscreen,
    allowSpeedBoost,
    engageSpeedBoost,
    releaseSpeedBoost,
    cancelSpaceGesture,
    clearGestureTimers,
  });
  useEffect(() => {
    handlersRef.current = {
      videoRef,
      togglePlay,
      seek,
      adjustVolume,
      toggleMute,
      toggleFullscreen,
      onToggleCaptions,
      onNextEpisode,
      dispatch,
      isFullscreen,
      hasNextEpisode,
      disabled,
      isLive,
      onInteraction,
      onToggleFullscreen,
      allowSpeedBoost,
      engageSpeedBoost,
      releaseSpeedBoost,
      cancelSpaceGesture,
      clearGestureTimers,
    };
  });

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in an input
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      const h = handlersRef.current;

      switch (e.code) {
        case 'Space': {
          if (h.disabled) break;
          e.preventDefault();

          // A keydown inside the settle window means the key was never really
          // released — this is an auto-repeat tick, so keep the same gesture open.
          if (settleTimerRef.current) {
            clearTimeout(settleTimerRef.current);
            settleTimerRef.current = null;
            break;
          }
          // Repeat ticks on platforms that flag them, with no interleaved keyup.
          if (gestureOpenRef.current) break;

          gestureOpenRef.current = true;
          holdConsumedRef.current = false;
          holdTimerRef.current = setTimeout(() => {
            holdTimerRef.current = null;
            // engage reports whether this counts as a hold. It returns false when
            // boosting is impossible (paused, live, read-only, disabled), letting the
            // gesture fall back to a plain play/pause press on release.
            if (handlersRef.current.engageSpeedBoost()) {
              holdConsumedRef.current = true;
              handlersRef.current.onInteraction?.();
            }
          }, SPEED_BOOST_HOLD_MS);
          break;
        }
        case 'KeyK':
          if (h.disabled) break;
          e.preventDefault();
          h.togglePlay();
          h.onInteraction?.();
          break;
        case 'ArrowLeft':
          if (h.disabled) break;
          e.preventDefault();
          h.seek(-10);
          h.onInteraction?.();
          break;
        case 'KeyJ':
          if (h.disabled) break;
          e.preventDefault();
          h.seek(-10);
          h.onInteraction?.();
          break;
        case 'ArrowRight':
          if (h.disabled) break;
          e.preventDefault();
          h.seek(10);
          h.onInteraction?.();
          break;
        case 'KeyL':
          if (h.disabled) break;
          e.preventDefault();
          h.seek(10);
          h.onInteraction?.();
          break;
        case 'ArrowUp':
          e.preventDefault();
          h.adjustVolume(0.1);
          h.onInteraction?.();
          break;
        case 'ArrowDown':
          e.preventDefault();
          h.adjustVolume(-0.1);
          h.onInteraction?.();
          break;
        case 'KeyM':
          h.toggleMute();
          h.onInteraction?.();
          break;
        case 'KeyF':
          h.toggleFullscreen();
          break;
        case 'Escape':
          if (h.isFullscreen) {
            if (document.fullscreenElement) {
              document.exitFullscreen().catch(() => {});
            } else if (h.onToggleFullscreen) {
              h.onToggleFullscreen();
            }
          }
          break;
        case 'KeyC':
          e.preventDefault();
          h.onToggleCaptions();
          h.onInteraction?.();
          break;
        case 'KeyN':
          if (h.hasNextEpisode && !h.disabled) {
            e.preventDefault();
            h.onNextEpisode();
          }
          break;
      }
    };

    // Register once — no dependencies, reads via ref
    window.addEventListener('keydown', handleKeyDown);

    /**
     * Space release: end a boost, or resolve the gesture as a play/pause tap.
     *
     * Play/pause lives here rather than on keydown so that holding Space to speed up
     * does not also toggle playback.
     */
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code !== 'Space') return;
      // keydown was ignored (typing in a field, or disabled) — nothing to resolve.
      if (!gestureOpenRef.current) return;

      // Provisional only: auto-repeat on some platforms emits a keyup per tick, so
      // wait to see whether another keydown lands before ending the gesture.
      if (settleTimerRef.current) clearTimeout(settleTimerRef.current);
      settleTimerRef.current = setTimeout(() => {
        settleTimerRef.current = null;
        gestureOpenRef.current = false;
        if (holdTimerRef.current) {
          clearTimeout(holdTimerRef.current);
          holdTimerRef.current = null;
        }

        const wasHold = holdConsumedRef.current;
        holdConsumedRef.current = false;
        const h = handlersRef.current;
        h.releaseSpeedBoost();

        if (!wasHold && !h.disabled) {
          h.togglePlay();
          h.onInteraction?.();
        }
      }, SPACE_RELEASE_SETTLE_MS);
    };

    /**
     * Losing focus mid-hold never delivers a keyup, which would otherwise leave
     * playback pinned at 2x with no way back short of the settings menu.
     */
    const handleRelease = () => {
      handlersRef.current.cancelSpaceGesture();
    };

    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', handleRelease);
    document.addEventListener('visibilitychange', handleRelease);

    // --- ELECTRON GLOBAL MEDIA KEYS HANDLER ---
    // Listen for physical keyboard media keys if running as the Nightwatch Desktop app!
    let unsubscribeDesktopMedia: (() => void) | undefined;
    if (checkIsDesktop() && desktopBridge.onMediaCommand) {
      unsubscribeDesktopMedia = desktopBridge.onMediaCommand((command) => {
        const h = handlersRef.current;
        if (h.disabled) return;

        switch (command) {
          case 'MediaPlayPause':
            h.togglePlay();
            h.onInteraction?.();
            break;
          case 'MediaNextTrack':
            if (h.hasNextEpisode) {
              h.onNextEpisode();
            }
            break;
          case 'MediaPreviousTrack':
            h.seek(-10); // Or restart video if implemented
            h.onInteraction?.();
            break;
        }
      });
    }

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', handleRelease);
      document.removeEventListener('visibilitychange', handleRelease);
      handlersRef.current.cancelSpaceGesture();
      if (unsubscribeDesktopMedia) unsubscribeDesktopMedia();
    };
  }, []);

  return { togglePlay, toggleMute, toggleFullscreen, seek, adjustVolume };
}
