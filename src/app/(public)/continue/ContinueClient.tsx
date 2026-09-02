'use client';

import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { LanguageSwitcher } from '@/components/layout/language-switcher';
import { GlobalLoading } from '@/components/ui/global-loading';
import { ForgotPasswordForm } from '@/features/auth/components/forgot-password-form';
import { GoogleCompleteForm } from '@/features/auth/components/google-complete-form';
import { LoginForm } from '@/features/auth/components/login-form';
import { QrLoginView } from '@/features/auth/components/qr-login-view';
import { useGoogleAuth } from '@/features/auth/hooks/use-google-auth';
import { useLoginForm } from '@/features/auth/hooks/use-login-form';
import { checkIsMobile } from '@/lib/electron-bridge';
import { useAuth } from '@/providers/auth-provider';

export default function ContinueClient() {
  const loginHook = useLoginForm();
  const google = useGoogleAuth();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { isLoading: hookLoading } = loginHook;
  const router = useRouter();
  const t = useTranslations('auth');

  const isLoading = authLoading || hookLoading;
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [initialAuthCheck] = useState(isAuthenticated);
  // The email/Google form is the default surface on every platform so
  // "Continue with Google" is reachable without a detour. QR sign-in stays one
  // tap away via the QR icon in the card header (LoginForm's onShowQr).
  const [showQr, setShowQr] = useState(false);

  useEffect(() => {
    // Check for flash messages (e.g., from logout/session end)
    const flash = sessionStorage.getItem('auth_flash');
    if (flash) {
      toast.error(flash);
      sessionStorage.removeItem('auth_flash');
    }

    // Direct redirect if already authenticated
    if (isAuthenticated) {
      if (checkIsMobile()) {
        window.location.href = '/home?tour=true';
      } else {
        router.replace('/home');
      }
    }
  }, [isAuthenticated, router]);

  useEffect(() => {
    if (isAuthenticated && !initialAuthCheck) {
      setIsTransitioning(true);
      const timer = setTimeout(() => {
        if (checkIsMobile()) {
          window.location.href = '/home?tour=true';
        } else {
          router.push('/home');
        }
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
      className={`bg-background text-foreground h-screen h-[100dvh] flex flex-col font-body overflow-y-auto md:overflow-hidden transition-[transform,opacity] duration-700 ease-out origin-top motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-4 motion-safe:zoom-in-[0.99] motion-reduce:animate-none ${isTransitioning ? 'scale-[0.98] -translate-y-4 opacity-0 pointer-events-none' : 'scale-100 translate-y-0 opacity-100'}`}
    >
      <LanguageSwitcher className="self-end mr-4 mt-2 md:absolute md:top-[calc(1rem+env(safe-area-inset-top,0px))] md:right-[calc(1rem+var(--electron-inset-right,0px)+env(safe-area-inset-right,0px))] z-50 shrink-0" />
      <main className="flex-grow flex flex-col items-center p-1 md:p-2 justify-center overflow-hidden w-full max-w-[1400px] mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-2 lg:gap-4 w-full max-w-5xl items-stretch pb-2 md:pb-0 shrink-0">
          {/* Features Bento Box - Identical to Signup for Parity */}
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

          {/* Login Card wrapper - Identical to Signup Card wrapper */}
          <div className="lg:col-span-5 flex items-stretch justify-center w-full h-full">
            <div className="bg-background border-4 border-border  pt-5 px-5 pb-0 flex flex-col gap-4 w-full max-w-md lg:max-w-none lg:min-h-[440px] h-full overflow-visible">
              <div className="flex-grow flex flex-col justify-start w-full h-full overflow-visible">
                {hookLoading ? null : google.pending ? (
                  <GoogleCompleteForm
                    pending={google.pending}
                    isCompleting={google.isCompleting}
                    usernameError={google.usernameError}
                    clearUsernameError={google.clearUsernameError}
                    onSubmit={google.complete}
                    onCancel={google.cancel}
                  />
                ) : showQr ? (
                  <QrLoginView onSwitchToEmail={() => setShowQr(false)} />
                ) : loginHook.step === 'forgot' ||
                  loginHook.step === 'forgot_success' ? (
                  <ForgotPasswordForm {...loginHook} />
                ) : (
                  <LoginForm
                    {...loginHook}
                    onShowQr={() => setShowQr(true)}
                    onContinueWithGoogle={google.start}
                    isGoogleLoading={google.isStarting}
                  />
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
      {/* Footer — no signup link: account creation happens inline via
          "Continue with Google", so there is no separate signup route. */}
      <footer className="bg-background w-full border-t-4 border-border mt-auto flex flex-col md:flex-row justify-between items-center px-4 py-4 md:px-8 md:py-6 gap-4 shrink-0">
        <p className="font-headline font-medium uppercase text-[10px] md:text-xs tracking-widest md:tracking-[0.4em] text-muted-foreground opacity-80 text-left">
          {t('footer.copyright')}
        </p>
      </footer>
    </div>
  );
}
