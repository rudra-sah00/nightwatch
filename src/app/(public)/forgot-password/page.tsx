'use client';

import { ShieldCheck } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { ForgotPasswordForm } from '@/features/auth/components';
import { useAuth } from '@/providers/auth-provider';

export default function ForgotPasswordPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.replace('/');
    }
  }, [isAuthenticated, isLoading, router]);

  // Loading State (optional to show while checking auth)
  if (isLoading) {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-primary/20 border-t-primary animate-spin" />
      </main>
    );
  }

  if (isAuthenticated) return null;

  return (
    <main className="min-h-screen bg-background flex items-center justify-center p-4 relative overflow-hidden">
      <div className="w-full max-w-md animate-in fade-in zoom-in-95 duration-500 relative z-10">
        <div className="flex flex-col items-center mb-8 text-center space-y-2">
          <h1 className="text-3xl font-bold tracking-tight text-gradient">
            Reset Password
          </h1>
          <p className="text-muted-foreground">
            Enter your email to receive a password reset link
          </p>
        </div>

        <div className="glass rounded-3xl p-8 shadow-2xl">
          <ForgotPasswordForm />
        </div>

        <div className="mt-8 flex items-center justify-center gap-2 text-xs text-muted-foreground opacity-60">
          <ShieldCheck className="w-3 h-3" />
          <p>Secure password recovery</p>
        </div>
      </div>
    </main>
  );
}
