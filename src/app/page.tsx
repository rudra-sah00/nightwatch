'use client';

import {
  ArrowRight,
  MonitorPlay,
  Music,
  Radio,
  Shield,
  Users,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { checkIsDesktop, checkIsMobile } from '@/lib/electron-bridge';
import { useAuth } from '@/providers/auth-provider';

const FEATURE_ICONS = [MonitorPlay, Users, Radio, Shield] as const;
const FEATURE_KEYS = [
  'watchTogether',
  'watchParties',
  'goLive',
  'secure',
] as const;

const BENTO_CONFIG = [
  {
    key: 'sync',
    icon: MonitorPlay,
    color: 'text-neo-yellow',
    span: 'md:col-span-2 lg:col-span-2',
    bg: 'bg-primary text-primary-foreground',
    descColor: 'text-primary-foreground/60',
    large: true,
  },
  {
    key: 'party',
    icon: Users,
    color: '',
    span: '',
    bg: 'bg-neo-yellow text-foreground',
    descColor: 'text-foreground/70',
    large: false,
  },
  {
    key: 'live',
    icon: Radio,
    color: 'text-neo-red',
    span: '',
    bg: 'bg-card text-foreground',
    descColor: 'text-foreground/50',
    large: false,
  },
  {
    key: 'music',
    icon: Music,
    color: 'text-neo-cyan',
    span: '',
    bg: 'bg-card text-foreground',
    descColor: 'text-foreground/50',
    large: false,
  },
] as const;

export default function LandingPage() {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const t = useTranslations('common.landing');

  useEffect(() => {
    if (!isLoading && isAuthenticated) router.replace('/home');
    if (!isLoading && !isAuthenticated && (checkIsDesktop() || checkIsMobile()))
      router.replace('/login');
  }, [isAuthenticated, isLoading, router]);

  if (isLoading || isAuthenticated || checkIsDesktop() || checkIsMobile()) {
    return (
      <div className="min-h-[100dvh] bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-border border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-background text-foreground font-body selection:bg-neo-yellow selection:text-foreground overflow-x-hidden overflow-y-auto h-full">
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute -top-[20%] -right-[10%] w-[60vw] h-[60vw] rounded-full bg-neo-yellow/[0.04]" />
        <div className="absolute -bottom-[15%] -left-[10%] w-[50vw] h-[50vw] rounded-full bg-neo-blue/[0.03]" />
      </div>

      {/* Hero */}
      <section className="relative z-10 flex flex-col items-center justify-center min-h-[100dvh] px-6 text-center">
        <div className="mb-8">
          <span className="font-headline font-black italic text-3xl md:text-4xl uppercase tracking-tighter">
            {t('brand')}
          </span>
        </div>

        <span className="inline-block bg-neo-yellow text-foreground font-headline font-black text-[9px] md:text-[10px] uppercase tracking-[0.35em] px-4 py-1 border-4 border-border mb-10">
          {t('badge')}
        </span>

        <h1 className="font-headline font-black text-[clamp(2.8rem,8vw,7rem)] uppercase tracking-tighter leading-[0.85] max-w-4xl">
          {t('heroTitle1')}
          <br />
          <span className="text-neo-yellow">{t('heroTitle2')}</span>
        </h1>

        <p className="mt-6 text-sm md:text-base text-foreground/50 max-w-lg leading-relaxed">
          {t('heroSubtitle')}
        </p>

        <Button
          asChild
          variant="neo-yellow"
          size="none"
          className="mt-10 px-10 py-4 text-sm uppercase tracking-[0.2em] font-headline font-black group"
        >
          <Link href="/login">
            {t('login')}
            <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
          </Link>
        </Button>

        <div className="flex flex-wrap items-center justify-center gap-3 mt-16 max-w-2xl">
          {FEATURE_KEYS.map((key, i) => {
            const Icon = FEATURE_ICONS[i];
            return (
              <div
                key={key}
                className="flex items-center gap-2 border-[3px] border-border px-3 py-1.5 bg-card cursor-default hover:scale-105 transition-transform"
              >
                <Icon
                  className="w-3.5 h-3.5 text-neo-yellow"
                  strokeWidth={2.5}
                />
                <span className="font-headline font-bold uppercase text-[10px] tracking-widest whitespace-nowrap">
                  {t(`features.${key}.title`)}
                </span>
              </div>
            );
          })}
        </div>
      </section>

      {/* Bento Features */}
      <section className="relative z-10 px-4 md:px-8 pb-24 max-w-6xl mx-auto">
        <h2 className="font-headline font-black text-3xl md:text-4xl uppercase tracking-tighter text-center mb-12">
          {t('bentoTitle')}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {BENTO_CONFIG.map((b) => {
            const Icon = b.icon;
            return (
              <div
                key={b.key}
                className={`${b.span} ${b.bg} border-4 border-border ${b.large ? 'p-8 md:p-10' : 'p-8'} flex flex-col justify-between min-h-[220px] cursor-default`}
              >
                <Icon
                  className={`w-10 h-10 ${b.color} mb-4`}
                  strokeWidth={2.5}
                />
                <div>
                  <h3
                    className={`font-headline font-black ${b.large ? 'text-xl md:text-2xl' : 'text-lg'} uppercase tracking-tight mb-2`}
                  >
                    {t(`bento.${b.key}.title`)}
                  </h3>
                  <p
                    className={`font-body ${b.large ? 'text-sm' : 'text-xs'} ${b.descColor} leading-relaxed ${b.large ? 'max-w-md' : ''}`}
                  >
                    {t(`bento.${b.key}.desc`)}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="relative z-10 border-t-4 border-border bg-primary dark:bg-card">
        <div className="max-w-4xl mx-auto px-6 py-16 md:py-20 flex flex-col items-center text-center">
          <h2 className="font-headline font-black text-2xl md:text-4xl uppercase tracking-tighter text-primary-foreground dark:text-foreground mb-4">
            {t('ctaTitle')}
          </h2>
          <p className="text-sm text-primary-foreground/50 dark:text-foreground/50 mb-8 max-w-sm">
            {t('ctaDesc')}
          </p>
          <Button
            asChild
            variant="neo-yellow"
            size="none"
            className="px-10 py-4 text-sm uppercase tracking-[0.2em] font-headline font-black group"
          >
            <Link href="/login">
              {t('login')}
              <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
            </Link>
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 bg-primary dark:bg-card border-t-4 border-border">
        <div className="px-6 md:px-12 pb-10 pt-10 max-w-2xl">
          <p className="text-[11px] text-primary-foreground/40 dark:text-foreground/30 leading-relaxed font-body">
            {t('footer.disclaimer')}
          </p>
        </div>
        <div className="border-t border-primary-foreground/10 dark:border-foreground/10 px-6 md:px-12 py-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
            <Link
              href="/terms"
              className="font-headline font-bold uppercase text-[10px] tracking-widest text-primary-foreground/50 dark:text-foreground/40 hover:text-neo-yellow transition-colors"
            >
              {t('footer.terms')}
            </Link>
            <Link
              href="/privacy"
              className="font-headline font-bold uppercase text-[10px] tracking-widest text-primary-foreground/50 dark:text-foreground/40 hover:text-neo-yellow transition-colors"
            >
              {t('footer.privacy')}
            </Link>
          </div>
          <p className="font-headline font-medium uppercase text-[10px] tracking-[0.25em] text-primary-foreground/30 dark:text-foreground/20">
            {t('footer.copyright', { year: new Date().getFullYear() })}
          </p>
        </div>
      </footer>
    </div>
  );
}
