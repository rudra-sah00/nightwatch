import {
  MessageSquare,
  PenTool,
  Settings,
  Shield,
  Volume2,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { useWatchPartySettings } from '../hooks/use-watch-party-settings';
import {
  updateMemberPermissions,
  updatePartyPermissions,
} from '../room/services/watch-party.api';
import type { RoomMember, WatchPartyRoom } from '../room/types';

// Simple Toggle Switch built with Tailwind
interface SwitchProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
}

function Switch({ checked, onCheckedChange, disabled }: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onCheckedChange(!checked)}
      className={cn(
        'peer inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-[outline]:ring-2 disabled:cursor-not-allowed disabled:opacity-50 ring-indigo-500',
        checked ? 'bg-indigo-500' : 'bg-zinc-700',
      )}
    >
      <span
        data-state={checked ? 'checked' : 'unchecked'}
        className={cn(
          'pointer-events-none block h-4 w-4 rounded-full bg-white shadow-lg ring-0 transition-transform',
          checked ? 'translate-x-4' : 'translate-x-0',
        )}
      />
    </button>
  );
}

export interface WatchPartySettingsProps {
  room: WatchPartyRoom;
  isHost: boolean;
}

export function WatchPartySettings({ room, isHost }: WatchPartySettingsProps) {
  const { isOpen, setIsOpen } = useWatchPartySettings();

  // If not host, maybe don't even render the button, or render it disabled (we'll just not render it in parent)
  if (!isHost) return null;

  const handleGlobalPermissionToggle = (
    key: keyof WatchPartyRoom['permissions'],
    value: boolean,
  ) => {
    updatePartyPermissions({ [key]: value });
  };

  const handleUserPermissionToggle = (
    memberId: string,
    key: keyof NonNullable<RoomMember['permissions']>,
    value: boolean,
  ) => {
    updateMemberPermissions(memberId, { [key]: value });
  };

  // Only guests should be listed in individual overrides (don't list the host)
  const guests = room.members.filter((m) => m.id !== room.hostId);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <button
          type="button"
          className="px-3 flex items-center justify-center gap-2 py-2 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-xl transition-colors"
          title="Room Settings"
        >
          <Settings aria-hidden="true" className="w-4 h-4" />
        </button>
      </DialogTrigger>

      <DialogContent className="max-w-md bg-zinc-950 border-white/10 text-white shadow-2xl overflow-hidden p-0">
        <DialogHeader className="p-6 border-b border-white/10 bg-zinc-900/50">
          <DialogTitle className="flex items-center gap-2">
            <Shield aria-hidden="true" className="w-5 h-5 text-indigo-400" />
            Watch Party Settings
          </DialogTitle>
        </DialogHeader>

        <div className="max-h-[70vh] overflow-y-auto custom-scrollbar p-6 space-y-8">
          {/* Global Permissions */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-white/50">
              Global Permissions for Guests
            </h3>

            <div className="space-y-3 bg-zinc-900/50 rounded-xl p-4 border border-white/5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <PenTool className="w-4 h-4 text-white/70" />
                  <div>
                    <p className="text-sm font-medium">Sketch Board</p>
                    <p className="text-xs text-white/40">
                      Allow guests to draw on the video overlay
                    </p>
                  </div>
                </div>
                <Switch
                  checked={room.permissions.canGuestsDraw}
                  onCheckedChange={(v) =>
                    handleGlobalPermissionToggle('canGuestsDraw', v)
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Volume2 className="w-4 h-4 text-white/70" />
                  <div>
                    <p className="text-sm font-medium">Soundboard</p>
                    <p className="text-xs text-white/40">
                      Allow guests to play trending sounds
                    </p>
                  </div>
                </div>
                <Switch
                  checked={room.permissions.canGuestsPlaySounds}
                  onCheckedChange={(v) =>
                    handleGlobalPermissionToggle('canGuestsPlaySounds', v)
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <MessageSquare className="w-4 h-4 text-white/70" />
                  <div>
                    <p className="text-sm font-medium">Live Chat</p>
                    <p className="text-xs text-white/40">
                      Allow guests to send chat messages
                    </p>
                  </div>
                </div>
                <Switch
                  checked={room.permissions.canGuestsChat}
                  onCheckedChange={(v) =>
                    handleGlobalPermissionToggle('canGuestsChat', v)
                  }
                />
              </div>
            </div>
          </div>

          {/* Individual Overrides */}
          {guests.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-white/50">
                Individual Guest Overrides
              </h3>

              <div className="space-y-2">
                {guests.map((guest) => (
                  <div
                    key={guest.id}
                    className="bg-zinc-900/50 rounded-xl p-4 border border-white/5 flex flex-col gap-4"
                  >
                    <div className="flex items-center gap-3 border-b border-white/5 pb-3">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shrink-0">
                        <span className="text-xs font-bold text-white">
                          {guest.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <span className="text-sm font-medium pr-2 truncate text-white">
                        {guest.name}
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      <div className="flex flex-col items-center gap-2">
                        <span className="text-xs text-white/50">Sketch</span>
                        <Switch
                          checked={
                            guest.permissions?.canDraw ??
                            room.permissions.canGuestsDraw
                          }
                          onCheckedChange={(v) =>
                            handleUserPermissionToggle(guest.id, 'canDraw', v)
                          }
                        />
                      </div>
                      <div className="flex flex-col items-center gap-2">
                        <span className="text-xs text-white/50">Sounds</span>
                        <Switch
                          checked={
                            guest.permissions?.canPlaySound ??
                            room.permissions.canGuestsPlaySounds
                          }
                          onCheckedChange={(v) =>
                            handleUserPermissionToggle(
                              guest.id,
                              'canPlaySound',
                              v,
                            )
                          }
                        />
                      </div>
                      <div className="flex flex-col items-center gap-2">
                        <span className="text-xs text-white/50">Chat</span>
                        <Switch
                          checked={
                            guest.permissions?.canChat ??
                            room.permissions.canGuestsChat
                          }
                          onCheckedChange={(v) =>
                            handleUserPermissionToggle(guest.id, 'canChat', v)
                          }
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
