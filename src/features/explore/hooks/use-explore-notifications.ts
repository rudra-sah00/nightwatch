'use client';

import { useEffect, useState } from 'react';
import { useSocket } from '@/providers/socket-provider';

/**
 * Tracks unread explore notifications (replies, mentions, reactions to your posts).
 * Resets when user navigates to /explore.
 */
export function useExploreNotifications() {
  const [unreadCount, setUnreadCount] = useState(0);
  const { socket } = useSocket();

  useEffect(() => {
    if (!socket) return;

    const increment = () => setUnreadCount((c) => c + 1);

    socket.on('explore:reply', increment);
    socket.on('explore:mention', increment);
    socket.on('explore:reaction', increment);

    return () => {
      socket.off('explore:reply', increment);
      socket.off('explore:mention', increment);
      socket.off('explore:reaction', increment);
    };
  }, [socket]);

  const clearBadge = () => setUnreadCount(0);

  return { unreadCount, clearBadge };
}
