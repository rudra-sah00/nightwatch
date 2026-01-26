import {
  type Participant,
  type RemoteTrack,
  Track,
  type TrackPublication,
} from 'livekit-client';
import { Mic, MicOff } from 'lucide-react';
import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

// Extended interface to handle LiveKit type inconsistencies
interface TypedParticipant extends Participant {
  videoTracks: Map<string, TrackPublication>;
  audioTracks: Map<string, TrackPublication>;
}

interface ParticipantViewProps {
  participant: Participant;
  isLocal: boolean;
}

export function ParticipantView({
  participant,
  isLocal,
}: ParticipantViewProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isVideoMuted, setIsVideoMuted] = useState(
    !participant.isCameraEnabled,
  );
  const [hasVideoTrack, setHasVideoTrack] = useState(false);

  // Parse metadata for avatar
  let avatarUrl: string | null = null;
  try {
    if (participant.metadata) {
      const meta = JSON.parse(participant.metadata);
      avatarUrl = meta.avatar;
    }
  } catch (_e) {
    // ignore
  }

  useEffect(() => {
    const handleTrackAttached = (track: Track) => {
      console.log(`[ParticipantView] Attaching ${track.kind} for ${participant.identity}`);

      if (track.kind === Track.Kind.Video && videoRef.current) {
        try {
          track.attach(videoRef.current);
          setHasVideoTrack(true);
          console.log(`[ParticipantView] Video Attached!`);
        } catch (e) {
          console.error(`[ParticipantView] Video Attach Error:`, e);
        }
      }
      if (track.kind === Track.Kind.Audio && audioRef.current && !isLocal) {
        track.attach(audioRef.current);
        audioRef.current.play().catch((e) => console.warn("Audio Play Error:", e));
        console.log(`[ParticipantView] Audio Attached!`);
      }
    };

    // Remote: Subscribed
    const handleTrackSubscribed = (track: RemoteTrack) => {
      handleTrackAttached(track);
    };

    // Local: Published
    const handleLocalTrackPublished = (pub: TrackPublication) => {
      if (pub.track) {
        handleTrackAttached(pub.track);
        if (pub.kind === Track.Kind.Video) {
          setIsVideoMuted(false);
          setHasVideoTrack(true);
        }
      }
    };

    // Mute Status
    const handleTrackMuted = (pub: TrackPublication) => {
      if (pub.kind === Track.Kind.Video) {
        // For local, ignore transient mute if camera is still enabled
        if (isLocal && participant.isCameraEnabled) {
          return;
        }
        setIsVideoMuted(true);
      }
    };

    const handleTrackUnmuted = (pub: TrackPublication) => {
      if (pub.kind === Track.Kind.Video) {
        setIsVideoMuted(false);
        if (pub.track && videoRef.current) {
          pub.track.attach(videoRef.current);
          setHasVideoTrack(true);
        }
      }
    };

    const handleTrackUnpublished = (pub: TrackPublication) => {
      if (pub.kind === Track.Kind.Video) {
        setIsVideoMuted(true);
        setHasVideoTrack(false);
      }
    };

    // Listeners
    if (isLocal) {
      // LocalParticipant uses 'localTrackPublished' event
      participant.on('localTrackPublished', handleLocalTrackPublished);
      participant.on('localTrackUnpublished', handleTrackUnpublished);
    } else {
      participant.on('trackSubscribed', handleTrackSubscribed);
      participant.on('trackUnpublished', handleTrackUnpublished);
    }

    participant.on('trackMuted', handleTrackMuted);
    participant.on('trackUnmuted', handleTrackUnmuted);

    // Initial Attach (Check both Local and Remote logic)
    const p = participant as unknown as TypedParticipant;
    if (p.videoTracks) {
      let found = false;
      Array.from(p.videoTracks.values()).forEach((pub: TrackPublication) => {
        const track = pub.track;
        if (track) {
          if (videoRef.current) track.attach(videoRef.current);
          found = true;
        }
      });
      if (found) {
        setHasVideoTrack(true);
        setIsVideoMuted(false);
      }
    }

    // Audio Initial
    if (p.audioTracks && !isLocal) {
      Array.from(p.audioTracks.values()).forEach((pub: TrackPublication) => {
        if (pub.track) {
          if (audioRef.current) pub.track.attach(audioRef.current);
        }
      });
    }

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
  }, [participant, isLocal]);

  // Sync mute state initially in case it changed before effect
  useEffect(() => {
    // For local video, avoid flickering to mute if we have a track but property is momentarily false
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
        if (p.videoTracks) {
          Array.from(p.videoTracks.values()).forEach(
            (pub: TrackPublication) => {
              const track = pub.track;
              if (track?.kind === Track.Kind.Video) {
                if (videoRef.current) track.attach(videoRef.current);
                setHasVideoTrack(true);
                setIsVideoMuted(false);
              }
            },
          );
        }
      }, 100);
    }
  }, [participant.isCameraEnabled, isLocal, participant, hasVideoTrack]);

  return (
    <div className="relative w-full h-full bg-black/50 rounded-lg overflow-hidden border border-white/10 group">
      {/* Video Element */}
      <video
        ref={videoRef}
        className={cn(
          'w-full h-full object-cover transition-opacity duration-300',
          isVideoMuted || !hasVideoTrack ? 'opacity-0' : 'opacity-100',
        )}
        autoPlay
        playsInline
        muted={isLocal}
      />
      <audio ref={audioRef} autoPlay>
        <track kind="captions" />
      </audio>

      {/* Fallback Avatar / Skeleton */}
      {(isVideoMuted || !hasVideoTrack) && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-900 -z-10">
          {avatarUrl ? (
            <Image
              src={avatarUrl}
              alt={participant.name || 'User'}
              className="object-cover opacity-50 blur-sm scale-110"
              fill
              unoptimized
            />
          ) : null}

          <div className="absolute inset-0 flex items-center justify-center">
            {avatarUrl ? (
              <div className="w-16 h-16 rounded-full border-2 border-white/20 overflow-hidden shadow-lg relative">
                <Image
                  src={avatarUrl}
                  alt={participant.name || 'User'}
                  className="object-cover"
                  fill
                  unoptimized
                />
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2">
                <div className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center animate-pulse">
                  <span className="text-2xl font-bold text-white">
                    {(participant.name || participant.identity || '?')
                      .charAt(0)
                      .toUpperCase()}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Overlay Info */}
      <div className="absolute bottom-0 left-0 w-full p-2 bg-gradient-to-t from-black/80 to-transparent flex items-center justify-between">
        <span className="text-xs text-white font-medium truncate max-w-[80px] shadow-sm">
          {participant.name || participant.identity}
        </span>
        <div className="flex items-center gap-1.5 bg-black/40 rounded-full px-1.5 py-0.5 backdrop-blur-sm">
          {participant.isMicrophoneEnabled ? (
            <Mic className="w-3 h-3 text-green-400" />
          ) : (
            <MicOff className="w-3 h-3 text-red-400" />
          )}
        </div>
      </div>

      {/* Speaking Indicator */}
      {participant.isSpeaking && (
        <div className="absolute top-2 right-2 w-2 h-2 bg-green-500 rounded-full animate-pulse shadow-lg shadow-green-500/50" />
      )}
    </div>
  );
}
