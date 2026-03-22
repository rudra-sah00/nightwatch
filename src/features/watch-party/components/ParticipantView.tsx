import { Mic, MicOff, X } from 'lucide-react';
import Image from 'next/image';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { useParticipantView } from '../hooks/use-participant-view';
import type { AgoraParticipant } from '../media/hooks/useAgora';

interface ParticipantViewProps {
  participant: AgoraParticipant;
  canKick?: boolean;
  onKick?: (userId: string) => void;
  isCurrentUser?: boolean;
}

/**
 * Renders a single participant's video/audio stream with avatar fallback.
 * Uses Agora remote user tracks for video rendering.
 */
export function ParticipantView({
  participant,
  canKick,
  onKick,
  isCurrentUser = false,
}: ParticipantViewProps) {
  const { videoRef, videoStyle } = useParticipantView(participant);

  // Parse avatar from participant metadata
  const avatarUrl = parseAvatarFromMetadata(participant.metadata);

  const isVideoMuted = !participant.isCameraEnabled;

  return (
    <div className="relative w-full h-full bg-[#f5f0e8] group">
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

      {/* You badge */}
      {isCurrentUser ? (
        <div className="absolute top-2 left-2 px-1.5 py-0.5 bg-[var(--wp-send-btn,#0055ff)] border-[2px] border-[#1a1a1a] text-[9px] font-black font-headline text-white uppercase tracking-widest neo-shadow-sm">
          You
        </div>
      ) : null}
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
    <div className="absolute inset-0 flex items-center justify-center bg-[#f5f0e8]">
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
          <div className="w-20 h-20 rounded-full border-[3px] border-[#1a1a1a] overflow-hidden neo-shadow-sm relative">
            <Image
              src={avatarUrl}
              alt={name}
              className="object-cover"
              fill
              unoptimized
            />
          </div>
        ) : (
          <div className="w-20 h-20 rounded-full flex items-center justify-center neo-shadow-sm border-[3px] border-[#1a1a1a] bg-[var(--wp-send-btn,#ffcc00)]">
            <span className="text-3xl font-black font-headline text-[#1a1a1a]">
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
  const [confirmKick, setConfirmKick] = useState(false);

  return (
    <div className="absolute bottom-0 left-0 w-full p-2 bg-white border-t-[3px] border-[#1a1a1a] flex items-center justify-between">
      <span className="text-[10px] font-black font-headline tracking-widest uppercase text-[#1a1a1a] truncate max-w-[120px]">
        {name}
      </span>
      <div className="flex items-center gap-1.5">
        <div className="flex items-center gap-1.5 bg-white border-[2px] border-[#1a1a1a] neo-shadow-sm px-2 py-0.5">
          {isMicEnabled ? (
            <Mic className="w-3 h-3 text-success" />
          ) : (
            <MicOff className="w-3 h-3 text-danger" />
          )}
        </div>
        {canKick && onKick ? (
          confirmKick ? (
            <div className="flex items-center gap-1 animate-in fade-in duration-150">
              <button
                type="button"
                onClick={onKick}
                className="px-2 py-0.5 border-[2px] border-[#1a1a1a] text-[9px] font-black font-headline uppercase tracking-widest text-white bg-[#e63b2e] hover:bg-[#1a1a1a] transition-colors neo-shadow-sm"
                title="Confirm remove"
              >
                Remove
              </button>
              <button
                type="button"
                onClick={() => setConfirmKick(false)}
                className="p-1 px-1.5 bg-white border-[2px] border-[#1a1a1a] hover:bg-[#ffe066] transition-colors neo-shadow-sm"
                title="Cancel"
              >
                <X className="w-2.5 h-2.5 text-[#1a1a1a] stroke-[3px]" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmKick(true)}
              className="px-2 py-0.5 border-[2px] border-[#1a1a1a] transition-colors text-[9px] font-black font-headline uppercase tracking-widest text-[#1a1a1a] bg-white hover:bg-[#ffe066] neo-shadow-sm"
              title="Kick user"
            >
              Kick
            </button>
          )
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
