import { Settings } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
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
  label?: string;
}

function Switch({ checked, onCheckedChange, disabled, label }: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onCheckedChange(!checked)}
      className={cn(
        'relative inline-flex h-8 w-16 shrink-0 cursor-pointer items-center rounded-full transition-colors focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50',
        checked ? 'bg-neo-blue' : 'bg-secondary',
      )}
    >
      <span
        className={cn(
          'inline-flex h-6 w-6 transform rounded-full bg-background shadow transition-transform',
          checked ? 'translate-x-9' : 'translate-x-1',
        )}
      />
    </button>
  );
}

interface WatchPartySettingsProps {
  room: WatchPartyRoom;
  isHost: boolean;
  /** Whether the floating chat overlay is enabled (shown when sidebar is closed) */
  floatingChatEnabled?: boolean;
  onToggleFloatingChat?: () => void;
  /** Whether floating participant tiles are enabled (shown when sidebar is closed) */
  floatingTilesEnabled?: boolean;
  onToggleFloatingTiles?: () => void;
  rtmSendMessage?: (msg: RTMMessage) => void;
}

export function WatchPartySettings({
  room,
  isHost,
  floatingChatEnabled = false,
  onToggleFloatingChat,
  floatingTilesEnabled = true,
  onToggleFloatingTiles,
  rtmSendMessage,
}: WatchPartySettingsProps) {
  const t = useTranslations('party');
  const { isOpen, setIsOpen } = useWatchPartySettings();

  const handleGlobalPermissionToggle = (
    key: keyof WatchPartyRoom['permissions'],
    value: boolean,
  ) => {
    // Direct update with no mapping needed - backend schema now matches frontend types
    updatePartyPermissions(room.id, { [key]: value })
      .then((response) => {
        if (response.permissions && rtmSendMessage) {
          rtmSendMessage({
            type: 'PERMISSIONS_UPDATED',
            permissions: response.permissions,
          });

          // Optimistically update local room state for host
          window.dispatchEvent(
            new CustomEvent('LOCAL_PERMISSIONS_UPDATED', {
              detail: { permissions: response.permissions },
            }),
          );
        }
      })
      .catch(() => {
        toast.error(t('settings.permissionUpdateFailed'));
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
    updateMemberPermissions(room.id, memberId, merged)
      .then((response) => {
        if (response.permissions && rtmSendMessage) {
          rtmSendMessage({
            type: 'MEMBER_PERMISSIONS_UPDATED',
            memberId,
            permissions: response.permissions,
          });

          // Optimistically update local room state for host
          window.dispatchEvent(
            new CustomEvent('LOCAL_MEMBER_PERMISSIONS_UPDATED', {
              detail: { memberId, permissions: response.permissions },
            }),
          );
        }
      })
      .catch(() => {
        toast.error(t('settings.permissionUpdateFailed'));
      });
  };

  // Only guests should be listed in individual overrides (don't list the host)
  const guests = room.members.filter((m) => m.id !== room.hostId);

  return (
    <>
      <button
        type="button"
        className="p-1.5 text-white/80 hover:text-white transition-colors"
        title={t('settings.roomAccessPermissions')}
        onClick={() => setIsOpen(true)}
      >
        <Settings aria-hidden="true" className="w-5 h-5 stroke-[3px]" />
      </button>

      {isOpen ? (
        <div
          className="fixed inset-0 z-[10000] flex flex-col items-center justify-center backdrop-blur-sm bg-black/40"
          onClick={() => setIsOpen(false)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') setIsOpen(false);
          }}
          role="dialog"
          tabIndex={-1}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            onKeyDown={() => {}}
            role="document"
            className="flex flex-col items-center gap-6 w-full max-w-sm px-4 max-h-[80vh] overflow-y-auto no-scrollbar"
          >
            <div className="flex flex-col items-center gap-2">
              <Settings className="w-8 h-8 text-white stroke-[3px]" />
              <h2 className="font-black font-headline uppercase tracking-tight text-xl text-white">
                {t('settings.title')}
              </h2>
            </div>

            {/* Personal Preferences */}
            {onToggleFloatingChat !== undefined ? (
              <div className="w-full space-y-4">
                <p className="text-[10px] font-black font-headline uppercase tracking-widest text-white/40 text-center">
                  {t('settings.personal')}
                </p>

                <div className="flex items-center justify-between w-full">
                  <span className="text-xs font-bold font-headline uppercase tracking-widest text-white">
                    {t('settings.floatingChat')}
                  </span>
                  <Switch
                    checked={floatingChatEnabled}
                    onCheckedChange={() => onToggleFloatingChat?.()}
                    label={t('settings.floatingChatOverlay')}
                  />
                </div>

                {onToggleFloatingTiles !== undefined ? (
                  <div className="flex items-center justify-between w-full">
                    <span className="text-xs font-bold font-headline uppercase tracking-widest text-white">
                      {t('settings.floatingTiles')}
                    </span>
                    <Switch
                      checked={floatingTilesEnabled}
                      onCheckedChange={() => onToggleFloatingTiles?.()}
                      label={t('settings.floatingTilesOverlay')}
                    />
                  </div>
                ) : null}
              </div>
            ) : null}

            {isHost ? (
              <>
                {/* Global Permissions */}
                <div className="w-full space-y-4">
                  <p className="text-[10px] font-black font-headline uppercase tracking-widest text-white/40 text-center">
                    {t('settings.globalPermissions')}
                  </p>

                  <div className="flex items-center justify-between w-full">
                    <span className="text-xs font-bold font-headline uppercase tracking-widest text-white">
                      {t('settings.sketchBoard')}
                    </span>
                    <Switch
                      checked={room.permissions.canGuestsDraw}
                      onCheckedChange={(v) =>
                        handleGlobalPermissionToggle('canGuestsDraw', v)
                      }
                      label={t('settings.allowDrawLabel')}
                    />
                  </div>

                  <div className="flex items-center justify-between w-full">
                    <span className="text-xs font-bold font-headline uppercase tracking-widest text-white">
                      {t('settings.soundboardLabel')}
                    </span>
                    <Switch
                      checked={room.permissions.canGuestsPlaySounds}
                      onCheckedChange={(v) =>
                        handleGlobalPermissionToggle('canGuestsPlaySounds', v)
                      }
                      label={t('settings.allowSoundsLabel')}
                    />
                  </div>

                  <div className="flex items-center justify-between w-full">
                    <span className="text-xs font-bold font-headline uppercase tracking-widest text-white">
                      {t('settings.liveChat')}
                    </span>
                    <Switch
                      checked={room.permissions.canGuestsChat}
                      onCheckedChange={(v) =>
                        handleGlobalPermissionToggle('canGuestsChat', v)
                      }
                      label={t('settings.allowChatLabel')}
                    />
                  </div>
                </div>

                {/* Individual Overrides */}
                {guests.length > 0 ? (
                  <div className="w-full space-y-4">
                    <p className="text-[10px] font-black font-headline uppercase tracking-widest text-white/40 text-center">
                      {t('settings.individualOverrides')}
                    </p>

                    {guests.map((guest) => (
                      <div key={guest.id} className="w-full space-y-3">
                        <p className="text-xs font-black font-headline uppercase tracking-widest text-white text-center">
                          {guest.name}
                        </p>
                        <div className="grid grid-cols-3 gap-2">
                          <div className="flex flex-col items-center gap-2">
                            <span className="text-[10px] font-bold font-headline uppercase tracking-widest text-white/50">
                              {t('tabs.sketch')}
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
                              label={t('settings.sketchFor', {
                                name: guest.name,
                              })}
                            />
                          </div>
                          <div className="flex flex-col items-center gap-2">
                            <span className="text-[10px] font-bold font-headline uppercase tracking-widest text-white/50">
                              {t('settings.sounds')}
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
                              label={t('settings.soundsFor', {
                                name: guest.name,
                              })}
                            />
                          </div>
                          <div className="flex flex-col items-center gap-2">
                            <span className="text-[10px] font-bold font-headline uppercase tracking-widest text-white/50">
                              {t('tabs.chat')}
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
                              label={t('settings.chatFor', {
                                name: guest.name,
                              })}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : null}
              </>
            ) : null}

            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="text-white/60 text-xs font-headline font-bold uppercase tracking-wider cursor-pointer hover:text-white mt-2"
            >
              {t('dialog.cancel')}
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}
