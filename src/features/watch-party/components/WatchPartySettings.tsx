import {
  Check,
  ChevronDown,
  MessageSquare,
  PenTool,
  Settings,
  Shield,
  Subtitles,
  Volume2,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { loadSubtitleFonts } from '@/features/watch/player/ui/controls/load-subtitle-fonts';
import {
  applySubtitleSettings,
  BACKGROUND_COLORS,
  loadSubtitleSettings,
  SUBTITLE_FONT_SIZES,
  SUBTITLE_FONTS,
  type SubtitleSettings,
  saveSubtitleSettings,
  TEXT_COLORS,
  TEXT_SHADOWS,
} from '@/features/watch/player/ui/controls/subtitle-settings';
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
        'peer inline-flex h-6 w-12 shrink-0 cursor-pointer items-center border-[3px] border-[#1a1a1a] transition-colors focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 ring-0',
        checked ? 'bg-[#ffcc00]' : 'bg-[#f5f0e8]',
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
}

export function WatchPartySettings({
  room,
  isHost,
  floatingChatEnabled = false,
  onToggleFloatingChat,
}: WatchPartySettingsProps) {
  const { isOpen, setIsOpen } = useWatchPartySettings();
  const [subtitleSettings, setSubtitleSettings] = useState<SubtitleSettings>(
    () => loadSubtitleSettings(),
  );

  // Sync subtitle settings when opening modal
  useEffect(() => {
    if (isOpen) {
      setSubtitleSettings(loadSubtitleSettings());
      loadSubtitleFonts();
    }
  }, [isOpen]);

  const updateSubtitleSettings = (newSettings: SubtitleSettings) => {
    setSubtitleSettings(newSettings);
    applySubtitleSettings(newSettings);
    saveSubtitleSettings(newSettings);
  };

  const handleGlobalPermissionToggle = (
    key: keyof WatchPartyRoom['permissions'],
    value: boolean,
  ) => {
    updatePartyPermissions(room.id, { [key]: value });
  };

  const handleUserPermissionToggle = (
    memberId: string,
    key: keyof NonNullable<RoomMember['permissions']>,
    value: boolean,
  ) => {
    updateMemberPermissions(room.id, memberId, { [key]: value });
  };

  // Only guests should be listed in individual overrides (don't list the host)
  const guests = room.members.filter((m) => m.id !== room.hostId);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <button
          type="button"
          className="px-3 flex items-center justify-center gap-2 py-2 bg-white text-[#1a1a1a] border-[3px] border-[#1a1a1a] neo-shadow-sm hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all active:bg-[#f5f0e8]"
          title="Room Settings"
        >
          <Settings aria-hidden="true" className="w-5 h-5 stroke-[3px]" />
        </button>
      </DialogTrigger>

      <DialogContent className="max-w-md bg-white border-[4px] border-[#1a1a1a] text-[#1a1a1a] neo-shadow p-0 rounded-none overflow-hidden m-4 w-[calc(100%-2rem)]">
        <DialogHeader className="p-4 md:p-6 border-b-[4px] border-[#1a1a1a] bg-[#ffcc00] m-0">
          <DialogTitle className="flex items-center gap-3 font-black font-headline uppercase tracking-tighter text-xl">
            <Shield aria-hidden="true" className="w-6 h-6 stroke-[3px]" />
            Watch Party Settings
          </DialogTitle>
        </DialogHeader>

        <div className="max-h-[70vh] overflow-y-auto custom-scrollbar p-4 md:p-6 space-y-8 bg-white">
          {/* Personal Preferences — visible to all users */}
          {onToggleFloatingChat !== undefined ? (
            <div className="space-y-4">
              <h3 className="text-sm font-black font-headline uppercase tracking-widest text-[#1a1a1a] flex items-center gap-2 border-b-[3px] border-[#1a1a1a] pb-2">
                <MessageSquare className="w-5 h-5 stroke-[3px]" />
                Personal
              </h3>
              <div className="bg-[#f5f0e8] border-[3px] border-[#1a1a1a] p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <MessageSquare className="w-5 h-5 text-[#1a1a1a] stroke-[3px]" />
                    <div className="flex flex-col">
                      <p className="text-sm font-black font-headline uppercase tracking-widest text-[#1a1a1a] leading-none">
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

                <div className="border-t-[2px] border-[#1a1a1a]/10 pt-4">
                  <h4 className="text-[10px] md:text-xs font-black font-headline uppercase tracking-widest text-[#1a1a1a]/60 mb-3 flex items-center gap-2">
                    <Subtitles className="w-3 h-3" />
                    Subtitle Style
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Font Size */}
                    <Dropdown
                      label="Size"
                      value={subtitleSettings.fontSize}
                      options={SUBTITLE_FONT_SIZES}
                      onChange={(v) =>
                        updateSubtitleSettings({
                          ...subtitleSettings,
                          fontSize: v,
                        })
                      }
                    />
                    {/* Font Family */}
                    <Dropdown
                      label="Font"
                      value={subtitleSettings.fontFamily}
                      options={SUBTITLE_FONTS}
                      onChange={(v) =>
                        updateSubtitleSettings({
                          ...subtitleSettings,
                          fontFamily: v,
                        })
                      }
                    />
                    {/* Text Color */}
                    <Dropdown
                      label="Text Color"
                      value={subtitleSettings.textColor}
                      options={TEXT_COLORS}
                      onChange={(v) =>
                        updateSubtitleSettings({
                          ...subtitleSettings,
                          textColor: v,
                        })
                      }
                      isColor
                    />
                    {/* Background */}
                    <Dropdown
                      label="Background"
                      value={subtitleSettings.backgroundColor}
                      options={BACKGROUND_COLORS}
                      onChange={(v) =>
                        updateSubtitleSettings({
                          ...subtitleSettings,
                          backgroundColor: v,
                        })
                      }
                      isColor
                    />
                    {/* Text Effect */}
                    <Dropdown
                      label="Effect"
                      value={subtitleSettings.textShadow}
                      options={TEXT_SHADOWS}
                      onChange={(v) =>
                        updateSubtitleSettings({
                          ...subtitleSettings,
                          textShadow: v,
                        })
                      }
                    />
                    {/* Opacity */}
                    <Dropdown
                      label="Opacity"
                      value={String(subtitleSettings.opacity)}
                      options={[
                        { label: 'Opaque', value: '1' },
                        { label: 'Semi-Transparent', value: '0.5' },
                        { label: 'Transparent', value: '0' },
                      ]}
                      onChange={(v) =>
                        updateSubtitleSettings({
                          ...subtitleSettings,
                          opacity: Number(v),
                        })
                      }
                    />
                  </div>
                </div>
              </div>
            </div>
          ) : null}

          {isHost ? (
            <div className="space-y-8">
              {/* Global Permissions */}
              <div className="space-y-4">
                <h3 className="text-sm font-black font-headline uppercase tracking-widest text-[#1a1a1a] border-b-[3px] border-[#1a1a1a] pb-2">
                  Global Permissions for Guests
                </h3>

                <div className="space-y-3 bg-[#f5f0e8] border-[3px] border-[#1a1a1a] p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <PenTool className="w-5 h-5 text-[#1a1a1a] stroke-[3px]" />
                      <div className="flex flex-col">
                        <p className="text-sm font-black font-headline uppercase tracking-widest text-[#1a1a1a] leading-none">
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

                  <div className="flex items-center justify-between border-t-[2px] border-[#1a1a1a]/10 pt-3">
                    <div className="flex items-center gap-3">
                      <Volume2 className="w-5 h-5 text-[#1a1a1a] stroke-[3px]" />
                      <div className="flex flex-col">
                        <p className="text-sm font-black font-headline uppercase tracking-widest text-[#1a1a1a] leading-none">
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

                  <div className="flex items-center justify-between border-t-[2px] border-[#1a1a1a]/10 pt-3">
                    <div className="flex items-center gap-3">
                      <MessageSquare className="w-5 h-5 text-[#1a1a1a] stroke-[3px]" />
                      <div className="flex flex-col">
                        <p className="text-sm font-black font-headline uppercase tracking-widest text-[#1a1a1a] leading-none">
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
                  <h3 className="text-sm font-black font-headline uppercase tracking-widest text-[#1a1a1a] border-b-[3px] border-[#1a1a1a] pb-2">
                    Individual Guest Overrides
                  </h3>

                  <div className="space-y-3">
                    {guests.map((guest) => (
                      <div
                        key={guest.id}
                        className="bg-white border-[3px] border-[#1a1a1a] p-4 flex flex-col gap-4 neo-shadow-sm"
                      >
                        <div className="flex items-center gap-3 border-b-[3px] border-[#1a1a1a] pb-3">
                          <div className="w-8 h-8 bg-[#0055ff] border-[2px] border-[#1a1a1a] flex items-center justify-center shrink-0">
                            <span className="text-xs font-black font-headline uppercase tracking-widest text-white">
                              {guest.name.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <span className="text-sm font-black font-headline uppercase tracking-widest pr-2 truncate text-[#1a1a1a]">
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
                          <div className="flex flex-col items-center gap-3 border-l-[2px] border-[#1a1a1a]/10">
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
                          <div className="flex flex-col items-center gap-3 border-l-[2px] border-[#1a1a1a]/10">
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

// Reusable Dropdown for Settings
interface DropdownProps {
  label: string;
  value: string;
  options: readonly { label: string; value: string }[];
  onChange: (value: string) => void;
  isColor?: boolean;
}

function Dropdown({ label, value, options, onChange, isColor }: DropdownProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node))
        setOpen(false);
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, [open]);

  const selected = options.find((o) => o.value === value) ?? options[0];

  return (
    <div ref={ref} className="relative flex-1">
      <p className="text-[10px] md:text-[8px] font-black font-headline uppercase tracking-widest text-[#1a1a1a]/40 mb-1 pl-1">
        {label}
      </p>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-2 px-3 py-2 bg-white border-[2px] border-[#1a1a1a] text-[#1a1a1a] font-bold font-headline uppercase tracking-widest text-[10px] transition-all focus:outline-none hover:bg-[#ffe066] active:bg-[#f5f0e8] truncate"
      >
        {isColor && (
          <span
            className="w-3 h-3 border border-[#1a1a1a] flex-shrink-0"
            style={{
              backgroundColor: value === 'transparent' ? 'transparent' : value,
            }}
          />
        )}
        <span className="flex-1 text-left truncate">{selected.label}</span>
        <ChevronDown
          className={cn(
            'w-3 h-3 text-[#1a1a1a] stroke-[3px] transition-transform duration-200 shrink-0',
            open && 'rotate-180',
          )}
        />
      </button>

      {open && (
        <div className="absolute z-[100] mt-1 w-full bg-white border-[3px] border-[#1a1a1a] neo-shadow-sm max-h-48 overflow-y-auto no-scrollbar animate-in fade-in zoom-in-95 duration-100">
          {options.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => {
                onChange(opt.value);
                setOpen(false);
              }}
              className={cn(
                'w-full flex items-center gap-2 px-3 py-2 text-[10px] font-bold font-headline uppercase tracking-widest transition-colors border-b border-[#1a1a1a]/10 last:border-b-0',
                value === opt.value
                  ? 'bg-[#ffcc00] text-[#1a1a1a]'
                  : 'text-[#1a1a1a] hover:bg-[#f5f0e8]',
              )}
            >
              {isColor && (
                <span
                  className="w-3 h-3 border border-[#1a1a1a] flex-shrink-0"
                  style={{
                    backgroundColor:
                      opt.value === 'transparent' ? 'transparent' : opt.value,
                  }}
                />
              )}
              <span className="flex-1 text-left truncate">{opt.label}</span>
              {value === opt.value && (
                <Check className="w-3 h-3 text-[#1a1a1a] stroke-[3px]" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
