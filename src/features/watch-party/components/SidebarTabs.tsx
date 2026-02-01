import { MessageSquare, Users } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SidebarTabsProps {
  activeTab: 'chat' | 'participants';
  onTabChange: (tab: 'chat' | 'participants') => void;
  participantCount: number;
  unreadMessages?: number;
}

export function SidebarTabs({
  activeTab,
  onTabChange,
  participantCount,
  unreadMessages = 0,
}: SidebarTabsProps) {
  const tabs = [
    {
      id: 'participants' as const,
      label: 'People',
      icon: Users,
      count: participantCount,
    },
    {
      id: 'chat' as const,
      label: 'Chat',
      icon: MessageSquare,
      badge: unreadMessages,
    },
  ];

  const activeIndex = tabs.findIndex((t) => t.id === activeTab);

  return (
    <div className="bg-zinc-900/80 backdrop-blur-sm border-b border-white/5 shrink-0 px-2 pt-2">
      <div className="flex relative">
        {/* Animated pill background */}
        <div
          className="absolute top-0 bottom-0 bg-white/10 rounded-lg transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]"
          style={{
            left: `${activeIndex * 50}%`,
            width: '50%',
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
                'flex-1 py-2.5 px-4 text-sm font-medium transition-all duration-200 relative z-10 rounded-lg',
                isActive ? 'text-white' : 'text-white/50 hover:text-white/80',
              )}
            >
              <div className="flex items-center justify-center gap-2">
                <Icon
                  className={cn(
                    'w-4 h-4 transition-transform duration-200',
                    isActive && 'scale-110',
                  )}
                />
                <span>{tab.label}</span>
                {'count' in tab && tab.count !== undefined && tab.count > 0 && (
                  <span
                    className={cn(
                      'text-xs px-1.5 py-0.5 rounded-full min-w-[20px] text-center transition-colors duration-200',
                      isActive
                        ? 'bg-white/20 text-white'
                        : 'bg-white/10 text-white/60',
                    )}
                  >
                    {tab.count}
                  </span>
                )}
                {'badge' in tab && tab.badge !== undefined && tab.badge > 0 && (
                  <span className="w-2 h-2 bg-primary rounded-full animate-pulse" />
                )}
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
