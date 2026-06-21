'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { checkIsDesktop, checkIsMobile } from '@/lib/electron-bridge';
import { useAuth } from '@/providers/auth-provider';

export function LandingRedirect() {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && isAuthenticated) router.replace('/home');
    if (!isLoading && !isAuthenticated && (checkIsDesktop() || checkIsMobile()))
      router.replace('/login');
  }, [isAuthenticated, isLoading, router]);

  return null;
}
