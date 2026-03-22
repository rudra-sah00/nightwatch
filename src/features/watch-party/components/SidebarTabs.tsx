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

  const _activeIndex = tabs.findIndex((t) => t.id === activeTab);

  return (
    <div className="flex border-b-[4px] border-[#1a1a1a] bg-white shrink-0">
      {tabs.map((tab, _idx) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;

        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onTabChange(tab.id)}
            className={cn(
              'flex-1 py-3 px-1 transition-colors relative border-r-[4px] border-[#1a1a1a] last:border-r-0 flex flex-col items-center justify-center gap-1.5',
              isActive
                ? 'bg-[#ffcc00] text-[#1a1a1a]'
                : 'bg-white text-[#1a1a1a] hover:bg-[#f5f0e8]',
            )}
          >
            <div className="relative">
              <Icon className="w-5 h-5 stroke-[3px]" />
              {'badge' in tab && tab.badge !== undefined && tab.badge > 0 ? (
                <span className="absolute -top-2 -right-3 min-w-[20px] h-5 px-1 bg-[#e63b2e] border-[2px] border-[#1a1a1a] text-[10px] font-black font-headline text-white flex items-center justify-center leading-none neo-shadow-sm">
                  {tab.badge > 99 ? '99+' : tab.badge}
                </span>
              ) : null}
            </div>
          </button>
        );
      })}
    </div>
  );
}
