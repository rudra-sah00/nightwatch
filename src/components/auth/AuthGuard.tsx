'use client';

import { Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { type ReactNode, useEffect, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';

interface AuthGuardProps {
  children: ReactNode;
  redirectTo?: string;
  /**
   * Fallback UI to show while checking auth
   * If not provided, shows a minimal loading spinner
   */
  fallback?: ReactNode;
}

/**
 * AuthGuard - Protects routes that require authentication
 *
 * Best practices followed (like NextAuth, Auth0, Clerk):
 * 1. Optimistic rendering - shows content immediately if user appears authenticated
 * 2. Background verification - validates with server without blocking UI
 * 3. Graceful degradation - handles timeouts and offline scenarios
 * 4. No layout shift - minimal loading state
 */
export function AuthGuard({ children, redirectTo = '/login', fallback }: AuthGuardProps) {
  const { status, isAuthenticated } = useAuth();
  const router = useRouter();
  const hasRedirected = useRef(false);

  useEffect(() => {
    // Only redirect once when we know for sure user is not authenticated
    if (status === 'unauthenticated' && !hasRedirected.current) {
      hasRedirected.current = true;
      router.replace(redirectTo);
    }
  }, [status, router, redirectTo]);

  // Reset redirect flag if user becomes authenticated
  useEffect(() => {
    if (isAuthenticated) {
      hasRedirected.current = false;
    }
  }, [isAuthenticated]);

  // Show loading only during initial auth check (very brief)
  if (status === 'loading') {
    return (
      fallback ?? (
        <div className="min-h-screen flex items-center justify-center bg-black">
          <Loader2 className="w-6 h-6 animate-spin text-white/50" />
        </div>
      )
    );
  }

  // Show content if authenticated
  if (isAuthenticated) {
    return <>{children}</>;
  }

  // Not authenticated - show minimal UI while redirect happens
  return (
    fallback ?? (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <Loader2 className="w-6 h-6 animate-spin text-white/50" />
      </div>
    )
  );
}

/**
 * GuestGuard - Protects routes for unauthenticated users only (e.g., login page)
 * Redirects to home if already authenticated
 */
export function GuestGuard({ children, redirectTo = '/', fallback }: AuthGuardProps) {
  const { status, isAuthenticated } = useAuth();
  const router = useRouter();
  const hasRedirected = useRef(false);

  useEffect(() => {
    // Redirect authenticated users away from guest-only pages
    if (status === 'authenticated' && !hasRedirected.current) {
      hasRedirected.current = true;
      router.replace(redirectTo);
    }
  }, [status, router, redirectTo]);

  // Reset redirect flag if user becomes unauthenticated
  useEffect(() => {
    if (!isAuthenticated) {
      hasRedirected.current = false;
    }
  }, [isAuthenticated]);

  // Show loading only during initial auth check
  if (status === 'loading') {
    return (
      fallback ?? (
        <div className="min-h-screen flex items-center justify-center bg-black">
          <Loader2 className="w-6 h-6 animate-spin text-white/50" />
        </div>
      )
    );
  }

  // Show content if NOT authenticated (guest)
  if (!isAuthenticated) {
    return <>{children}</>;
  }

  // Authenticated - show minimal UI while redirect happens
  return (
    fallback ?? (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <Loader2 className="w-6 h-6 animate-spin text-white/50" />
      </div>
    )
  );
}
