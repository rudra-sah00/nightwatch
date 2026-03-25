'use client';

import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';
import { GlobalLoading } from '@/components/ui/global-loading';
import { useSignupContent } from './use-signup-content';

const SignupForm = dynamic(
  () =>
    import('@/features/auth/components/signup-form').then((m) => ({
      default: m.SignupForm,
    })),
  {
    loading: () => (
      <div className="flex items-center justify-center p-8">
        <div className="animate-pulse font-headline text-[#1a1a1a] opacity-60">
          Loading...
        </div>
      </div>
    ),
    ssr: false,
  },
);

export default function SignupPage() {
  const { isAuthenticated, isLoading, isInviteValid } = useSignupContent();
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [initialAuthCheck] = useState(isAuthenticated);

  useEffect(() => {
    if (isAuthenticated && !initialAuthCheck) {
      setIsTransitioning(true);
    }
  }, [isAuthenticated, initialAuthCheck]);

  // Loading State
  if (isLoading) {
    return <GlobalLoading />;
  }

  if (initialAuthCheck) return null;

  return (
    <div
      className={`bg-white text-[#1a1a1a] h-screen h-[100dvh] flex flex-col font-body overflow-hidden transition-all duration-700 ease-out origin-top animate-in fade-in slide-in-from-bottom-4 zoom-in-[0.99] ${isTransitioning ? 'scale-[0.98] -translate-y-4 opacity-0 pointer-events-none' : 'scale-100 translate-y-0 opacity-100'}`}
    >
      <main className="flex-grow flex flex-col items-center p-1 md:p-2 justify-center overflow-hidden w-full max-w-[1400px] mx-auto">
        {isInviteValid === false ? (
          <div className="flex flex-col items-center justify-center p-8 bg-white border-4 border-[#1a1a1a] neo-shadow max-w-md w-full animate-in zoom-in duration-300">
            <span className="material-symbols-outlined text-6xl text-[#e63b2e] mb-4">
              block
            </span>
            <h1 className="text-3xl font-black uppercase tracking-tighter mb-2 font-headline text-center">
              Access Denied
            </h1>
            <p className="text-center font-body font-semibold text-sm text-[#1a1a1a]/60 uppercase tracking-tight mb-2">
              A valid invite link is required to join this community.
            </p>
            <p className="text-center font-body text-[10px] text-[#1a1a1a] opacity-50 uppercase tracking-widest max-w-[80%]">
              If you believe this is a mistake, please contact your
              administrator.
            </p>
            <div className="mt-8 w-full">
              <a
                href="/login"
                className="block w-full text-center bg-[#1a1a1a] text-white py-4 border-4 border-[#1a1a1a] neo-shadow-sm hover:neo-shadow-hover active:translate-y-1 active:neo-shadow-none transition-all font-headline font-bold uppercase tracking-tight text-lg"
              >
                Back to Login
              </a>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-2 lg:gap-4 w-full max-w-5xl items-stretch pb-2 md:pb-0 shrink-0">
            {/* Features Bento Box - height driven by the signup form on the right */}
            <div className="hidden lg:grid lg:col-span-7 grid-cols-1 md:grid-cols-2 grid-rows-2 gap-4 lg:gap-6">
              <div className="bg-[#1a1a1a] text-white p-4 md:p-5 border-4 border-[#1a1a1a] neo-shadow cursor-pointer neo-shadow-hover neo-shadow-active transition-all flex flex-col justify-between aspect-square md:aspect-auto">
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
                    Pure focus. High fidelity. Minimalist immersion for the
                    cinema purist.
                  </p>
                </div>
              </div>
              <div className="bg-[#d6e3ff] text-[#1a1a1a] p-4 md:p-5 border-4 border-[#1a1a1a] neo-shadow cursor-pointer neo-shadow-hover neo-shadow-active transition-all flex flex-col justify-between aspect-square md:aspect-auto">
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
                  <p className="font-body text-[#1a1a1a] leading-tight text-xs">
                    Integrated video calls. React in real-time without leaving
                    the frame.
                  </p>
                </div>
              </div>
              <div className="md:col-span-2 bg-[#ffcc00] text-[#1a1a1a] p-4 md:p-6 border-4 border-[#1a1a1a] neo-shadow cursor-pointer neo-shadow-hover neo-shadow-active transition-all flex items-center gap-4">
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
                    Frame-perfect synchronization across every device. No lag,
                    no spoilers.
                  </p>
                </div>
              </div>
            </div>
            {/* Signup Card wrapper */}
            <div className="lg:col-span-5 flex items-center justify-center w-full">
              <div className="bg-white border-4 border-[#1a1a1a] neo-shadow p-5 flex flex-col gap-3 w-[92%] max-w-xs mx-auto lg:w-full lg:max-w-none lg:mx-0">
                <div className="flex flex-col justify-start w-full">
                  <SignupForm />
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-[#1a1a1a] w-full border-t-4 border-[#1a1a1a] mt-auto flex flex-col md:flex-row justify-between items-center px-4 py-3 md:px-8 md:py-5 gap-1 hidden md:flex shrink-0">
        <div className="hidden">Watch Rudra</div>
        <p className="font-headline font-medium uppercase text-xs tracking-widest text-[#f5f0e8]">
          © 2026 WATCH RUDRA — FORM FOLLOWS FUNCTION
        </p>
        <div className="flex gap-4">
          <p className="font-headline font-medium uppercase text-xs tracking-widest text-[#e63b2e]">
            This is a private website. Public access is not allowed.
          </p>
        </div>
      </footer>
    </div>
  );
}
