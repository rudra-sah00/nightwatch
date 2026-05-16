'use client';

import { ArrowLeft, Camera, Music, Pause, Play, Trash2 } from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useEffect, useRef, useState } from 'react';
import { AppSkeletonTheme, Skeleton } from '@/components/ui/skeleton-theme';
import {
  deleteUserPlaylist,
  getUserPlaylistDetail,
  removeTrackFromPlaylist,
  type UserPlaylistDetail,
  updateUserPlaylist,
  uploadPlaylistCover,
} from '@/features/music/api';
import { showSongMenu } from '@/features/music/components/SongContextMenu';
import { useMusicPlayerContext } from '@/features/music/context/MusicPlayerContext';

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export default function UserPlaylistDetailPage() {
  const params = useParams();
  const router = useRouter();
  const tm = useTranslations('music');
  const id = params.id as string;
  const player = useMusicPlayerContext();
  const [playlist, setPlaylist] = useState<UserPlaylistDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    getUserPlaylistDetail(id)
      .then((data) => {
        setPlaylist(data);
        document.title = `${data.name} — Nightwatch`;
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (editing) nameInputRef.current?.focus();
  }, [editing]);

  const handleRename = async () => {
    if (!playlist || !editName.trim() || editName.trim() === playlist.name)
      return setEditing(false);
    await updateUserPlaylist(id, { name: editName.trim() });
    setPlaylist((p) => (p ? { ...p, name: editName.trim() } : p));
    document.title = `${editName.trim()} — Nightwatch`;
    setEditing(false);
  };

  const [uploading, setUploading] = useState(false);

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const updated = await uploadPlaylistCover(id, file);
      setPlaylist((p) =>
        p ? { ...p, coverUrl: `${updated.coverUrl}?t=${Date.now()}` } : p,
      );
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveTrack = async (trackEntryId: string) => {
    await removeTrackFromPlaylist(id, trackEntryId);
    setPlaylist((p) =>
      p
        ? {
            ...p,
            tracks: p.tracks.filter((t) => t.id !== trackEntryId),
            trackCount: p.trackCount - 1,
          }
        : p,
    );
  };

  const playTrack = (
    track: UserPlaylistDetail['tracks'][number],
    allTracks: UserPlaylistDetail['tracks'],
  ) => {
    const asMusicTrack = (t: UserPlaylistDetail['tracks'][number]) => {
      console.log('[Playlist] Playing track:', t.trackId, t.title);
      return {
        id: t.trackId,
        title: t.title,
        artist: t.artist,
        album: t.album,
        albumId: '',
        duration: t.duration,
        image: t.image,
        language: '',
        year: 0,
        hasLyrics: false,
      };
    };
    player.play(asMusicTrack(track), allTracks.map(asMusicTrack));
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-y-auto pb-28">
      <div className="px-6 pt-6 flex items-center justify-between">
        <button
          type="button"
          onClick={() => router.back()}
          className="flex items-center gap-2 text-foreground/40 hover:text-foreground font-headline font-bold uppercase tracking-widest text-xs transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          {tm('back')}
        </button>
        <button
          type="button"
          onClick={() => setConfirmDelete(true)}
          className="flex items-center gap-1.5 text-foreground/30 hover:text-neo-red font-headline font-bold uppercase tracking-widest text-xs transition-colors"
        >
          <Trash2 className="w-3.5 h-3.5" />
          {tm('deletePlaylist')}
        </button>
      </div>

      {loading && (
        <AppSkeletonTheme>
          <div className="px-6 py-6 flex items-end gap-6">
            <Skeleton width={208} height={208} />
            <div>
              <Skeleton width={200} height={24} />
              <Skeleton width={80} height={10} style={{ marginTop: 8 }} />
            </div>
          </div>
          <div className="px-6">
            {[1, 2, 3, 4, 5].map((n) => (
              <div key={n} className="flex items-center gap-4 px-4 py-3">
                <Skeleton width={20} height={12} />
                <Skeleton width={40} height={40} />
                <div className="flex-1 min-w-0">
                  <Skeleton width="55%" height={12} />
                  <Skeleton width="35%" height={9} style={{ marginTop: 4 }} />
                </div>
                <Skeleton width={30} height={9} />
              </div>
            ))}
          </div>
        </AppSkeletonTheme>
      )}

      {!loading && playlist && (
        <>
          <div className="flex items-end gap-6 px-6 py-6">
            <div className="relative w-40 h-40 md:w-52 md:h-52 border-[4px] border-border overflow-hidden flex-shrink-0 group">
              {playlist.coverUrl ? (
                <img
                  src={playlist.coverUrl}
                  alt={playlist.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-card flex items-center justify-center">
                  <Music className="w-16 h-16 text-foreground/20" />
                </div>
              )}
              {uploading && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                  <div className="w-6 h-6 border-[3px] border-white/20 border-t-white rounded-full animate-spin" />
                </div>
              )}
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Camera className="w-6 h-6 text-white" />
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                onChange={handleCoverUpload}
                className="hidden"
              />
            </div>
            <div className="min-w-0">
              {editing ? (
                <input
                  ref={nameInputRef}
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  onBlur={handleRename}
                  onKeyDown={(e) => e.key === 'Enter' && handleRename()}
                  className="bg-transparent font-headline font-black uppercase tracking-tighter text-2xl md:text-4xl border-b-[3px] border-neo-yellow outline-none w-full"
                />
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setEditName(playlist.name);
                    setEditing(true);
                  }}
                  className="font-headline font-black uppercase tracking-tighter text-2xl md:text-4xl truncate text-left hover:text-neo-yellow transition-colors"
                >
                  {playlist.name}
                </button>
              )}
              <p className="text-foreground/20 font-headline uppercase tracking-widest text-[10px] mt-2">
                {tm('songCount', { count: playlist.tracks.length })}
              </p>
            </div>
          </div>

          <div className="px-6">
            {playlist.tracks.map((track, i) => {
              const isActive = player.currentTrack?.id === track.trackId;
              return (
                <button
                  type="button"
                  key={track.id}
                  onClick={() =>
                    isActive
                      ? player.togglePlay()
                      : playTrack(track, playlist.tracks)
                  }
                  onContextMenu={(e) =>
                    showSongMenu(
                      e,
                      {
                        id: track.trackId,
                        title: track.title,
                        artist: track.artist,
                        album: track.album,
                        image: track.image,
                        duration: track.duration,
                      },
                      () => handleRemoveTrack(track.id),
                    )
                  }
                  className="w-full flex items-center gap-4 px-4 py-3 text-left transition-colors hover:bg-card"
                >
                  <span className="w-6 text-foreground/20 text-xs font-mono text-right flex-shrink-0">
                    {isActive && player.isPlaying ? (
                      <Pause className="w-3.5 h-3.5 text-neo-yellow fill-current inline" />
                    ) : isActive ? (
                      <Play className="w-3.5 h-3.5 text-neo-yellow fill-current inline ml-0.5" />
                    ) : (
                      i + 1
                    )}
                  </span>
                  <img
                    src={track.image}
                    alt={track.title}
                    className="w-10 h-10 border-[2px] border-border object-cover flex-shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <p
                      className={`font-headline font-bold text-sm uppercase tracking-wider truncate ${isActive ? 'text-neo-yellow' : ''}`}
                    >
                      {track.title}
                    </p>
                    <p className="text-foreground/40 text-[10px] font-headline uppercase tracking-wider truncate">
                      {track.artist}
                    </p>
                  </div>
                  <span className="text-foreground/20 text-[10px] font-mono flex-shrink-0">
                    {formatTime(track.duration)}
                  </span>
                </button>
              );
            })}
          </div>
        </>
      )}

      {confirmDelete && (
        <DeletePlaylistOverlay
          onConfirm={async () => {
            if (!playlist) return;
            await deleteUserPlaylist(playlist.id);
            router.back();
          }}
          onCancel={() => setConfirmDelete(false)}
        />
      )}
    </div>
  );
}

