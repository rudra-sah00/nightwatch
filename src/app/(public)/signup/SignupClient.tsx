'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { LanguageSwitcher } from '@/components/layout/language-switcher';
import { GlobalLoading } from '@/components/ui/global-loading';
import { SignupForm } from '@/features/auth/components/signup-form';
import { useSignupForm } from '@/features/auth/hooks/use-signup-form';

import { useAuth } from '@/providers/auth-provider';

export default function SignupClient() {
  const signupHook = useSignupForm();
  const t = useTranslations('auth');
  const { isAuthenticated, isLoading: authLoading } = useAuth();

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
  if (authLoading) {
    return <GlobalLoading />;
  }

  if (initialAuthCheck) return null;

  return (
    <div
      className={`bg-background text-foreground h-screen h-[100dvh] flex flex-col font-body overflow-y-auto md:overflow-hidden transition-[transform,opacity] duration-700 ease-out origin-top motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-4 motion-safe:zoom-in-[0.99] motion-reduce:animate-none ${isTransitioning ? 'scale-[0.98] -translate-y-4 opacity-0 pointer-events-none' : 'scale-100 translate-y-0 opacity-100'}`}
    >
      <LanguageSwitcher className="self-end mr-4 mt-2 md:absolute md:top-[calc(1rem+env(safe-area-inset-top,0px))] md:right-[calc(1rem+var(--electron-inset-right,0px)+env(safe-area-inset-right,0px))] z-50 shrink-0" />
      <main className="flex-grow flex flex-col items-center p-1 md:p-2 justify-center overflow-hidden w-full max-w-[1400px] mx-auto">
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
      </main>

      {/* Footer */}
      <footer className="bg-background w-full border-t-4 border-border mt-auto flex flex-col md:flex-row justify-between items-center px-4 py-4 md:px-8 md:py-6 gap-4 shrink-0">
        <p className="font-headline font-medium uppercase text-[10px] md:text-xs tracking-widest md:tracking-[0.4em] text-muted-foreground opacity-80 text-left">
          {t('footer.copyright')}
        </p>
        <div className="flex flex-col md:flex-row items-center gap-4 md:gap-8">
          <Link
            href="/login"
            className="group flex items-center gap-2 transition-transform active:scale-95 rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neo-yellow/70 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            <span className="font-headline font-bold uppercase text-[10px] md:text-xs tracking-widest text-muted-foreground opacity-40 group-hover:opacity-100 transition-opacity whitespace-nowrap">
              {t('footer.alreadyMember')}
            </span>
            <span className="font-headline font-black uppercase text-[10px] md:text-xs tracking-widest text-neo-yellow group-hover:text-foreground underline decoration-neo-yellow/30 underline-offset-4 transition-colors">
              {t('footer.signIn')}
            </span>
          </Link>
        </div>
      </footer>
    </div>
  );
}
