'use client';

import {
  Activity,
  Check,
  Globe,
  Monitor,
  Moon,
  Power,
  Sun,
  Zap,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { useCallback, useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { COOKIE_NAME, locales } from '@/i18n/config';
import { checkIsDesktop, desktopBridge } from '@/lib/tauri-bridge';
import { cn } from '@/lib/utils';
import { useTheme } from '@/providers/theme-provider';

const LOCALE_META: Record<string, { native: string; english: string }> = {
  en: { native: 'English', english: 'English' },
  hi: { native: 'हिन्दी', english: 'Hindi' },
  ta: { native: 'தமிழ்', english: 'Tamil' },
  te: { native: 'తెలుగు', english: 'Telugu' },
  es: { native: 'Español', english: 'Spanish' },
  fr: { native: 'Français', english: 'French' },
  ja: { native: '日本語', english: 'Japanese' },
  ko: { native: '한국어', english: 'Korean' },
  de: { native: 'Deutsch', english: 'German' },
  pt: { native: 'Português', english: 'Portuguese' },
  ar: { native: 'العربية', english: 'Arabic' },
  ru: { native: 'Русский', english: 'Russian' },
  zh: { native: '中文', english: 'Chinese' },
  it: { native: 'Italiano', english: 'Italian' },
  tr: { native: 'Türkçe', english: 'Turkish' },
  th: { native: 'ไทย', english: 'Thai' },
};

function setCookie(name: string, value: string) {
  // biome-ignore lint/suspicious/noDocumentCookie: required for SSR locale detection
  document.cookie = `${name}=${value};path=/;max-age=31536000;samesite=lax`;
}

export function AppPreferences() {
  const t = useTranslations('profile');
  const { theme, setTheme } = useTheme();
  const locale = useLocale();
  const router = useRouter();

  const [runOnBoot, setRunOnBoot] = useState(false);
  const [concurrentDownloads, setConcurrentDownloads] = useState<number>(3);
  const [downloadSpeedLimit, setDownloadSpeedLimit] = useState<number>(0);
  const [isDesktop, setIsDesktop] = useState(false);

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

  const [langOpen, setLangOpen] = useState(false);

  const switchLocale = useCallback(
    (newLocale: string) => {
      setCookie(COOKIE_NAME, newLocale);
      localStorage.setItem('preferred-locale', newLocale);
      setLangOpen(false);
      router.refresh();
    },
    [router],
  );

  const handleToggleRunOnBoot = () => {
    const newValue = !runOnBoot;
    setRunOnBoot(newValue);
    if (desktopBridge.setRunOnBoot) {
      desktopBridge.setRunOnBoot(newValue);
      desktopBridge.storeSet('runOnBoot', newValue);
    }
  };

  const handleConcurrentChange = (val: number) => {
    setConcurrentDownloads(val);
    if (checkIsDesktop()) desktopBridge.storeSet('concurrentDownloads', val);
  };

  const handleSpeedChange = (val: number) => {
    setDownloadSpeedLimit(val);
    if (checkIsDesktop()) desktopBridge.storeSet('downloadSpeedLimit', val);
  };

  return (
    <section className="bg-card text-card-foreground border border-border rounded-xl shadow-sm p-8 mb-12">
      <h2 className="text-4xl font-black font-headline uppercase tracking-tighter mb-8">
        {t('preferences.title')}
      </h2>

      <div className="flex flex-col gap-10 max-w-2xl">
        {/* Theme Settings */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div className="flex flex-col gap-2">
            <span className="font-headline font-bold uppercase tracking-widest text-muted-foreground text-sm">
              {t('preferences.themeSelection')}
            </span>
            <p className="text-muted-foreground font-body text-sm max-w-sm">
              {t('preferences.themeDescription')}
            </p>
          </div>

          <div
            role="radiogroup"
            aria-label="Theme selection"
            className="flex flex-row p-1 bg-secondary rounded-lg border border-border shrink-0"
          >
            {[
              {
                id: 'light' as const,
                label: t('preferences.light'),
                Icon: Sun,
              },
              { id: 'dark' as const, label: t('preferences.dark'), Icon: Moon },
              {
                id: 'system' as const,
                label: t('preferences.system'),
                Icon: Monitor,
              },
            ].map(({ id, label, Icon }) => (
              <button
                key={id}
                type="button"
                role="radio"
                aria-checked={theme === id}
                onClick={() => setTheme(id)}
                className={cn(
                  'px-3 py-1.5 text-xs font-bold uppercase tracking-widest rounded-md transition-colors flex items-center gap-1.5',
                  theme === id
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                <Icon className="w-3.5 h-3.5" />
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="h-px bg-border w-full" />

        {/* Language Settings */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div className="flex flex-col gap-2">
            <span className="font-headline font-bold uppercase tracking-widest text-muted-foreground text-sm flex items-center gap-2">
              <Globe className="w-4 h-4 text-neo-blue" />
              {t('preferences.language')}
            </span>
            <p className="text-muted-foreground font-body text-sm max-w-sm">
              {t('preferences.languageDescription')}
            </p>
          </div>

          <Dialog open={langOpen} onOpenChange={setLangOpen}>
            <DialogTrigger asChild>
              <button
                type="button"
                className="px-5 py-2.5 border-[3px] border-border bg-background hover:bg-foreground/5 font-headline font-bold uppercase tracking-widest text-sm transition-colors flex items-center gap-3"
              >
                <Globe className="w-4 h-4" />
                {LOCALE_META[locale]?.native || 'English'}
              </button>
            </DialogTrigger>

            <DialogContent
              className="!fixed !inset-0 !left-0 !top-0 !translate-x-0 !translate-y-0 z-[10100] !max-w-none w-screen h-screen m-0 p-0 border-none bg-white/90 dark:bg-black/80 backdrop-blur-2xl shadow-none !flex flex-col items-center [-webkit-app-region:no-drag] data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 duration-500 overflow-hidden"
              showCloseButton={false}
            >
              <DialogTitle className="sr-only">
                {t('preferences.selectLanguage')}
              </DialogTitle>

              <button
                type="button"
                onClick={() => setLangOpen(false)}
                className="absolute top-8 right-8 z-50 text-foreground/50 hover:text-foreground font-headline font-black uppercase tracking-[0.2em] text-sm transition-colors"
              >
                Cancel
              </button>

              <div className="flex flex-col items-center w-full max-w-md px-6 h-full pt-16">
                <h2 className="text-3xl md:text-5xl font-black font-headline uppercase tracking-tighter text-foreground shrink-0 mb-6">
                  {t('preferences.language')}
                </h2>

                <div className="flex flex-col w-full gap-1 overflow-y-auto flex-1 pb-16">
                  {locales.map((l) => (
                    <button
                      key={l}
                      type="button"
                      onClick={() => switchLocale(l)}
                      className={cn(
                        'w-full px-6 py-4 flex items-center justify-between text-left transition-all duration-200',
                        locale === l
                          ? 'bg-foreground text-background font-black'
                          : 'hover:bg-foreground/5 text-foreground/80 hover:text-foreground',
                      )}
                    >
                      <div className="flex flex-col">
                        <span className="text-lg font-headline font-bold tracking-wide">
                          {LOCALE_META[l]?.native}
                        </span>
                        <span className="text-xs opacity-60 uppercase tracking-widest font-bold">
                          {LOCALE_META[l]?.english}
                        </span>
                      </div>
                      {locale === l && (
                        <Check className="w-5 h-5 stroke-[3px]" />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Desktop Only Settings */}
        {isDesktop && (
          <>
            <div className="h-px bg-border w-full" />

            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
              <div className="flex flex-col gap-2">
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
                  'relative inline-flex h-8 w-16 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background shrink-0',
                  runOnBoot ? 'bg-neo-blue' : 'bg-secondary',
                )}
              >
                <span className="sr-only">Toggle Launch on Boot</span>
                <span
                  className={cn(
                    'inline-flex h-6 w-6 transform items-center justify-center rounded-full bg-background shadow transition-transform',
                    runOnBoot ? 'translate-x-9' : 'translate-x-1',
                  )}
                />
              </button>
            </div>

            <div className="h-px bg-border w-full" />

            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
              <div className="flex flex-col gap-2">
                <span className="font-headline font-bold uppercase tracking-widest text-muted-foreground text-sm flex items-center gap-2">
                  <Activity className="w-4 h-4 text-neo-yellow" />
                  {t('preferences.maxConcurrentDownloads')}
                </span>
                <p className="text-muted-foreground font-body text-sm max-w-sm">
                  {t('preferences.maxConcurrentDescription')}
                </p>
              </div>

              <div
                role="radiogroup"
                aria-label="Max concurrent downloads"
                className="flex flex-row p-1 bg-secondary rounded-lg border border-border"
              >
                {[1, 2, 3, 5].map((val) => (
                  <button
                    key={val}
                    type="button"
                    role="radio"
                    aria-checked={concurrentDownloads === val}
                    onClick={() => handleConcurrentChange(val)}
                    className={cn(
                      'px-4 py-1.5 text-xs font-bold uppercase tracking-widest rounded-md transition-colors',
                      concurrentDownloads === val
                        ? 'bg-background text-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground',
                    )}
                  >
                    {val}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
              <div className="flex flex-col gap-2">
                <span className="font-headline font-bold uppercase tracking-widest text-muted-foreground text-sm flex items-center gap-2">
                  <Zap className="w-4 h-4 text-neo-green" />
                  {t('preferences.downloadSpeedLimit')}
                </span>
                <p className="text-muted-foreground font-body text-sm max-w-sm">
                  {t('preferences.downloadSpeedDescription')}
                </p>
              </div>

              <div
                role="radiogroup"
                aria-label="Download speed limit"
                className="flex flex-row p-1 bg-secondary rounded-lg border border-border overflow-x-auto min-w-0 max-w-[250px] sm:max-w-none"
              >
                {[
                  { label: t('preferences.unlimited'), val: 0 },
                  { label: '1 MB/s', val: 1 },
                  { label: '3 MB/s', val: 3 },
                  { label: '10 MB/s', val: 10 },
                ].map((opt) => (
                  <button
                    key={opt.val}
                    type="button"
                    role="radio"
                    aria-checked={downloadSpeedLimit === opt.val}
                    onClick={() => handleSpeedChange(opt.val)}
                    className={cn(
                      'px-4 py-1.5 text-xs font-bold uppercase tracking-widest rounded-md transition-colors whitespace-nowrap',
                      downloadSpeedLimit === opt.val
                        ? 'bg-background text-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground',
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </section>
  );
}
