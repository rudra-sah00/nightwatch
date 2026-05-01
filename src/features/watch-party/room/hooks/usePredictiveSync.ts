import { type RefObject, useCallback, useEffect, useRef } from 'react';
import type { PartyStateUpdate } from '../types';

interface PartyPlaybackState {
  isPlaying: boolean;
  videoTime: number; // Position at last event
  serverTime: number; // Server timestamp of last event
  playbackRate: number;
}

/**
 * Predictive synchronisation hook for watch party video playback.
 *
 * Uses NTP-style clock offset to calculate the expected video position
 * based on the host's authoritative state, then applies graduated drift
 * correction (hard seek > ±15% rate > ±5% rate > normal) to keep all
 * participants in sync. Enforces play/pause state every 2 s.
 *
 * @param videoRef - Ref to the `<video>` element.
 * @param clockOffset - Millisecond offset between local clock and server.
 * @param isCalibrated - Whether the clock offset has been calibrated.
 * @param isLive - When `true`, skips time-based seeking (HLS live).
 * @returns `applyState` to process incoming state updates and `getExpectedTime`.
 */
export function usePredictiveSync(
  videoRef: RefObject<HTMLVideoElement | null>,
  clockOffset: number,
  isCalibrated: boolean,
  isLive = false,
) {
  const stateRef = useRef<PartyPlaybackState | null>(null);
  // Stores the last state update received before the video element was mounted.
  // A polling interval applies it once the video becomes available.
  const pendingUpdateRef = useRef<PartyStateUpdate | null>(null);

  // Calculate expected video position based on server time
  const getExpectedTime = useCallback(() => {
    const state = stateRef.current;
    if (!state) return 0;
    if (!state.isPlaying) return state.videoTime;

    // serverNow = localNow + offset
    const serverNow = Date.now() + clockOffset;
    const elapsed = (serverNow - state.serverTime) / 1000;
    return state.videoTime + elapsed * state.playbackRate;
  }, [clockOffset]);

  // Apply state update from server
  const applyState = useCallback(
    (update: PartyStateUpdate) => {
      const video = videoRef.current;
      if (!video || video.readyState < 1) {
        // Video element not mounted yet or metadata not loaded.
        // Save for later — the polling effect below will apply it once video is ready.
        pendingUpdateRef.current = update;
        return;
      }
      pendingUpdateRef.current = null;

      // Construct authoritative state
      // Use serverTime provided in update, or fallback to timestamp
      // If update comes from host event, it should have accurate videoTime and serverTime
      const newState: PartyPlaybackState = {
        isPlaying: update.isPlaying,
        videoTime: update.videoTime ?? update.currentTime,
        serverTime: update.serverTime ?? update.timestamp,
        playbackRate: update.playbackRate ?? 1,
      };

      stateRef.current = newState;

      // Livestreams: never seek — HLS live buffer is per-client and seeking
      // to a remote currentTime causes stalls/buffering. Only sync play/pause.
      if (isLive) {
        if (newState.isPlaying && video.paused) {
          video.play().catch((_err) => {});
        }
        if (newState.isPlaying === false && !video.paused) video.pause();
        return;
      }

      // If clock not calibrated yet, we can't use NTP-style offset, but we can
      // still compensate for elapsed playback time using serverTime vs timestamp.
      // serverTime = when the server sent this response (Date.now() on server)
      // timestamp  = when the state was last updated (lastUpdated in Redis)
      // The video has been playing for (serverTime - timestamp) ms since the last event.
      if (!isCalibrated) {
        let targetTime = newState.videoTime;
        if (newState.isPlaying && update.serverTime && update.timestamp) {
          const elapsed = (update.serverTime - update.timestamp) / 1000;
          if (elapsed > 0 && elapsed < 7200) {
            // Sanity: max 2 hours
            targetTime += elapsed * newState.playbackRate;
          }
        }
        if (Math.abs(video.currentTime - targetTime) > 0.5) {
          video.currentTime = targetTime;
        }
        if (newState.isPlaying && video.paused) {
          video.play().catch((_err) => {});
        }
        if (newState.isPlaying === false && !video.paused) video.pause();
        video.playbackRate = newState.playbackRate;
        return;
      }

      const expectedTime = getExpectedTime();
      const drift = expectedTime - video.currentTime;

      // Handle Play/Pause State Sync immediately
      if (newState.isPlaying && video.paused) {
        video.play().catch((_err) => {});
      } else if (newState.isPlaying === false && !video.paused) {
        video.pause();
      }

      // Handle Seek / Drift
      // If drift is huge (> 2s), it's likely a seek or user fell way behind
      if (Math.abs(drift) > 2.0) {
        video.currentTime = expectedTime;
        video.playbackRate = newState.playbackRate;
      } else if (Math.abs(drift) > 0.5) {
        // Large soft drift: ±15% correction — closes 1.5s gap in ~10 seconds
        // Old ±5% took 36 seconds which almost never converges before next event
        const correctionRate =
          drift > 0
            ? newState.playbackRate * 1.15 // +15% to catch up
            : newState.playbackRate * 0.85; // -15% to slow down
        video.playbackRate = correctionRate;
      } else if (Math.abs(drift) > 0.2) {
        // Fine drift: ±5% for smooth finish
        const correctionRate =
          drift > 0
            ? newState.playbackRate * 1.05
            : newState.playbackRate * 0.95;
        video.playbackRate = correctionRate;
      } else {
        // Within tolerance: restore normal rate
        if (video.playbackRate !== newState.playbackRate) {
          video.playbackRate = newState.playbackRate;
        }
      }
    },
    [videoRef, getExpectedTime, isCalibrated, isLive],
  );

  // Apply pending state once video element becomes available.
  // This covers the gap between join_approved (video not yet rendered) and
  // the first state_update that arrives after the video mounts.
  useEffect(() => {
    const interval = setInterval(() => {
      const video = videoRef.current;
      if (pendingUpdateRef.current && video && video.readyState >= 1) {
        applyState(pendingUpdateRef.current);
        clearInterval(interval);
      }
    }, 250);
    // Stop polling after 10s — reconnection sync timers will handle it by then
    const timeout = setTimeout(() => clearInterval(interval), 10_000);
    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [applyState, videoRef]);

  // Periodic state enforcement & drift check (every 2s)
  useEffect(() => {
    const interval = setInterval(() => {
      const video = videoRef.current;
      const state = stateRef.current;
      if (!video || !state) return;

      // If user's browser auto-paused (e.g. background tab / lost focus on dual monitor)
      // but the party is officially playing, fiercely force it back to play.
      if (state.isPlaying && video.paused) {
        video.play().catch((_err) => {});
      }

      // Conversely, enforce pause state
      if (!state.isPlaying && !video.paused) {
        video.pause();
      }

      // Skip actual time-drift correction for livestreams or uncalibrated VOD or if paused
      if (!state.isPlaying || !isCalibrated || isLive) return;

      const expected = getExpectedTime();
      const actual = video.currentTime;
      const drift = expected - actual;

      if (Math.abs(drift) > 2.0) {
        // Hard seek if way off
        video.currentTime = expected;
        video.playbackRate = state.playbackRate;
      } else if (Math.abs(drift) > 0.5) {
        // Large soft drift: ±15% — converges in ~10s
        const correctionRate =
          drift > 0 ? state.playbackRate * 1.15 : state.playbackRate * 0.85;
        video.playbackRate = correctionRate;
      } else if (Math.abs(drift) > 0.2) {
        // Fine drift: ±5% smooth finish
        const correctionRate =
          drift > 0 ? state.playbackRate * 1.05 : state.playbackRate * 0.95;
        video.playbackRate = correctionRate;
      } else {
        // Drift resolved: restore normal rate
        if (Math.abs(video.playbackRate - state.playbackRate) > 0.01) {
          video.playbackRate = state.playbackRate;
        }
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [videoRef, getExpectedTime, isCalibrated, isLive]);

  return { applyState, getExpectedTime };
}
