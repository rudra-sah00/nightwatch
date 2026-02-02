'use client';

import type { ReactNode } from 'react';
import { useDevToolsProtection } from '@/hooks/useDevToolsProtection';

interface DevToolsProtectionProviderProps {
  children: ReactNode;
}

export function DevToolsProtectionProvider({
  children,
}: DevToolsProtectionProviderProps) {
  useDevToolsProtection();

  return <>{children}</>;
}
