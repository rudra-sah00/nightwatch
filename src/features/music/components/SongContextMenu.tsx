'use client';

import { ListMusic, ListPlus, Plus, Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import {
  addToUserQueue,
  addTrackToPlaylist,
  createUserPlaylist,
  getUserPlaylists,
  type UserPlaylist,
} from '../api';
import { useMusicPlayerContext } from '../context/MusicPlayerContext';

interface Track {
  id: string;
  title: string;
  artist: string;
  album: string;
  image: string;
  duration: number;
}

type MenuEvent = { x: number; y: number; song: Track; onRemove?: () => void };
type Listener = (e: MenuEvent) => void;

const bus = new Set<Listener>();

export function showSongMenu(
  e: React.MouseEvent,
  song: Track,
  onRemove?: () => void,
) {
  e.preventDefault();
  for (const l of bus) l({ x: e.clientX, y: e.clientY, song, onRemove });
}

export function SongContextMenu() {
  const t = useTranslations('music');
  const { currentTrack } = useMusicPlayerContext();
  const [menu, setMenu] = useState<MenuEvent | null>(null);
  const [playlists, setPlaylists] = useState<UserPlaylist[]>([]);
  const [showPlaylists, setShowPlaylists] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');

  useEffect(() => {
    const handler: Listener = (e) => {
      setMenu(e);
      setShowPlaylists(false);
      setCreating(false);
      setNewName('');
    };
    bus.add(handler);
    return () => {
      bus.delete(handler);
    };
  }, []);

  const close = useCallback(() => setMenu(null), []);

  useEffect(() => {
    if (!menu) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest('[data-song-menu]')) return;
      close();
    };
    window.addEventListener('click', handler);
    window.addEventListener('scroll', close, true);
    return () => {
      window.removeEventListener('click', handler);
      window.removeEventListener('scroll', close, true);
    };
  }, [menu, close]);

  const handleAddToQueue = useCallback(async () => {
    if (!menu) return;
    const { song } = menu;
    setMenu(null);
    try {
      await addToUserQueue(song);
      toast.success(t('addedToQueue'));
    } catch {
      toast.error(t('failedToAdd'));
    }
  }, [menu, t]);

  const handleShowPlaylists = useCallback(async () => {
    setShowPlaylists(true);
    try {
      const data = await getUserPlaylists();
      setPlaylists(data);
    } catch {
      setPlaylists([]);
    }
  }, []);

  const handleAddToPlaylist = useCallback(
    async (playlistId: string) => {
      if (!menu) return;
      const { song } = menu;
      setMenu(null);
      try {
        await addTrackToPlaylist(playlistId, {
          trackId: song.id,
          title: song.title,
          artist: song.artist,
          album: song.album,
          image: song.image,
          duration: song.duration,
        });
        toast.success(t('addedToPlaylist'));
      } catch (err) {
        const msg = err instanceof Error ? err.message : '';
        if (msg.includes('409') || msg.includes('Already')) {
          toast.info('Already in playlist');
        } else {
          toast.error(t('failedToAdd'));
        }
      }
    },
    [menu, t],
  );

  const handleCreate = useCallback(async () => {
    if (!newName.trim()) return;
    try {
      const playlist = await createUserPlaylist(newName.trim());
      if (menu) {
        await addTrackToPlaylist(playlist.id, {
          trackId: menu.song.id,
          title: menu.song.title,
          artist: menu.song.artist,
          album: menu.song.album,
          image: menu.song.image,
          duration: menu.song.duration,
        });
      }
      setMenu(null);
      toast.success(t('playlistCreated'));
    } catch {
      toast.error(t('failedToCreate'));
    }
  }, [newName, menu, t]);

  if (!menu) return null;

  return (
    <menu
      data-song-menu
      className="fixed z-[10000] bg-card border-[3px] border-border shadow-lg py-1 min-w-[200px] list-none m-0 p-0"
      style={{ left: menu.x, top: menu.y }}
    >
      {menu.onRemove && (
        <>
          <li>
            <button
              type="button"
              onClick={() => {
                menu.onRemove?.();
                close();
              }}
              className="w-full flex items-center gap-2 px-4 py-2 text-left font-headline font-bold uppercase text-xs tracking-wider hover:bg-neo-yellow/10 transition-colors text-red-400"
            >
              <Trash2 className="w-4 h-4" />
              Remove from Playlist
            </button>
          </li>
          <li className="h-[2px] bg-border mx-2 my-1" />
        </>
      )}
      {menu.song.id !== currentTrack?.id && (
        <>
          <li>
            <button
              type="button"
              onClick={handleAddToQueue}
              className="w-full flex items-center gap-2 px-4 py-2 text-left font-headline font-bold uppercase text-xs tracking-wider hover:bg-neo-yellow/10 transition-colors"
            >
              <ListPlus className="w-4 h-4 text-foreground/40" />
              {t('addToQueue')}
            </button>
          </li>
          <li className="h-[2px] bg-border mx-2 my-1" />
        </>
      )}
      <li>
        <button
          type="button"
          onClick={handleShowPlaylists}
          className="w-full flex items-center gap-2 px-4 py-2 text-left font-headline font-bold uppercase text-xs tracking-wider hover:bg-neo-yellow/10 transition-colors"
        >
          <ListMusic className="w-4 h-4 text-foreground/40" />
          Add to Playlist
        </button>
      </li>

      {showPlaylists && (
        <>
          {playlists.length > 0 && (
            <>
              {playlists.map((p) => (
                <li key={p.id}>
                  <button
                    type="button"
                    onClick={() => handleAddToPlaylist(p.id)}
                    className="w-full flex items-center gap-2 px-6 py-1.5 text-left font-headline font-bold text-[10px] uppercase tracking-wider hover:bg-neo-yellow/10 transition-colors"
                  >
                    {p.coverUrl ? (
                      <img
                        src={p.coverUrl}
                        alt=""
                        className="w-5 h-5 border border-border object-cover shrink-0"
                      />
                    ) : (
                      <ListMusic className="w-4 h-4 text-foreground/20 shrink-0" />
                    )}
                    <span className="truncate">{p.name}</span>
                    <span className="text-foreground/20 ml-auto shrink-0">
                      {p.trackCount}
                    </span>
                  </button>
                </li>
              ))}
              <li className="h-[2px] bg-border mx-2 my-1" />
            </>
          )}
          {!creating ? (
            <li>
              <button
                type="button"
                onClick={() => setCreating(true)}
                className="w-full flex items-center gap-2 px-6 py-1.5 text-left font-headline font-bold text-[10px] uppercase tracking-wider hover:bg-neo-yellow/10 transition-colors text-neo-yellow"
              >
                <Plus className="w-4 h-4" />
                Create Playlist
              </button>
            </li>
          ) : (
            <li className="px-4 py-2">
              <input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder={t('playlistName')}
                className="w-full bg-background border-[2px] border-border px-2 py-1 font-headline font-bold text-[10px] uppercase tracking-wider outline-none focus:border-neo-yellow"
                onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
              />
            </li>
          )}
        </>
      )}
    </menu>
  );
}
