import { Loader2 } from 'lucide-react';
import type { Metadata } from 'next';
import { Suspense } from 'react';
import { WatchPartyClient } from '@/features/watch-party/components/WatchPartyClient';
import { checkRoomExists } from '@/features/watch-party/room/services/watch-party.api';

export const metadata: Metadata = {
  title: 'Watch Party | Nightwatch',
  description: 'Join your friends and watch together in real-time.',
};

export default function WatchPartyPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-screen bg-background">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      }
    >
      <WatchPartyLoader params={params} searchParams={searchParams} />
    </Suspense>
  );
}

async function WatchPartyLoader({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const resolvedParams = await params;
  const resolvedSearchParams = await searchParams;
  const roomId = resolvedParams.id.toUpperCase();
  const isNewParty = resolvedSearchParams.new === 'true';
  const result = await checkRoomExists(roomId);

  return (
    <WatchPartyClient
      roomId={roomId}
      isNewParty={isNewParty}
      initialRoomPreview={result.exists ? result.preview || null : null}
      initialRoomNotFound={!result.exists}
    />
  );
}