function DeletePlaylistOverlay({
  onConfirm,
  onCancel,
}: {
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const tm = useTranslations('music');
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
  }, []);

  const close = () => {
    setVisible(false);
    setTimeout(onCancel, 200);
  };

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm transition-all duration-200 ${visible ? 'bg-black/40 opacity-100' : 'bg-black/0 opacity-0'}`}
      onClick={close}
      onKeyDown={(e) => {
        if (e.key === 'Escape') close();
      }}
      role="dialog"
    >
      <div
        className={`flex flex-col items-center transition-all duration-200 ${visible ? 'scale-100 opacity-100' : 'scale-75 opacity-0'}`}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={() => {}}
        role="dialog"
      >
        <p className="text-white text-lg font-black font-headline uppercase tracking-tight text-center">
          {tm('deletePlaylistTitle')}
        </p>
        <p className="text-white/50 text-xs font-headline uppercase tracking-wider text-center mt-2">
          {tm('deletePlaylistDescription')}
        </p>
        <div className="flex gap-6 mt-5">
          <button
            type="button"
            className="text-red-400 text-xs font-headline font-bold uppercase tracking-wider cursor-pointer hover:text-red-300"
            onClick={() => {
              setVisible(false);
              setTimeout(onConfirm, 200);
            }}
          >
            {tm('deletePlaylist')}
          </button>
          <button
            type="button"
            className="text-white/60 text-xs font-headline font-bold uppercase tracking-wider cursor-pointer hover:text-white"
            onClick={close}
          >
            {tm('cancel')}
          </button>
        </div>
      </div>
    </div>
  );
}
