import { Video } from 'lucide-react';
import type { AgoraParticipant } from '../media/hooks/useAgora';
import { ParticipantView } from './ParticipantView';

interface VideoGridProps {
  participants: AgoraParticipant[];
  currentUserId?: string;
  hostId?: string;
  isHost?: boolean;
  onKick?: (userId: string) => void;
}

/**
 * Grid of participant video tiles
 * Displays Agora participants in a responsive grid layout
 */
export function VideoGrid({
  participants,
  currentUserId,
  hostId,
  isHost,
  onKick,
}: VideoGridProps) {
  // Sort so the host is always first
  const sorted = [...participants].sort((a, b) => {
    if (a.identity === hostId) return -1;
    if (b.identity === hostId) return 1;
    return 0;
  });

  if (sorted.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center py-12 text-center px-4">
        <div className="w-16 h-16 border-[4px] border-[#1a1a1a] bg-white flex items-center justify-center mb-4 neo-shadow">
          <Video className="w-8 h-8 stroke-[3px] text-[#1a1a1a]" />
        </div>
        <p className="font-black font-headline uppercase tracking-widest text-lg text-[#1a1a1a]">
          No one on camera yet
        </p>
        <p className="text-[#4a4a4a] text-xs font-bold font-headline uppercase tracking-widest mt-2 max-w-[200px]">
          Turn on your camera or wait for others to join
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 no-scrollbar bg-[#f5f0e8]">
      <div className="grid grid-cols-1 gap-4">
        {sorted.map((participant) => (
          <div
            key={participant.identity}
            className="w-full aspect-video border-[4px] border-[#1a1a1a] bg-[#f5f0e8] overflow-hidden neo-shadow"
          >
            <ParticipantView
              participant={participant}
              canKick={isHost && participant.identity !== currentUserId}
              onKick={onKick}
              isCurrentUser={participant.identity === currentUserId}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
