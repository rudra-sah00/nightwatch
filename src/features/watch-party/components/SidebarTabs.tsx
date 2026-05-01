import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { useSidebarTabs } from '../hooks/use-sidebar-tabs';

/**
 * Props for the {@link SidebarTabs} component.
 */
interface SidebarTabsProps {
  /** The currently active sidebar tab. */
  activeTab: 'chat' | 'participants' | 'soundboard' | 'sketch';
  /** Callback invoked when the user selects a different tab. */
  onTabChange: (tab: 'chat' | 'participants' | 'soundboard' | 'sketch') => void;
}

/**
 * Renders a horizontal tab bar for the watch party sidebar.
 *
 * Displays icon-based tabs (participants, chat, soundboard, sketch) with
 * neo-brutalist styling. The active tab is visually highlighted.
 *
 * @param props - The active tab state and change handler.
 * @returns A tab bar element for sidebar navigation.
 */
export function SidebarTabs({ activeTab, onTabChange }: SidebarTabsProps) {
  const { tabs } = useSidebarTabs();
  const t = useTranslations('party.tabs');

  return (
    <div className="flex border-b border-border bg-background shrink-0">
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
            aria-label={t('tabAriaLabel', { label: tab.label })}
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
