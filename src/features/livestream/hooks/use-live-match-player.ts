'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';
import type { LiveMatch } from '@/features/livestream/types';
import { useWatchParty } from '@/features/watch-party/room/hooks/useWatchParty';
import { generateRoomId } from '@/features/watch-party/room/utils';
import { env } from '@/lib/env';
import { useAuth } from '@/providers/auth-provider';

/**
 * Hook for live match playback actions.
 * Extracted from the app layer to the livestream feature.
 */
export function useLiveMatchPlayer(match: LiveMatch | null, matchId: string) {
  const router = useRouter();
  const { user } = useAuth();
  const { createRoom } = useWatchParty();
  const [isCreatingParty, setIsCreatingParty] = useState(false);

  const handleCreateParty = async () => {
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

    const roomId = generateRoomId();

    createRoom(roomId, {
      contentId: matchId,
      title: `${match.team1.name} vs ${match.team2.name}`,
      type: 'livestream',
      streamUrl: proxyUrl,
      posterUrl: match.team1.avatar,
    })
      .then((response) => {
        setIsCreatingParty(false);
        if (response) {
          toast.success('Party room created! Redirecting...');
          router.push(`/watch-party/${response.id}?new=true`);
        } else {
          toast.error('Failed to create party room');
        }
      })
      .catch((err) => {
        setIsCreatingParty(false);
        toast.error(
          err instanceof Error ? err.message : 'Failed to create party room',
        );
      });
  };

  return { isCreatingParty, handleCreateParty };
}
