'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { validateInvite } from '@/features/auth/api';
import { useAuth } from '@/providers/auth-provider';

export function useSignupContent() {
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

  return { isAuthenticated, isLoading };
}
