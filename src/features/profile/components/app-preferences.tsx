'use client';

import {
  Activity,
  Check,
  Globe,
  Keyboard,
  Monitor,
  Moon,
  Palette,
  Power,
  Sun,
  Zap,
} from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { LanguageSwitcher } from '@/components/layout/language-switcher';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { checkIsDesktop, desktopBridge } from '@/lib/electron-bridge';
import { cn } from '@/lib/utils';
import { useTheme } from '@/providers/theme-provider';
import { KeyboardShortcuts } from './keyboard-shortcuts';

const THEME_META = [
  { id: 'light' as const, label: 'Light', Icon: Sun },
  { id: 'dark' as const, label: 'Dark', Icon: Moon },
  { id: 'system' as const, label: 'System', Icon: Monitor },
];

/**
 * Application preferences panel for the profile page.
 *
 * Provides theme selection (light/dark/system), language switching, keyboard
 * shortcuts reference, and desktop-only settings (launch on startup, concurrent
 * downloads limit, download speed limit). Desktop settings are persisted via
 * the Electron bridge store.
 */
export function AppPreferences() {
  const t = useTranslations('profile');
  const { theme, setTheme } = useTheme();
  const locale = useLocale();

  const [runOnBoot, setRunOnBoot] = useState(false);
  const [concurrentDownloads, setConcurrentDownloads] = useState<number>(3);
  const [customConcurrent, setCustomConcurrent] = useState('');
  const [downloadSpeedLimit, setDownloadSpeedLimit] = useState<number>(0);
  const [customSpeed, setCustomSpeed] = useState('');
  const [isDesktop, setIsDesktop] = useState(false);
  const [themeOpen, setThemeOpen] = useState(false);
  const [gaplessEnabled, setGaplessEnabled] = useState(true);
  const [crossfadeSec, setCrossfadeSec] = useState(0);

  useEffect(() => {
    if (checkIsDesktop()) {
      setIsDesktop(true);
      desktopBridge.storeGet('runOnBoot').then((val: unknown) => {
        if (typeof val === 'boolean') setRunOnBoot(val);
      });
      desktopBridge.storeGet('concurrentDownloads').then((val: unknown) => {
        if (typeof val === 'number') setConcurrentDownloads(val);
      });
      desktopBridge.storeGet('downloadSpeedLimit').then((val: unknown) => {
        if (typeof val === 'number') setDownloadSpeedLimit(val);
      });
    }
  }, []);

  const handleToggleRunOnBoot = () => {
    const newValue = !runOnBoot;
    setRunOnBoot(newValue);
    desktopBridge.setRunOnBoot(newValue);
    desktopBridge.storeSet('runOnBoot', newValue);
  };

  const handleConcurrentChange = (val: number) => {
    setConcurrentDownloads(val);
    setCustomConcurrent('');
    if (checkIsDesktop()) desktopBridge.storeSet('concurrentDownloads', val);
  };

  const handleCustomConcurrent = () => {
    const val = Number.parseInt(customConcurrent, 10);
    if (val > 0 && val <= 10) handleConcurrentChange(val);
  };

  const handleSpeedChange = (val: number) => {
    setDownloadSpeedLimit(val);
    setCustomSpeed('');
    if (checkIsDesktop()) desktopBridge.storeSet('downloadSpeedLimit', val);
  };

  const handleCustomSpeed = () => {
    const val = Number.parseInt(customSpeed, 10);
    if (val > 0 && val <= 100) handleSpeedChange(val);
  };

  const themeLabel =
    theme === 'light'
      ? t('preferences.light')
      : theme === 'dark'
        ? t('preferences.dark')
        : t('preferences.system');

  return (
    <section className="bg-card text-card-foreground border border-border rounded-xl shadow-sm p-8 mb-12">
      <h2 className="text-4xl font-black font-headline uppercase tracking-tighter mb-8">
        {t('preferences.title')}
      </h2>

      <div className="flex flex-col gap-8">
        {/* Theme */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex flex-col gap-1">
            <span className="font-headline font-bold uppercase tracking-widest text-muted-foreground text-sm flex items-center gap-2">
              <Palette className="w-4 h-4 text-neo-yellow" />
              {t('preferences.themeSelection')}
            </span>
            <p className="text-muted-foreground font-body text-sm max-w-sm">
              {t('preferences.themeDescription')}
            </p>
          </div>

          <Dialog open={themeOpen} onOpenChange={setThemeOpen}>
            <DialogTrigger asChild>
              <button
                type="button"
                className="flex items-center gap-3 px-5 py-3 bg-transparent text-foreground border border-border hover:bg-primary hover:text-primary-foreground rounded-md font-headline font-medium tracking-normal transition-[background-color,color,border-color,opacity,transform] cursor-pointer"
              >
                {theme === 'light' ? (
                  <Sun className="w-4 h-4" />
                ) : theme === 'dark' ? (
                  <Moon className="w-4 h-4" />
                ) : (
                  <Monitor className="w-4 h-4" />
                )}
                {themeLabel}
              </button>
            </DialogTrigger>

            <DialogContent
              className="!fixed !inset-x-0 !bottom-0 !top-[var(--electron-titlebar-height,0px)] !translate-x-0 !translate-y-0 z-[10100] !max-w-none w-screen h-[calc(100vh-var(--electron-titlebar-height,0px))] m-0 p-0 border-none bg-white/80 dark:bg-black/60 backdrop-blur-2xl shadow-none !flex flex-col items-center [-webkit-app-region:no-drag] data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 duration-500 overflow-hidden"
              showCloseButton={false}
            >
              <DialogTitle className="sr-only">
                {t('preferences.themeSelection')}
              </DialogTitle>
              <button
                type="button"
                onClick={() => setThemeOpen(false)}
                className="absolute z-50 text-foreground/50 hover:text-foreground font-headline font-black uppercase tracking-[0.2em] text-sm transition-colors"
                style={{
                  top: 'calc(2rem + env(safe-area-inset-top, 0px))',
                  right: 'calc(2rem + env(safe-area-inset-right, 0px))',
                }}
              >
                {t('preferences.cancel')}
              </button>

              <div
                className="flex flex-col items-center justify-center gap-8 w-full max-w-md px-6 h-full"
                style={{
                  paddingTop: 'calc(4rem + env(safe-area-inset-top, 0px))',
                }}
              >
                <h2 className="text-3xl md:text-5xl font-black font-headline uppercase tracking-tighter text-foreground">
                  {t('preferences.themeSelection')}
                </h2>
                <div className="flex flex-col w-full gap-1">
                  {THEME_META.map(({ id, label, Icon }) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => {
                        setTheme(id);
                        setThemeOpen(false);
                      }}
                      className={cn(
                        'w-full px-6 py-5 flex items-center justify-between text-left transition-all duration-200',
                        theme === id
                          ? 'text-foreground font-black [text-shadow:0_0_12px_rgba(255,255,255,0.5)]'
                          : 'text-foreground/30 hover:text-foreground/60',
                      )}
                    >
                      <div className="flex items-center gap-4">
                        <Icon className="w-6 h-6" />
                        <span className="text-lg font-headline font-bold tracking-wide">
                          {label}
                        </span>
                      </div>
                      {theme === id && (
                        <Check className="w-5 h-5 stroke-[3px]" />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="h-px bg-border w-full" />

        {/* Language */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex flex-col gap-1">
            <span className="font-headline font-bold uppercase tracking-widest text-muted-foreground text-sm flex items-center gap-2">
              <Globe className="w-4 h-4 text-neo-blue" />
              {t('preferences.language')}
            </span>
            <p className="text-muted-foreground font-body text-sm max-w-sm">
              {t('preferences.languageDescription')}
            </p>
          </div>

          <LanguageSwitcher
            trigger={
              <button
                type="button"
                className="flex items-center gap-3 px-5 py-3 bg-transparent text-foreground border border-border hover:bg-primary hover:text-primary-foreground rounded-md font-headline font-medium tracking-normal transition-[background-color,color,border-color,opacity,transform] cursor-pointer"
              >
                <Globe className="w-4 h-4" />
                {locale}
              </button>
            }
          />
        </div>

        <div className="h-px bg-border w-full" />

        {/* Keyboard Shortcuts */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex flex-col gap-1">
            <span className="font-headline font-bold uppercase tracking-widest text-muted-foreground text-sm flex items-center gap-2">
              <Keyboard className="w-4 h-4 text-neo-green" />
              {t('preferences.shortcuts')}
            </span>
            <p className="text-muted-foreground font-body text-sm max-w-sm">
              {t('preferences.shortcutsDescription')}
            </p>
          </div>

          <KeyboardShortcuts />
        </div>

        {/* Desktop Only Settings */}
        {isDesktop && (
          <>
            <div className="h-px bg-border w-full" />

            {/* Launch on Startup */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex flex-col gap-1">
                <span className="font-headline font-bold uppercase tracking-widest text-muted-foreground text-sm flex items-center gap-2">
                  <Power className="w-4 h-4 text-neo-blue" />
                  {t('preferences.launchOnStartup')}
                </span>
                <p className="text-muted-foreground font-body text-sm max-w-sm">
                  {t('preferences.launchDescription')}
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={runOnBoot}
                onClick={handleToggleRunOnBoot}
                className={cn(
                  'relative inline-flex h-8 w-16 items-center rounded-full transition-colors shrink-0',
                  runOnBoot ? 'bg-neo-blue' : 'bg-secondary',
                )}
              >
                <span
                  className={cn(
                    'inline-flex h-6 w-6 transform rounded-full bg-background shadow transition-transform',
                    runOnBoot ? 'translate-x-9' : 'translate-x-1',
                  )}
                />
              </button>
            </div>

            <div className="h-px bg-border w-full" />

            {/* Max Concurrent Downloads */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex flex-col gap-1">
                <span className="font-headline font-bold uppercase tracking-widest text-muted-foreground text-sm flex items-center gap-2">
                  <Activity className="w-4 h-4 text-neo-yellow" />
                  {t('preferences.maxConcurrentDownloads')}
                </span>
                <p className="text-muted-foreground font-body text-sm max-w-sm">
                  {t('preferences.maxConcurrentDescription')}
                </p>
              </div>

              <Dialog>
                <DialogTrigger asChild>
                  <button
                    type="button"
                    className="flex items-center gap-3 px-5 py-3 bg-transparent text-foreground border border-border hover:bg-primary hover:text-primary-foreground rounded-md font-headline font-medium tracking-normal transition-[background-color,color,border-color,opacity,transform] cursor-pointer"
                  >
                    <Activity className="w-4 h-4" />
                    {concurrentDownloads}
                  </button>
                </DialogTrigger>
                <DialogContent
                  className="!fixed !inset-x-0 !bottom-0 !top-[var(--electron-titlebar-height,0px)] !translate-x-0 !translate-y-0 z-[10100] !max-w-none w-screen h-[calc(100vh-var(--electron-titlebar-height,0px))] m-0 p-0 border-none bg-white/80 dark:bg-black/60 backdrop-blur-2xl shadow-none !flex flex-col items-center justify-center [-webkit-app-region:no-drag] data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 duration-500"
                  showCloseButton={false}
                >
                  <DialogTitle className="sr-only">
                    {t('preferences.maxConcurrentDownloads')}
                  </DialogTitle>
                  <DialogClose className="absolute top-8 right-8 z-50 text-foreground/50 hover:text-foreground font-headline font-black uppercase tracking-[0.2em] text-sm transition-colors">
                    {t('preferences.cancel')}
                  </DialogClose>
                  <div className="flex flex-col items-center gap-8 w-full max-w-md px-6">
                    <h2 className="text-2xl md:text-4xl font-black font-headline uppercase tracking-tighter text-foreground text-center">
                      {t('preferences.maxConcurrentDownloads')}
                    </h2>
                    <div className="flex flex-col w-full gap-1">
                      {[1, 2, 3, 5, 8, 10].map((val) => (
                        <button
                          key={val}
                          type="button"
                          onClick={() => handleConcurrentChange(val)}
                          className={cn(
                            'w-full px-6 py-5 flex items-center justify-between text-left transition-all duration-200',
                            concurrentDownloads === val
                              ? 'text-foreground font-black [text-shadow:0_0_12px_rgba(255,255,255,0.5)]'
                              : 'text-foreground/30 hover:text-foreground/60',
                          )}
                        >
                          <span className="text-lg font-headline font-bold">
                            {val}
                          </span>
                          {concurrentDownloads === val && (
                            <Check className="w-5 h-5 stroke-[3px]" />
                          )}
                        </button>
                      ))}
                    </div>
                    <div className="w-full">
                      <input
                        type="number"
                        min={1}
                        max={10}
                        placeholder={t('preferences.customConcurrent')}
                        value={customConcurrent}
                        onChange={(e) => setCustomConcurrent(e.target.value)}
                        onKeyDown={(e) =>
                          e.key === 'Enter' && handleCustomConcurrent()
                        }
                        className="w-full bg-transparent border-none outline-none text-xl sm:text-4xl font-black font-headline uppercase text-foreground placeholder:text-muted-foreground/30 border-b-2 rounded-md border-border/50 focus:border-primary focus:bg-primary focus:text-primary-foreground transition-colors py-2 text-center"
                      />
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            <div className="h-px bg-border w-full" />

            {/* Download Speed Limit */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex flex-col gap-1">
                <span className="font-headline font-bold uppercase tracking-widest text-muted-foreground text-sm flex items-center gap-2">
                  <Zap className="w-4 h-4 text-neo-green" />
                  {t('preferences.downloadSpeedLimit')}
                </span>
                <p className="text-muted-foreground font-body text-sm max-w-sm">
                  {t('preferences.downloadSpeedDescription')}
                </p>
              </div>

              <Dialog>
                <DialogTrigger asChild>
                  <button
                    type="button"
                    className="flex items-center gap-3 px-5 py-3 bg-transparent text-foreground border border-border hover:bg-primary hover:text-primary-foreground rounded-md font-headline font-medium tracking-normal transition-[background-color,color,border-color,opacity,transform] cursor-pointer"
                  >
                    <Zap className="w-4 h-4" />
                    {downloadSpeedLimit === 0
                      ? t('preferences.unlimited')
                      : `${downloadSpeedLimit} MB/s`}
                  </button>
                </DialogTrigger>
                <DialogContent
                  className="!fixed !inset-x-0 !bottom-0 !top-[var(--electron-titlebar-height,0px)] !translate-x-0 !translate-y-0 z-[10100] !max-w-none w-screen h-[calc(100vh-var(--electron-titlebar-height,0px))] m-0 p-0 border-none bg-white/80 dark:bg-black/60 backdrop-blur-2xl shadow-none !flex flex-col items-center justify-center [-webkit-app-region:no-drag] data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 duration-500"
                  showCloseButton={false}
                >
                  <DialogTitle className="sr-only">
                    {t('preferences.downloadSpeedLimit')}
                  </DialogTitle>
                  <DialogClose className="absolute top-8 right-8 z-50 text-foreground/50 hover:text-foreground font-headline font-black uppercase tracking-[0.2em] text-sm transition-colors">
                    {t('preferences.cancel')}
                  </DialogClose>
                  <div className="flex flex-col items-center gap-8 w-full max-w-md px-6">
                    <h2 className="text-2xl md:text-4xl font-black font-headline uppercase tracking-tighter text-foreground text-center">
                      {t('preferences.downloadSpeedLimit')}
                    </h2>
                    <div className="flex flex-col w-full gap-1">
                      {[
                        { val: 0, label: t('preferences.unlimited') },
                        { val: 1, label: '1 MB/s' },
                        { val: 5, label: '5 MB/s' },
                        { val: 10, label: '10 MB/s' },
                        { val: 20, label: '20 MB/s' },
                        { val: 50, label: '50 MB/s' },
                      ].map((opt) => (
                        <button
                          key={opt.val}
                          type="button"
                          onClick={() => handleSpeedChange(opt.val)}
                          className={cn(
                            'w-full px-6 py-5 flex items-center justify-between text-left transition-all duration-200',
                            downloadSpeedLimit === opt.val
                              ? 'text-foreground font-black [text-shadow:0_0_12px_rgba(255,255,255,0.5)]'
                              : 'text-foreground/30 hover:text-foreground/60',
                          )}
                        >
                          <span className="text-lg font-headline font-bold">
                            {opt.label}
                          </span>
                          {downloadSpeedLimit === opt.val && (
                            <Check className="w-5 h-5 stroke-[3px]" />
                          )}
                        </button>
                      ))}
                    </div>
                    <div className="w-full">
                      <input
                        type="number"
                        min={1}
                        max={100}
                        placeholder={t('preferences.customSpeed')}
                        value={customSpeed}
                        onChange={(e) => setCustomSpeed(e.target.value)}
                        onKeyDown={(e) =>
                          e.key === 'Enter' && handleCustomSpeed()
                        }
                        className="w-full bg-transparent border-none outline-none text-xl sm:text-4xl font-black font-headline uppercase text-foreground placeholder:text-muted-foreground/30 border-b-2 rounded-md border-border/50 focus:border-primary focus:bg-primary focus:text-primary-foreground transition-colors py-2 text-center"
                      />
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </>
        )}
      </div>

      {/* Music Playback */}
      <div className="pt-8 border-t border-border">
        <h3 className="font-headline font-black uppercase tracking-widest text-sm text-muted-foreground mb-6">
          Music Playback
        </h3>
        <div className="flex flex-col gap-8 max-w-2xl">
          {/* Gapless */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex flex-col gap-1">
              <span className="font-headline font-bold uppercase tracking-widest text-muted-foreground text-sm flex items-center gap-2">
                <Zap className="w-4 h-4 text-neo-yellow" />
                Gapless Playback
              </span>
              <p className="text-muted-foreground font-body text-sm max-w-sm">
                No silence between tracks
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={gaplessEnabled}
              onClick={() => {
                const event = new CustomEvent('music:set-gapless', {
                  detail: !gaplessEnabled,
                });
                window.dispatchEvent(event);
                setGaplessEnabled((v) => !v);
              }}
              className={cn(
                'relative inline-flex h-8 w-16 items-center rounded-full transition-colors shrink-0',
                gaplessEnabled ? 'bg-neo-blue' : 'bg-secondary',
              )}
            >
              <span
                className={cn(
                  'inline-flex h-6 w-6 transform rounded-full bg-background shadow transition-transform',
                  gaplessEnabled ? 'translate-x-9' : 'translate-x-1',
                )}
              />
            </button>
          </div>

          <div className="h-px bg-border w-full" />

          {/* Crossfade */}
          <div className="flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex flex-col gap-1">
                <span className="font-headline font-bold uppercase tracking-widest text-muted-foreground text-sm flex items-center gap-2">
                  <Activity className="w-4 h-4 text-neo-green" />
                  Crossfade
                </span>
                <p className="text-muted-foreground font-body text-sm max-w-sm">
                  Blend tracks together
                </p>
              </div>
              <span className="text-sm font-headline font-bold text-foreground">
                {crossfadeSec === 0 ? 'Off' : `${crossfadeSec}s`}
              </span>
            </div>
            <div className="relative w-full h-8 flex items-center">
              <div className="absolute inset-x-0 h-2 rounded-full bg-secondary" />
              <div
                className="absolute left-0 h-2 rounded-full bg-neo-green"
                style={{ width: `${(crossfadeSec / 12) * 100}%` }}
              />
              <input
                type="range"
                min={0}
                max={12}
                step={1}
                value={crossfadeSec}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  setCrossfadeSec(val);
                  window.dispatchEvent(
                    new CustomEvent('music:set-crossfade', { detail: val }),
                  );
                }}
                className="absolute inset-x-0 w-full h-8 opacity-0 cursor-pointer"
              />
              <div
                className="absolute w-5 h-5 rounded-full bg-foreground border-2 border-background shadow pointer-events-none"
                style={{ left: `calc(${(crossfadeSec / 12) * 100}% - 10px)` }}
              />
            </div>
            <div className="flex justify-between text-xs font-headline text-muted-foreground">
              <span>Off</span>
              <span>12s</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
