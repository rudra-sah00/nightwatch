'use client';

import { Check, Globe } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { useCallback, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { COOKIE_NAME, locales } from '@/i18n/config';
import { cn } from '@/lib/utils';

const LOCALE_META: Record<string, { native: string; english: string }> = {
  en: { native: 'English', english: 'English' },
  hi: { native: 'हिन्दी', english: 'Hindi' },
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

/**
 * Full-screen language picker dialog supporting 14 locales.
 *
 * Persists the selected locale to a cookie and `localStorage`, then triggers
 * a router refresh so the next-intl middleware serves the new language.
 *
 * @param props.className - Optional CSS class applied to the default trigger button.
 * @param props.trigger - Optional custom trigger element; defaults to a globe button showing the current locale.
 */
export function LanguageSwitcher({
  className,
  trigger,
}: {
  className?: string;
  trigger?: React.ReactNode;
}) {
  const locale = useLocale();
  const router = useRouter();
  const t = useTranslations('common.language');
  const tCancel = useTranslations('profile.preferences');
  const [open, setOpen] = useState(false);

  const switchLocale = useCallback(
    (newLocale: string) => {
      setCookie(COOKIE_NAME, newLocale);
      localStorage.setItem('preferred-locale', newLocale);
      setOpen(false);
      router.refresh();
    },
    [router],
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <button
            type="button"
            className={cn(
              'flex items-center gap-2 px-3 py-2 text-xs font-headline font-bold uppercase tracking-widest transition-colors rounded-md border border-border bg-background/80 backdrop-blur-sm hover:bg-muted cursor-pointer',
              className,
            )}
            aria-label={t('title')}
          >
            <Globe className="w-4 h-4" />
            {LOCALE_META[locale]?.native || locale}
          </button>
        )}
      </DialogTrigger>

      <DialogContent
        className="!fixed !inset-x-0 !bottom-0 !top-[var(--electron-titlebar-height,0px)] !translate-x-0 !translate-y-0 z-[10100] !max-w-none w-screen h-[calc(100vh-var(--electron-titlebar-height,0px))] m-0 p-0 border-none bg-white/80 dark:bg-black/60 backdrop-blur-2xl shadow-none !flex flex-col items-center [-webkit-app-region:no-drag] data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 duration-500 overflow-hidden"
        showCloseButton={false}
      >
        <DialogTitle className="sr-only">{t('title')}</DialogTitle>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="absolute top-8 right-8 z-50 text-foreground/50 hover:text-foreground font-headline font-black uppercase tracking-[0.2em] text-sm transition-colors"
          style={{
            top: 'calc(2rem + env(safe-area-inset-top, 0px))',
            right: 'calc(2rem + env(safe-area-inset-right, 0px))',
          }}
        >
          {tCancel('cancel')}
        </button>

        <div
          className="flex flex-col items-center w-full max-w-md px-6 h-full"
          style={{ paddingTop: 'calc(4rem + env(safe-area-inset-top, 0px))' }}
        >
          <h2 className="text-3xl md:text-5xl font-black font-headline uppercase tracking-tighter text-foreground shrink-0 mb-6">
            {t('title')}
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
                    ? 'text-foreground font-black [text-shadow:0_0_12px_rgba(255,255,255,0.5)]'
                    : 'text-foreground/30 hover:text-foreground/60',
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
                {locale === l && <Check className="w-5 h-5 stroke-[3px]" />}
              </button>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
