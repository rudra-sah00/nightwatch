'use client';

import { type ReactNode, useEffect } from 'react';

interface DevToolsProtectionProviderProps {
  children: ReactNode;
}

export function DevToolsProtectionProvider({
  children,
}: DevToolsProtectionProviderProps) {
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') return;

    let cancelled = false;
    let cleanup: (() => void) | undefined;

    // Dynamic import — the 300+ line module is only loaded in production
    import('@/hooks/useDevToolsProtection').then((mod) => {
      if (cancelled) return;
      cleanup = mod.initDevToolsProtection();
    });

    return () => {
      cancelled = true;
      cleanup?.();
    };
  }, []);

  return <>{children}</>;
}
