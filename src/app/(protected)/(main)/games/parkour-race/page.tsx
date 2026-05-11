'use client';

import { ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { GameFrame } from '@/components/game-frame';
import { GAME_DATA, getGameUrl } from '@/features/games/config';

const game = GAME_DATA['parkour-race'];

export default function GamePage() {
  const router = useRouter();

  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] p-4 gap-4">
      <div className="w-full max-w-4xl">
        <button
          type="button"
          onClick={() => router.back()}
          className="flex items-center gap-2 text-foreground/40 hover:text-foreground font-headline font-bold uppercase tracking-widest text-xs transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>
      </div>
      <div className="w-full max-w-4xl aspect-[4/3] rounded-xl overflow-hidden border-[3px] border-border">
        <GameFrame
          slug="parkour-race"
          title={game.title}
          gameUrl={getGameUrl(game.gameId, game.versionId)}
        />
      </div>
    </div>
  );
}
