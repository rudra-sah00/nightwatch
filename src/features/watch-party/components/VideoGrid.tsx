import type { Participant } from 'livekit-client';
import { ParticipantView } from './ParticipantView';

interface VideoGridProps {
  participants: Participant[];
  currentUserId?: string;
}

/**
 * Grid of participant video tiles
 * Displays LiveKit participants in a single-column layout
 */
export function VideoGrid({ participants, currentUserId }: VideoGridProps) {
  if (participants.length === 0) {
    return (
      <div className="py-8 text-center text-white/30 text-xs italic">
        No active participants
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-2 space-y-2 custom-scrollbar bg-black/20">
      {participants.map((participant) => (
        <div key={participant.identity} className="w-full aspect-video">
          <ParticipantView
            participant={participant}
            isLocal={participant.identity === currentUserId}
          />
        </div>
      ))}
    </div>
  );
}
