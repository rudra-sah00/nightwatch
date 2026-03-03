'use client';

import { useAuth } from '@/providers/auth-provider';
import { ServerProvider } from '@/providers/server-provider';

function MainLayoutInner({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  return (
    <ServerProvider defaultServer={user?.preferredServer}>
      {children}
    </ServerProvider>
  );
}

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <MainLayoutInner>{children}</MainLayoutInner>;
}
