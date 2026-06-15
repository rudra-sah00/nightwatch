'use client';

import {
  Heart,
  ListMusic,
  ListPlus,
  Pause,
  Play,
  RotateCcw,
  X,
} from 'lucide-react';
import Image from 'next/image';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import {
  addTrackToPlaylist,
  getUserPlaylists,
  type UserPlaylist,
} from '@/features/music/api';
import { trackEvent } from '@/lib/analytics';
import { AnalyticsEvents } from '@/lib/analytics-events';
import { hapticLight } from '@/lib/haptics';
import type { DiscoverSong } from '../api';

interface DiscoverActionsProps {
  song: DiscoverSong | null;
  onSwipe: (action: 'like' | 'dislike') => void;
  onUndo: () => void;
  onTogglePlay: () => void;
  isPlaying: boolean;
  canUndo: boolean;
}

export function DiscoverActions({
  song,
  onSwipe,
  onUndo,
  onTogglePlay,
  isPlaying,
  canUndo,
}: DiscoverActionsProps) {
  const [showPlaylists, setShowPlaylists] = useState(false);
  const [playlists, setPlaylists] = useState<UserPlaylist[]>([]);

  const loadPlaylists = useCallback(() => {
    getUserPlaylists()
      .then(setPlaylists)
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (showPlaylists && playlists.length === 0) {
      loadPlaylists();
    }
  }, [showPlaylists, playlists.length, loadPlaylists]);

  const handleAddToPlaylist = useCallback(
    async (playlistId: string) => {
      if (!song) return;
      try {
        await addTrackToPlaylist(playlistId, {
          trackId: song.id,
          title: song.title,
          artist: song.artist,
          album: song.album,
          image: song.image,
          duration: song.duration,
        });
        hapticLight();
        toast.success('Added to playlist');
        trackEvent(AnalyticsEvents.DISCOVER_ADD_TO_PLAYLIST, {
          songId: song.id,
        });
        setShowPlaylists(false);
      } catch {
        toast.error('Already in playlist');
      }
    },
    [song],
  );

  return (
    <>
      <div className="shrink-0 pb-5 pt-2 flex flex-col items-center gap-3">
        {/* Action buttons row */}
        <div className="flex items-center gap-4">
          {/* Dislike / Skip */}
          <button
            type="button"
            onClick={() => onSwipe('dislike')}
            className="w-12 h-12 rounded-full border-2 border-red-400/50 flex items-center justify-center hover:bg-red-400/10 active:scale-90 transition-transform"
            aria-label="Skip"
          >
            <X className="w-5 h-5 text-red-400" />
          </button>

          {/* Undo */}
          <button
            type="button"
            onClick={onUndo}
            disabled={!canUndo}
            className="w-10 h-10 rounded-full border-2 border-border flex items-center justify-center hover:bg-muted active:scale-90 transition-transform disabled:opacity-30 disabled:cursor-not-allowed"
            aria-label="Undo"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          {/* Pause / Play */}
          <button
            type="button"
            onClick={onTogglePlay}
            className="w-12 h-12 rounded-full border-2 border-border bg-card flex items-center justify-center hover:bg-muted active:scale-90 transition-transform shadow-md"
            aria-label={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? (
              <Pause className="w-5 h-5" />
            ) : (
              <Play className="w-5 h-5 ml-0.5" />
            )}
          </button>

          {/* Add to Playlist */}
          <button
            type="button"
            onClick={() => {
              hapticLight();
              setShowPlaylists(true);
            }}
            className="w-10 h-10 rounded-full border-2 border-border flex items-center justify-center hover:bg-muted active:scale-90 transition-transform"
            aria-label="Add to playlist"
          >
            <ListPlus className="w-4 h-4" />
          </button>

          {/* Like */}
          <button
            type="button"
            onClick={() => onSwipe('like')}
            className="w-12 h-12 rounded-full border-2 border-green-400/50 flex items-center justify-center hover:bg-green-400/10 active:scale-90 transition-transform"
            aria-label="Like"
          >
            <Heart className="w-5 h-5 text-green-400" />
          </button>
        </div>
      </div>

      {/* Glassmorphism playlist picker overlay */}
      {showPlaylists && (
        <div
          className="fixed inset-0 z-[10000] flex items-center justify-center backdrop-blur-sm bg-black/40 transition-all duration-200"
          onClick={() => setShowPlaylists(false)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') setShowPlaylists(false);
          }}
          role="dialog"
        >
          <div
            className="w-72 bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={() => {}}
            role="menu"
          >
            {/* Header */}
            <p className="font-headline font-black text-sm uppercase tracking-tight text-white text-center mb-3">
              Add to Playlist
            </p>

            {/* Playlist list */}
            <div className="flex flex-col gap-1 max-h-60 overflow-y-auto">
              {playlists.length === 0 ? (
                <p className="text-white/40 text-xs text-center py-3 font-headline uppercase tracking-wider">
                  No playlists yet
                </p>
              ) : (
                playlists.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => handleAddToPlaylist(p.id)}
                    className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-white/10 text-left transition-colors"
                  >
                    <div className="w-10 h-10 rounded-lg overflow-hidden shrink-0 bg-white/5 border border-white/10">
                      {p.coverUrl ? (
                        <Image
                          src={p.coverUrl}
                          alt=""
                          width={40}
                          height={40}
                          className="object-cover w-full h-full"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <ListMusic className="w-4 h-4 text-white/30" />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-headline font-bold text-white/80 truncate">
                        {p.name}
                      </p>
                      <p className="text-[10px] text-white/40">
                        {p.trackCount} songs
                      </p>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
