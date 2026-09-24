import { Settings } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useCallback } from 'react';
import { toast } from 'sonner';
import { cn, formatBytes } from '@/lib/utils';
import { useModalFocus } from '../hooks/use-modal-focus';
import { useWatchPartySettings } from '../hooks/use-watch-party-settings';
import type { RTMMessage } from '../media/hooks/useAgoraRtm';
import {
  updateMemberPermissions,
  updatePartyPermissions,
} from '../room/services/watch-party.api';
import type { RoomMember, WatchPartyRoom } from '../room/types';
import { useTheatreAssets } from '../theatre/hooks/use-theatre-assets';
import { useTheatreView } from '../theatre/lib/view-mode';
import { theatreDownloadBytes } from '../theatre/types';

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

  /*
    Keyboard containment, same as the leave dialog.

    This overlay sits above the sidebar's media controls, and Tab used to walk
    straight onto them through the backdrop.
  */
  const close = useCallback(() => setIsOpen(false), [setIsOpen]);
  const settingsRef = useModalFocus<HTMLDivElement>(isOpen, close);

  // 3D theatre opt-in lives in a store so settings, the video area and the V
  // hotkey all read one source of truth.
  const theatreEnabled = useTheatreView((s) => s.enabled);
  const theatrePhase = useTheatreView((s) => s.phase);
  const theatreProgress = useTheatreView((s) => s.progress);
  const enableTheatre = useTheatreView((s) => s.enable);
  const disableTheatre = useTheatreView((s) => s.disable);
  const theatreCharacter = useTheatreView((s) => s.character);
  const setTheatreCharacter = useTheatreView((s) => s.setCharacter);

  /*
    Real download size for the 3D toggle, measured by the backend against the
    same objects the client will fetch.

    This label used to be the hardcoded string "Downloads ~35 MB of assets", and
    it had gone stale by roughly 3x: 35 MB was the full v2 set, and the room, cafe
    and chair stopped being served once the client began generating the auditorium
    in code. What a client actually transfers is the two character models.

    The manifest is fetched here rather than only after opt-in, because the whole
    point is to tell the user the cost BEFORE they commit. Same query key as the
    preloader, so this warms the cache instead of duplicating work.

    Falls back to a figureless label rather than inventing a number, so an older
    backend or a failed size probe cannot put a wrong figure back on screen.
  */
  const { data: theatreAssets } = useTheatreAssets({ enabled: true });
  const theatreBytes = theatreDownloadBytes(theatreAssets);
  const theatreDownloadLabel = theatreBytes
    ? `Downloads ${formatBytes(theatreBytes)} of assets`
    : 'Downloads character models on first use';

  const handleGlobalPermissionToggle = (
    key: keyof WatchPartyRoom['permissions'],
    value: boolean,
  ) => {
    // Guarded here as well as in the markup. The backend refuses a non-host, so
    // this is not the security boundary — it stops a guest reaching a control that
    // can only ever fail, and being shown an error for it.
    if (!isHost) return;
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
    if (!isHost) return;
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
        className="p-1.5 text-foreground/80 hover:text-foreground transition-colors"
        title={t('settings.roomAccessPermissions')}
        onClick={() => setIsOpen(true)}
      >
        <Settings aria-hidden="true" className="w-5 h-5 stroke-[3px]" />
      </button>

      {isOpen ? (
        <div className="fixed inset-0 z-[10000] flex flex-col items-center justify-center backdrop-blur-sm bg-black/70">
          {/* Click-to-dismiss. A button, so it is keyboard-operable by
              construction, and hidden from assistive tech because it duplicates
              the Done button below — Escape closes too, via useModalFocus. */}
          <button
            type="button"
            aria-hidden="true"
            tabIndex={-1}
            onClick={() => setIsOpen(false)}
            className="absolute inset-0 cursor-default"
          />
          <div
            ref={settingsRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="wp-settings-title"
            tabIndex={-1}
            className="relative flex flex-col items-center gap-6 w-full max-w-sm px-4 max-h-[80vh] overflow-y-auto no-scrollbar"
          >
            <div className="flex flex-col items-center gap-2">
              <Settings className="w-8 h-8 text-white stroke-[3px]" />
              <h2
                id="wp-settings-title"
                className="font-black font-headline uppercase tracking-tight text-xl text-white"
              >
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

                {/*
                  3D theatre opt-in. Reads the store directly rather than taking
                  props, because this component sits two levels below
                  ActiveWatchParty and prop-drilling it through the sidebar would
                  touch three files to move one boolean.

                  Nothing downloads until this is switched on — a normal 2D watch
                  party must not pay for 3D assets it never shows.
                */}
                <div className="flex items-center justify-between w-full">
                  <span className="flex flex-col">
                    <span className="text-xs font-bold font-headline uppercase tracking-widest text-white">
                      3D Theatre
                    </span>
                    <span className="text-[10px] font-medium text-white/40">
                      {theatrePhase === 'downloading'
                        ? `Downloading… ${Math.round(theatreProgress * 100)}%`
                        : theatrePhase === 'ready'
                          ? 'Ready — press V to change view'
                          : theatrePhase === 'error'
                            ? 'Download failed — toggle to retry'
                            : theatreDownloadLabel}
                    </span>
                  </span>
                  <Switch
                    checked={theatreEnabled}
                    onCheckedChange={(next) =>
                      next ? enableTheatre() : disableTheatre()
                    }
                    label="3D Theatre"
                  />
                </div>

                {/*
                  Which body you appear as. Shown only once 3D is on, because it
                  is meaningless otherwise.

                  This does NOT change what gets downloaded — every character
                  model is fetched regardless, since a peer may have picked the
                  other one and we cannot draw them without it. The choice is
                  broadcast with your pose so other people see you as the body
                  you picked.
                */}
                {theatreEnabled ? (
                  <div className="flex items-center justify-between w-full">
                    <span className="flex flex-col">
                      <span className="text-xs font-bold font-headline uppercase tracking-widest text-white">
                        Your Character
                      </span>
                      <span className="text-[10px] font-medium text-white/40">
                        How others see you in the theatre
                      </span>
                    </span>
                    <fieldset className="flex items-center gap-1 rounded-md border-2 border-white/15 p-0.5">
                      <legend className="sr-only">Your character</legend>
                      {(['man', 'woman'] as const).map((option) => (
                        <label
                          key={option}
                          className={`cursor-pointer px-2.5 py-1 text-[10px] font-black font-headline uppercase tracking-widest transition-colors ${
                            theatreCharacter === option
                              ? 'bg-white text-black'
                              : 'text-white/50 hover:text-white/80'
                          }`}
                        >
                          <input
                            type="radio"
                            name="theatre-character"
                            value={option}
                            checked={theatreCharacter === option}
                            onChange={() => setTheatreCharacter(option)}
                            className="sr-only"
                          />
                          {option === 'man' ? 'Man' : 'Woman'}
                        </label>
                      ))}
                    </fieldset>
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
