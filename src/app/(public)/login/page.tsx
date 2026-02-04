'use client';

import { ShieldCheck } from 'lucide-react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useAuth } from '@/providers/auth-provider';

const LoginForm = dynamic(
  () =>
    import('@/features/auth/components').then((m) => ({
      default: m.LoginForm,
    })),
  {
    loading: () => (
      <div className="flex items-center justify-center p-8">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    ),
    ssr: false,
  },
);

const StatsBanner = dynamic(
  () =>
    import('@/features/auth/components').then((m) => ({
      default: m.StatsBanner,
    })),
  {
    loading: () => (
      <div className="w-full max-w-md mx-auto mb-6 h-28 rounded-2xl bg-zinc-900/50 animate-pulse" />
    ),
    ssr: false,
  },
);

export default function LoginPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.replace('/');
    }
  }, [isAuthenticated, isLoading, router]);

  // Loading State
  if (isLoading) {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="relative w-12 h-12">
            <div className="absolute inset-0 rounded-full border-2 border-primary/20"></div>
            <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-primary animate-spin"></div>
          </div>
        </div>
      </main>
    );
  }

  if (isAuthenticated) return null;

  return (
    <main className="min-h-screen bg-background flex items-center justify-center p-4 relative overflow-hidden">
      <div className="w-full max-w-md animate-in fade-in zoom-in-95 duration-500 relative z-10">
        {/* Stats Banner */}
        <StatsBanner />

        {/* Brand */}
        <div className="flex flex-col items-center mb-8 text-center space-y-2">
          <h1 className="text-3xl font-bold tracking-tight text-gradient">
            Welcome Back
          </h1>
        </div>

        {/* Login Card */}
        <div className="glass rounded-3xl p-8 shadow-2xl">
          <LoginForm />
        </div>

        {/* Footer */}
        <div className="mt-8 flex items-center justify-center gap-2 text-xs text-muted-foreground opacity-60">
          <ShieldCheck className="w-3 h-3" />
          <p>Secure single-session authentication</p>
        </div>
      </div>
    </main>
  );
}
