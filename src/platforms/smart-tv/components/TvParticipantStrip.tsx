'use client';

import Image from 'next/image';

import { useEffect, useRef } from 'react';
import type { AgoraParticipant } from '@/features/watch-party/media/hooks/useAgora';

interface TvParticipantStripProps {
  participants: AgoraParticipant[];
}

/**
 * Floating PiP video strip for TV watch-together.
 * Shows participant camera feeds along the right edge.
 * Participants without camera show avatar + speaking indicator.
 */
export function TvParticipantStrip({ participants }: TvParticipantStripProps) {
  if (participants.length === 0) return null;

  return (
    <div className="absolute top-20 right-6 z-30 flex flex-col gap-3">
      {participants.slice(0, 6).map((p) => (
        <ParticipantTile key={p.uid} participant={p} />
      ))}
    </div>
  );
}

function ParticipantTile({ participant }: { participant: AgoraParticipant }) {
  const videoContainerRef = useRef<HTMLDivElement>(null);

  // Attach Agora video track to the container
  useEffect(() => {
    const track = participant.videoTrack;
    const container = videoContainerRef.current;
    if (!track || !container) return;

    track.play(container);

    return () => {
      while (container.firstChild) {
        container.removeChild(container.firstChild);
      }
    };
  }, [participant.videoTrack]);

  const hasVideo = participant.isCameraEnabled && participant.videoTrack;

  return (
    <div
      className={`relative w-[120px] h-[90px] rounded-xl overflow-hidden border-2 transition-colors shadow-lg ${
        participant.isSpeaking ? 'border-green-400' : 'border-white/20'
      }`}
    >
      {/* Video feed */}
      {hasVideo ? (
        <div
          ref={videoContainerRef}
          className="w-full h-full [&_video]:w-full [&_video]:h-full [&_video]:object-cover"
        />
      ) : (
        /* Avatar fallback */
        <div className="w-full h-full bg-zinc-800 flex items-center justify-center">
          {participant.metadata ? (
            <Image
              src={parseAvatar(participant.metadata)}
              alt=""
              className="w-10 h-10 rounded-full object-cover"
              width={40}
              height={40}
              unoptimized
            />
          ) : (
            <span className="text-lg font-bold text-white/60">
              {participant.name?.charAt(0).toUpperCase() || '?'}
            </span>
          )}
        </div>
      )}

      {/* Speaking indicator ring */}
      {participant.isSpeaking && (
        <div className="absolute inset-0 rounded-xl ring-2 ring-green-400 animate-pulse pointer-events-none" />
      )}

      {/* Name + mic badge */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent px-2 py-1 flex items-center gap-1">
        <span className="text-[10px] font-bold text-white truncate flex-1">
          {participant.name || 'Guest'}
        </span>
        {!participant.isMicrophoneEnabled && (
          <span className="material-symbols-outlined text-[10px] text-red-400">
            mic_off
          </span>
        )}
      </div>
    </div>
  );
}

function parseAvatar(metadata?: string): string {
  if (!metadata) return '';
  try {
    const data = JSON.parse(metadata);
    return data.profilePhoto || data.avatar || '';
  } catch {
    return '';
  }
}
