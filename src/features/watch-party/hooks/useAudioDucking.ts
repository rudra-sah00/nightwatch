'use client';

import type { Participant, Room } from 'livekit-client';
import { RoomEvent } from 'livekit-client';
import { useCallback, useEffect, useRef, useState } from 'react';

interface UseAudioDuckingOptions {
  /** Video element reference to control volume */
  videoRef: React.MutableRefObject<HTMLVideoElement | null>;
  /** LiveKit room instance */
  room: Room | null;
  /** All participants in the room */
  participants: Participant[];
  /** Normal video volume (0-1), default 1 */
  normalVolume?: number;
  /** Ducked video volume when someone speaks (0-1), default 0.3 */
  duckedVolume?: number;
  /** Transition time in ms for volume changes, default 150 */
  transitionMs?: number;
  /** Enabled flag - set to false to disable ducking */
  enabled?: boolean;
}

/**
 * Hook that implements audio ducking - reduces movie volume when participants speak
 * Creates a smooth, immersive experience during watch parties
 */
export function useAudioDucking({
  videoRef,
  room,
  participants,
  normalVolume = 1,
  duckedVolume = 0.3,
  transitionMs = 150,
  enabled = true,
}: UseAudioDuckingOptions) {
  const [isSomeoneSpeaking, setIsSomeoneSpeaking] = useState(false);
  const [currentDuckedVolume, setCurrentDuckedVolume] = useState(normalVolume);
  const animationRef = useRef<number | null>(null);
  const targetVolumeRef = useRef(normalVolume);

  // Smoothly transition volume
  const transitionVolume = useCallback(
    (targetVolume: number) => {
      if (!videoRef.current || !enabled) return;

      targetVolumeRef.current = targetVolume;
      const video = videoRef.current;
      const startVolume = video.volume;
      const volumeDiff = targetVolume - startVolume;
      const startTime = performance.now();

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
          setCurrentDuckedVolume(targetVolume);
        }
      };

      animationRef.current = requestAnimationFrame(animate);
    },
    [videoRef, transitionMs, enabled],
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

  // Apply volume ducking when speaking state changes
  useEffect(() => {
    if (!enabled) return;

    if (isSomeoneSpeaking) {
      transitionVolume(duckedVolume);
    } else {
      transitionVolume(normalVolume);
    }
  }, [
    isSomeoneSpeaking,
    duckedVolume,
    normalVolume,
    transitionVolume,
    enabled,
  ]);

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
    currentVolume: currentDuckedVolume,
    /** Manually set ducking enabled/disabled */
    setDuckingEnabled: (value: boolean) => {
      if (!value && videoRef.current) {
        // Restore normal volume when disabled
        videoRef.current.volume = normalVolume;
      }
    },
  };
}
