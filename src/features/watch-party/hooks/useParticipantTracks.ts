import type {
  Participant,
  RemoteTrack,
  Track,
  TrackPublication,
} from 'livekit-client';
import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Extended interface to handle LiveKit type inconsistencies
 * between local and remote participant track maps
 */
interface TypedParticipant extends Participant {
  videoTracks: Map<string, TrackPublication>;
  audioTracks: Map<string, TrackPublication>;
}

interface UseParticipantTracksOptions {
  /** The LiveKit participant to track */
  participant: Participant;
  /** Whether this is the local participant */
  isLocal: boolean;
}

interface UseParticipantTracksResult {
  /** Ref to attach to the video element */
  videoRef: React.RefObject<HTMLVideoElement | null>;
  /** Whether the video is currently muted/disabled */
  isVideoMuted: boolean;
  /** Whether we have an active video track */
  hasVideoTrack: boolean;
  /** The audio track (if available) for use with useAudioStream */
  audioTrack: Track | undefined;
}

/**
 * Hook to manage LiveKit participant video and audio tracks.
 * Handles track subscription, attachment, mute/unmute events.
 *
 * @param options - The participant and isLocal flag
 * @returns Video ref, mute state, and audio track for the participant
 */
export function useParticipantTracks({
  participant,
  isLocal,
}: UseParticipantTracksOptions): UseParticipantTracksResult {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isVideoMuted, setIsVideoMuted] = useState(
    !participant.isCameraEnabled,
  );
  const [hasVideoTrack, setHasVideoTrack] = useState(false);

  // Get audio track from participant
  const audioTrackPub = participant.audioTrackPublications
    ? Array.from(participant.audioTrackPublications.values())[0]
    : undefined;
  const audioTrack = audioTrackPub?.track;

  /**
   * Attach a video track to the video element
   */
  const attachVideoTrack = useCallback((track: Track) => {
    if (track.kind === 'video' && videoRef.current) {
      try {
        track.attach(videoRef.current);
        setHasVideoTrack(true);
      } catch {
        // Ignore attach error
      }
    }
  }, []);

  /**
   * Handle remote track subscription
   */
  const handleTrackSubscribed = useCallback(
    (track: RemoteTrack) => {
      attachVideoTrack(track);
    },
    [attachVideoTrack],
  );

  /**
   * Handle local track publication
   */
  const handleLocalTrackPublished = useCallback(
    (pub: TrackPublication) => {
      if (pub.track) {
        attachVideoTrack(pub.track);
        if (pub.kind === 'video') {
          setIsVideoMuted(false);
          setHasVideoTrack(true);
        }
      }
    },
    [attachVideoTrack],
  );

  /**
   * Handle track mute event
   */
  const handleTrackMuted = useCallback(
    (pub: TrackPublication) => {
      if (pub.kind === 'video') {
        // For local, ignore transient mute if camera is still enabled
        if (isLocal && participant.isCameraEnabled) {
          return;
        }
        setIsVideoMuted(true);
      }
    },
    [isLocal, participant.isCameraEnabled],
  );

  /**
   * Handle track unmute event
   */
  const handleTrackUnmuted = useCallback((pub: TrackPublication) => {
    if (pub.kind === 'video') {
      setIsVideoMuted(false);
      if (pub.track && videoRef.current) {
        pub.track.attach(videoRef.current);
        setHasVideoTrack(true);
      }
    }
  }, []);

  /**
   * Handle track unpublish event
   */
  const handleTrackUnpublished = useCallback((pub: TrackPublication) => {
    if (pub.kind === 'video') {
      setIsVideoMuted(true);
      setHasVideoTrack(false);
    }
  }, []);

  // Set up event listeners for track changes
  useEffect(() => {
    // Register event listeners based on participant type
    if (isLocal) {
      participant.on('localTrackPublished', handleLocalTrackPublished);
      participant.on('localTrackUnpublished', handleTrackUnpublished);
    } else {
      participant.on('trackSubscribed', handleTrackSubscribed);
      participant.on('trackUnpublished', handleTrackUnpublished);
    }

    participant.on('trackMuted', handleTrackMuted);
    participant.on('trackUnmuted', handleTrackUnmuted);

    // Initial attachment for existing tracks
    const p = participant as unknown as TypedParticipant;
    if (p.videoTracks?.values) {
      let found = false;
      for (const pub of p.videoTracks.values()) {
        const track = pub.track;
        if (track && videoRef.current) {
          track.attach(videoRef.current);
          found = true;
        }
      }
      if (found) {
        setHasVideoTrack(true);
        setIsVideoMuted(false);
      }
    }

    // Cleanup
    return () => {
      if (isLocal) {
        participant.off('localTrackPublished', handleLocalTrackPublished);
        participant.off('localTrackUnpublished', handleTrackUnpublished);
      } else {
        participant.off('trackSubscribed', handleTrackSubscribed);
        participant.off('trackUnpublished', handleTrackUnpublished);
      }
      participant.off('trackMuted', handleTrackMuted);
      participant.off('trackUnmuted', handleTrackUnmuted);
    };
  }, [
    participant,
    isLocal,
    handleLocalTrackPublished,
    handleTrackSubscribed,
    handleTrackMuted,
    handleTrackUnmuted,
    handleTrackUnpublished,
  ]);

  // Sync mute state when camera enabled state changes
  useEffect(() => {
    // For local video, avoid flickering if we have a track but property is momentarily false
    if (isLocal && hasVideoTrack && !participant.isCameraEnabled) {
      return;
    }

    const shouldBeMuted = !participant.isCameraEnabled;
    setIsVideoMuted(shouldBeMuted);

    // Force attach if camera is enabled (fallback for missed events)
    if (!shouldBeMuted && isLocal) {
      const p = participant as unknown as TypedParticipant;
      // Small timeout to allow track to be added to map if it was just published
      setTimeout(() => {
        if (p.videoTracks?.values) {
          for (const pub of p.videoTracks.values()) {
            const track = pub.track;
            if (track?.kind === 'video' && videoRef.current) {
              track.attach(videoRef.current);
              setHasVideoTrack(true);
              setIsVideoMuted(false);
            }
          }
        }
      }, 100);
    }
  }, [participant.isCameraEnabled, isLocal, participant, hasVideoTrack]);

  return {
    videoRef,
    isVideoMuted,
    hasVideoTrack,
    audioTrack,
  };
}
