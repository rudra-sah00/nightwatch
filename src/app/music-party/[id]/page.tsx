'use client';

import { LogOut, Music, Plus } from 'lucide-react';
import { useParams } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import {
  getStreamUrl,
  type MusicTrack,
  searchMusic,
} from '@/features/music/api';
import {
  addToMusicPartyQueue,
  getMusicPartyRoom,
  joinMusicParty,
  leaveMusicParty,
  type MusicPartyRoom,
} from '@/features/music-party/api';

function formatTime(s: number) {
  const m = Math.floor(s / 60);
  return `${m}:${Math.floor(s % 60)
    .toString()
    .padStart(2, '0')}`;
}

export default function MusicPartyRoomPage() {
  const params = useParams();
  const roomId = params.id as string;

  const [room, setRoom] = useState<MusicPartyRoom | null>(null);
  const [loading, setLoading] = useState(true);
  const [joined, setJoined] = useState(false);
  const [_userId, setUserId] = useState<string | null>(null);
  const [anonName, setAnonName] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<MusicTrack[]>([]);
  const [searching, setSearching] = useState(false);
  const [_isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const currentTrackIdRef = useRef<string | null>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    getMusicPartyRoom(roomId)
      .then((r) => {
        setRoom(r);
        document.title = `${r.name} — Music Party — Nightwatch`;
      })
      .catch(() => toast.error('Room not found'))
      .finally(() => setLoading(false));
  }, [roomId]);

  // Poll room state
  useEffect(() => {
    if (!joined) return;
    const interval = setInterval(() => {
      getMusicPartyRoom(roomId)
        .then(setRoom)
        .catch(() => {});
    }, 3000);
    return () => clearInterval(interval);
  }, [roomId, joined]);

  // Play current track when it changes
  useEffect(() => {
    if (!room || !joined || room.currentTrackIndex < 0) return;
    const track = room.queue[room.currentTrackIndex];
    if (!track || track.id === currentTrackIdRef.current) return;
    currentTrackIdRef.current = track.id;
    if (!audioRef.current) {
      audioRef.current = new Audio();
      audioRef.current.addEventListener('timeupdate', () => {
        const a = audioRef.current!;
        if (a.duration) {
          setProgress((a.currentTime / a.duration) * 100);
          setDuration(a.duration);
        }
      });
      audioRef.current.addEventListener('ended', () => setIsPlaying(false));
    }
    getStreamUrl(track.id)
      .then((url) => {
        audioRef.current!.src = url;
        audioRef
          .current!.play()
          .then(() => setIsPlaying(true))
          .catch(() => {});
      })
      .catch(() => toast.error('Failed to load audio'));
  }, [room, joined]);

  // Cleanup audio on unmount
  useEffect(
    () => () => {
      audioRef.current?.pause();
    },
    [],
  );

  const handleJoin = async () => {
    const name = anonName.trim();
    if (!name) {
      toast.error('Enter your name');
      return;
    }
    try {
      const res = await joinMusicParty(roomId, name);
      setRoom(res.room);
      setUserId(res.userId);
      setJoined(true);
    } catch {
      toast.error('Failed to join');
    }
  };

  const handleLeave = async () => {
    audioRef.current?.pause();
    await leaveMusicParty(roomId).catch(() => {});
    setJoined(false);
    setUserId(null);
    setIsPlaying(false);
  };

  const handleAddToQueue = async (track: MusicTrack) => {
    try {
      const r = await addToMusicPartyQueue(roomId, {
        id: track.id,
        title: track.title,
        artist: track.artist,
        album: track.album,
        image: track.image,
        duration: track.duration,
      });
      setRoom(r);
      setShowSearch(false);
      setSearchQuery('');
      setSearchResults([]);
      toast.success('Added to queue');
    } catch {
      toast.error('Failed to add');
    }
  };

  const handleSearch = useCallback((q: string) => {
    setSearchQuery(q);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (q.trim().length < 2) {
      setSearchResults([]);
      return;
    }
    setSearching(true);
    debounceRef.current = setTimeout(() => {
      searchMusic(q)
        .then((r) => setSearchResults(r.songs))
        .catch(() => {})
        .finally(() => setSearching(false));
    }, 300);
  }, []);

  if (loading) {
    return (
      <div className="h-[100dvh] bg-background flex items-center justify-center">
        <div className="w-6 h-6 border-[3px] border-foreground/10 border-t-foreground rounded-full animate-spin" />
      </div>
    );
  }

  if (!room) {
    return (
      <div className="h-[100dvh] bg-background flex flex-col items-center justify-center gap-4 text-foreground">
        <Music className="w-12 h-12 text-foreground/20" />
        <p className="font-headline font-bold uppercase tracking-widest text-sm text-foreground/40">
          Room not found
        </p>
      </div>
    );
  }

  // Join screen — fullscreen centered
  if (!joined) {
    const previewTrack =
      room.currentTrackIndex >= 0 ? room.queue[room.currentTrackIndex] : null;
    return (
      <div className="h-[100dvh] bg-background text-foreground flex flex-col items-center justify-center gap-6 px-6">
        {previewTrack ? (
          <div className="relative mb-2">
            <div className="absolute inset-0 bg-neo-yellow translate-x-2 translate-y-2 border-[4px] border-border" />
            <img
              src={previewTrack.image}
              alt=""
              className="relative w-40 h-40 border-[4px] border-border object-cover"
            />
          </div>
        ) : (
          <Music className="w-16 h-16 text-neo-yellow" />
        )}
        <h1 className="font-headline font-black uppercase tracking-tighter text-3xl text-center">
          {room.name}
        </h1>
        {previewTrack && (
          <p className="text-foreground/40 font-headline uppercase tracking-widest text-xs">
            Now playing: {previewTrack.title}
          </p>
        )}
        <StackedAvatars members={room.members} size="lg" />
        <p className="text-foreground/20 font-headline uppercase tracking-widest text-[10px]">
          {room.members.length} listening
        </p>
        <input
          value={anonName}
          onChange={(e) => setAnonName(e.target.value)}
          placeholder="Your name"
          className="w-64 bg-card border-[3px] border-border px-4 py-3 font-headline font-bold uppercase text-sm tracking-wider text-center outline-none focus:border-neo-yellow text-foreground"
          onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
        />
        <button
          type="button"
          onClick={handleJoin}
          className="px-8 py-3 bg-neo-yellow border-[3px] border-border font-headline font-black uppercase tracking-widest text-sm hover:bg-neo-yellow/80 transition-colors"
        >
          Join Party
        </button>
      </div>
    );
  }

  const currentTrack =
    room.currentTrackIndex >= 0 ? room.queue[room.currentTrackIndex] : null;

  // Fullscreen player layout
  return (
    <div className="h-[100dvh] bg-background text-foreground flex flex-col">
      {/* Top bar */}
      <div className="flex items-center justify-between px-6 pt-5 pb-3 shrink-0">
        <div>
          <h2 className="font-headline font-black uppercase tracking-tighter text-sm">
            {room.name}
          </h2>
          <p className="text-foreground/20 font-headline uppercase tracking-widest text-[10px]">
            {room.id}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <StackedAvatars members={room.members} />
          <button
            type="button"
            onClick={handleLeave}
            className="p-2 text-foreground/30 hover:text-neo-red transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main player area */}
      <div className="flex-1 flex flex-col items-center justify-center px-8 min-h-0">
        {currentTrack ? (
          <>
            <div className="relative mb-8">
              <div className="absolute inset-0 bg-neo-yellow translate-x-2 translate-y-2 border-[4px] border-border" />
              <img
                src={currentTrack.image}
                alt={currentTrack.title}
                className="relative w-56 h-56 md:w-72 md:h-72 border-[4px] border-border object-cover"
              />
            </div>
            <div className="text-center px-4 mb-6 max-w-md">
              <h2 className="font-headline font-black uppercase tracking-tighter text-xl md:text-2xl truncate">
                {currentTrack.title}
              </h2>
              <p className="text-foreground/40 font-headline font-bold uppercase tracking-widest text-xs mt-1 truncate">
                {currentTrack.artist}
              </p>
            </div>
            {/* Seek bar (read-only) */}
            <div className="w-full max-w-sm mb-4">
              <div className="w-full h-2 bg-border relative">
                <div
                  className="h-full bg-neo-yellow transition-all duration-200"
                  style={{ width: `${progress}%` }}
                />
                <div
                  className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-neo-yellow border-[2px] border-border rounded-full"
                  style={{ left: `${progress}%`, marginLeft: '-6px' }}
                />
              </div>
              <div className="flex justify-between mt-1">
                <span className="text-foreground/20 text-[10px] font-mono">
                  {formatTime((progress / 100) * duration)}
                </span>
                <span className="text-foreground/20 text-[10px] font-mono">
                  {formatTime(duration)}
                </span>
              </div>
            </div>
            {/* Listening indicator */}
            <div className="flex items-center gap-2 mt-2">
              <div className="w-2 h-2 rounded-full bg-neo-yellow animate-pulse" />
              <span className="text-foreground/30 font-headline uppercase tracking-widest text-[10px]">
                Listening
              </span>
            </div>
          </>
        ) : (
          <div className="text-center">
            <Music className="w-16 h-16 text-foreground/10 mx-auto mb-4" />
            <p className="text-foreground/20 font-headline uppercase tracking-widest text-xs">
              No songs yet
            </p>
          </div>
        )}
      </div>

      {/* Bottom: Queue + Add */}
      <div className="shrink-0 max-h-[35vh] flex flex-col border-t-[3px] border-border">
        <div className="flex items-center justify-between px-6 py-3">
          <h3 className="font-headline font-black uppercase tracking-widest text-xs text-foreground/40">
            Queue — {room.queue.length}
          </h3>
          <button
            type="button"
            onClick={() => setShowSearch(!showSearch)}
            className="flex items-center gap-1 text-foreground/40 hover:text-foreground font-headline font-bold uppercase text-[10px] tracking-widest transition-colors"
          >
            <Plus className="w-3.5 h-3.5" /> Add
          </button>
        </div>

        {showSearch && (
          <div className="px-6 pb-2">
            <input
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder="Search songs..."
              className="w-full bg-card border-[2px] border-border px-3 py-2 font-headline font-bold text-xs outline-none focus:border-neo-yellow"
            />
            {searching && (
              <div className="py-2 text-center">
                <div className="w-3 h-3 border-[2px] border-foreground/10 border-t-foreground rounded-full animate-spin inline-block" />
              </div>
            )}
            <div className="max-h-32 overflow-y-auto">
              {searchResults.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => handleAddToQueue(s)}
                  className="w-full flex items-center gap-2 px-2 py-1.5 hover:bg-card transition-colors text-left"
                >
                  <img
                    src={s.image}
                    alt=""
                    className="w-6 h-6 border border-border object-cover shrink-0"
                  />
                  <span className="font-headline font-bold text-[10px] uppercase tracking-wider truncate flex-1">
                    {s.title} — {s.artist}
                  </span>
                  <Plus className="w-3 h-3 text-foreground/30 shrink-0" />
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto px-6 pb-4">
          {room.queue.map((track, i) => (
            <div
              // biome-ignore lint/suspicious/noArrayIndexKey: queue can have duplicate track ids
              key={`${track.id}-${i}`}
              className={`flex items-center gap-2 px-2 py-1.5 ${i === room.currentTrackIndex ? 'bg-neo-yellow/10' : ''}`}
            >
              <span className="w-4 text-foreground/20 text-[10px] font-mono text-right shrink-0">
                {i + 1}
              </span>
              <img
                src={track.image}
                alt=""
                className="w-7 h-7 border border-border object-cover shrink-0"
              />
              <div className="flex-1 min-w-0">
                <p
                  className={`font-headline font-bold text-[10px] uppercase tracking-wider truncate ${i === room.currentTrackIndex ? 'text-neo-yellow' : ''}`}
                >
                  {track.title}
                </p>
                <p className="text-foreground/40 text-[9px] font-headline uppercase tracking-wider truncate">
                  {track.artist}
                </p>
              </div>
              <span className="text-foreground/20 text-[9px] font-mono shrink-0">
                {formatTime(track.duration)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function StackedAvatars({
  members,
  size = 'sm',
}: {
  members: { id: string; name: string; profilePhoto?: string | null }[];
  size?: 'sm' | 'lg';
}) {
  const visible = members.slice(0, 5);
  const extra = members.length - visible.length;
  const s = size === 'lg' ? 'w-10 h-10' : 'w-8 h-8';
  const txt = size === 'lg' ? 'text-xs' : 'text-[10px]';

  return (
    <div className="flex items-center -space-x-2">
      {visible.map((m) => (
        <div
          key={m.id}
          className={`${s} rounded-full border-[2px] border-background overflow-hidden bg-card flex items-center justify-center shrink-0`}
          title={m.name}
        >
          {m.profilePhoto ? (
            <img
              src={m.profilePhoto}
              alt={m.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <span
              className={`font-headline font-black ${txt} uppercase text-foreground/60`}
            >
              {m.name[0]}
            </span>
          )}
        </div>
      ))}
      {extra > 0 && (
        <div
          className={`${s} rounded-full border-[2px] border-background bg-card flex items-center justify-center shrink-0`}
        >
          <span
            className={`font-headline font-black ${txt} text-foreground/40`}
          >
            +{extra}
          </span>
        </div>
      )}
    </div>
  );
}
