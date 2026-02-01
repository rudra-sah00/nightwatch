'use client';

import { ShieldCheck } from 'lucide-react';
import dynamic from 'next/dynamic';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { validateInvite } from '@/features/auth';
import { useAuth } from '@/providers/auth-provider';

const SignupForm = dynamic(
  () =>
    import('@/features/auth/components').then((m) => ({
      default: m.SignupForm,
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

export default function SignupPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuth();

  const searchParams = useSearchParams();
  const inviteCode = searchParams.get('invite');

  const didCheckInvite = useRef(false);

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.replace('/');
      return;
    }

    if (!isLoading && !inviteCode) {
      toast.error('Registration requires a valid invite link');
      router.replace('/login');
      return;
    }

    const checkInvite = async () => {
      // Prevent double execution in Strict Mode or re-renders
      if (didCheckInvite.current) return;

      if (inviteCode) {
        didCheckInvite.current = true;
        try {
          const { valid } = await validateInvite(inviteCode);
          if (!valid) {
            toast.error('Invalid or expired invite code');
            router.push('/login');
          }
        } catch (_error) {
          toast.error('Failed to validate invite');
          router.push('/login');
        }
      }
    };

    checkInvite();
  }, [isAuthenticated, isLoading, router, inviteCode]);

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
        {/* Brand */}
        <div className="flex flex-col items-center mb-8 text-center space-y-2">
          <h1 className="text-3xl font-bold tracking-tight text-gradient">
            Create Account
          </h1>
          <p className="text-muted-foreground text-sm">
            Join the watch party experience
          </p>
        </div>

        {/* Login Card */}
        <div className="glass rounded-3xl p-8 shadow-2xl">
          <SignupForm />
        </div>

        {/* Footer */}
        <div className="mt-8 flex items-center justify-center gap-2 text-xs text-muted-foreground opacity-60">
          <ShieldCheck className="w-3 h-3" />
          <p>Secure invite-only registration</p>
        </div>
      </div>
    </main>
  );
}
