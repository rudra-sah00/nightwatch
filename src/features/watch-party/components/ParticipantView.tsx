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
  canKick?: boolean;
  onKick?: (userId: string) => void;
}

export function ParticipantView({
  participant,
  isLocal,
  canKick,
  onKick,
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
      if (track.kind === Track.Kind.Video && videoRef.current) {
        try {
          track.attach(videoRef.current);
          setHasVideoTrack(true);
        } catch (_e) {
          // Ignore attach error
        }
      }
      if (track.kind === Track.Kind.Audio && audioRef.current && !isLocal) {
        track.attach(audioRef.current);
        audioRef.current.play().catch(() => {});
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
    <div className="relative w-full h-full bg-gradient-to-br from-gray-900 to-black rounded-xl overflow-hidden border border-white/10 group shadow-inner">
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
        style={{ transform: 'scaleX(1)' }} // Explicitly disable mirroring (user request)
      />
      <audio ref={audioRef} autoPlay>
        <track kind="captions" />
      </audio>

      {/* Fallback Avatar / Skeleton */}
      {(isVideoMuted || !hasVideoTrack) && (
        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
          {/* Background blur effect */}
          {avatarUrl && (
            <div className="absolute inset-0">
              <Image
                src={avatarUrl}
                alt={participant.name || 'User'}
                className="object-cover opacity-20 blur-2xl scale-110"
                fill
                unoptimized
              />
            </div>
          )}

          {/* Centered Avatar */}
          <div className="relative z-10 flex items-center justify-center">
            {avatarUrl ? (
              <div className="w-20 h-20 rounded-full border-4 border-white/20 overflow-hidden shadow-2xl relative">
                <Image
                  src={avatarUrl}
                  alt={participant.name || 'User'}
                  className="object-cover"
                  fill
                  unoptimized
                />
              </div>
            ) : (
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-2xl border-4 border-white/20">
                <span className="text-3xl font-bold text-white">
                  {(participant.name || 'U').charAt(0).toUpperCase()}
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Overlay Info */}
      <div className="absolute bottom-0 left-0 w-full p-2 bg-gradient-to-t from-black/90 via-black/60 to-transparent flex items-center justify-between">
        <span className="text-xs text-white font-semibold truncate max-w-[120px] drop-shadow-lg">
          {participant.name || 'User'}
        </span>
        <div className="flex items-center gap-1.5">
          <div className="flex items-center gap-1.5 bg-black/60 rounded-full px-2 py-1 backdrop-blur-sm border border-white/10">
            {participant.isMicrophoneEnabled ? (
              <Mic className="w-3 h-3 text-green-400" />
            ) : (
              <MicOff className="w-3 h-3 text-red-400" />
            )}
          </div>
          {canKick && onKick && (
            <button
              type="button"
              onClick={() => onKick(participant.identity)}
              className="bg-red-500/80 hover:bg-red-500 rounded-full px-2 py-1 backdrop-blur-sm border border-red-400/20 transition-colors text-[10px] font-medium text-white shadow-lg"
              title="Kick user"
            >
              Kick
            </button>
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
