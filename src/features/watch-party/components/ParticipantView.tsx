import { Mic, MicOff } from 'lucide-react';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { useParticipantView } from '../hooks/use-participant-view';
import type { AgoraParticipant } from '../media/hooks/useAgora';

interface ParticipantViewProps {
  participant: AgoraParticipant;
  canKick?: boolean;
  onKick?: (userId: string) => void;
}

/**
 * Renders a single participant's video/audio stream with avatar fallback.
 * Uses Agora remote user tracks for video rendering.
 */
export function ParticipantView({
  participant,
  canKick,
  onKick,
}: ParticipantViewProps) {
  const { videoRef, videoStyle } = useParticipantView(participant);

  // Parse avatar from participant metadata
  const avatarUrl = parseAvatarFromMetadata(participant.metadata);

  const isVideoMuted = !participant.isCameraEnabled;

  return (
    <div className="relative w-full h-full bg-gradient-to-br from-gray-900 to-black rounded-xl overflow-hidden border border-white/10 group shadow-inner">
      {/* Video Container — Agora renders into this div */}
      <div
        ref={videoRef}
        className={cn(
          'w-full h-full transition-opacity duration-300',
          isVideoMuted ? 'opacity-0' : 'opacity-100',
        )}
        style={videoStyle}
      />

      {/* Avatar Fallback (shown when video is muted/unavailable) */}
      {isVideoMuted ? (
        <AvatarFallback
          avatarUrl={avatarUrl}
          name={participant.name || 'User'}
        />
      ) : null}

      {/* Bottom Overlay: Name and Controls */}
      <ParticipantOverlay
        name={participant.name || 'User'}
        isMicEnabled={participant.isMicrophoneEnabled}
        canKick={canKick}
        onKick={onKick ? () => onKick(participant.identity) : undefined}
      />

      {/* Speaking Indicator */}
      {participant.isSpeaking ? <SpeakingIndicator /> : null}
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
      {avatarUrl ? (
        <div className="absolute inset-0">
          <Image
            src={avatarUrl}
            alt={name}
            className="object-cover opacity-20 blur-2xl scale-110"
            fill
            unoptimized
          />
        </div>
      ) : null}

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
          <div
            className="w-20 h-20 rounded-full flex items-center justify-center shadow-2xl border-4 border-white/20"
            style={{
              background:
                'linear-gradient(to bottom right, var(--party-color), var(--ai-color))',
            }}
          >
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
            <Mic className="w-3 h-3 text-success" />
          ) : (
            <MicOff className="w-3 h-3 text-danger" />
          )}
        </div>
        {canKick && onKick ? (
          <button
            type="button"
            onClick={onKick}
            className="rounded-full px-2 py-1 backdrop-blur-sm border border-white/10 transition-colors text-[10px] font-medium text-white shadow-lg hover:opacity-90"
            style={{ backgroundColor: 'var(--danger-bg-strong)' }}
            title="Kick user"
          >
            Kick
          </button>
        ) : null}
      </div>
    </div>
  );
}

/**
 * Green pulsing indicator shown when participant is speaking
 */
function SpeakingIndicator() {
  return (
    <div
      className="absolute top-2 right-2 w-2 h-2 rounded-full animate-pulse shadow-lg"
      style={{
        backgroundColor: 'var(--success-color-strong)',
        boxShadow: '0 0 6px var(--success-glow)',
      }}
    />
  );
}
