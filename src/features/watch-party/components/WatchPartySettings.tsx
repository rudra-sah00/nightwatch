import { MessageSquare, PenTool, Settings, Volume2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { useWatchPartySettings } from '../hooks/use-watch-party-settings';
import type { RTMMessage } from '../media/hooks/useAgoraRtm';
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
        'peer inline-flex h-6 w-12 shrink-0 cursor-pointer items-center border-[3px] border-border transition-colors focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 ring-0 p-0 m-0',
        checked ? 'bg-[#ffcc00]' : 'bg-background',
      )}
    >
      <span
        data-state={checked ? 'checked' : 'unchecked'}
        className={cn(
          'pointer-events-none block h-4 w-4 bg-[#1a1a1a] transition-transform',
          checked ? 'translate-x-[22px]' : 'translate-x-[2px]',
        )}
      />
    </button>
  );
}

export interface WatchPartySettingsProps {
  room: WatchPartyRoom;
  isHost: boolean;
  /** Whether the floating chat overlay is enabled (shown when sidebar is closed) */
  floatingChatEnabled?: boolean;
  onToggleFloatingChat?: () => void;
  rtmSendMessage?: (msg: RTMMessage) => void;
}

export function WatchPartySettings({
  room,
  isHost,
  floatingChatEnabled = false,
  onToggleFloatingChat,
  rtmSendMessage,
}: WatchPartySettingsProps) {
  const { isOpen, setIsOpen } = useWatchPartySettings();

  const handleGlobalPermissionToggle = (
    key: keyof WatchPartyRoom['permissions'],
    value: boolean,
  ) => {
    // Direct update with no mapping needed - backend schema now matches frontend types
    updatePartyPermissions(room.id, { [key]: value }).then((response) => {
      if (response.permissions && rtmSendMessage) {
        rtmSendMessage({
          type: 'PERMISSIONS_UPDATED',
          permissions: response.permissions,
        });
      }
    });
  };

  const handleUserPermissionToggle = (
    memberId: string,
    key: keyof NonNullable<RoomMember['permissions']>,
    value: boolean,
  ) => {
    const member = room.members.find((m) => m.id === memberId);
    if (!member) return;

    // Merge existing permissions with the new toggle value
    const currentPerms = member.permissions || {};
    const globalPerms = room.permissions;

    const merged = {
      canDraw:
        (key === 'canDraw' ? value : currentPerms.canDraw) ??
        globalPerms.canGuestsDraw,
      canPlaySound:
        (key === 'canPlaySound' ? value : currentPerms.canPlaySound) ??
        globalPerms.canGuestsPlaySounds,
      canChat:
        (key === 'canChat' ? value : currentPerms.canChat) ??
        globalPerms.canGuestsChat,
    };

    // Schema expects all three fields with specific names
    updateMemberPermissions(room.id, memberId, merged).then((response) => {
      if (response.permissions && rtmSendMessage) {
        rtmSendMessage({
          type: 'MEMBER_PERMISSIONS_UPDATED',
          memberId,
          permissions: response.permissions,
        });
      }
    });
  };

  // Only guests should be listed in individual overrides (don't list the host)
  const guests = room.members.filter((m) => m.id !== room.hostId);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          type="button"
          variant="none"
          size="none"
          className="px-3 flex items-center justify-center gap-2 py-2 bg-white text-foreground border-[3px] border-border hover:bg-[#ffe066] rounded-none transition-colors"
          title="Room Access & Permissions"
        >
          <Settings aria-hidden="true" className="w-5 h-5 stroke-[3px]" />
        </Button>
      </DialogTrigger>

      <DialogContent
        aria-describedby={undefined}
        showCloseButton={false}
        className="max-w-md bg-white border-[4px] border-border text-foreground  p-0 rounded-none overflow-hidden m-4 w-[calc(100%-2rem)]"
      >
        <DialogHeader className="p-4 md:p-6 border-b-[4px] border-border bg-[#ffcc00] m-0 flex flex-row items-center justify-between">
          <DialogTitle className="flex items-center gap-3 font-black font-headline uppercase tracking-tighter text-xl">
            <Settings aria-hidden="true" className="w-6 h-6 stroke-[3px]" />
            Room Settings
          </DialogTitle>
          <DialogClose asChild>
            <Button
              type="button"
              variant="neo-outline"
              size="none"
              className="p-1.5 bg-white hover:bg-[#e63b2e] hover:text-white"
            >
              <X className="w-5 h-5 stroke-[3.5px]" />
            </Button>
          </DialogClose>
        </DialogHeader>

        <div className="max-h-[70vh] overflow-y-auto custom-scrollbar p-4 md:p-6 space-y-8 bg-white">
          {/* Personal Preferences — visible to all users */}
          {onToggleFloatingChat !== undefined ? (
            <div className="space-y-4">
              <h3 className="text-sm font-black font-headline uppercase tracking-widest text-foreground flex items-center gap-2 border-b-[3px] border-border pb-2">
                <MessageSquare className="w-5 h-5 stroke-[3px]" />
                Personal
              </h3>
              <div className="bg-background border-[3px] border-border p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <MessageSquare className="w-5 h-5 text-foreground stroke-[3px]" />
                    <div className="flex flex-col">
                      <p className="text-sm font-black font-headline uppercase tracking-widest text-foreground leading-none">
                        Floating chat
                      </p>
                      <p className="text-[10px] md:text-xs font-bold font-headline uppercase tracking-widest text-[#4a4a4a] mt-1">
                        Show chat overlay when closed
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={floatingChatEnabled}
                    onCheckedChange={() => onToggleFloatingChat?.()}
                  />
                </div>
              </div>
            </div>
          ) : null}

          {isHost ? (
            <div className="space-y-8">
              {/* Global Permissions */}
              <div className="space-y-4">
                <h3 className="text-sm font-black font-headline uppercase tracking-widest text-foreground border-b-[3px] border-border pb-2">
                  Global Permissions for Guests
                </h3>

                <div className="space-y-3 bg-background border-[3px] border-border p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <PenTool className="w-5 h-5 text-foreground stroke-[3px]" />
                      <div className="flex flex-col">
                        <p className="text-sm font-black font-headline uppercase tracking-widest text-foreground leading-none">
                          Sketch Board
                        </p>
                        <p className="text-[10px] md:text-xs font-bold font-headline uppercase tracking-widest text-[#4a4a4a] mt-1">
                          Allow guests to draw on video
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

                  <div className="flex items-center justify-between border-t-[2px] border-border/10 pt-3">
                    <div className="flex items-center gap-3">
                      <Volume2 className="w-5 h-5 text-foreground stroke-[3px]" />
                      <div className="flex flex-col">
                        <p className="text-sm font-black font-headline uppercase tracking-widest text-foreground leading-none">
                          Soundboard
                        </p>
                        <p className="text-[10px] md:text-xs font-bold font-headline uppercase tracking-widest text-[#4a4a4a] mt-1">
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

                  <div className="flex items-center justify-between border-t-[2px] border-border/10 pt-3">
                    <div className="flex items-center gap-3">
                      <MessageSquare className="w-5 h-5 text-foreground stroke-[3px]" />
                      <div className="flex flex-col">
                        <p className="text-sm font-black font-headline uppercase tracking-widest text-foreground leading-none">
                          Live Chat
                        </p>
                        <p className="text-[10px] md:text-xs font-bold font-headline uppercase tracking-widest text-[#4a4a4a] mt-1">
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
                  <h3 className="text-sm font-black font-headline uppercase tracking-widest text-foreground border-b-[3px] border-border pb-2">
                    Individual Guest Overrides
                  </h3>

                  <div className="space-y-3">
                    {guests.map((guest) => (
                      <div
                        key={guest.id}
                        className="bg-white border-[3px] border-border p-4 flex flex-col gap-4 "
                      >
                        <div className="flex items-center gap-3 border-b-[3px] border-border pb-3">
                          <div className="w-8 h-8 bg-[#0055ff] border-[2px] border-border flex items-center justify-center shrink-0">
                            <span className="text-xs font-black font-headline uppercase tracking-widest text-white">
                              {guest.name.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <span className="text-sm font-black font-headline uppercase tracking-widest pr-2 truncate text-foreground">
                            {guest.name}
                          </span>
                        </div>

                        <div className="grid grid-cols-3 gap-2">
                          <div className="flex flex-col items-center gap-3">
                            <span className="text-[10px] md:text-xs font-bold font-headline uppercase tracking-widest text-[#4a4a4a]">
                              Sketch
                            </span>
                            <Switch
                              checked={
                                guest.permissions?.canDraw ??
                                room.permissions.canGuestsDraw
                              }
                              onCheckedChange={(v) =>
                                handleUserPermissionToggle(
                                  guest.id,
                                  'canDraw',
                                  v,
                                )
                              }
                            />
                          </div>
                          <div className="flex flex-col items-center gap-3 border-l-[2px] border-border/10">
                            <span className="text-[10px] md:text-xs font-bold font-headline uppercase tracking-widest text-[#4a4a4a]">
                              Sounds
                            </span>
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
                          <div className="flex flex-col items-center gap-3 border-l-[2px] border-border/10">
                            <span className="text-[10px] md:text-xs font-bold font-headline uppercase tracking-widest text-[#4a4a4a]">
                              Chat
                            </span>
                            <Switch
                              checked={
                                guest.permissions?.canChat ??
                                room.permissions.canGuestsChat
                              }
                              onCheckedChange={(v) =>
                                handleUserPermissionToggle(
                                  guest.id,
                                  'canChat',
                                  v,
                                )
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
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
