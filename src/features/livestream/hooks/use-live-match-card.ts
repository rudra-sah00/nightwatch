'use client';

import { useRouter } from 'next/navigation';
import { useFormatter, useTranslations } from 'next-intl';
import { useState } from 'react';
import { toast } from 'sonner';
import { createPartyRoom } from '@/features/watch-party/room/services/watch-party.api';
import { generateRoomId } from '@/features/watch-party/room/utils';
import { useAuth } from '@/providers/auth-provider';
import type { LiveMatch } from '../types';

/**
 * Provides interaction logic for a single live match card.
 *
 * Derives display state (live/ended/upcoming, formatted times), manages the
 * watch prompt modal, and handles solo watch navigation and watch party
 * creation via the backend API.
 *
 * @param match - The live match data to derive state from.
 * @returns Computed display flags, formatted strings, modal state, and action handlers.
 */
export function useLiveMatchCard(match: LiveMatch) {
  const router = useRouter();
  const { user } = useAuth();
  const t = useTranslations('live');
  const tp = useTranslations('party.toasts');
  const format = useFormatter();

  const isLive = match.status === 'MatchIng';
  const isEnded = match.status === 'MatchEnded';
  const isUpcoming = match.status === 'MatchNotStart';
  const isLivestream =
    match.id.startsWith('live-server1') || match.id.startsWith('lt:');
  const canWatch =
    match.channelStatus !== 'offline' &&
    (isLive || isLivestream) &&
    (match.playType === 'PlayTypeVideo' ||
      isLivestream ||
      match.playType === 'hls');

  const startTime = new Date(match.startTime);
  const formattedTime = format.dateTime(startTime, {
    hour: '2-digit',
    minute: '2-digit',
  });
  const formattedDate = format.dateTime(startTime, {
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
      toast.error(t('loginRequired'));
      setShowPrompt(false);
      return;
    }

    setIsCreatingParty(true);
    const proxyUrl = match.playPath?.startsWith('https://')
      ? match.playPath
      : `/api/livestream/playlist.m3u8?url=${encodeURIComponent(match.playPath || '')}&token=LIVESTREAM`;
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
        toast.success(t('creating'));
        router.push(`/watch-party/${response.room.id}?new=true`);
      } else {
        toast.error(response.error || tp('failedCreateRoom'));
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
