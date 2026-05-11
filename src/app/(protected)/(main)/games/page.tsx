'use client';

import Link from 'next/link';
import { useState } from 'react';
import { NeoSearchBar } from '@/components/ui/neo-search-bar';

const GAMES = [
  {
    id: 'subway-surfers',
    title: 'Subway Surfers',
    description: 'Endless runner — dodge obstacles, collect coins!',
    thumbnail: '/games/subway-surfers/thumbnail.png',
    video:
      'https://v.poki-cdn.com/6b6c7d15-192b-4add-bba3-18eb57f2e348/thumbnail.3x3.h264.mp4',
  },
  {
    id: 'temple-run-2',
    title: 'Temple Run 2',
    description: 'Run, jump, slide & fly through ancient temples!',
    thumbnail: '/games/temple-run-2/thumbnail.png',
    video:
      'https://v.poki-cdn.com/0e7e3ddd-4bfa-4713-82f6-1d27bda826c8/thumbnail.3x3.h264.mp4',
  },
  {
    id: 'temple-run-2-frozen-shadows',
    title: 'Temple Run 2: Frozen Shadows',
    description: 'Escape through icy mountains and frozen caves!',
    thumbnail: '/games/temple-run-2-frozen-shadows/thumbnail.png',
    video:
      'https://v.poki-cdn.com/0e7e3ddd-4bfa-4713-82f6-1d27bda826c8/thumbnail.3x3.h264.mp4',
  },
];

export default function GamesPage() {
  const [search, setSearch] = useState('');

  const filtered = GAMES.filter(
    (g) =>
      g.title.toLowerCase().includes(search.toLowerCase()) ||
      g.description.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="min-h-full pb-32 overflow-x-hidden">
      {/* Hero */}
      <div className="mb-8 bg-neo-green relative overflow-hidden rounded-2xl">
        <div className="absolute -top-10 -right-10 w-64 h-64 border-[4px] border-border rounded-full opacity-10" />
        <div className="absolute top-10 left-1/4 w-24 h-24 bg-neo-yellow border-[4px] border-border opacity-20 rotate-12" />
        <div className="container mx-auto px-6 py-12 md:px-10 relative z-10">
          <h1 className="text-6xl md:text-8xl lg:text-9xl font-black tracking-tighter text-foreground font-headline uppercase leading-none mb-4">
            PLAY
            <br />
            <span className="bg-background px-4 inline-block border-[4px] border-border -rotate-1 ml-2 mt-2">
              GAMES
            </span>
          </h1>
          <p className="font-headline font-bold uppercase tracking-widest text-foreground bg-background inline-block px-4 py-2 border-[3px] border-border">
            Arcade classics right in your browser
          </p>
        </div>
      </div>

      <div className="container mx-auto px-6 md:px-10">
        <div className="max-w-5xl mx-auto space-y-6">
          <div className="flex flex-col sm:flex-row gap-4 justify-between items-center bg-card border-[3px] border-border p-4 md:p-6 rounded-md">
            <NeoSearchBar
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search games..."
            />
          </div>

          {/* Games Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {filtered.map((game) => (
              <Link
                key={game.id}
                href={`/games/${game.id}`}
                className="group bg-card p-2 border-[3px] border-border"
              >
                <div className="aspect-video bg-background flex items-center justify-center border-[3px] border-border overflow-hidden relative">
                  <img
                    src={game.thumbnail}
                    alt={game.title}
                    className="w-full h-full object-cover group-hover:opacity-0 transition-opacity"
                  />
                  <video
                    src={game.video}
                    muted
                    loop
                    playsInline
                    className="absolute inset-0 w-full h-full object-cover opacity-0 group-hover:opacity-100 transition-opacity"
                    onMouseEnter={(e) => (e.target as HTMLVideoElement).play()}
                    onMouseLeave={(e) => {
                      const v = e.target as HTMLVideoElement;
                      v.pause();
                      v.currentTime = 0;
                    }}
                  />
                </div>
                <div className="px-2 pt-3 pb-2">
                  <p className="font-headline font-black uppercase tracking-wider text-foreground text-sm">
                    {game.title}
                  </p>
                  <p className="text-xs text-foreground/50 mt-1">
                    {game.description}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
