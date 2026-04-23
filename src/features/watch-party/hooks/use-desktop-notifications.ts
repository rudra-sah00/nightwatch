import { useTranslations } from 'next-intl';
import { useEffect, useRef, useState } from 'react';
import type {
  ChatMessage,
  WatchPartyRoom,
} from '@/features/watch-party/room/types';
import { checkIsDesktop, desktopBridge } from '@/lib/electron-bridge';

interface UseDesktopNotificationsProps {
  room: WatchPartyRoom | null;
  isConnected: boolean;
  messages: ChatMessage[];
  currentUserId?: string;
}

export function useDesktopNotifications({
  room,
  isConnected,
  messages,
  currentUserId,
}: UseDesktopNotificationsProps) {
  // --- Discord Rich Presence ---
  const td = useTranslations('party.desktop');
  useEffect(() => {
    if (
      typeof window !== 'undefined' &&
      checkIsDesktop() &&
      room &&
      isConnected
    ) {
      desktopBridge.updateDiscordPresence({
        details: td('partyDetails', { title: room.title }),
        state:
          room.type === 'series'
            ? td('seasonEpisode', {
                season: room.season ?? 0,
                episode: room.episode ?? 0,
              })
            : room.type === 'livestream'
              ? td('coWatchingLiveStream')
              : td('coWatchingMovie'),
        largeImageText: room.title,
        largeImageKey: 'nightwatch_logo', // Safe fallback because discord-rpc drops invalid keys/urls
        partySize: room.members?.length || 1,
        partyMax: 10,
        startTimestamp: room.createdAt || Date.now(),
      });
    }
  }, [room, isConnected, td]);

  // --- Taskbar Notification Icon Bounces ---
  const isWindowFocusedRef = useRef(true);
  const [, setUnreadCount] = useState(0);

  useEffect(() => {
    if (typeof window !== 'undefined' && checkIsDesktop()) {
      const unsubFocus = desktopBridge.onWindowFocus(() => {
        isWindowFocusedRef.current = true;
        setUnreadCount(0);
        desktopBridge.setUnreadBadge(0);
      });
      const unsubBlur = desktopBridge.onWindowBlur(() => {
        isWindowFocusedRef.current = false;
      });
      return () => {
        unsubFocus();
        unsubBlur();
      };
    }
  }, []);

  const prevMessagesLength = useRef(messages?.length || 0);

  useEffect(() => {
    if (messages && messages.length > prevMessagesLength.current) {
      if (!isWindowFocusedRef.current) {
        // Taskbar Bounce
        setUnreadCount((c) => {
          const added = messages.length - prevMessagesLength.current;
          const next = c + added;
          desktopBridge.setUnreadBadge(next);
          return next;
        });

        // Trigger Real OS Native Toast Notification for the latest message
        const latestMsg = messages[messages.length - 1];
        // We only want to show toasts for actual human text messages (not 'User joined' system messages)
        if (
          latestMsg &&
          latestMsg.userId !== currentUserId &&
          !latestMsg.isSystem
        ) {
          desktopBridge.showNotification({
            title: latestMsg.userName || td('newMessage'),
            body: latestMsg.content,
          });
        }
      }
    }
    prevMessagesLength.current = messages?.length || 0;
  }, [messages, currentUserId, td]);
}
