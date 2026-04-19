'use client';

import dynamic from 'next/dynamic';
import { useState } from 'react';
import { ContinueWatching } from '@/features/watch/components/ContinueWatching';

const ContentDetailModal = dynamic(
  () =>
    import('@/features/search/components/content-detail-modal').then(
      (m) => m.ContentDetailModal,
    ),
  { ssr: false },
);

export default function ContinueWatchingClient() {
  const [selectedContentId, setSelectedContentId] = useState<string | null>(
    null,
  );

  return (
    <main className="min-h-[calc(100vh-80px)] bg-background pb-32 animate-in fade-in">
      {/* Hero Header */}
      <div className="border-b-[4px] border-border mb-12 bg-neo-blue relative overflow-hidden">
        {/* Abstract background shapes */}
        <div className="absolute -top-10 -right-10 w-64 h-64 border-[4px] border-border rounded-full opacity-20" />
        <div className="absolute top-10 left-1/4 w-24 h-24 bg-neo-yellow border-[4px] border-border opacity-30 rotate-12" />

        <div className="container mx-auto px-6 py-12 md:px-10 relative z-10">
          <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-8">
            <div>
              <h1 className="text-6xl md:text-8xl lg:text-9xl font-black tracking-tighter text-primary-foreground font-headline uppercase leading-none mb-4 min-w-0">
                CONTINUE
                <br />
                <span className="bg-neo-yellow text-foreground px-4 inline-block border-[4px] border-border  -rotate-1 ml-2 mt-2">
                  WATCHING
                </span>
              </h1>
              <p className="font-headline font-bold uppercase tracking-widest text-foreground bg-background inline-block px-4 py-2 border-[3px] border-border">
                Pick Up Where You Left Off
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 md:px-10">
        <div className="max-w-5xl mx-auto">
          <ContinueWatching
            hideTitle={true}
            onSelectContent={(contentId: string) =>
              setSelectedContentId(contentId)
            }
          />
        </div>
      </div>

      {selectedContentId && (
        <ContentDetailModal
          contentId={selectedContentId}
          fromContinueWatching={true}
          onClose={() => setSelectedContentId(null)}
        />
      )}
    </main>
  );
}
