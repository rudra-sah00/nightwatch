'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { toast } from 'sonner';
import { useAuth } from '@/providers/auth-provider';

export function useLoginPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.replace('/');
    }
  }, [isAuthenticated, isLoading, router]);

  // Show flash message from force-logout / session-expired redirect
  useEffect(() => {
    const flash = sessionStorage.getItem('auth_flash');
    if (flash) {
      sessionStorage.removeItem('auth_flash');
      toast.error(flash);
    }
  }, []);

  return { isAuthenticated, isLoading };
}
