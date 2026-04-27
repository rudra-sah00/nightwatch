'use client';

import { User } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useMusicPlayerContext } from '@/features/music/context/MusicPlayerContext';
import { useAuth } from '@/providers/auth-provider';

export function Navbar() {
  const { user } = useAuth();
  const { expanded: musicExpanded } = useMusicPlayerContext();
  const t = useTranslations('common.nav');

  return (
    <nav
      data-electron-drag-region
      className={`sticky top-0 z-50 w-full bg-background text-foreground overflow-hidden ${musicExpanded ? '[-webkit-app-region:no-drag]' : '[-webkit-app-region:drag]'}`}
    >
      <div
        className="flex justify-between items-center w-full max-w-5xl mx-auto px-4 sm:px-6 h-20 relative gap-4"
        style={{
          paddingLeft: `max(1rem, var(--electron-inset-left, 0px))`,
          paddingRight: `max(1rem, var(--electron-inset-right, 0px))`,
        }}
      >
        {/* Left Side: Brand Logo */}
        <div className="flex-1 flex justify-start items-center">
          <Link
            href="/home"
            className="flex items-center gap-2 py-4 px-2 [-webkit-app-region:no-drag]"
            title={t('home')}
          >
            <div className="md:hidden w-10 h-10 border border-border bg-neo-yellow flex items-center justify-center rounded-md hover:bg-neo-yellow/80 transition-colors shrink-0">
              <img
                src="/logo-ico.png"
                alt={t('logoAlt')}
                width={24}
                height={24}
                className="w-6 h-6 object-contain"
              />
            </div>
            <span className="hidden md:block text-2xl md:text-3xl font-black italic tracking-tighter text-foreground font-headline uppercase whitespace-nowrap">
              NIGHTWATCH
            </span>
          </Link>
        </div>

        {/* Right Side: Profile */}
        <div className="flex-1 flex justify-end items-center shrink-0 gap-3">
          <Link
            href="/profile"
            className="flex flex-col items-center [-webkit-app-region:no-drag] justify-center gap-1 hover:bg-black/5 text-foreground rounded-lg px-3 py-1.5 transition-colors min-w-[72px]"
            title={t('profile')}
          >
            <div className="relative w-6 h-6 shrink-0 flex items-center justify-center overflow-hidden">
              {user?.profilePhoto ? (
                <Image
                  src={user.profilePhoto}
                  alt={user?.name || t('profile')}
                  fill
                  sizes="32px"
                  className="object-cover rounded-full"
                />
              ) : (
                <User className="w-5 h-5 text-foreground" />
              )}
            </div>
            <span className="font-headline font-black uppercase text-[10px] hidden sm:block tracking-widest leading-none mt-0.5">
              {t('profile')}
            </span>
          </Link>
        </div>
      </div>
      <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-border" />
    </nav>
  );
}
