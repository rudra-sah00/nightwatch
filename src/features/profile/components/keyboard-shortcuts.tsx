'use client';

import {
  Keyboard,
  Monitor,
  MonitorPlay,
  Music,
  Search,
  Users,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { checkIsDesktop } from '@/lib/electron-bridge';
import { cn } from '@/lib/utils';

/** Definition of a keyboard shortcut group (e.g. video, music, party). */
interface ShortcutGroup {
  /** Unique group identifier used for tab selection and i18n keys. */
  id: string;
  /** Lucide icon component for the group tab. */
  icon: React.ElementType;
  /** Tailwind color class for the active tab icon. */
  color: string;
  /** Array of keyboard shortcuts in this group. */
  shortcuts: { keys: string[]; label: string }[];
  /** When `true`, this group is only shown in the Electron desktop app. */
  desktopOnly?: boolean;
}

const GROUPS: ShortcutGroup[] = [
  {
    id: 'video',
    icon: MonitorPlay,
    color: 'text-neo-blue',
    shortcuts: [
      { keys: ['Space', 'K'], label: 'playPause' },
      { keys: ['J', '←'], label: 'seekBack' },
      { keys: ['L', '→'], label: 'seekForward' },
      { keys: ['↑'], label: 'volumeUp' },
      { keys: ['↓'], label: 'volumeDown' },
      { keys: ['M'], label: 'mute' },
      { keys: ['F'], label: 'fullscreen' },
      { keys: ['C'], label: 'captions' },
      { keys: ['N'], label: 'nextEpisode' },
      { keys: ['Esc'], label: 'exitFullscreen' },
    ],
  },
  {
    id: 'music',
    icon: Music,
    color: 'text-neo-yellow',
    shortcuts: [
      { keys: ['Space'], label: 'playPause' },
      { keys: ['←'], label: 'prevTrack' },
      { keys: ['→'], label: 'nextTrack' },
      { keys: ['↑'], label: 'volumeUp' },
      { keys: ['↓'], label: 'volumeDown' },
      { keys: ['M'], label: 'mute' },
      { keys: ['S'], label: 'shuffle' },
      { keys: ['R'], label: 'repeat' },
    ],
  },
  {
    id: 'party',
    icon: Users,
    color: 'text-neo-orange',
    shortcuts: [
      { keys: ['Enter'], label: 'sendMessage' },
      { keys: ['Esc'], label: 'cancelAnnotation' },
    ],
  },
  {
    id: 'search',
    icon: Search,
    color: 'text-neo-green',
    shortcuts: [
      { keys: ['Tab'], label: 'autocomplete' },
      { keys: ['Enter'], label: 'search' },
      { keys: ['Esc'], label: 'close' },
    ],
  },
  {
    id: 'desktop',
    icon: Monitor,
    color: 'text-neo-red',
    desktopOnly: true,
    shortcuts: [
      { keys: ['MediaPlayPause'], label: 'mediaPlay' },
      { keys: ['MediaNextTrack'], label: 'mediaNext' },
      { keys: ['MediaPreviousTrack'], label: 'mediaPrev' },
    ],
  },
];

/**
 * Full-screen dialog listing all keyboard shortcuts grouped by feature area
 * (video, music, party, search, desktop). Includes tabbed navigation between groups.
 */
export function KeyboardShortcuts() {
  const t = useTranslations('profile.shortcuts');
  const tCancel = useTranslations('profile.preferences');
  const [open, setOpen] = useState(false);
  const [activeGroup, setActiveGroup] = useState('video');
  const isDesktop = checkIsDesktop();

  const groups = GROUPS.filter((g) => !g.desktopOnly || isDesktop);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          type="button"
          className="flex items-center gap-3 px-5 py-3 bg-transparent text-foreground border border-border hover:bg-primary hover:text-primary-foreground rounded-md font-headline font-medium tracking-normal transition-[background-color,color,border-color,opacity,transform] cursor-pointer"
        >
          <Keyboard className="w-4 h-4" />
          {t('title')}
        </button>
      </DialogTrigger>

      <DialogContent
        className="!fixed !inset-x-0 !bottom-0 !top-[var(--electron-titlebar-height,0px)] !translate-x-0 !translate-y-0 z-[10100] !max-w-none w-screen h-[calc(100vh-var(--electron-titlebar-height,0px))] m-0 p-0 border-none bg-white/80 dark:bg-black/60 backdrop-blur-2xl shadow-none !flex flex-col items-center [-webkit-app-region:no-drag] data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 duration-500 overflow-hidden"
        showCloseButton={false}
      >
        <DialogTitle className="sr-only">{t('title')}</DialogTitle>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="absolute z-50 text-foreground/50 hover:text-foreground font-headline font-black uppercase tracking-[0.2em] text-sm transition-colors"
          style={{
            top: 'calc(2rem + env(safe-area-inset-top, 0px))',
            right: 'calc(2rem + env(safe-area-inset-right, 0px))',
          }}
        >
          {tCancel('cancel')}
        </button>

        <div
          className="flex flex-col items-center w-full max-w-lg px-6 h-full"
          style={{
            paddingTop: 'calc(4rem + env(safe-area-inset-top, 0px))',
          }}
        >
          <h2 className="text-3xl md:text-5xl font-black font-headline uppercase tracking-tighter text-foreground shrink-0 mb-6">
            {t('title')}
          </h2>

          {/* Group tabs */}
          <div className="flex overflow-x-auto gap-2 mb-6 shrink-0 w-full no-scrollbar">
            {groups.map((group) => {
              const Icon = group.icon;
              return (
                <button
                  key={group.id}
                  type="button"
                  onClick={() => setActiveGroup(group.id)}
                  className={cn(
                    'px-3 py-1.5 rounded-md font-headline font-bold uppercase text-xs tracking-wider transition-all duration-200 shrink-0 whitespace-nowrap',
                    activeGroup === group.id
                      ? 'text-foreground font-black [text-shadow:0_0_12px_rgba(255,255,255,0.5)]'
                      : 'text-foreground/30 hover:text-foreground/60',
                  )}
                >
                  <Icon
                    className={cn(
                      'w-4 h-4 inline-block mr-1.5',
                      activeGroup === group.id ? group.color : 'text-current',
                    )}
                  />
                  {t(`groups.${group.id}`)}
                </button>
              );
            })}
          </div>

          {/* Shortcuts list — fixed position so tab switches don't shift layout */}
          <div className="relative w-full flex-1 overflow-hidden">
            {groups.map((group) => (
              <div
                key={group.id}
                className={cn(
                  'absolute inset-0 flex flex-col w-full gap-1 overflow-y-auto pb-16 transition-opacity duration-200',
                  activeGroup === group.id
                    ? 'opacity-100'
                    : 'opacity-0 pointer-events-none',
                )}
              >
                {group.shortcuts.map((shortcut) => (
                  <div
                    key={shortcut.label}
                    className="w-full px-6 py-4 flex items-center justify-between"
                  >
                    <span className="text-lg font-headline font-bold tracking-wide text-foreground/60">
                      {t(`actions.${shortcut.label}`)}
                    </span>
                    <div className="flex gap-2">
                      {shortcut.keys.map((key) => (
                        <kbd
                          key={key}
                          className="px-3 py-1.5 bg-foreground/10 border border-foreground/20 rounded-lg font-headline font-black text-sm uppercase text-foreground tracking-wider"
                        >
                          {key}
                        </kbd>
                      ))}
                    </div>
                  </div>
                ))}

                <div className="px-6 pt-4">
                  <p className="text-xs font-bold uppercase font-headline text-foreground/20 tracking-widest">
                    {t('note')}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
