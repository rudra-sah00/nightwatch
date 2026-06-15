'use client';

import { Heart, ListPlus, Pause, Play, RotateCcw, X } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import {
  addTrackToPlaylist,
  getUserPlaylists,
  type UserPlaylist,
} from '@/features/music/api';
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
        setShowPlaylists(false);
      } catch {
        toast.error('Already in playlist');
      }
    },
    [song],
  );

  return (
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
            setShowPlaylists(!showPlaylists);
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

      {/* Playlist picker dropdown */}
      {showPlaylists && (
        <div className="w-full max-w-[320px] bg-card border-2 border-border rounded-2xl p-3 shadow-xl max-h-48 overflow-y-auto">
          {playlists.length === 0 ? (
            <p className="text-sm text-foreground/50 text-center py-2">
              No playlists yet
            </p>
          ) : (
            <div className="flex flex-col gap-1">
              {playlists.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => handleAddToPlaylist(p.id)}
                  className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-muted text-left transition-colors"
                >
                  <ListPlus className="w-4 h-4 shrink-0 text-foreground/50" />
                  <span className="text-sm font-medium truncate">{p.name}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
