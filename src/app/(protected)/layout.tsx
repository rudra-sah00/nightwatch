import dynamic from 'next/dynamic';
import { MobileAppLifecycle } from '@/components/layout/MobileAppLifecycle';
import { FeatureErrorBoundary } from '@/components/ui/feature-error-boundary';
import { CallOverlay } from '@/features/friends/components/CallOverlay';
import { CallProvider } from '@/features/friends/hooks/use-call';
import { FloatingDisc } from '@/features/music/components/FloatingDisc';

const FullPlayer = dynamic(() =>
  import('@/features/music/components/FullPlayer').then((m) => m.FullPlayer),
);

import { MusicAutoStop } from '@/features/music/components/MusicAutoStop';
import { MusicDeviceSync } from '@/features/music/components/MusicDeviceSync';
import { MusicDiscordPresence } from '@/features/music/components/MusicDiscordPresence';
import { MusicMediaSession } from '@/features/music/components/MusicMediaSession';
import { MusicPlayerProvider } from '@/features/music/context/MusicPlayerContext';
import { RemoteDisc } from '@/features/remote-control/components/RemoteDisc';
import { PipOverlay } from '@/features/watch/player/ui/overlays/PipOverlay';
import { PipProvider } from '@/providers/pip-provider';

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <FeatureErrorBoundary feature="Calls" silent>
      <CallProvider>
        <FeatureErrorBoundary feature="Music" silent>
          <MusicPlayerProvider>
            <PipProvider>
              <FeatureErrorBoundary feature="Call Overlay" silent>
                <CallOverlay />
              </FeatureErrorBoundary>
              <PipOverlay />
              <FeatureErrorBoundary feature="Music Player" silent>
                <FullPlayer />
                <FloatingDisc />
                <MusicAutoStop />
                <MusicDeviceSync />
                <MusicDiscordPresence />
                <MusicMediaSession />
              </FeatureErrorBoundary>
              <RemoteDisc />
              <MobileAppLifecycle />
              <div className="h-full bg-background flex flex-col overflow-hidden">
                <main className="flex-1 w-full min-h-0">{children}</main>
              </div>
            </PipProvider>
          </MusicPlayerProvider>
        </FeatureErrorBoundary>
      </CallProvider>
    </FeatureErrorBoundary>
  );
}
