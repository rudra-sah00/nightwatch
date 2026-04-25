import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { CallOverlay } from '@/features/friends/components/CallOverlay';
import { CallProvider } from '@/features/friends/hooks/use-call';
import { PipOverlay } from '@/features/watch/player/ui/overlays/PipOverlay';

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const refreshToken = cookieStore.get('refreshToken');

  if (!refreshToken) {
    redirect('/login');
  }

  return (
    <CallProvider>
      <CallOverlay />
      <PipOverlay />
      <div className="min-h-full bg-background flex flex-col">
        <main className="flex-1 w-full">{children}</main>
      </div>
    </CallProvider>
  );
}
