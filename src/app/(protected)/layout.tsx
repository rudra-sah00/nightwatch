import dynamic from 'next/dynamic';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { CallProvider } from '@/features/friends/hooks/use-call';

const CallOverlay = dynamic(
  () =>
    import('@/features/friends/components/CallOverlay').then(
      (m) => m.CallOverlay,
    ),
  { ssr: false },
);

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const refreshToken = cookieStore.get('refreshToken');

  // If no refresh token is present, user is definitely not authenticated
  if (!refreshToken) {
    redirect('/login');
  }

  return (
    <CallProvider>
      <CallOverlay />
      <div className="min-h-screen bg-background flex flex-col">
        <main className="flex-1 w-full">{children}</main>
      </div>
    </CallProvider>
  );
}
