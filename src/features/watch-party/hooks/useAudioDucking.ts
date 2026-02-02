'use client';

import type { Participant, Room } from 'livekit-client';
import { RoomEvent } from 'livekit-client';
import { useCallback, useEffect, useRef, useState } from 'react';

interface UseAudioDuckingOptions {
  /** Video element reference to control volume */
  videoRef: React.RefObject<HTMLVideoElement | null>;
  /** LiveKit room instance */
  room: Room | null;
  /** All participants in the room */
  participants: Participant[];
  /** User's desired volume level (0-1) from volume controls */
  userVolume: number;
  /** Ducking factor when someone speaks (0-1), default 0.25 - multiplies user volume */
  duckingFactor?: number;
  /** Transition time in ms for volume changes, default 150 */
  transitionMs?: number;
  /** Enabled flag - set to false to disable ducking */
  enabled?: boolean;
  /** Ref to track if ducking is currently active (prevents circular updates) */
  isDuckingRef?: { current: boolean };
}

/**
 * Hook that implements audio ducking - reduces movie volume when participants speak
 * Creates a smooth, immersive experience during watch parties
 */
export function useAudioDucking({
  videoRef,
  room,
  participants,
  userVolume,
  duckingFactor = 0.25,
  transitionMs = 150,
  enabled = true,
  isDuckingRef,
}: UseAudioDuckingOptions) {
  const [isSomeoneSpeaking, setIsSomeoneSpeaking] = useState(false);
  const animationRef = useRef<number | null>(null);
  const targetVolumeRef = useRef(userVolume);

  // Smoothly transition volume
  const transitionVolume = useCallback(
    (targetVolume: number) => {
      if (!videoRef.current || !enabled) return;

      targetVolumeRef.current = targetVolume;
      const video = videoRef.current;
      const startVolume = video.volume;
      const volumeDiff = targetVolume - startVolume;
      const startTime = performance.now();

      // Mark that ducking is active
      if (isDuckingRef) {
        isDuckingRef.current = true;
      }

      // Cancel any existing animation
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }

      const animate = (currentTime: number) => {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / transitionMs, 1);

        // Ease-out curve for smooth transition
        const easeOut = 1 - (1 - progress) ** 3;
        const newVolume = startVolume + volumeDiff * easeOut;

        if (videoRef.current) {
          videoRef.current.volume = Math.max(0, Math.min(1, newVolume));
        }

        if (progress < 1) {
          animationRef.current = requestAnimationFrame(animate);
        } else {
          // Ducking complete - keep isDuckingRef true for 100ms to ignore final volumechange event
          setTimeout(() => {
            if (isDuckingRef) {
              isDuckingRef.current = false;
            }
          }, 100);
        }
      };

      animationRef.current = requestAnimationFrame(animate);
    },
    [videoRef, transitionMs, enabled, isDuckingRef],
  );

  // Check if any remote participant is speaking
  const checkSpeaking = useCallback(() => {
    if (!room || !enabled) return;

    const localIdentity = room.localParticipant?.identity;

    // Check if any REMOTE participant is speaking (not local)
    const someoneIsSpeaking = participants.some(
      (p) => p.identity !== localIdentity && p.isSpeaking,
    );

    setIsSomeoneSpeaking(someoneIsSpeaking);
  }, [room, participants, enabled]);

  // Listen to speaking changes
  useEffect(() => {
    if (!room || !enabled) return;

    const handleActiveSpeakersChanged = () => {
      checkSpeaking();
    };

    // Check periodically as well (fallback)
    const interval = setInterval(checkSpeaking, 100);

    room.on(RoomEvent.ActiveSpeakersChanged, handleActiveSpeakersChanged);

    return () => {
      room.off(RoomEvent.ActiveSpeakersChanged, handleActiveSpeakersChanged);
      clearInterval(interval);
    };
  }, [room, checkSpeaking, enabled]);

  // Also check when participants change
  useEffect(() => {
    checkSpeaking();
  }, [checkSpeaking]);

  // Apply volume ducking when speaking state changes or user volume changes
  useEffect(() => {
    if (!enabled) return;

    // Apply ducking factor to user's volume when someone speaks
    const targetVolume = isSomeoneSpeaking
      ? userVolume * duckingFactor
      : userVolume;

    transitionVolume(targetVolume);
  }, [isSomeoneSpeaking, userVolume, duckingFactor, transitionVolume, enabled]);

  // Cleanup animation on unmount
  useEffect(() => {
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  return {
    isSomeoneSpeaking,
    /** Manually set ducking enabled/disabled */
    setDuckingEnabled: (value: boolean) => {
      if (!value && videoRef.current) {
        // Restore user's volume when disabled
        videoRef.current.volume = userVolume;
      }
    },
  };
}
