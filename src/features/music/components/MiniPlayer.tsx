'use client';

import {
  ListMusic,
  Pause,
  Play,
  SkipBack,
  SkipForward,
  Square,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { useMusicPlayerContext } from '../context/MusicPlayerContext';
import { useMusicShortcuts } from '../hooks/use-music-shortcuts';
import { showSongMenu } from './SongContextMenu';

export function MiniPlayer() {
  const player = useMusicPlayerContext();
  const t = useTranslations('music');
  useMusicShortcuts();

  const {
    currentTrack,
    isPlaying,
    progress,
    queue,
    togglePlay,
    next,
    prev,
    seek,
    stop,
    setExpanded,
    volume,
    setVolume,
    removeFromQueue,
  } = player;
  const [showQueue, setShowQueue] = useState(false);

  if (!currentTrack) return null;

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
        {/* Cover */}
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

        {/* Info */}
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

        {/* Controls */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={prev}
            className="p-1.5 text-foreground/40 hover:text-foreground transition-colors"
          >
            <SkipBack className="w-3.5 h-3.5 fill-current" />
          </button>
          <button
            type="button"
            onClick={togglePlay}
            className="w-8 h-8 flex items-center justify-center bg-neo-yellow border-[2px] border-border text-foreground"
          >
            {isPlaying ? (
              <Pause className="w-3 h-3 fill-current" />
            ) : (
              <Play className="w-3 h-3 fill-current ml-0.5" />
            )}
          </button>
          <button
            type="button"
            onClick={next}
            className="p-1.5 text-foreground/40 hover:text-foreground transition-colors"
          >
            <SkipForward className="w-3.5 h-3.5 fill-current" />
          </button>
          <button
            type="button"
            onClick={stop}
            className="p-1.5 text-foreground/20 hover:text-foreground transition-colors"
          >
            <Square className="w-3 h-3 fill-current" />
          </button>
          <button
            type="button"
            onClick={() => setVolume(volume > 0 ? 0 : 1)}
            className="p-1.5 text-foreground/20 hover:text-foreground transition-colors"
          >
            {volume === 0 ? (
              <VolumeX className="w-3.5 h-3.5" />
            ) : (
              <Volume2 className="w-3.5 h-3.5" />
            )}
          </button>
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={volume}
            onChange={(e) => setVolume(Number(e.target.value))}
            className="w-16 h-1 accent-neo-yellow cursor-pointer"
          />
          <button
            type="button"
            onClick={() => setShowQueue((v) => !v)}
            className={`p-1.5 transition-colors ${showQueue ? 'text-neo-yellow' : 'text-foreground/20 hover:text-foreground'}`}
            title={t('queueTitle')}
          >
            <ListMusic className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Queue panel */}
      {showQueue && queue.length > 0 && (
        <div className="border-t-[2px] border-border max-h-48 overflow-y-auto px-4 py-2">
          <p className="font-headline font-black uppercase tracking-widest text-[10px] text-foreground/30 mb-1">
            Queue — {queue.length}
          </p>
          {queue.map((track, i) => (
            <button
              key={track.id}
              type="button"
              onClick={() => player.play(track, queue)}
              onContextMenu={(e) =>
                showSongMenu(
                  e,
                  track,
                  currentTrack?.id !== track.id
                    ? () => removeFromQueue(i)
                    : undefined,
                )
              }
              className={`w-full flex items-center gap-2 py-1.5 text-left transition-colors hover:bg-card ${currentTrack?.id === track.id ? 'text-neo-yellow' : ''}`}
            >
              <span className="w-4 text-foreground/20 text-[9px] font-mono text-right shrink-0">
                {i + 1}
              </span>
              <img
                src={track.image}
                alt=""
                className="w-6 h-6 border border-border object-cover shrink-0"
              />
              <span className="font-headline font-bold text-[10px] uppercase tracking-wider truncate flex-1">
                {track.title}
              </span>
              <span className="text-foreground/20 text-[9px] font-mono shrink-0">
                {track.artist}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
