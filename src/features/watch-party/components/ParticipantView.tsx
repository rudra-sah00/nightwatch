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
    <div className="relative w-full h-full bg-background group">
      {/* Video Container — Agora renders into this div */}
      <div
        ref={videoRef}
        className={cn(
          'w-full h-full transition-opacity duration-300',
          isVideoMuted ? 'opacity-0' : 'opacity-100',
        )}
        style={videoStyle}
      />

      {/* Speaking Indicator (Top Left) */}
      {participant.isSpeaking ? <SpeakingIndicator /> : null}

      {/* You badge */}
      {isCurrentUser ? (
        <div
          className={cn(
            'absolute top-2 left-2 z-20 px-1.5 py-0.5 bg-selected border-[2px] border-foreground text-[9px] font-black font-headline text-white uppercase tracking-widest neo-shadow-sm',
            participant.isSpeaking && 'left-6', // Shift if speaking to not overlap
          )}
        >
          You
        </div>
      ) : null}

      {/* Avatar Fallback (shown when video is muted/unavailable) */}
      {isVideoMuted ? (
        <AvatarFallback
          avatarUrl={avatarUrl}
          name={
            participant.name ||
            (participant.identity?.startsWith('guest') ? 'Guest' : 'Member')
          }
        />
      ) : null}

      {/* Bottom Overlay: Name and Controls */}
      <ParticipantOverlay
        name={
          participant.name ||
          (participant.identity?.startsWith('guest') ? 'Guest' : 'Member')
        }
        isMicEnabled={participant.isMicrophoneEnabled}
        canKick={canKick}
        onKick={onKick ? () => onKick(participant.identity) : undefined}
      />
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
    <div className="absolute inset-0 flex items-center justify-center bg-background">
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
          <div className="w-20 h-20 rounded-full border-[3px] border-foreground overflow-hidden neo-shadow-sm relative">
            <Image
              src={avatarUrl}
              alt={name}
              className="object-cover"
              fill
              unoptimized
            />
          </div>
        ) : (
          <div className="w-20 h-20 rounded-full flex items-center justify-center neo-shadow-sm border-[3px] border-foreground bg-host">
            <span className="text-3xl font-black font-headline text-foreground">
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
    <>
      <div className="absolute bottom-2 left-2 flex items-center gap-1.5 pointer-events-none">
        {/* Name Tag */}
        <div className="bg-[#1a1a1a]/80 backdrop-blur-sm border-[2px] border-white/20 px-2 py-0.5 shadow-lg">
          <span className="text-[9px] font-black font-headline tracking-widest uppercase text-white truncate max-w-[100px]">
            {name}
          </span>
        </div>

        {/* Mic Status */}
        <div className="bg-foreground/80 backdrop-blur-sm border-[2px] border-white/20 p-1 shadow-lg">
          {isMicEnabled ? (
            <Mic className="w-2.5 h-2.5 text-success-strong" />
          ) : (
            <MicOff className="w-2.5 h-2.5 text-danger" />
          )}
        </div>
      </div>

      {/* Kick Controls (Top Right) */}
      {canKick && onKick && (
        <div className="absolute top-2 right-2 z-20 opacity-0 group-hover:opacity-100 transition-opacity">
          {confirmKick ? (
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={onKick}
                className="px-2 py-1 bg-danger text-white border-[2px] border-foreground text-[9px] font-black font-headline uppercase tracking-widest neo-shadow-sm hover:bg-foreground transition-all"
              >
                Kick!
              </button>
              <button
                type="button"
                onClick={() => setConfirmKick(false)}
                className="p-1 bg-host border-[2px] border-foreground neo-shadow-sm hover:bg-white transition-all"
              >
                <X className="w-2.5 h-2.5 text-foreground stroke-[3px]" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmKick(true)}
              className="p-1.5 bg-danger text-white border-[2px] border-foreground hover:bg-foreground transition-all neo-shadow-sm"
              title="Kick user"
            >
              <X className="w-3 h-3 stroke-[3px]" />
            </button>
          )}
        </div>
      )}
    </>
  );
}

/**
 * Green pulsing indicator shown when participant is speaking
 */
function SpeakingIndicator() {
  return (
    <div
      className="absolute top-2 left-2 w-2.5 h-2.5 rounded-full animate-pulse z-30 pointer-events-none"
      style={{
        backgroundColor: 'var(--success-color-strong)',
        boxShadow: '0 0 12px var(--success-glow), 0 0 4px #000',
        border: '1.5px solid var(--foreground)',
      }}
    />
  );
}
