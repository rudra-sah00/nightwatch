import { type RefObject, useCallback, useEffect, useRef } from 'react';
import type { PartyStateUpdate } from '../types';

interface PartyPlaybackState {
  isPlaying: boolean;
  videoTime: number; // Position at last event
  serverTime: number; // Server timestamp of last event
  playbackRate: number;
}

export function usePredictiveSync(
  videoRef: RefObject<HTMLVideoElement | null>,
  clockOffset: number,
  isCalibrated: boolean,
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
      if (!video) {
        // Video element not mounted yet (e.g. join_approved before ActiveWatchParty renders).
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
        if (newState.isPlaying && video.paused) video.play();
        if (!newState.isPlaying && !video.paused) video.pause();
        video.playbackRate = newState.playbackRate;
        return;
      }

      const expectedTime = getExpectedTime();
      const drift = expectedTime - video.currentTime;

      // Handle Play/Pause State Sync immediately
      if (newState.isPlaying && video.paused) {
        video.play().catch(() => {});
      } else if (!newState.isPlaying && !video.paused) {
        video.pause();
      }

      // Handle Seek / Drift
      // If drift is huge (> 2s), it's likely a seek or user fell way behind
      if (Math.abs(drift) > 2.0) {
        video.currentTime = expectedTime;
        video.playbackRate = newState.playbackRate;
      } else if (Math.abs(drift) > 0.3) {
        // Soft drift: adjust rate to catch up/sow down
        // If behind (positive drift): speed up
        // If ahead (negative drift): slow down
        const correctionRate =
          drift > 0
            ? newState.playbackRate * 1.05 // +5% to catch up
            : newState.playbackRate * 0.95; // -5% to slow down
        video.playbackRate = correctionRate;
      } else {
        // Small drift: lock to correct rate
        // Only set if different to avoid noise
        if (video.playbackRate !== newState.playbackRate) {
          video.playbackRate = newState.playbackRate;
        }
      }
    },
    [videoRef, getExpectedTime, isCalibrated],
  );

  // Apply pending state once video element becomes available.
  // This covers the gap between join_approved (video not yet rendered) and
  // the first state_update that arrives after the video mounts.
  useEffect(() => {
    const interval = setInterval(() => {
      if (pendingUpdateRef.current && videoRef.current) {
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

  // Periodic drift check (every 2s)
  useEffect(() => {
    if (!isCalibrated) return;

    const interval = setInterval(() => {
      const video = videoRef.current;
      const state = stateRef.current;
      if (!video || !state || !state.isPlaying) return;

      // If user paused locally but party is playing, we force play (unless we want to allow local pause?)
      // For now, strict sync:
      if (video.paused && state.isPlaying) {
        video.play().catch(() => {});
      }

      const expected = getExpectedTime();
      const actual = video.currentTime;
      const drift = expected - actual;

      if (Math.abs(drift) > 2.0) {
        // Hard seek if way off
        video.currentTime = expected;
        video.playbackRate = state.playbackRate;
      } else if (Math.abs(drift) > 0.3) {
        // Soft correction
        const correctionRate =
          drift > 0 ? state.playbackRate * 1.05 : state.playbackRate * 0.95;
        video.playbackRate = correctionRate;
      } else {
        // Drift resolved? Restore normal rate
        // We use a small epsilon for float comparison if needed, but strict check is okay-ish
        // Better: if we are differentiating from target rate, restore it
        if (Math.abs(video.playbackRate - state.playbackRate) > 0.01) {
          video.playbackRate = state.playbackRate;
        }
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [videoRef, getExpectedTime, isCalibrated]);

  return { applyState, getExpectedTime };
}
