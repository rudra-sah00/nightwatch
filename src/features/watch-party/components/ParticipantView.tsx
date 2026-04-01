import { Mic, MicOff, X } from 'lucide-react';
import Image from 'next/image';
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
  const { videoRef, videoStyle } = useParticipantView(participant);

  // Parse avatar from participant metadata
  const avatarUrl = parseAvatarFromMetadata(participant.metadata);

  const isVideoMuted = !participant.isCameraEnabled;

  return (
    <div className="relative w-full h-full bg-gray-100 group">
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
            'absolute top-2 left-2 z-20 px-2 py-0.5 bg-blue-500 rounded-md shadow-sm text-[9px] font-bold font-headline text-white uppercase tracking-widest ',
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
    <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
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
          <div className="w-20 h-20 rounded-full border-2 border-white overflow-hidden shadow-md relative">
            <Image
              src={avatarUrl}
              alt={name}
              className="object-cover"
              fill
              unoptimized
            />
          </div>
        ) : (
          <div className="w-20 h-20 rounded-full flex items-center justify-center border-2 border-white bg-blue-500 shadow-md">
            <span className="text-3xl font-black font-headline text-white">
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
        <div className="bg-[#1a1a1a]/80 backdrop-blur-sm border-[2px] border-white/20 p-1 shadow-lg">
          {isMicEnabled ? (
            <Mic className="w-2.5 h-2.5 text-green-400" />
          ) : (
            <MicOff className="w-2.5 h-2.5 text-red-500" />
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
                className="px-2 py-1 bg-red-500 text-white rounded-md text-[9px] font-bold font-headline uppercase tracking-widest hover:bg-red-600 transition-all shadow-sm"
              >
                Kick!
              </Button>
              <Button
                type="button"
                onClick={() => setConfirmKick(false)}
                className="p-1 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition-all shadow-sm"
              >
                <X className="w-2.5 h-2.5 stroke-[3px]" />
              </Button>
            </div>
          ) : (
            <Button
              type="button"
              onClick={() => setConfirmKick(true)}
              className="p-1.5 bg-red-500 text-white rounded-md hover:bg-red-600 transition-all shadow-sm"
              title="Kick user"
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
