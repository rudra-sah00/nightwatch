'use client';

import { Play, Users } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import type { PostWatchParty } from '@/features/explore/types';

export function WatchPartyCard({ watchParty }: { watchParty: PostWatchParty }) {
  return (
    <Link
      href={`/watch-party/${watchParty.roomId}`}
      className="mt-3 flex items-center gap-3 border border-border rounded-xl p-3 hover:bg-muted/50 transition-colors group"
    >
      {watchParty.contentImage && (
        <Image
          src={watchParty.contentImage}
          alt={watchParty.contentTitle}
          width={48}
          height={64}
          className="w-12 h-16 rounded-lg object-cover"
        />
      )}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold truncate">{watchParty.contentTitle}</p>
        <div className="flex items-center gap-1.5 mt-1 text-xs text-foreground/50">
          <Users className="w-3.5 h-3.5" />
          <span>Watch Party</span>
          <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          <span className="text-green-500 font-medium">Live</span>
        </div>
      </div>
      <div className="p-2 rounded-full bg-primary text-primary-foreground group-hover:scale-110 transition-transform">
        <Play className="w-4 h-4" />
      </div>
    </Link>
  );
}
