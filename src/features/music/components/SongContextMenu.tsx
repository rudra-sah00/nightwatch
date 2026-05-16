'use client';

import {
  Check,
  ListMusic,
  ListPlus,
  Plus,
  Radio,
  SkipForward,
  Trash2,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import {
  addTrackToPlaylist,
  createSongRadio,
  createUserPlaylist,
  getUserPlaylists,
  type MusicTrack,
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
  const { currentTrack, addToQueue, playNext, play } = useMusicPlayerContext();
  const [menu, setMenu] = useState<MenuEvent | null>(null);
  const [visible, setVisible] = useState(false);
  const [panel, setPanel] = useState<'actions' | 'playlists'>('actions');
  const [playlists, setPlaylists] = useState<UserPlaylist[]>([]);
  const [addedTo, setAddedTo] = useState<Set<string>>(new Set());
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handler: Listener = (e) => {
      setMenu(e);
      setPanel('actions');
      setCreating(false);
      setNewName('');
      setAddedTo(new Set());
      requestAnimationFrame(() => setVisible(true));
    };
    bus.add(handler);
    return () => {
      bus.delete(handler);
    };
  }, []);

  const close = useCallback(() => {
    setVisible(false);
    setTimeout(() => setMenu(null), 200);
  }, []);

  const handleAddToQueue = useCallback(async () => {
    if (!menu) return;
    close();
    try {
      await addToQueue(menu.song as MusicTrack);
      toast.success(t('addedToQueue'));
    } catch {
      toast.error(t('failedToAdd'));
    }
  }, [menu, t, addToQueue, close]);

  const handlePlayNext = useCallback(() => {
    if (!menu) return;
    close();
    playNext(menu.song as MusicTrack);
    toast.success(t('contextMenu.playingNext'));
  }, [menu, playNext, t, close]);

  const handleStartRadio = useCallback(async () => {
    if (!menu) return;
    close();
    try {
      const songs = await createSongRadio(menu.song.id);
      if (songs.length > 0) play(songs[0], songs);
    } catch {
      toast.error(t('failedToAdd'));
    }
  }, [menu, t, play, close]);

  const handleShowPlaylists = useCallback(async () => {
    setPanel('playlists');
    try {
      const data = await getUserPlaylists();
      setPlaylists(data);
    } catch {
      setPlaylists([]);
    }
  }, []);

  const handleAddToPlaylist = useCallback(
    async (playlistId: string) => {
      if (!menu || addedTo.has(playlistId)) return;
      try {
        await addTrackToPlaylist(playlistId, {
          trackId: menu.song.id,
          title: menu.song.title,
          artist: menu.song.artist,
          album: menu.song.album,
          image: menu.song.image,
          duration: menu.song.duration,
        });
        setAddedTo((prev) => new Set(prev).add(playlistId));
        toast.success(t('addedToPlaylist'));
      } catch (err) {
        const msg = err instanceof Error ? err.message : '';
        if (msg.includes('409') || msg.includes('Already')) {
          setAddedTo((prev) => new Set(prev).add(playlistId));
          toast.info(t('contextMenu.alreadyInPlaylist'));
        } else {
          toast.error(t('failedToAdd'));
        }
      }
    },
    [menu, t, addedTo],
  );

  const handleCreate = useCallback(async () => {
    if (!newName.trim() || !menu) return;
    try {
      const playlist = await createUserPlaylist(newName.trim());
      await addTrackToPlaylist(playlist.id, {
        trackId: menu.song.id,
        title: menu.song.title,
        artist: menu.song.artist,
        album: menu.song.album,
        image: menu.song.image,
        duration: menu.song.duration,
      });
      close();
      toast.success(t('playlistCreated'));
    } catch {
      toast.error(t('failedToCreate'));
    }
  }, [newName, menu, t, close]);

  if (!menu) return null;

  return (
    <div
      className={`fixed inset-0 z-[10000] flex items-center justify-center backdrop-blur-sm transition-all duration-200 ${visible ? 'bg-black/40 opacity-100' : 'bg-black/0 opacity-0'}`}
      onClick={close}
      onKeyDown={(e) => {
        if (e.key === 'Escape') close();
      }}
      role="dialog"
    >
      <div
        className={`relative w-72 overflow-hidden transition-all duration-200 ${visible ? 'scale-100 opacity-100' : 'scale-75 opacity-0'}`}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={() => {}}
        role="menu"
      >
        {/* Track info */}
        <div className="text-center mb-4">
          <p className="font-headline font-black text-sm uppercase tracking-tight text-white truncate">
            {menu.song.title}
          </p>
          <p className="text-white/40 text-[10px] font-headline uppercase tracking-wider truncate">
            {menu.song.artist}
          </p>
        </div>

        {/* Sliding panels */}
        <div className="relative overflow-hidden">
          <div
            className={`flex transition-transform duration-300 ease-in-out ${panel === 'playlists' ? '-translate-x-full' : 'translate-x-0'}`}
          >
            {/* Panel 1: Actions */}
            <div className="w-full flex-shrink-0 flex flex-col items-center gap-3 py-2">
              {menu.onRemove && (
                <button
                  type="button"
                  className="text-red-400 text-xs font-headline font-bold uppercase tracking-wider cursor-pointer hover:text-red-300 flex items-center gap-2"
                  onClick={() => {
                    menu.onRemove?.();
                    close();
                  }}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  {t('contextMenu.removeFromPlaylist')}
                </button>
              )}
              {menu.song.id !== currentTrack?.id && (
                <>
                  <button
                    type="button"
                    className="text-white/70 text-xs font-headline font-bold uppercase tracking-wider cursor-pointer hover:text-white flex items-center gap-2"
                    onClick={handlePlayNext}
                  >
                    <SkipForward className="w-3.5 h-3.5" />
                    {t('contextMenu.playNext')}
                  </button>
                  <button
                    type="button"
                    className="text-white/70 text-xs font-headline font-bold uppercase tracking-wider cursor-pointer hover:text-white flex items-center gap-2"
                    onClick={handleAddToQueue}
                  >
                    <ListPlus className="w-3.5 h-3.5" />
                    {t('addToQueue')}
                  </button>
                </>
              )}
              <button
                type="button"
                className="text-white/70 text-xs font-headline font-bold uppercase tracking-wider cursor-pointer hover:text-white flex items-center gap-2"
                onClick={handleStartRadio}
              >
                <Radio className="w-3.5 h-3.5" />
                {t('contextMenu.startRadio')}
              </button>
              <button
                type="button"
                className="text-white/70 text-xs font-headline font-bold uppercase tracking-wider cursor-pointer hover:text-white flex items-center gap-2"
                onClick={handleShowPlaylists}
              >
                <ListMusic className="w-3.5 h-3.5" />
                {t('contextMenu.addToPlaylist')}
              </button>
            </div>

            {/* Panel 2: Playlists */}
            <div className="w-full flex-shrink-0 flex flex-col items-center gap-3 max-h-60 overflow-y-auto py-2">
              <button
                type="button"
                className="text-white/40 text-[10px] font-headline uppercase tracking-wider cursor-pointer hover:text-white mb-1"
                onClick={() => setPanel('actions')}
              >
                ← back
              </button>
              {playlists.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  className={`text-xs font-headline font-bold uppercase tracking-wider flex items-center gap-2 w-full justify-center py-0.5 ${addedTo.has(p.id) ? 'text-white/30 cursor-default' : 'text-white/70 cursor-pointer hover:text-white'}`}
                  onClick={() => handleAddToPlaylist(p.id)}
                >
                  {addedTo.has(p.id) ? (
                    <Check className="w-3 h-3 text-green-400" />
                  ) : (
                    <ListMusic className="w-3 h-3 text-white/30" />
                  )}
                  <span className="truncate max-w-[180px]">{p.name}</span>
                </button>
              ))}
              {!creating ? (
                <button
                  type="button"
                  className="text-neo-yellow text-xs font-headline font-bold uppercase tracking-wider cursor-pointer hover:text-neo-yellow/80 flex items-center gap-2 mt-1"
                  onClick={() => {
                    setCreating(true);
                    setTimeout(() => inputRef.current?.focus(), 50);
                  }}
                >
                  <Plus className="w-3.5 h-3.5" />
                  {t('createPlaylist')}
                </button>
              ) : (
                <input
                  ref={inputRef}
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder={t('playlistName')}
                  className="mt-1 w-48 bg-transparent border-b border-white/20 outline-none text-sm font-bold font-headline uppercase text-white placeholder:text-white/30 text-center py-1"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleCreate();
                  }}
                />
              )}
            </div>
          </div>
        </div>

        {/* Cancel */}
        <div className="text-center mt-3">
          <button
            type="button"
            className="text-white/40 text-[10px] font-headline uppercase tracking-wider cursor-pointer hover:text-white"
            onClick={close}
          >
            cancel
          </button>
        </div>
      </div>
    </div>
  );
}
