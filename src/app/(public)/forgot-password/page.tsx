'use client';

import { ForgotPasswordForm } from '@/features/auth/components/forgot-password-form';
import { useForgotPasswordPage } from './use-forgot-password-page';

export default function ForgotPasswordPage() {
  const { isAuthenticated, isLoading } = useForgotPasswordPage();

  // Loading State
  if (isLoading) {
    return (
      <main className="min-h-screen bg-white flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-4 border-[#1a1a1a]/20 border-t-[#1a1a1a] animate-spin" />
      </main>
    );
  }

  if (isAuthenticated) return null;

  return (
    <div className="bg-white text-[#1a1a1a] h-screen h-[100dvh] flex flex-col font-body overflow-hidden transition-all duration-700 ease-out origin-top animate-in fade-in slide-in-from-bottom-4 zoom-in-[0.99]">
      <main className="flex-grow flex flex-col items-stretch p-1 md:p-2 justify-center overflow-hidden w-full max-w-[1400px] mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-2 lg:gap-4 w-full max-w-5xl items-stretch shrink-0">
          {/* Features Bento Box */}
          <div className="hidden lg:grid lg:col-span-7 grid-cols-1 md:grid-cols-2 grid-rows-2 gap-4 lg:gap-6 lg:min-h-[500px] h-full">
            <div className="bg-[#1a1a1a] text-white p-4 md:p-5 border-4 border-[#1a1a1a] neo-shadow cursor-pointer neo-shadow-hover neo-shadow-active transition-all flex flex-col justify-between aspect-square md:aspect-auto">
              <div>
                <span
                  className="material-symbols-outlined text-3xl mb-2"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  history
                </span>
                <h3 className="text-lg md:text-xl font-bold uppercase tracking-tight mb-1 font-headline">
                  Recovery Mode
                </h3>
                <p className="font-body opacity-80 leading-tight text-xs">
                  Lost access? We'll help you regain control of your cinema
                  vault.
                </p>
              </div>
            </div>
            <div className="bg-[#d6e3ff] text-[#1a1a1a] p-4 md:p-5 border-4 border-[#1a1a1a] neo-shadow cursor-pointer neo-shadow-hover neo-shadow-active transition-all flex flex-col justify-between aspect-square md:aspect-auto">
              <div>
                <span
                  className="material-symbols-outlined text-3xl mb-2"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  lock_reset
                </span>
                <h3 className="text-lg md:text-xl font-bold uppercase tracking-tight mb-1 font-headline">
                  Secure Reset
                </h3>
                <p className="font-body text-[#1a1a1a] leading-tight text-xs">
                  State-of-the-art verification loops to keep your data safe.
                </p>
              </div>
            </div>
            <div className="md:col-span-2 bg-[#ffcc00] text-[#1a1a1a] p-4 md:p-6 border-4 border-[#1a1a1a] neo-shadow cursor-pointer neo-shadow-hover neo-shadow-active transition-all flex items-center gap-4">
              <span
                className="material-symbols-outlined text-5xl"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                security
              </span>
              <div>
                <h3 className="text-xl md:text-2xl font-black uppercase tracking-tighter font-headline">
                  Zero Trust Architecture
                </h3>
                <p className="font-body font-medium text-xs">
                  Encrypted recovery tokens. One-way hashing. Ultimate security.
                </p>
              </div>
            </div>
          </div>

          {/* Recovery Card wrapper */}
          <div className="lg:col-span-5 flex items-center justify-center w-full h-full">
            <div className="bg-white border-4 border-[#1a1a1a] neo-shadow p-5 flex flex-col gap-2 w-full max-w-md lg:max-w-none lg:min-h-[500px] h-full overflow-visible">
              <div className="flex-grow flex flex-col justify-start w-full h-full overflow-visible">
                <ForgotPasswordForm />
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-[#1a1a1a] w-full border-t-4 border-[#1a1a1a] mt-auto flex flex-col md:flex-row justify-between items-center px-4 py-3 md:px-8 md:py-2 gap-3 shrink-0">
        <div className="hidden lg:block">Watch Rudra</div>
        <p className="font-headline font-medium uppercase text-[8px] md:text-[10px] tracking-widest md:tracking-[0.3em] text-[#f5f0e8] opacity-80 text-center md:text-left">
          © 2026 WATCH RUDRA — FORM FOLLOWS FUNCTION
        </p>
        <div className="flex flex-col md:flex-row items-center gap-4 md:gap-8">
          <p className="font-headline font-bold uppercase text-[8px] md:text-[10px] tracking-widest text-[#e63b2e] text-center md:text-left">
            ACCESS RECOVERY ONLY
          </p>
        </div>
      </footer>
    </div>
  );
}
