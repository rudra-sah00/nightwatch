'use client';

import { Navbar } from '@/components/layout/navbar';
import { useAuth } from '@/providers/auth-provider';
import { ServerProvider } from '@/providers/server-provider';

export default function AiAssistantLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user } = useAuth();
  return (
    <ServerProvider defaultServer={user?.preferredServer}>
      <Navbar />
      {children}
    </ServerProvider>
  );
}
