'use client';

import { useEffect } from 'react';
import { toast } from 'sonner';
import { useSocket } from '@/providers/socket-provider';

/**
 * Global toast notifications for friend events and incoming messages.
 * Mount once in the main layout — shows toasts regardless of current route.
 */
export function useFriendNotifications() {
  const { socket } = useSocket();

  useEffect(() => {
    if (!socket) return;

    const onNewMessage = (data: { senderId: string; content: string }) => {
      // Don't toast if user is currently viewing that chat
      const params = new URLSearchParams(window.location.search);
      const currentChat = params.get('f');
      if (currentChat === data.senderId) return;

      const preview =
        data.content.length > 50
          ? `${data.content.slice(0, 50)}…`
          : data.content;
      toast.message('New message', { description: preview });
    };

    const onRequestReceived = () => {
      toast.info('New friend request received');
    };

    const onRequestAccepted = () => {
      toast.success('Friend request accepted!');
    };

    const onCallIncoming = (data: { callerName: string }) => {
      toast.info(`${data.callerName} is calling you...`);
    };

    socket.on('message:new', onNewMessage);
    socket.on('friend:request_received', onRequestReceived);
    socket.on('friend:request_accepted', onRequestAccepted);
    socket.on('call:incoming', onCallIncoming);

    return () => {
      socket.off('message:new', onNewMessage);
      socket.off('friend:request_received', onRequestReceived);
      socket.off('friend:request_accepted', onRequestAccepted);
      socket.off('call:incoming', onCallIncoming);
    };
  }, [socket]);
}
