'use client';

import { MessageSquare, PenTool, Users, Volume2 } from 'lucide-react';
import { useMemo } from 'react';

export function useSidebarTabs(unreadMessages: number) {
  const tabs = useMemo(
    () => [
      {
        id: 'participants' as const,
        label: 'People',
        icon: Users,
      },
      {
        id: 'chat' as const,
        label: 'Chat',
        icon: MessageSquare,
        badge: unreadMessages,
      },
      {
        id: 'soundboard' as const,
        label: 'Soundboard',
        icon: Volume2,
      },
      {
        id: 'sketch' as const,
        label: 'Sketch',
        icon: PenTool,
      },
    ],
    [unreadMessages],
  );

  return { tabs };
}
