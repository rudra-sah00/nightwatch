import { Video } from 'lucide-react';
import type { AgoraParticipant } from '../hooks/useAgora';
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
        <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-center mb-4">
          <Video className="w-6 h-6 text-white/30" />
        </div>
        <p className="text-white/50 text-sm font-medium">
          No one on camera yet
        </p>
        <p className="text-white/30 text-xs mt-1.5 max-w-[200px]">
          Turn on your camera or wait for others to join
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-3 custom-scrollbar">
      <div className="grid grid-cols-1 gap-2">
        {sorted.map((participant) => (
          <div
            key={participant.identity}
            className="w-full aspect-video rounded-xl overflow-hidden bg-zinc-900 ring-1 ring-white/5"
          >
            <ParticipantView
              participant={participant}
              isLocal={participant.identity === currentUserId}
              canKick={isHost && participant.identity !== currentUserId}
              onKick={onKick}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
