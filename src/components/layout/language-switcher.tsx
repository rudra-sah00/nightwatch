'use client';

import { Globe } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { useCallback, useState } from 'react';
import { COOKIE_NAME, locales } from '@/i18n/config';
import { cn } from '@/lib/utils';

const LOCALE_LABELS: Record<string, { native: string; flag: string }> = {
  en: { native: 'English', flag: '🇬🇧' },
  hi: { native: 'हिन्दी', flag: '🇮🇳' },
  ta: { native: 'தமிழ்', flag: '🇮🇳' },
  te: { native: 'తెలుగు', flag: '🇮🇳' },
  es: { native: 'Español', flag: '🇪🇸' },
  fr: { native: 'Français', flag: '🇫🇷' },
  ja: { native: '日本語', flag: '🇯🇵' },
  ko: { native: '한국어', flag: '🇰🇷' },
};

function setCookie(name: string, value: string) {
  // biome-ignore lint/suspicious/noDocumentCookie: next-intl requires cookie for SSR locale detection
  document.cookie = `${name}=${value};path=/;max-age=31536000;samesite=lax`;
}

export function LanguageSwitcher() {
  const locale = useLocale();
  const router = useRouter();
  const t = useTranslations('language');
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
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="p-2 hover:bg-foreground/10 transition-colors rounded-md"
        title={t('title')}
        aria-label={t('title')}
      >
        <Globe className="w-5 h-5" />
      </button>

      {open && (
        <>
          <button
            type="button"
            className="fixed inset-0 z-40 cursor-default bg-transparent"
            onClick={() => setOpen(false)}
            aria-label="Close language menu"
            tabIndex={-1}
          />
          <div className="absolute right-0 top-full mt-2 z-50 border-[3px] border-border bg-background shadow-lg min-w-[160px]">
            {locales.map((l) => (
              <button
                key={l}
                type="button"
                onClick={() => switchLocale(l)}
                className={cn(
                  'w-full px-4 py-2.5 text-left flex items-center gap-3 hover:bg-foreground/5 transition-colors',
                  locale === l && 'bg-foreground/10 font-bold',
                )}
              >
                <span className="text-lg">{LOCALE_LABELS[l].flag}</span>
                <span className="text-sm font-headline font-bold tracking-wide">
                  {LOCALE_LABELS[l].native}
                </span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
