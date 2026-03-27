import { cn } from '@/lib/utils';
import { useSidebarTabs } from '../hooks/use-sidebar-tabs';

interface SidebarTabsProps {
  activeTab: 'chat' | 'participants' | 'soundboard' | 'sketch';
  onTabChange: (tab: 'chat' | 'participants' | 'soundboard' | 'sketch') => void;
}

export function SidebarTabs({ activeTab, onTabChange }: SidebarTabsProps) {
  const { tabs } = useSidebarTabs();

  return (
    <div className="flex border-b-[4px] border-[#1a1a1a] bg-white shrink-0">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;

        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onTabChange(tab.id)}
            aria-label={`${tab.label} Tab`}
            className={cn(
              'flex-1 py-3 px-1 transition-colors relative border-r-[4px] border-[#1a1a1a] last:border-r-0 flex flex-col items-center justify-center gap-1.5',
              isActive
                ? 'bg-[#ffcc00] text-[#1a1a1a]'
                : 'bg-white text-[#1a1a1a] hover:bg-[#f5f0e8]',
            )}
          >
            <div className="relative">
              <Icon className="w-5 h-5 stroke-[3px]" />
            </div>
          </button>
        );
      })}
    </div>
  );
}
