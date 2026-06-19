import dynamic from 'next/dynamic';
import { FirebaseIdentity } from '@/components/layout/FirebaseIdentity';
import { MobileAppLifecycle } from '@/components/layout/MobileAppLifecycle';
import { PushNotifications } from '@/components/layout/PushNotifications';
import { ScreenTracker } from '@/components/layout/ScreenTracker';
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
import { MusicEngineInit } from '@/features/music/components/MusicEngineInit';
import { MusicMediaSession } from '@/features/music/components/MusicMediaSession';
import { RemoteDisc } from '@/features/remote-control/components/RemoteDisc';

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <FeatureErrorBoundary feature="Calls" silent>
      <CallProvider>
        <FeatureErrorBoundary feature="Music" silent>
          <MusicEngineInit />
          <FeatureErrorBoundary feature="Call Overlay" silent>
            <CallOverlay />
          </FeatureErrorBoundary>
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
          <PushNotifications />
          <FirebaseIdentity />
          <ScreenTracker />
          <div className="h-full bg-background flex flex-col overflow-hidden">
            <main className="flex-1 w-full min-h-0">{children}</main>
          </div>
        </FeatureErrorBoundary>
      </CallProvider>
    </FeatureErrorBoundary>
  );
}
