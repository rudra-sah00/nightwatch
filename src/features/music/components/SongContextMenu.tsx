'use client';

import {
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

/** Minimal track shape required by the context menu (avoids coupling to full MusicTrack). */
interface Track {
  id: string;
  title: string;
  artist: string;
  album: string;
  image: string;
  duration: number;
}

/** Payload emitted through the event bus when a context menu is requested. */
type MenuEvent = { x: number; y: number; song: Track; onRemove?: () => void };
/** Subscriber callback type for the event bus. */
type Listener = (e: MenuEvent) => void;

/**
 * Simple in-memory pub/sub event bus (a `Set` of listeners).
 *
 * Producers call {@link showSongMenu} which broadcasts a `MenuEvent` to all
 * registered listeners. The singleton {@link SongContextMenu} component
 * subscribes on mount and renders the menu at the event coordinates.
 */
const bus = new Set<Listener>();

/**
 * Fires a context-menu event for a song at the pointer position.
 *
 * Call this from any component's `onContextMenu` handler to open the
 * global {@link SongContextMenu} without prop-drilling.
 *
 * @param e - The React mouse event (used for coordinates and `preventDefault`).
 * @param song - The track to show actions for.
 * @param onRemove - Optional callback for a "Remove from Playlist" action.
 */
export function showSongMenu(
  e: React.MouseEvent,
  song: Track,
  onRemove?: () => void,
) {
  e.preventDefault();
  for (const l of bus) l({ x: e.clientX, y: e.clientY, song, onRemove });
}

/**
 * Global right-click context menu for song actions.
 *
 * Subscribes to the {@link bus} event bus on mount and renders a positioned
 * `<menu>` element at the pointer coordinates when a {@link showSongMenu} event
 * is received. Available actions (shown conditionally):
 *
 * - **Remove from Playlist** — only if `onRemove` was provided by the caller.
 * - **Play Next** / **Add to Queue** — only if the song is not the currently playing track.
 * - **Start Song Radio** — creates an auto-generated radio queue from the song.
 * - **Add to Playlist** — expands an inline sub-menu listing the user's playlists
 *   (fetched on demand) with an option to create a new playlist inline.
 *
 * The menu auto-closes on outside click or scroll. This is a singleton component —
 * mount it once near the app root.
 */
export function SongContextMenu() {
  const t = useTranslations('music');
  const { currentTrack, addToQueue, playNext, play } = useMusicPlayerContext();
  const [menu, setMenu] = useState<MenuEvent | null>(null);
  const [pos, setPos] = useState<{ left: number; top: number }>({
    left: 0,
    top: 0,
  });
  const menuRef = useRef<HTMLMenuElement>(null);
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
    if (!menu || !menuRef.current) return;
    const rect = menuRef.current.getBoundingClientRect();
    let { x: left, y: top } = menu;
    if (top + rect.height > window.innerHeight) {
      top = menu.y - rect.height;
    }
    if (left + rect.width > window.innerWidth) {
      left = menu.x - rect.width;
    }
    if (top < 0) top = 0;
    if (left < 0) left = 0;
    setPos({ left, top });
  }, [menu]);

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
      await addToQueue(song as MusicTrack);
      toast.success(t('addedToQueue'));
    } catch {
      toast.error(t('failedToAdd'));
    }
  }, [menu, t, addToQueue]);

  const handlePlayNext = useCallback(() => {
    if (!menu) return;
    const { song } = menu;
    setMenu(null);
    playNext(song as MusicTrack);
    toast.success('Playing next');
  }, [menu, playNext]);

  const handleStartRadio = useCallback(async () => {
    if (!menu) return;
    const { song } = menu;
    setMenu(null);
    try {
      const songs = await createSongRadio(song.id);
      if (songs.length > 0) play(songs[0], songs);
    } catch {
      toast.error(t('failedToAdd'));
    }
  }, [menu, t, play]);

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
      ref={menuRef}
      data-song-menu
      className="fixed z-[10000] bg-card border-[3px] border-border shadow-lg py-1 min-w-[200px] list-none m-0 p-0"
      style={{ left: pos.left, top: pos.top }}
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
              onClick={handlePlayNext}
              className="w-full flex items-center gap-2 px-4 py-2 text-left font-headline font-bold uppercase text-xs tracking-wider hover:bg-neo-yellow/10 transition-colors"
            >
              <SkipForward className="w-4 h-4 text-foreground/40" />
              Play Next
            </button>
          </li>
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
          onClick={handleStartRadio}
          className="w-full flex items-center gap-2 px-4 py-2 text-left font-headline font-bold uppercase text-xs tracking-wider hover:bg-neo-yellow/10 transition-colors"
        >
          <Radio className="w-4 h-4 text-foreground/40" />
          Start Song Radio
        </button>
      </li>
      <li className="h-[2px] bg-border mx-2 my-1" />
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
