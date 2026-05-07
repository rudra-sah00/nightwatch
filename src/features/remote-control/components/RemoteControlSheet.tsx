'use client';

import {
  ArrowLeft,
  Cast,
  Monitor,
  Pause,
  Play,
  SkipBack,
  SkipForward,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { checkIsMobile } from '@/lib/electron-bridge';
import { useRemoteCommander } from '../hooks/use-remote-commander';
import { useRemoteStreams } from '../hooks/use-remote-streams';
import type { RemoteStreamAdvertise } from '../types';

function formatTime(seconds: number): string {
  if (!seconds || !Number.isFinite(seconds) || seconds <= 0) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function StreamSelector({
  streams,
  activeStream,
  onSelect,
}: {
  streams: RemoteStreamAdvertise[];
  activeStream: RemoteStreamAdvertise | null;
  onSelect: (socketId: string) => void;
}) {
  if (streams.length <= 1) return null;

  return (
    <div className="flex flex-col gap-2 px-4 mb-6">
      <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">
        Devices
      </p>
      {streams.map((s) => (
        <button
          key={s.socketId}
          type="button"
          onClick={() => onSelect(s.socketId)}
          className={`flex items-center gap-3 p-3 rounded-xl border transition-colors ${
            s.socketId === activeStream?.socketId
              ? 'border-primary bg-primary/10'
              : 'border-border bg-card hover:bg-accent'
          }`}
        >
          <Monitor className="w-4 h-4 text-muted-foreground shrink-0" />
          <div className="flex-1 text-left min-w-0">
            <p className="text-sm font-medium truncate">{s.title}</p>
            <p className="text-xs text-muted-foreground">{s.deviceName}</p>
          </div>
        </button>
      ))}
    </div>
  );
}

function Controls({ stream }: { stream: RemoteStreamAdvertise }) {
  const { state, sendCommand } = useRemoteCommander(stream);
  const hasDuration = state.duration > 0 && Number.isFinite(state.duration);
  const progress = hasDuration ? (state.currentTime / state.duration) * 100 : 0;
  const isLive = stream.type === 'livestream';

  return (
    <div className="flex flex-col items-center gap-8 px-6">
      {/* Poster */}
      <div className="w-48 h-72 rounded-2xl overflow-hidden border border-border shadow-xl bg-muted">
        {stream.posterUrl ? (
          <img
            src={stream.posterUrl}
            alt={stream.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Cast className="w-12 h-12 text-muted-foreground" />
          </div>
        )}
      </div>

      {/* Title + metadata */}
      <div className="text-center space-y-1">
        <h2 className="text-lg font-semibold text-foreground truncate max-w-[280px]">
          {stream.title}
        </h2>
        {stream.type === 'series' && stream.season && stream.episode ? (
          <p className="text-sm text-muted-foreground">
            S{stream.season} E{stream.episode}
            {stream.episodeTitle ? ` · ${stream.episodeTitle}` : ''}
          </p>
        ) : isLive ? (
          <p className="text-sm text-red-400 font-medium flex items-center justify-center gap-1.5">
            <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
            LIVE
          </p>
        ) : (
          <p className="text-sm text-muted-foreground capitalize">
            {stream.type} · {stream.deviceName}
          </p>
        )}
      </div>

      {/* Progress bar — hidden for livestreams with no duration */}
      {hasDuration && !isLive ? (
        <div className="w-full max-w-xs space-y-1">
          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{formatTime(state.currentTime)}</span>
            <span>{formatTime(state.duration)}</span>
          </div>
        </div>
      ) : null}

      {/* Playback controls */}
      <div className="flex items-center gap-6">
        {/* Hide seek for livestreams */}
        {!isLive ? (
          <button
            type="button"
            onClick={() => sendCommand('seek_backward', { seekSeconds: 10 })}
            className="w-12 h-12 rounded-full bg-muted flex items-center justify-center active:scale-90 transition-transform"
            aria-label="Seek back 10s"
          >
            <SkipBack className="w-5 h-5" />
          </button>
        ) : null}

        <button
          type="button"
          onClick={() => sendCommand('toggle_play')}
          className="w-16 h-16 rounded-full bg-primary flex items-center justify-center active:scale-90 transition-transform shadow-lg"
          aria-label={state.isPlaying ? 'Pause' : 'Play'}
        >
          {state.isPlaying ? (
            <Pause className="w-7 h-7 text-primary-foreground fill-current" />
          ) : (
            <Play className="w-7 h-7 text-primary-foreground fill-current ml-0.5" />
          )}
        </button>

        {!isLive ? (
          <button
            type="button"
            onClick={() => sendCommand('seek_forward', { seekSeconds: 10 })}
            className="w-12 h-12 rounded-full bg-muted flex items-center justify-center active:scale-90 transition-transform"
            aria-label="Seek forward 10s"
          >
            <SkipForward className="w-5 h-5" />
          </button>
        ) : null}
      </div>

      {/* Next episode button (series only) */}
      {stream.type === 'series' ? (
        <button
          type="button"
          onClick={() => sendCommand('next_episode')}
          className="px-5 py-2.5 rounded-full border border-border bg-card text-sm font-medium hover:bg-accent active:scale-95 transition-all"
        >
          Next Episode →
        </button>
      ) : null}
    </div>
  );
}

/**
 * Full-page remote control UI for mobile.
 * Shows device picker (if multiple) + playback controls.
 * Auto-navigates back when all streams end.
 */
export function RemoteControlSheet() {
  const { streams, activeStream, selectStream } = useRemoteStreams();
  const router = useRouter();
  const hadStreamsRef = useRef(false);

  // Track if we ever had streams — if they all end, show toast and go back
  useEffect(() => {
    if (streams.length > 0) {
      hadStreamsRef.current = true;
    } else if (hadStreamsRef.current) {
      toast.info('Playback ended on desktop');
      router.back();
    }
  }, [streams.length, router]);

  if (streams.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 px-6">
        <Cast className="w-16 h-16 text-muted-foreground/50" />
        <p className="text-muted-foreground text-center">
          No active streams found.
          <br />
          Start playing something on your desktop.
        </p>
        <button
          type="button"
          onClick={() => router.back()}
          className="mt-4 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium"
        >
          Go Back
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full pt-safe">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3">
        <button
          type="button"
          onClick={() => router.back()}
          className="w-9 h-9 rounded-full bg-muted flex items-center justify-center"
          aria-label="Back"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <h1 className="text-base font-semibold">Remote Control</h1>
      </div>

      {/* Device picker */}
      <StreamSelector
        streams={streams}
        activeStream={activeStream}
        onSelect={selectStream}
      />

      {/* Controls */}
      <div className="flex-1 flex items-center justify-center pb-safe">
        {activeStream ? <Controls stream={activeStream} /> : null}
      </div>
    </div>
  );
}

/**
 * Page-level wrapper that redirects desktop users back to home.
 */
export function RemoteControlPage() {
  const router = useRouter();

  if (!checkIsMobile()) {
    router.replace('/home');
    return null;
  }

  return <RemoteControlSheet />;
}
