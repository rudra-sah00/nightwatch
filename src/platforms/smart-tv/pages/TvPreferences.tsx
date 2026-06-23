'use client';

import {
  FocusContext,
  useFocusable,
} from '@noriginmedia/norigin-spatial-navigation';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { getCookie, setCookie } from '@/lib/cookies';
import { cn } from '@/lib/utils';
import { useTheme } from '@/providers/theme-provider';
import { useTvFocus } from '../hooks/use-tv-focus';
import { FOCUS_KEYS } from '../lib/focus-keys';

const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'hi', label: 'हिन्दी' },
  { code: 'es', label: 'Español' },
  { code: 'fr', label: 'Français' },
  { code: 'de', label: 'Deutsch' },
  { code: 'ja', label: '日本語' },
  { code: 'ko', label: '한국어' },
  { code: 'pt', label: 'Português' },
  { code: 'ru', label: 'Русский' },
  { code: 'zh', label: '中文' },
  { code: 'ar', label: 'العربية' },
  { code: 'it', label: 'Italiano' },
  { code: 'tr', label: 'Türkçe' },
  { code: 'nl', label: 'Nederlands' },
];

function FocusableToggle({
  label,
  description,
  icon,
  iconColor,
  checked,
  onToggle,
}: {
  label: string;
  description: string;
  icon: string;
  iconColor: string;
  checked: boolean;
  onToggle: () => void;
}) {
  const { ref, focused } = useFocusable({ onEnterPress: onToggle });
  return (
    <div
      ref={ref}
      className={`flex items-center justify-between gap-4 px-6 py-5 rounded-xl transition-colors ${
        focused ? 'bg-secondary/50 ring-2 ring-tv-focus' : ''
      }`}
    >
      <div className="flex flex-col gap-1">
        <span className="font-headline font-bold uppercase tracking-widest text-muted-foreground text-sm flex items-center gap-2">
          <span className={`material-symbols-outlined text-base ${iconColor}`}>
            {icon}
          </span>
          {label}
        </span>
        <p className="text-muted-foreground font-body text-sm max-w-sm">
          {description}
        </p>
      </div>
      <div
        className={cn(
          'relative inline-flex h-8 w-16 items-center rounded-full transition-colors shrink-0',
          checked ? 'bg-neo-blue' : 'bg-secondary',
        )}
      >
        <span
          className={cn(
            'inline-flex h-6 w-6 transform rounded-full bg-background shadow transition-transform',
            checked ? 'translate-x-9' : 'translate-x-1',
          )}
        />
      </div>
    </div>
  );
}

function FocusableThemeButton({
  label,
  icon,
  active,
  onSelect,
}: {
  label: string;
  icon: string;
  active: boolean;
  onSelect: () => void;
}) {
  const { ref, focused } = useFocusable({ onEnterPress: onSelect });
  return (
    <div
      ref={ref}
      className={cn(
        'flex items-center gap-4 px-6 py-4 rounded-xl transition-all',
        focused && 'ring-2 ring-tv-focus',
        active
          ? 'bg-primary text-primary-foreground'
          : 'bg-card border border-border',
      )}
    >
      <span className="material-symbols-outlined text-xl">{icon}</span>
      <span className="font-headline font-bold tracking-wide">{label}</span>
    </div>
  );
}

function FocusableLangButton({
  label,
  active,
  onSelect,
}: {
  label: string;
  active: boolean;
  onSelect: () => void;
}) {
  const { ref, focused } = useFocusable({ onEnterPress: onSelect });
  return (
    <div
      ref={ref}
      className={cn(
        'px-5 py-3 rounded-xl transition-all text-sm font-headline font-bold',
        focused && 'ring-2 ring-tv-focus',
        active
          ? 'bg-primary text-primary-foreground'
          : 'bg-card border border-border text-foreground',
      )}
    >
      {label}
    </div>
  );
}

export function TvPreferences() {
  const t = useTranslations('profile');
  const { theme, setTheme } = useTheme();
  const { ref, focusKey } = useFocusable({ focusKey: 'TV_PREFS_PAGE' });

  const [gapless, setGapless] = useState(true);
  const [currentLocale, setCurrentLocale] = useState('en');

  useTvFocus('tv-preferences', FOCUS_KEYS.CONTENT);

  useEffect(() => {
    try {
      const g = localStorage.getItem('nightwatch:gapless');
      if (g !== null) setGapless(g !== 'false');
      // Read current locale from cookie
      const locale = getCookie('NEXT_LOCALE');
      if (locale) setCurrentLocale(locale);
    } catch {}
  }, []);

  const changeLanguage = (code: string) => {
    setCurrentLocale(code);
    // Set locale cookie for next-intl
    const expires = new Date(
      Date.now() + 365 * 24 * 60 * 60 * 1000,
    ).toUTCString();
    setCookie('NEXT_LOCALE', code, `path=/;expires=${expires}`);
    window.location.href = window.location.pathname;
  };

  return (
    <FocusContext.Provider value={focusKey}>
      <main ref={ref} className="max-w-5xl mx-auto px-4 sm:px-6 py-12 w-full">
        <section className="bg-card text-card-foreground border border-border rounded-xl shadow-sm p-8">
          <h2 className="text-4xl font-black font-headline uppercase tracking-tighter mb-8">
            {t('preferences.title')}
          </h2>

          <div className="flex flex-col gap-6">
            {/* Theme */}
            <div className="flex flex-col gap-2">
              <span className="font-headline font-bold uppercase tracking-widest text-muted-foreground text-sm flex items-center gap-2 px-2">
                <span className="material-symbols-outlined text-base text-neo-yellow">
                  palette
                </span>
                {t('preferences.themeSelection')}
              </span>
              <div className="flex gap-3">
                <FocusableThemeButton
                  label="Light"
                  icon="light_mode"
                  active={theme === 'light'}
                  onSelect={() => setTheme('light')}
                />
                <FocusableThemeButton
                  label="Dark"
                  icon="dark_mode"
                  active={theme === 'dark'}
                  onSelect={() => setTheme('dark')}
                />
                <FocusableThemeButton
                  label="System"
                  icon="monitor"
                  active={theme === 'system'}
                  onSelect={() => setTheme('system')}
                />
              </div>
            </div>

            <div className="h-px bg-border w-full" />

            {/* Language */}
            <div className="flex flex-col gap-3">
              <span className="font-headline font-bold uppercase tracking-widest text-muted-foreground text-sm flex items-center gap-2 px-2">
                <span className="material-symbols-outlined text-base text-neo-blue">
                  language
                </span>
                {t('preferences.language')}
              </span>
              <div className="flex flex-wrap gap-2">
                {LANGUAGES.map((lang) => (
                  <FocusableLangButton
                    key={lang.code}
                    label={lang.label}
                    active={currentLocale === lang.code}
                    onSelect={() => changeLanguage(lang.code)}
                  />
                ))}
              </div>
            </div>

            <div className="h-px bg-border w-full" />

            {/* Gapless Playback */}
            <FocusableToggle
              label="Gapless Playback"
              description="No silence between tracks"
              icon="bolt"
              iconColor="text-neo-yellow"
              checked={gapless}
              onToggle={() => {
                const next = !gapless;
                setGapless(next);
                localStorage.setItem('nightwatch:gapless', String(next));
              }}
            />
          </div>
        </section>
      </main>
    </FocusContext.Provider>
  );
}
