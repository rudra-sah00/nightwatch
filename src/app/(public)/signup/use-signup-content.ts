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
      setIsInviteValid(null); // Allow manual entry instead of locking them out
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
        }
      } catch (_error) {
        toast.error('Failed to validate invite');
        setIsInviteValid(null);
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
