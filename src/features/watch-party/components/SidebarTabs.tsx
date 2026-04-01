import { Button } from '@/components/ui/button';
import { useSidebarTabs } from '../hooks/use-sidebar-tabs';

interface SidebarTabsProps {
  activeTab: 'chat' | 'participants' | 'soundboard' | 'sketch';
  onTabChange: (tab: 'chat' | 'participants' | 'soundboard' | 'sketch') => void;
}

export function SidebarTabs({ activeTab, onTabChange }: SidebarTabsProps) {
  const { tabs } = useSidebarTabs();

  return (
    <div className="flex border-b border-border bg-white shrink-0">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;

        return (
          <Button
            key={tab.id}
            type="button"
            variant={isActive ? 'neo-yellow' : 'neo-ghost'}
            size="default"
            onClick={() => onTabChange(tab.id)}
            aria-label={`${tab.label} Tab`}
            className="flex-1 rounded-none flex flex-col items-center justify-center gap-1.5 h-auto py-3"
          >
            <div className="relative">
              <Icon className="w-5 h-5 stroke-[3px]" />
            </div>
          </Button>
        );
      })}
    </div>
  );
}
