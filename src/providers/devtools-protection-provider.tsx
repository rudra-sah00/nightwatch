'use client';

import type { ReactNode } from 'react';

interface DevToolsProtectionProviderProps {
  children: ReactNode;
}

export function DevToolsProtectionProvider({
  children,
}: DevToolsProtectionProviderProps) {
  return <>{children}</>;
}
