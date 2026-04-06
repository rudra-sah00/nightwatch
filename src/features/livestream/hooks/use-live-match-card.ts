'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';
import { createPartyRoom } from '@/features/watch-party/room/services/watch-party.api';
import { generateRoomId } from '@/features/watch-party/room/utils';
import { useAuth } from '@/providers/auth-provider';
import type { LiveMatch } from '../types';

export function useLiveMatchCard(match: LiveMatch) {
  const router = useRouter();
  const { user } = useAuth();

  const isLive = match.status === 'MatchIng';
  const isEnded = match.status === 'MatchEnded';
  const isUpcoming = match.status === 'MatchNotStart';
  const isServer2 = match.id.startsWith('pm:');
  // Server 2 always shows WATCH button, S1 depends on status
  const canWatch =
    (isLive || isServer2) && (match.playType === 'PlayTypeVideo' || isServer2);

  const startTime = new Date(match.startTime);
  const formattedTime = startTime.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });
  const formattedDate = startTime.toLocaleDateString([], {
    month: 'short',
    day: 'numeric',
  });

  const [showPrompt, setShowPrompt] = useState(false);
  const [isCreatingParty, setIsCreatingParty] = useState(false);

  const handleWatchClick = (e: React.MouseEvent) => {
    if (!canWatch) return;
    e.preventDefault();
    e.stopPropagation();
    setShowPrompt(true);
  };

  const handleWatchSolo = () => {
    setShowPrompt(false);
    const title =
      match.contentKind === 'channel' || match.type === 'all_channels'
        ? match.channelName || match.team1.name
        : `${match.team1.name} vs ${match.team2.name}`;
    router.push(`/live/${match.id}?title=${encodeURIComponent(title)}`);
  };

  const handleWatchParty = () => {
    if (!user) {
      toast.error('You must be logged in to host a watch party.');
      setShowPrompt(false);
      return;
    }

    setIsCreatingParty(true);
    const proxyUrl = `/api/livestream/playlist.m3u8?url=${encodeURIComponent(match.playPath || '')}&token=LIVESTREAM`;
    const roomTitle =
      match.contentKind === 'channel' || match.type === 'all_channels'
        ? match.channelName || match.team1.name
        : `${match.team1.name} vs ${match.team2.name}`;

    const roomId = generateRoomId();

    createPartyRoom(roomId, {
      contentId: match.id,
      title: roomTitle,
      type: 'livestream',
      streamUrl: proxyUrl,
      posterUrl: match.team1.avatar,
    }).then((response) => {
      setIsCreatingParty(false);
      setShowPrompt(false);
      if (response.room) {
        toast.success('Party room created! Redirecting...');
        router.push(`/watch-party/${response.room.id}?new=true`);
      } else {
        toast.error(response.error || 'Failed to create party room');
      }
    });
  };

  return {
    isLive,
    isEnded,
    isUpcoming,
    canWatch,
    formattedTime,
    formattedDate,
    showPrompt,
    setShowPrompt,
    isCreatingParty,
    handleWatchClick,
    handleWatchSolo,
    handleWatchParty,
  };
}
