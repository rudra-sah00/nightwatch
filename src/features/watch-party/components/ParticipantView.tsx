import type { Participant } from 'livekit-client';
import { Mic, MicOff } from 'lucide-react';
import Image from 'next/image';
import { useMemo } from 'react';
import { useAudioStream } from '@/features/watch-party/hooks/useAudioStream';
import { useParticipantTracks } from '@/features/watch-party/hooks/useParticipantTracks';
import { cn } from '@/lib/utils';

interface ParticipantViewProps {
  participant: Participant;
  isLocal: boolean;
  canKick?: boolean;
  onKick?: (userId: string) => void;
}

/**
 * Renders a single participant's video/audio stream with avatar fallback.
 * Uses useParticipantTracks for track management and useAudioStream for audio.
 */
export function ParticipantView({
  participant,
  isLocal,
  canKick,
  onKick,
}: ParticipantViewProps) {
  // Track management (video attachment, mute state)
  const { videoRef, isVideoMuted, hasVideoTrack, audioTrack } =
    useParticipantTracks({ participant, isLocal });

  // Audio stream for remote participants
  const audioRef = useAudioStream(audioTrack, isLocal);

  // Parse avatar from participant metadata
  const avatarUrl = parseAvatarFromMetadata(participant.metadata);

  // Memoize video transform style to avoid inline object recreation (rule 5.4)
  const videoStyle = useMemo(
    () => ({ transform: isLocal ? 'scaleX(-1)' : 'scaleX(1)' }),
    [isLocal],
  );

  return (
    <div className="relative w-full h-full bg-gradient-to-br from-gray-900 to-black rounded-xl overflow-hidden border border-white/10 group shadow-inner">
      {/* Video Element - Mirror local video for natural self-view, keep remote non-mirrored */}
      <video
        ref={videoRef}
        className={cn(
          'w-full h-full object-cover transition-opacity duration-300',
          isVideoMuted || !hasVideoTrack ? 'opacity-0' : 'opacity-100',
        )}
        autoPlay
        playsInline
        muted={isLocal}
        style={videoStyle}
      />

      {/* Audio element for remote participant audio */}
      <audio ref={audioRef} autoPlay muted={false} playsInline>
        <track kind="captions" />
      </audio>

      {/* Avatar Fallback (shown when video is muted/unavailable) */}
      {(isVideoMuted || !hasVideoTrack) && (
        <AvatarFallback
          avatarUrl={avatarUrl}
          name={participant.name || 'User'}
        />
      )}

      {/* Bottom Overlay: Name and Controls */}
      <ParticipantOverlay
        name={participant.name || 'User'}
        isMicEnabled={participant.isMicrophoneEnabled}
        canKick={canKick}
        onKick={onKick ? () => onKick(participant.identity) : undefined}
      />

      {/* Speaking Indicator */}
      {participant.isSpeaking && <SpeakingIndicator />}
    </div>
  );
}

/**
 * Parse avatar URL from participant metadata JSON
 */
function parseAvatarFromMetadata(metadata: string | undefined): string | null {
  if (!metadata) return null;
  try {
    const meta = JSON.parse(metadata);
    return meta.avatar || null;
  } catch {
    return null;
  }
}

/**
 * Avatar fallback component shown when video is unavailable
 */
function AvatarFallback({
  avatarUrl,
  name,
}: {
  avatarUrl: string | null;
  name: string;
}) {
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      {/* Background blur effect */}
      {avatarUrl && (
        <div className="absolute inset-0">
          <Image
            src={avatarUrl}
            alt={name}
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
              alt={name}
              className="object-cover"
              fill
              unoptimized
            />
          </div>
        ) : (
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-2xl border-4 border-white/20">
            <span className="text-3xl font-bold text-white">
              {name.charAt(0).toUpperCase()}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Bottom overlay with participant name and controls
 */
function ParticipantOverlay({
  name,
  isMicEnabled,
  canKick,
  onKick,
}: {
  name: string;
  isMicEnabled: boolean;
  canKick?: boolean;
  onKick?: () => void;
}) {
  return (
    <div className="absolute bottom-0 left-0 w-full p-2 bg-gradient-to-t from-black/90 via-black/60 to-transparent flex items-center justify-between">
      <span className="text-xs text-white font-semibold truncate max-w-[120px] drop-shadow-lg">
        {name}
      </span>
      <div className="flex items-center gap-1.5">
        <div className="flex items-center gap-1.5 bg-black/60 rounded-full px-2 py-1 backdrop-blur-sm border border-white/10">
          {isMicEnabled ? (
            <Mic className="w-3 h-3 text-green-400" />
          ) : (
            <MicOff className="w-3 h-3 text-red-400" />
          )}
        </div>
        {canKick && onKick && (
          <button
            type="button"
            onClick={onKick}
            className="bg-red-500/80 hover:bg-red-500 rounded-full px-2 py-1 backdrop-blur-sm border border-red-400/20 transition-colors text-[10px] font-medium text-white shadow-lg"
            title="Kick user"
          >
            Kick
          </button>
        )}
      </div>
    </div>
  );
}

/**
 * Green pulsing indicator shown when participant is speaking
 */
function SpeakingIndicator() {
  return (
    <div className="absolute top-2 right-2 w-2 h-2 bg-green-500 rounded-full animate-pulse shadow-lg shadow-green-500/50" />
  );
}
