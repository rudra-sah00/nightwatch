import { cn } from '@/lib/utils';
import { useSidebarTabs } from '../hooks/use-sidebar-tabs';

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
  const { tabs } = useSidebarTabs(unreadMessages);

  const activeIndex = tabs.findIndex((t) => t.id === activeTab);

  return (
    <div
      className="backdrop-blur-sm border-b shrink-0 px-2 pt-2"
      style={{
        background: 'var(--wp-tab-bg)',
        borderColor: 'var(--wp-tab-border)',
      }}
    >
      <div className="flex relative">
        {/* Animated pill background */}
        <div
          className="absolute top-0 bottom-0 rounded-lg transition-[left,width] duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]"
          style={{
            background: 'var(--wp-tab-pill)',
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
                'flex-1 py-3 px-1 sm:px-4 text-sm font-medium transition-colors duration-200 relative z-10 rounded-lg',
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
                    <span
                      className="absolute -top-1 -right-1 w-2 h-2 rounded-full animate-pulse"
                      style={{
                        backgroundColor: 'var(--wp-badge)',
                        outline: '2px solid var(--wp-badge-ring)',
                      }}
                    />
                  ) : null}
                </div>
              </div>
            </button>
          );
        })}
      </div>
      {/* Bottom accent line */}
      <div
        className="h-px mt-2"
        style={{
          background:
            'linear-gradient(to right, transparent, var(--wp-divider), transparent)',
        }}
      />
    </div>
  );
}
