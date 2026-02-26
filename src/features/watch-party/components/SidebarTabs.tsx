import { MessageSquare, PenTool, Users, Volume2 } from 'lucide-react';
import { useMemo } from 'react';
import { cn } from '@/lib/utils';

interface SidebarTabsProps {
  activeTab: 'chat' | 'participants' | 'soundboard' | 'sketch';
  onTabChange: (tab: 'chat' | 'participants' | 'soundboard' | 'sketch') => void;
  unreadMessages?: number;
}

export function SidebarTabs({
  activeTab,
  onTabChange,
  unreadMessages = 0,
}: SidebarTabsProps) {
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

  const activeIndex = tabs.findIndex((t) => t.id === activeTab);

  return (
    <div className="bg-zinc-900/80 backdrop-blur-sm border-b border-white/5 shrink-0 px-2 pt-2">
      <div className="flex relative">
        {/* Animated pill background */}
        <div
          className="absolute top-0 bottom-0 bg-white/10 rounded-lg transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]"
          style={{
            left: `${activeIndex * 25}%`,
            width: '25%',
          }}
        />

        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onTabChange(tab.id)}
              className={cn(
                'flex-1 py-3 px-1 sm:px-4 text-sm font-medium transition-all duration-200 relative z-10 rounded-lg',
                isActive ? 'text-white' : 'text-white/40 hover:text-white/80',
              )}
            >
              <div className="flex flex-col sm:flex-row items-center justify-center gap-1.5 sm:gap-2">
                <div className="relative">
                  <Icon
                    className={cn(
                      'w-5 h-5 sm:w-4 sm:h-4 transition-transform duration-200',
                      isActive && 'scale-110',
                    )}
                  />
                  {'badge' in tab &&
                  tab.badge !== undefined &&
                  tab.badge > 0 ? (
                    <span className="absolute -top-1 -right-1 w-2 h-2 bg-indigo-500 rounded-full animate-pulse ring-2 ring-zinc-900" />
                  ) : null}
                </div>
              </div>
            </button>
          );
        })}
      </div>
      {/* Bottom accent line */}
      <div className="h-px bg-gradient-to-r from-transparent via-white/10 to-transparent mt-2" />
    </div>
  );
}
