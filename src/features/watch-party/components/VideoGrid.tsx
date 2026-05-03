import { Video } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useMemo } from 'react';
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
  const sorted = useMemo(
    () =>
      [...participants].sort((a, b) => {
        if (a.identity === hostId) return -1;
        if (b.identity === hostId) return 1;
        return 0;
      }),
    [participants, hostId],
  );

  const t = useTranslations('party.video');

  if (sorted.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center py-12 text-center px-4">
        <div className="w-16 h-16 border-[3px] border-border rounded-full bg-background shadow-sm flex items-center justify-center mb-4">
          <Video className="w-8 h-8 text-muted-foreground stroke-2" />
        </div>
        <p className="font-semibold font-headline uppercase tracking-widest text-lg text-foreground">
          {t('noOneOnCamera')}
        </p>
        <p className="text-muted-foreground text-xs font-medium mt-2 max-w-[200px]">
          {t('turnOnCamera')}
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 no-scrollbar bg-transparent">
      <div className="grid grid-cols-1 gap-4">
        {sorted.map((participant) => (
          <div
            key={participant.identity}
            className="w-full aspect-video border-[3px] border-border rounded-xl bg-background shadow-sm overflow-hidden relative"
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
