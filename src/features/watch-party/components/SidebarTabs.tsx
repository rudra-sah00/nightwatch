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
                'flex-1 py-2.5 px-1 text-xs font-medium transition-colors duration-200 relative z-10 rounded-lg',
                isActive ? 'text-white' : 'text-white/40 hover:text-white/80',
              )}
            >
              <div className="flex flex-col items-center justify-center gap-1">
                <div className="relative">
                  <Icon
                    className={cn(
                      'w-4 h-4 transition-transform duration-200',
                      isActive && 'scale-110',
                    )}
                  />
                  {'badge' in tab &&
                  tab.badge !== undefined &&
                  tab.badge > 0 ? (
                    <span
                      className="absolute -top-1.5 -right-1.5 min-w-[14px] h-3.5 px-0.5 rounded-full text-[9px] font-bold text-white flex items-center justify-center leading-none"
                      style={{ backgroundColor: 'var(--wp-badge)' }}
                    >
                      {tab.badge > 99 ? '99+' : tab.badge}
                    </span>
                  ) : null}
                </div>
                <span className="leading-none">{tab.label}</span>
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
