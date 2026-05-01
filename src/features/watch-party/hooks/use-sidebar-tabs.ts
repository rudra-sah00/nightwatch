'use client';

import { MessageSquare, PenTool, Users, Volume2 } from 'lucide-react';
import { useMemo } from 'react';

/**
 * Hook providing the static tab definitions for the watch party sidebar.
 *
 * Returns a memoized array of tab objects, each containing an `id`, display `label`,
 * and Lucide `icon` component for: participants, chat, soundboard, and sketch.
 *
 * @returns An object containing the `tabs` array.
 */
export function useSidebarTabs() {
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
    [],
  );

  return { tabs };
}
