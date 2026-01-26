import { MessageSquare, Users } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SidebarTabsProps {
  activeTab: 'chat' | 'participants';
  onTabChange: (tab: 'chat' | 'participants') => void;
  participantCount: number;
}

export function SidebarTabs({
  activeTab,
  onTabChange,
  participantCount,
}: SidebarTabsProps) {
  return (
    <div className="relative bg-gradient-to-b from-black/80 to-black/40 border-b border-white/10 shrink-0">
      <div className="flex relative items-stretch">
        {/* Tabs Container */}
        <div className="flex flex-1 relative">
          {/* Animated sliding indicator */}
          <div
            className="absolute bottom-0 h-0.5 bg-primary transition-all duration-500 ease-out shadow-[0_0_12px_rgba(var(--primary),0.6)]"
            style={{
              left: activeTab === 'chat' ? '12.5%' : '62.5%',
              width: '25%',
            }}
          />

          {/* Chat Tab */}
          <button
            type="button"
            onClick={() => onTabChange('chat')}
            className={cn(
              'flex-1 py-4 text-sm font-medium transition-all duration-300 relative overflow-hidden group',
              activeTab === 'chat'
                ? 'text-white'
                : 'text-white/40 hover:text-white/70',
            )}
          >
            <div
              className={cn(
                'absolute inset-0 bg-gradient-to-b from-primary/0 to-primary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300',
                activeTab === 'chat' && 'opacity-100',
              )}
            />

            <div className="flex items-center justify-center gap-2 relative z-10">
              <MessageSquare
                className={cn(
                  'w-4 h-4 transition-all duration-500',
                  activeTab === 'chat' ? 'scale-110 text-primary' : 'scale-100',
                )}
              />
              <span
                className={cn(
                  'transition-all duration-300',
                  activeTab === 'chat' && 'font-semibold',
                )}
              >
                Chat
              </span>
            </div>
          </button>

          {/* Participants Tab */}
          <button
            type="button"
            onClick={() => onTabChange('participants')}
            className={cn(
              'flex-1 py-4 text-sm font-medium transition-all duration-300 relative overflow-hidden group',
              activeTab === 'participants'
                ? 'text-white'
                : 'text-white/40 hover:text-white/70',
            )}
          >
            <div
              className={cn(
                'absolute inset-0 bg-gradient-to-b from-primary/0 to-primary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300',
                activeTab === 'participants' && 'opacity-100',
              )}
            />

            <div className="flex items-center justify-center gap-2 relative z-10">
              <Users
                className={cn(
                  'w-4 h-4 transition-all duration-500',
                  activeTab === 'participants'
                    ? 'scale-110 text-primary'
                    : 'scale-100',
                )}
              />
              <span
                className={cn(
                  'transition-all duration-300',
                  activeTab === 'participants' && 'font-semibold',
                )}
              >
                Participants
              </span>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
