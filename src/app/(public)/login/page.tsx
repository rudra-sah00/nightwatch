'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { GlobalLoading } from '@/components/ui/global-loading';
import { ForgotPasswordForm } from '@/features/auth/components/forgot-password-form';
import { LoginForm } from '@/features/auth/components/login-form';
import { useLoginForm } from '@/features/auth/hooks/use-login-form';
import { useAuth } from '@/providers/auth-provider';

export default function LoginPage() {
  const loginHook = useLoginForm();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { isLoading: hookLoading } = loginHook;
  const router = useRouter();

  const isLoading = authLoading || hookLoading;
  const [copied, setCopied] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [initialAuthCheck] = useState(isAuthenticated);

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

  const handleCopyEmail = () => {
    const email = 'rudranarayanaknr@gmail.com';
    try {
      if (
        typeof window !== 'undefined' &&
        window.electronAPI?.copyToClipboard
      ) {
        window.electronAPI.copyToClipboard(email);
      } else {
        navigator.clipboard.writeText(email);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch {
      console.warn('Failed to write to clipboard');
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
                  Solo Viewing
                </h3>
                <p className="font-body opacity-80 leading-tight text-xs">
                  Pure focus. High fidelity. Minimalist immersion for the cinema
                  purist.
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
                  Watch Parties
                </h3>
                <p className="font-body text-foreground leading-tight text-xs">
                  Integrated video calls. React in real-time without leaving the
                  frame.
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
                  Real-Time Sync
                </h3>
                <p className="font-body font-medium text-xs">
                  Frame-perfect synchronization across every device. No lag, no
                  spoilers.
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
      <footer className="bg-[#1a1a1a] dark:bg-background w-full border-t-4 border-border mt-auto flex flex-col md:flex-row justify-between items-center px-4 py-4 md:px-8 md:py-6 gap-4 shrink-0">
        <p className="font-headline font-medium uppercase text-[10px] md:text-xs tracking-widest md:tracking-[0.4em] text-[#a1a1aa] dark:text-muted-foreground opacity-80 text-left">
          © 2026 WATCH RUDRA — FORM FOLLOWS FUNCTION
        </p>
        <div className="flex flex-col md:flex-row items-center gap-4 md:gap-8">
          <button
            type="button"
            onClick={handleCopyEmail}
            className="group flex items-center gap-2 transition-transform active:scale-95 rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ffcc00]/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#1a1a1a]"
          >
            <span className="font-headline font-bold uppercase text-[8px] md:text-[10px] tracking-widest text-[#a1a1aa] dark:text-muted-foreground opacity-40 group-hover:opacity-100 transition-opacity whitespace-nowrap">
              WANT AN ACCOUNT?
            </span>
            <span
              className={`font-headline font-black uppercase text-[8px] md:text-[10px] tracking-widest transition-colors ${copied ? 'text-[#00aa44]' : 'text-neo-yellow group-hover:text-[#ffffff] underline decoration-[#ffcc00]/30 underline-offset-4'}`}
            >
              {copied ? '✓ EMAIL COPIED' : 'REQUEST @ RUDRASAHOO'}
            </span>
          </button>

          <p className="font-headline font-bold uppercase text-[8px] md:text-[10px] tracking-widest text-neo-red text-center md:text-left">
            PRIVATE ACCESS ONLY
          </p>
        </div>
      </footer>
    </div>
  );
}
