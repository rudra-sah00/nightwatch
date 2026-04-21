import { Mic, MicOff, X } from 'lucide-react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
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
  const t = useTranslations('party');
  const { videoRef, videoStyle } = useParticipantView(participant);

  // Parse avatar from participant metadata
  const avatarUrl = parseAvatarFromMetadata(participant.metadata);

  const isVideoMuted = !participant.isCameraEnabled;

  const displayName =
    participant.name ||
    (participant.identity?.startsWith('guest')
      ? t('fallback.guest')
      : t('fallback.member'));

  return (
    <div className="relative w-full h-full bg-muted/30 group">
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
            'absolute top-2 left-2 z-20 px-2 py-0.5 bg-neo-yellow border-[3px] border-border rounded-md shadow-sm text-[9px] font-black font-headline text-foreground uppercase tracking-widest ',
            participant.isSpeaking && 'left-7', // Shift if speaking to not overlap
          )}
        >
          {t('participant.you')}
        </div>
      ) : null}

      {/* Avatar Fallback (shown when video is muted/unavailable) */}
      {isVideoMuted ? (
        <AvatarFallback avatarUrl={avatarUrl} name={displayName} />
      ) : null}

      {/* Bottom Overlay: Name and Controls */}
      <ParticipantOverlay
        name={displayName}
        isMicEnabled={participant.isMicrophoneEnabled}
        canKick={canKick}
        onKick={onKick ? () => onKick(participant.identity) : undefined}
        isCurrentUser={isCurrentUser}
        t={t}
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
    <div className="absolute inset-0 flex items-center justify-center bg-muted/20">
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
          <div className="w-20 h-20 rounded-full border-[3px] border-border overflow-hidden shadow-md relative">
            <Image
              src={avatarUrl}
              alt={name}
              className="object-cover"
              fill
              unoptimized
            />
          </div>
        ) : (
          <div className="w-20 h-20 rounded-full flex items-center justify-center border-[3px] border-border bg-neo-blue shadow-md">
            <span className="text-3xl font-black font-headline text-primary-foreground">
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
  isCurrentUser,
  t,
}: {
  name: string;
  isMicEnabled: boolean;
  canKick?: boolean;
  onKick?: () => void;
  isCurrentUser?: boolean;
  t: ReturnType<typeof useTranslations<'party'>>;
}) {
  const [confirmKick, setConfirmKick] = useState(false);

  return (
    <>
      <div className="absolute bottom-2 left-2 flex items-center gap-1.5 pointer-events-none">
        {/* Name Tag */}
        {!isCurrentUser && (
          <div className="bg-background/80 backdrop-blur-sm border-[3px] border-border px-2 py-0.5 shadow-lg">
            <span className="text-[9px] font-black font-headline tracking-widest uppercase text-foreground truncate max-w-[100px]">
              {name}
            </span>
          </div>
        )}

        {/* Mic Status */}
        <div className="bg-background/80 backdrop-blur-sm border-[3px] border-border p-1 shadow-lg flex items-center justify-center">
          {isMicEnabled ? (
            <Mic className="w-2.5 h-2.5 text-green-500 stroke-[3px]" />
          ) : (
            <MicOff className="w-2.5 h-2.5 text-neo-red stroke-[3px]" />
          )}
        </div>
      </div>

      {/* Kick Controls (Top Right) */}
      {canKick && onKick && (
        <div className="absolute top-2 right-2 z-20 opacity-0 group-hover:opacity-100 transition-opacity">
          {confirmKick ? (
            <div className="flex items-center gap-1">
              <Button
                type="button"
                onClick={onKick}
                className="px-2 py-1 bg-neo-red text-primary-foreground rounded-md text-[9px] font-bold font-headline uppercase tracking-widest hover:bg-neo-red/80 transition-colors shadow-sm"
              >
                {t('participant.kickConfirm')}
              </Button>
              <Button
                type="button"
                onClick={() => setConfirmKick(false)}
                className="p-1 bg-muted text-foreground rounded-md hover:bg-muted/80 transition-colors shadow-sm"
              >
                <X className="w-2.5 h-2.5 stroke-[3px]" />
              </Button>
            </div>
          ) : (
            <Button
              type="button"
              onClick={() => setConfirmKick(true)}
              className="p-1.5 bg-neo-red text-primary-foreground rounded-md hover:bg-neo-red/80 transition-colors shadow-sm"
              title={t('participant.kickUser')}
            >
              <X className="w-3 h-3 stroke-[3px]" />
            </Button>
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
        backgroundColor: '#4ade80',
        boxShadow: '0 0 12px #22c55e, 0 0 4px #000',
        border: '1.5px solid #ffffff',
      }}
    />
  );
}
