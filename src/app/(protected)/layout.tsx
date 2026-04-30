import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { MobileAppLifecycle } from '@/components/layout/MobileAppLifecycle';
import { CallOverlay } from '@/features/friends/components/CallOverlay';
import { CallProvider } from '@/features/friends/hooks/use-call';
import { FloatingDisc } from '@/features/music/components/FloatingDisc';
import { FullPlayer } from '@/features/music/components/FullPlayer';
import { MusicAutoStop } from '@/features/music/components/MusicAutoStop';
import { MusicDiscordPresence } from '@/features/music/components/MusicDiscordPresence';
import { MusicMediaSession } from '@/features/music/components/MusicMediaSession';
import { MusicPlayerProvider } from '@/features/music/context/MusicPlayerContext';
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
      <MusicPlayerProvider>
        <CallOverlay />
        <PipOverlay />
        <FullPlayer />
        <FloatingDisc />
        <MusicAutoStop />
        <MusicDiscordPresence />
        <MusicMediaSession />
        <MobileAppLifecycle />
        <div className="h-full bg-background flex flex-col overflow-hidden">
          <main className="flex-1 w-full min-h-0">{children}</main>
        </div>
      </MusicPlayerProvider>
    </CallProvider>
  );
}
