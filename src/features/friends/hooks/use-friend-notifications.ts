'use client';

import { useTranslations } from 'next-intl';
import { useEffect } from 'react';
import { toast } from 'sonner';
import { useSocket } from '@/providers/socket-provider';

/**
 * Global toast notifications for friend events and incoming calls.
 * Mount once in the main layout — shows toasts regardless of current route.
 */
export function useFriendNotifications() {
  const { socket } = useSocket();
  const t = useTranslations('common');

  useEffect(() => {
    if (!socket) return;

    const onRequestReceived = () => {
      toast.info(t('friendNotifications.newRequest'));
    };

    const onRequestAccepted = () => {
      toast.success(t('friendNotifications.requestAccepted'));
    };

    const onCallIncoming = (data: { callerName: string }) => {
      toast.info(
        t('friendNotifications.incomingCall', { name: data.callerName }),
      );
    };

    socket.on('friend:request_received', onRequestReceived);
    socket.on('friend:request_accepted', onRequestAccepted);
    socket.on('call:incoming', onCallIncoming);

    return () => {
      socket.off('friend:request_received', onRequestReceived);
      socket.off('friend:request_accepted', onRequestAccepted);
      socket.off('call:incoming', onCallIncoming);
    };
  }, [socket, t]);
}
