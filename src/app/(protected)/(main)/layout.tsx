'use client';

import { Navbar } from '@/components/layout/navbar';
import { useAuth } from '@/providers/auth-provider';
import { ServerProvider } from '@/providers/server-provider';

function MainLayoutInner({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  return (
    <ServerProvider defaultServer={user?.preferredServer}>
      <div className="min-h-[100dvh] w-full bg-[#f5f0e8] text-[#1a1a1a] font-body flex flex-col">
        <Navbar />
        <div className="flex-grow flex flex-col">{children}</div>
      </div>
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
