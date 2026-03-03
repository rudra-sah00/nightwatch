'use client';

import { ShieldCheck } from 'lucide-react';
import Link from 'next/link';
import { Suspense } from 'react';
import { Button } from '@/components/ui/button';
import { ResetPasswordForm } from '@/features/auth/components/reset-password-form';
import { useResetPasswordPage } from './use-reset-password-page';

function ResetPasswordContent() {
  const { isAuthenticated, isLoading, token } = useResetPasswordPage();

  if (isLoading) {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-primary/20 border-t-primary animate-spin" />
      </main>
    );
  }

  if (isAuthenticated) return null;

  // If no token, show error state
  if (!token) {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="w-full max-w-md text-center space-y-4">
          <h1 className="text-2xl font-bold text-destructive">Invalid Link</h1>
          <p className="text-muted-foreground">
            This password reset link is invalid or missing a token.
          </p>
          <Button asChild>
            <Link href="/login">Return to Login</Link>
          </Button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background flex items-center justify-center p-4 relative overflow-hidden">
      <div className="w-full max-w-md animate-in fade-in zoom-in-95 duration-500 relative z-10">
        <div className="flex flex-col items-center mb-8 text-center space-y-2">
          <h1 className="text-3xl font-bold tracking-tight text-gradient">
            New Password
          </h1>
          <p className="text-muted-foreground">Enter your new password below</p>
        </div>

        <div className="glass rounded-3xl p-8 shadow-2xl">
          <ResetPasswordForm token={token} />
        </div>

        <div className="mt-8 flex items-center justify-center gap-2 text-xs text-muted-foreground opacity-60">
          <ShieldCheck className="w-3 h-3" />
          <p>Secure password update</p>
        </div>
      </div>
    </main>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-background flex items-center justify-center">
          <div className="w-8 h-8 rounded-full border-2 border-primary/20 border-t-primary animate-spin" />
        </main>
      }
    >
      <ResetPasswordContent />
    </Suspense>
  );
}
