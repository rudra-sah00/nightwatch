'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { LanguageSwitcher } from '@/components/layout/language-switcher';
import { GlobalLoading } from '@/components/ui/global-loading';
import { ForgotPasswordForm } from '@/features/auth/components/forgot-password-form';
import { LoginForm } from '@/features/auth/components/login-form';
import { useLoginForm } from '@/features/auth/hooks/use-login-form';
import { checkIsDesktop, desktopBridge } from '@/lib/electron-bridge';
import { useAuth } from '@/providers/auth-provider';

export default function LoginClient() {
  const loginHook = useLoginForm();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { isLoading: hookLoading } = loginHook;
  const router = useRouter();
  const t = useTranslations('auth');

  const isLoading = authLoading || hookLoading;
  const [copied, setCopied] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [initialAuthCheck] = useState(isAuthenticated);
  const [_desktopWaiting, setDesktopWaiting] = useState(false);

  useEffect(() => {
    // Check for flash messages (e.g., from logout/session end)
    const flash = sessionStorage.getItem('auth_flash');
    if (flash) {
      toast.error(flash);
      sessionStorage.removeItem('auth_flash');
    }

    // Direct redirect if already authenticated
    if (isAuthenticated) {
      router.replace('/home');
    }
  }, [isAuthenticated, router]);

  useEffect(() => {
    if (isAuthenticated && !initialAuthCheck) {
      setIsTransitioning(true);
      const timer = setTimeout(() => {
        router.push('/home');
      }, 700);
      return () => clearTimeout(timer);
    }
  }, [isAuthenticated, initialAuthCheck, router]);

  // Desktop auth: open the default browser for login, then receive
  // the auth callback via deep link back into the Electron app.
  // Runs once on mount — guarded by a window flag to prevent re-triggering
  // on React re-renders or navigation.
  useEffect(() => {
    if (!checkIsDesktop() || isAuthenticated || authLoading) return;
    if ((window as unknown as Record<string, boolean>).__nw_desktop_auth)
      return;
    (window as unknown as Record<string, boolean>).__nw_desktop_auth = true;

    let cancelled = false;

    const startDesktopAuth = async () => {
      try {
        const { desktopAuthInitiate, desktopAuthExchange } = await import(
          '@/features/auth/api'
        );
        const { code } = await desktopAuthInitiate();

        // Use localhost in dev, production domain in builds
        const baseUrl =
          process.env.NODE_ENV === 'development'
            ? `http://localhost:${window.location.port || 3000}`
            : 'https://nightwatch.in';
        const loginUrl = `${baseUrl}/login?desktop=1&code=${encodeURIComponent(code)}`;
        // Use shell.openExternal via the Electron preload to guarantee
        // the URL opens in the default browser, not inside the Electron window.
        // window.open() is intercepted by setWindowOpenHandler which reloads
        // the Electron window for internal URLs, causing a redirect loop.
        if (window.electronAPI?.openExternal) {
          window.electronAPI.openExternal(loginUrl);
        } else {
          window.open(loginUrl, '_blank');
        }
        setDesktopWaiting(true);

        // Listen for the deep link callback
        const unlisten = desktopBridge.onDesktopAuthCallback(async (cbCode) => {
          if (cancelled) return;
          try {
            const response = await desktopAuthExchange(cbCode);
            if (response.user) {
              const { storeUser } = await import('@/lib/auth');
              const { useAuthStore } = await import('@/store/use-auth-store');
              storeUser(response.user);
              useAuthStore.getState().updateUser(response.user);
              useAuthStore.setState({
                user: response.user,
                isAuthenticated: true,
              });
            }
          } catch {
            toast.error('Desktop login failed. Please try again.');
          } finally {
            setDesktopWaiting(false);
          }
        });

        return unlisten;
      } catch {
        // If initiate fails, fall through to normal login form
      }
    };

    const cleanup = startDesktopAuth();
    return () => {
      cancelled = true;
      cleanup?.then((unlisten) => unlisten?.());
    };
  }, [isAuthenticated, authLoading]);

  const handleCopyEmail = () => {
    const email = 'rudranarayanaknr@gmail.com';
    try {
      if (typeof window !== 'undefined' && checkIsDesktop()) {
        desktopBridge.copyToClipboard(email);
      } else {
        navigator.clipboard.writeText(email);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch {
      // Failed to write to clipboard
    }
  };

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
                {hookLoading ? null : loginHook.step === 'forgot' ||
                  loginHook.step === 'forgot_success' ? (
                  <ForgotPasswordForm {...loginHook} />
                ) : (
                  <LoginForm {...loginHook} />
                )}
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer - Aligned with Signup for Parity */}
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

          <button
            type="button"
            onClick={handleCopyEmail}
            className="group flex items-center gap-2 transition-transform active:scale-95 rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neo-yellow/70 focus-visible:ring-offset-2 focus-visible:ring-offset-primary dark:ring-offset-background"
          >
            <span className="font-headline font-bold uppercase text-[8px] md:text-[10px] tracking-widest text-primary-foreground/80 dark:text-muted-foreground opacity-40 group-hover:opacity-100 transition-opacity whitespace-nowrap">
              {t('footer.wantAccount')}
            </span>
            <span
              className={`font-headline font-black uppercase text-[8px] md:text-[10px] tracking-widest transition-colors ${copied ? 'text-success' : 'text-neo-yellow group-hover:text-white underline decoration-neo-yellow/30 underline-offset-4'}`}
            >
              {copied ? t('footer.emailCopied') : t('footer.requestEmail')}
            </span>
          </button>

          <p className="font-headline font-bold uppercase text-[8px] md:text-[10px] tracking-widest text-neo-red text-center md:text-left">
            {t('footer.privateAccess')}
          </p>
        </div>
      </footer>
    </div>
  );
}
