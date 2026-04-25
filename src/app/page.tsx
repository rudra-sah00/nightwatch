'use client';

import {
  ArrowRight,
  Download,
  MessageCircle,
  MonitorPlay,
  Radio,
  Shield,
  Users,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { useDownloadLinks } from '@/hooks/use-download-links';
import { checkIsDesktop } from '@/lib/electron-bridge';
import { useAuth } from '@/providers/auth-provider';

const FEATURE_ICONS = [
  MonitorPlay,
  Users,
  Radio,
  MessageCircle,
  Download,
  Shield,
] as const;
const FEATURE_KEYS = [
  'watchTogether',
  'watchParties',
  'goLive',
  'messaging',
  'offline',
  'secure',
] as const;

const PLATFORM_BUTTONS = [
  {
    key: 'windows' as const,
    label: 'Windows',
    icon: (
      <svg
        viewBox="0 0 24 24"
        fill="currentColor"
        className="w-5 h-5 shrink-0"
        role="img"
        aria-label="Windows"
      >
        <path d="M3 12V6.5l8-1.1V12H3zm0 5.5V12h8v6.6l-8-1.1zm9-12.9L22 3v9h-10V5.1zM22 12v9l-10 2V12h10z" />
      </svg>
    ),
  },
  {
    key: 'mac' as const,
    label: 'macOS',
    icon: (
      <svg
        viewBox="0 0 24 24"
        fill="currentColor"
        className="w-5 h-5 shrink-0"
        role="img"
        aria-label="macOS"
      >
        <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
      </svg>
    ),
  },
  {
    key: 'linux' as const,
    label: 'Linux',
    icon: (
      <svg
        viewBox="0 0 24 24"
        fill="currentColor"
        className="w-5 h-5 shrink-0"
        role="img"
        aria-label="Linux"
      >
        <path d="M12.504 0c-.155 0-.315.008-.48.021-4.226.333-3.105 4.807-3.17 6.298-.076 1.092-.3 1.953-1.05 3.02-.885 1.051-2.127 2.75-2.716 4.521-.278.832-.41 1.684-.287 2.489a.424.424 0 00-.11.135c-.26.268-.45.6-.663.839-.199.199-.485.267-.797.4-.313.136-.658.269-.864.68-.09.189-.136.394-.132.602 0 .199.027.4.055.536.058.399.116.728.04.97-.249.68-.28 1.145-.106 1.484.174.334.535.47.94.601.81.2 1.91.135 2.774.6.926.466 1.866.67 2.616.47.526-.116.97-.464 1.208-.946.587-.003 1.23-.269 2.26-.334.699-.058 1.574.267 2.577.2.025.134.063.198.114.333l.003.003c.391.778 1.113 1.368 1.884 1.43.868.07 1.723-.26 2.456-.594.733-.34 1.455-.678 2.186-.78.292-.042.594-.04.857.058a.32.32 0 00.286 0c.166-.09.296-.267.406-.466.109-.198.195-.467.305-.642.087-.174.183-.349.245-.516.06-.17.1-.334.1-.501 0-.21-.05-.39-.192-.536-.112-.12-.266-.19-.422-.23a.86.86 0 00.012-.045c.4-.88.127-1.632-.24-2.268-.376-.631-.862-1.2-1.205-1.774-.345-.576-.58-1.21-.689-2.04-.122-.93-.08-1.56-.079-2.14 0-.58.032-1.12-.18-1.68-.37-.97-1.15-1.86-2.05-2.46-.9-.6-1.94-.93-2.88-.93z" />
      </svg>
    ),
  },
];

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
    key: 'friends',
    icon: MessageCircle,
    color: 'text-neo-cyan',
    span: '',
    bg: 'bg-card text-foreground',
    descColor: 'text-foreground/50',
    large: false,
  },
  {
    key: 'downloads',
    icon: Download,
    color: 'text-neo-green',
    span: 'md:col-span-2 lg:col-span-1',
    bg: 'bg-secondary text-foreground',
    descColor: 'text-foreground/70',
    large: false,
  },
] as const;

export default function LandingPage() {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const downloads = useDownloadLinks();
  const t = useTranslations('common.landing');

  useEffect(() => {
    if (!isLoading && isAuthenticated) router.replace('/home');
    if (!isLoading && !isAuthenticated && checkIsDesktop())
      router.replace('/login');
  }, [isAuthenticated, isLoading, router]);

  if (isLoading || isAuthenticated || checkIsDesktop()) {
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

      {/* Download Desktop App */}
      <section className="relative z-10 px-4 md:px-8 pb-24 max-w-4xl mx-auto text-center">
        <h2 className="font-headline font-black text-3xl md:text-4xl uppercase tracking-tighter mb-3">
          {t('downloadTitle')}
        </h2>
        <p className="text-sm text-foreground/50 mb-10 max-w-md mx-auto">
          {t('downloadDesc')}
        </p>
        {downloads && (
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            {PLATFORM_BUTTONS.map((p) => (
              <a
                key={p.key}
                href={downloads[p.key]}
                className="flex items-center gap-3 border-4 border-border bg-card px-6 py-4 font-headline font-black uppercase text-xs tracking-widest hover:bg-primary hover:text-primary-foreground transition-colors w-full sm:w-auto justify-center"
              >
                {p.icon}
                {p.label}
              </a>
            ))}
          </div>
        )}
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
            <Link
              href="/whats-new"
              className="font-headline font-bold uppercase text-[10px] tracking-widest text-primary-foreground/50 dark:text-foreground/40 hover:text-neo-yellow transition-colors"
            >
              {t('footer.whatsNew')}
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
