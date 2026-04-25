'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { LanguageSwitcher } from '@/components/layout/language-switcher';
import { Button } from '@/components/ui/button';
import { GlobalLoading } from '@/components/ui/global-loading';
import { SignupForm } from '@/features/auth/components/signup-form';
import { useSignupForm } from '@/features/auth/hooks/use-signup-form';

import { useAuth } from '@/providers/auth-provider';

export default function SignupClient() {
  const signupHook = useSignupForm();
  const t = useTranslations('auth');
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { isLoading: hookLoading, isInviteValid } = signupHook;

  const isLoading = authLoading || hookLoading;
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [initialAuthCheck] = useState(isAuthenticated);
  const router = useRouter();

  useEffect(() => {
    if (isAuthenticated && !initialAuthCheck) {
      setIsTransitioning(true);
      const timer = setTimeout(() => {
        router.push('/home?tour=true');
      }, 700);
      return () => clearTimeout(timer);
    }
  }, [isAuthenticated, initialAuthCheck, router]);

  // Loading State
  if (isLoading) {
    return <GlobalLoading />;
  }

  if (initialAuthCheck) return null;

  return (
    <div
      className={`bg-background text-foreground h-screen h-[100dvh] flex flex-col font-body overflow-hidden transition-[transform,opacity] duration-700 ease-out origin-top motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-4 motion-safe:zoom-in-[0.99] motion-reduce:animate-none ${isTransitioning ? 'scale-[0.98] -translate-y-4 opacity-0 pointer-events-none' : 'scale-100 translate-y-0 opacity-100'}`}
    >
      <LanguageSwitcher className="absolute top-[calc(1rem)] right-[calc(1rem+var(--electron-inset-right,0px))] z-50" />
      <main className="flex-grow flex flex-col items-center p-1 md:p-2 justify-center overflow-hidden w-full max-w-[1400px] mx-auto">
        {isInviteValid === false ? (
          <div className="flex flex-col items-center justify-center p-8 bg-background border-4 border-border  max-w-md w-full motion-safe:animate-in motion-safe:zoom-in motion-safe:duration-300 motion-reduce:animate-none">
            <span className="material-symbols-outlined text-6xl text-neo-red mb-4">
              block
            </span>
            <h1 className="text-3xl font-black uppercase tracking-tighter mb-2 font-headline text-center">
              {t('signup.accessDenied')}
            </h1>
            <p className="text-center font-body font-semibold text-sm text-foreground/60 uppercase tracking-tight mb-2">
              {t('signup.inviteRequired')}
            </p>
            <p className="text-center font-body text-[10px] text-foreground opacity-50 uppercase tracking-widest max-w-[80%]">
              {t('signup.contactAdmin')}
            </p>
            <div className="mt-8 w-full">
              <Button
                asChild
                variant="neo-yellow"
                size="neo-lg"
                className="w-full text-center"
              >
                <Link href="/login">{t('signup.backToLogin')}</Link>
              </Button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-2 lg:gap-4 w-full max-w-5xl items-stretch pb-2 md:pb-0 shrink-0">
            {/* Features Bento Box - height driven by the signup form on the right */}
            <div className="hidden lg:grid lg:col-span-7 grid-cols-1 md:grid-cols-2 grid-rows-2 gap-4 lg:gap-6 lg:min-h-[440px] h-full">
              <div className="bg-primary text-primary-foreground p-4 md:p-5 border-4 border-border cursor-default select-none flex flex-col justify-between aspect-square md:aspect-auto">
                <div>
                  <span
                    className="material-symbols-outlined text-3xl mb-2"
                    style={{ fontVariationSettings: "'FILL' 1" }}
                  >
                    person
                  </span>
                  <h3 className="text-lg md:text-xl font-bold uppercase tracking-tight mb-1 font-headline">
                    {t('features.solo.title')}
                  </h3>
                  <p className="font-body opacity-80 leading-tight text-xs">
                    {t('features.solo.desc')}
                  </p>
                </div>
              </div>
              <div className="bg-secondary text-foreground p-4 md:p-5 border-4 border-border cursor-default select-none flex flex-col justify-between aspect-square md:aspect-auto">
                <div>
                  <span
                    className="material-symbols-outlined text-3xl mb-2"
                    style={{ fontVariationSettings: "'FILL' 1" }}
                  >
                    video_call
                  </span>
                  <h3 className="text-lg md:text-xl font-bold uppercase tracking-tight mb-1 font-headline">
                    {t('features.party.title')}
                  </h3>
                  <p className="font-body text-foreground leading-tight text-xs">
                    {t('features.party.desc')}
                  </p>
                </div>
              </div>
              <div className="md:col-span-2 bg-accent text-foreground p-4 md:p-6 border-4 border-border cursor-default select-none flex items-center gap-4">
                <span
                  className="material-symbols-outlined text-5xl"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  sync_alt
                </span>
                <div>
                  <h3 className="text-xl md:text-2xl font-black uppercase tracking-tighter font-headline">
                    {t('features.sync.title')}
                  </h3>
                  <p className="font-body font-medium text-xs">
                    {t('features.sync.desc')}
                  </p>
                </div>
              </div>
            </div>
            {/* Signup Card wrapper */}
            <div className="lg:col-span-5 flex items-stretch justify-center w-full h-full">
              <div className="bg-background border-4 border-border  pt-5 px-5 pb-0 flex flex-col gap-4 w-full max-w-md lg:max-w-none lg:min-h-[440px] h-full overflow-visible">
                <div className="flex-grow flex flex-col justify-start w-full h-full overflow-visible">
                  <SignupForm {...signupHook} />
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-primary dark:bg-background w-full border-t-4 border-border mt-auto flex flex-col md:flex-row justify-between items-center px-4 py-4 md:px-8 md:py-6 gap-4 shrink-0">
        <p className="font-headline font-medium uppercase text-[10px] md:text-xs tracking-widest md:tracking-[0.4em] text-primary-foreground/80 dark:text-muted-foreground opacity-80 text-left">
          {t('footer.copyright')}
        </p>
        <div className="flex flex-col md:flex-row items-center gap-4 md:gap-8">
          <Link
            href="/whats-new"
            className="group flex items-center gap-2 transition-transform active:scale-95 rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neo-yellow/70 focus-visible:ring-offset-2 focus-visible:ring-offset-primary dark:ring-offset-background"
          >
            <span className="font-headline font-bold uppercase text-[8px] md:text-[10px] tracking-widest text-primary-foreground/80 dark:text-muted-foreground opacity-40 group-hover:opacity-100 transition-opacity whitespace-nowrap">
              {t('footer.stayUpdated')}
            </span>
            <span className="font-headline font-black uppercase text-[8px] md:text-[10px] tracking-widest text-neo-yellow group-hover:text-white underline decoration-neo-yellow/30 underline-offset-4 transition-colors whitespace-nowrap">
              {t('footer.whatsNew')}
            </span>
          </Link>

          <p className="font-headline font-bold uppercase text-[10px] md:text-xs tracking-widest text-neo-red text-center md:text-left">
            {t('footer.privateAccess')}
          </p>
        </div>
      </footer>
    </div>
  );
}
