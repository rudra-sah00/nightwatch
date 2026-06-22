'use client';

import {
  FocusContext,
  useFocusable,
} from '@noriginmedia/norigin-spatial-navigation';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useAuthStore } from '@/store/use-auth-store';
import { useTvFocus } from '../hooks/use-tv-focus';
import { FOCUS_KEYS } from '../lib/focus-keys';

function FocusableNavLink({
  href,
  label,
  icon,
}: {
  href: string;
  label: string;
  icon: string;
}) {
  const router = useRouter();
  const { ref, focused } = useFocusable({
    onEnterPress: () => router.push(href),
  });

  return (
    <div
      ref={ref}
      className={`flex items-center gap-4 px-5 py-4 bg-card border rounded-xl transition-all ${
        focused
          ? 'border-indigo-500 bg-secondary/50 scale-[1.01]'
          : 'border-border'
      }`}
    >
      <span
        className={`material-symbols-outlined text-xl ${focused ? 'text-foreground' : 'text-muted-foreground'}`}
      >
        {icon}
      </span>
      <span className="flex-1 font-headline font-bold uppercase tracking-wider text-sm">
        {label}
      </span>
      <span
        className={`material-symbols-outlined text-lg ${focused ? 'text-foreground' : 'text-muted-foreground/50'}`}
      >
        chevron_right
      </span>
    </div>
  );
}

function SignOutButton() {
  const logout = useAuthStore((s) => s.logout);
  const { ref, focused } = useFocusable({
    onEnterPress: () => logout(),
  });

  return (
    <div
      ref={ref}
      className={`flex items-center gap-4 px-5 py-4 rounded-xl transition-all ${
        focused
          ? 'bg-red-500/20 border-red-500 ring-2 ring-red-500'
          : 'bg-card border border-border'
      }`}
    >
      <span className="font-headline font-bold uppercase tracking-wider text-sm text-red-400">
        Sign Out
      </span>
    </div>
  );
}

export function TvProfile() {
  const t = useTranslations('profile');
  const navT = useTranslations('common.nav');
  const user = useAuthStore((s) => s.user);
  const { ref, focusKey } = useFocusable({ focusKey: 'TV_PROFILE_PAGE' });

  useTvFocus('tv-profile', FOCUS_KEYS.CONTENT);

  if (!user) return null;

  return (
    <FocusContext.Provider value={focusKey}>
      <main
        ref={ref}
        className="max-w-5xl mx-auto px-4 sm:px-6 py-12 space-y-8 w-full"
      >
        <h1 className="text-4xl font-black font-headline uppercase tracking-tighter">
          {navT('profile')}
        </h1>

        {/* User Info */}
        <section className="bg-card border border-border rounded-xl shadow-sm p-8 flex items-center gap-6">
          {user.profilePhoto ? (
            <img
              src={user.profilePhoto}
              alt=""
              className="w-20 h-20 rounded-full object-cover border-4 border-border"
            />
          ) : (
            <div className="w-20 h-20 rounded-full bg-indigo-600 flex items-center justify-center text-3xl font-black text-white">
              {user.name?.charAt(0).toUpperCase() ?? '?'}
            </div>
          )}
          <div>
            <h2 className="text-2xl font-black font-headline uppercase tracking-tight">
              {user.name}
            </h2>
            <p className="text-muted-foreground font-headline font-bold uppercase tracking-widest text-sm">
              {user.email}
            </p>
          </div>
        </section>

        {/* Nav */}
        <nav className="flex flex-col gap-2">
          <FocusableNavLink
            href="/profile/preferences"
            label={t('nav.preferences')}
            icon="palette"
          />
        </nav>

        {/* Sign Out */}
        <SignOutButton />
      </main>
    </FocusContext.Provider>
  );
}
