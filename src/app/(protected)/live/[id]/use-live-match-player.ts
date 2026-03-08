'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';
import type { LiveMatch } from '@/features/livestream/types';
import { createPartyRoom } from '@/features/watch-party/room/services/watch-party.api';
import { env } from '@/lib/env';
import { useAuth } from '@/providers/auth-provider';

export function useLiveMatchPlayer(match: LiveMatch | null, matchId: string) {
  const router = useRouter();
  const { user } = useAuth();
  const [isCreatingParty, setIsCreatingParty] = useState(false);

  const handleCreateParty = () => {
    if (!user) {
      toast.error('You must be logged in to host a watch party.');
      return;
    }

    if (!match || !match.playPath) {
      toast.error('Cannot create watch party: Stream URL not available yet.');
      return;
    }

    setIsCreatingParty(true);
    const proxyUrl = `${env.BACKEND_URL}/api/livestream/playlist.m3u8?url=${encodeURIComponent(match.playPath)}&token=LIVESTREAM`;

    createPartyRoom(
      {
        contentId: matchId,
        title: `${match.team1.name} vs ${match.team2.name}`,
        type: 'livestream',
        streamUrl: proxyUrl,
        posterUrl: match.team1.avatar,
      },
      (response) => {
        setIsCreatingParty(false);
        if (response.success && response.room) {
          toast.success('Party room created! Redirecting...');
          router.push(`/watch-party/${response.room.id}?new=true`);
        } else {
          toast.error(response.error || 'Failed to create party room');
        }
      },
    );
  };

  return { isCreatingParty, handleCreateParty };
}
