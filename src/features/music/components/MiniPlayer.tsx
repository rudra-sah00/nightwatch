'use client';

import {
  Pause,
  Play,
  SkipBack,
  SkipForward,
  Square,
  Users,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { toast } from 'sonner';
import { createMusicParty } from '@/features/music-party/api';
import { useMusicPlayerContext } from '../context/MusicPlayerContext';
import { formatTime } from '../utils';

export function MiniPlayer() {
  const {
    currentTrack,
    isPlaying,
    progress,
    duration,
    togglePlay,
    next,
    prev,
    seek,
    stop,
    setExpanded,
  } = useMusicPlayerContext();
  const t = useTranslations('music');
  const [partyCode, setPartyCode] = useState<string | null>(null);

  const startParty = async () => {
    if (partyCode) {
      setPartyCode(null);
      return;
    }
    try {
      const { room } = await createMusicParty(
        currentTrack?.title ?? 'Music Party',
      );
      setPartyCode(room.id);
      navigator.clipboard.writeText(
        `${window.location.origin}/music-party/${room.id}`,
      );
      toast.success(t('party.partyLinkCopied'));
    } catch {
      toast.error(t('party.failedToCreate'));
    }
  };

  if (!currentTrack) {
    return null;
  }

  return (
    <div className="sticky bottom-0 z-10 bg-card">
      {/* Progress bar */}
      <button
        type="button"
        className="absolute top-0 left-0 right-0 h-1 bg-border cursor-pointer"
        onClick={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          seek(((e.clientX - rect.left) / rect.width) * 100);
        }}
      >
        <div
          className="h-full bg-neo-yellow transition-all duration-200"
          style={{ width: `${progress}%` }}
        />
      </button>

      <div className="flex items-center gap-3 px-4 py-2.5">
        {/* Cover — click to expand */}
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="flex-shrink-0"
        >
          <div className="w-11 h-11 border-[2px] border-border overflow-hidden">
            <img
              src={currentTrack.image}
              alt={currentTrack.title}
              className="w-full h-full object-cover"
            />
          </div>
        </button>

        {/* Info — click to expand */}
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="flex-1 min-w-0 text-left"
        >
          <p className="font-headline font-bold text-xs uppercase tracking-wider truncate">
            {currentTrack.title}
          </p>
          <p className="text-foreground/40 text-[10px] font-headline uppercase tracking-wider truncate">
            {currentTrack.artist}
          </p>
        </button>

        {/* Time */}
        <span className="text-foreground/20 text-[10px] font-mono hidden sm:block">
          {formatTime((progress / 100) * duration)} / {formatTime(duration)}
        </span>

        {/* Controls */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={prev}
            className="p-2 text-foreground/40 hover:text-foreground transition-colors"
          >
            <SkipBack className="w-4 h-4 fill-current" />
          </button>
          <button
            type="button"
            onClick={togglePlay}
            className="w-9 h-9 flex items-center justify-center bg-neo-yellow border-[2px] border-border text-foreground"
          >
            {isPlaying ? (
              <Pause className="w-3.5 h-3.5 fill-current" />
            ) : (
              <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
            )}
          </button>
          <button
            type="button"
            onClick={next}
            className="p-2 text-foreground/40 hover:text-foreground transition-colors"
          >
            <SkipForward className="w-4 h-4 fill-current" />
          </button>
          <button
            type="button"
            onClick={stop}
            className="p-2 text-foreground/20 hover:text-foreground transition-colors"
          >
            <Square className="w-3 h-3 fill-current" />
          </button>
          <button
            type="button"
            onClick={startParty}
            className={`p-2 transition-colors ${partyCode ? 'text-neo-yellow' : 'text-foreground/20 hover:text-foreground'}`}
            title={
              partyCode ? `Party: ${partyCode} (click to copy)` : 'Start party'
            }
          >
            <Users className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
