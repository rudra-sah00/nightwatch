'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { validateInvite } from '@/features/auth/api';
import { useAuth } from '@/providers/auth-provider';

export function useSignupContent() {
  const router = useRouter();
  const { isAuthenticated, isLoading: isAuthLoading } = useAuth();
  const searchParams = useSearchParams();
  const inviteCode = searchParams.get('invite');
  const [isInviteValid, setIsInviteValid] = useState<boolean | null>(null);
  const didCheckInvite = useRef(false);

  useEffect(() => {
    if (!isAuthLoading && isAuthenticated) {
      router.replace('/');
      return;
    }

    if (!isAuthLoading && !inviteCode) {
      toast.error('Registration requires a valid invite link');
      setIsInviteValid(false);
      // Wait a bit before redirecting to let the user see the error state if needed
      setTimeout(() => router.replace('/login'), 2000);
      return;
    }

    const checkInvite = async () => {
      if (didCheckInvite.current || !inviteCode) return;

      didCheckInvite.current = true;
      try {
        const { valid } = await validateInvite(inviteCode);
        setIsInviteValid(valid);
        if (!valid) {
          toast.error('Invalid or expired invite code');
          setTimeout(() => router.push('/login'), 2000);
        }
      } catch (_error) {
        toast.error('Failed to validate invite');
        setIsInviteValid(false);
        setTimeout(() => router.push('/login'), 2000);
      }
    };

    if (!isAuthLoading && inviteCode) {
      checkInvite();
    }
  }, [isAuthenticated, isAuthLoading, router, inviteCode]);

  return {
    isAuthenticated,
    isLoading: isAuthLoading || (inviteCode !== null && isInviteValid === null),
    isInviteValid,
  };
}
