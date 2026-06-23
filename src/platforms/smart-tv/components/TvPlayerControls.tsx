'use client';

import {
  FocusContext,
  useFocusable,
} from '@noriginmedia/norigin-spatial-navigation';
import { useTranslations } from 'next-intl';
import { useEffect, useRef, useState } from 'react';
import type {
  Quality,
  SubtitleTrack,
} from '@/features/watch/player/context/types';
import { formatTime } from '@/features/watch/player/utils/format-time';
import { FOCUS_KEYS } from '../lib/focus-keys';

interface TvPlayerControlsProps {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  isLive?: boolean;
  qualities: Quality[];
  currentQuality: string;
  subtitleTracks: SubtitleTrack[];
  currentSubtitleTrack: string | null;
  activePanel: 'none' | 'quality' | 'subtitle' | 'audio' | 'speed';
  hasNext: boolean;
  hasPrev: boolean;
  isClipping?: boolean;
  clipDuration?: number;
  onClipToggle?: () => void;
  onPlayPause: () => void;
  onSeek: (time: number) => void;
  onNext?: () => void;
  onPrev?: () => void;
  onQualityChange: (index: number) => void;
  onSubtitleChange: (trackId: string | null) => void;
  onOpenPanel: (
    panel: 'none' | 'quality' | 'subtitle' | 'audio' | 'speed',
  ) => void;
  audioTracks: { id: string; label: string; language: string }[];
  currentAudioTrack: string | null;
  onAudioTrackChange: (trackId: string) => void;
  playbackRate: number;
  onPlaybackRateChange: (rate: number) => void;
}

// ─── Control Button ───
function ControlBtn({
  icon,
  label,
  onPress,
  disabled,
}: {
  icon: string;
  label: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  const { ref, focused } = useFocusable({
    onEnterPress: () => {
      if (!disabled) onPress();
    },
    focusable: !disabled,
  });
  return (
    <button
      ref={ref}
      type="button"
      aria-label={label}
      className={`p-3 rounded-full transition-all ${
        disabled ? 'opacity-30' : ''
      } ${focused ? 'bg-white text-black scale-110' : 'bg-white/20 text-white'}`}
    >
      <span className="material-symbols-outlined text-2xl">{icon}</span>
    </button>
  );
}

// ─── Seek Bar ───
function SeekBar({
  currentTime,
  duration,
  isLive,
  onSeek,
}: {
  currentTime: number;
  duration: number;
  isLive?: boolean;
  onSeek: (time: number) => void;
}) {
  const t = useTranslations('common.tv.player');
  const holdRef = useRef<ReturnType<typeof setInterval>>(undefined);
  const [localTime, setLocalTime] = useState(currentTime);

  useEffect(() => {
    setLocalTime(currentTime);
  }, [currentTime]);

  const { ref, focused } = useFocusable({
    onArrowPress: (dir) => {
      if (dir !== 'right' && dir !== 'left') return true;
      const step = duration * 0.02;
      const sign = dir === 'right' ? 1 : -1;
      if (!holdRef.current) {
        // Start seeking
        holdRef.current = setInterval(() => {
          setLocalTime((t) => {
            const next = Math.max(0, Math.min(duration, t + step * sign));
            onSeek(next);
            return next;
          });
        }, 80);
      }
      return false;
    },
    onArrowRelease: (dir) => {
      if (dir === 'left' || dir === 'right') {
        clearInterval(holdRef.current);
        holdRef.current = undefined;
      }
    },
  });

  useEffect(() => () => clearInterval(holdRef.current), []);

  if (isLive) {
    return (
      <div ref={ref} className="flex items-center gap-3 w-full">
        <span className="px-2 py-0.5 bg-red-600 text-white text-xs font-bold rounded">
          {t('live')}
        </span>
        <div className="flex-1 h-1.5 bg-white/20 rounded-full overflow-hidden">
          <div className="h-full bg-red-500 rounded-full w-full" />
        </div>
      </div>
    );
  }

  const pct = duration > 0 ? (localTime / duration) * 100 : 0;

  return (
    <div
      ref={ref}
      className={`flex items-center gap-3 w-full ${focused ? 'scale-y-150' : ''}`}
    >
      <span className="text-xs text-white/70 min-w-[48px] text-right font-mono">
        {formatTime(localTime)}
      </span>
      <div
        className={`flex-1 h-1.5 rounded-full overflow-hidden transition-all ${
          focused ? 'h-2.5 ring-2 ring-tv-focus' : 'bg-white/20'
        }`}
      >
        <div
          className="h-full bg-tv-focus rounded-full transition-[width] duration-75"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs text-white/70 min-w-[48px] font-mono">
        {formatTime(duration)}
      </span>
    </div>
  );
}

// ─── Quality Panel ───
function QualityPanel({
  qualities,
  currentQuality,
  onSelect,
}: {
  qualities: Quality[];
  currentQuality: string;
  onSelect: (index: number) => void;
}) {
  const t = useTranslations('common.tv.player');
  const { ref, focusKey, focusSelf } = useFocusable({
    focusKey: 'TV_QUALITY_PANEL',
    isFocusBoundary: true,
    trackChildren: true,
  });

  useEffect(() => {
    focusSelf();
  }, [focusSelf]);

  return (
    <FocusContext.Provider value={focusKey}>
      <div
        ref={ref}
        className="absolute bottom-28 right-8 bg-black/95 border border-white/20 rounded-xl p-3 min-w-[180px] z-40"
      >
        <p className="text-xs text-white/50 font-bold uppercase tracking-wider mb-2 px-2">
          {t('quality')}
        </p>
        <AutoQualityItem
          active={currentQuality === 'auto'}
          onSelect={() => onSelect(-1)}
        />
        {qualities.map((q, i) => (
          <QualityItem
            key={q.label}
            quality={q}
            active={currentQuality === q.label}
            onSelect={() => onSelect(i)}
          />
        ))}
      </div>
    </FocusContext.Provider>
  );
}

function AutoQualityItem({
  active,
  onSelect,
}: {
  active: boolean;
  onSelect: () => void;
}) {
  const t = useTranslations('common.tv.player');
  const { ref, focused } = useFocusable({ onEnterPress: onSelect });
  return (
    <div
      ref={ref}
      className={`px-3 py-2 rounded-lg text-sm transition-all ${
        focused
          ? 'bg-tv-focus text-white'
          : active
            ? 'text-tv-focus'
            : 'text-white/80'
      }`}
    >
      {t('auto')} {active && '✓'}
    </div>
  );
}

function QualityItem({
  quality,
  active,
  onSelect,
}: {
  quality: Quality;
  active: boolean;
  onSelect: () => void;
}) {
  const { ref, focused } = useFocusable({ onEnterPress: onSelect });
  return (
    <div
      ref={ref}
      className={`px-3 py-2 rounded-lg text-sm transition-all ${
        focused
          ? 'bg-tv-focus text-white'
          : active
            ? 'text-tv-focus'
            : 'text-white/80'
      }`}
    >
      {quality.height}p {active && '✓'}
    </div>
  );
}

// ─── Subtitle Panel ───
function SubtitlePanel({
  tracks,
  currentTrack,
  onSelect,
}: {
  tracks: SubtitleTrack[];
  currentTrack: string | null;
  onSelect: (id: string | null) => void;
}) {
  const t = useTranslations('common.tv.player');
  const { ref, focusKey, focusSelf } = useFocusable({
    focusKey: 'TV_SUBTITLE_PANEL',
    isFocusBoundary: true,
    trackChildren: true,
  });

  useEffect(() => {
    focusSelf();
  }, [focusSelf]);

  return (
    <FocusContext.Provider value={focusKey}>
      <div
        ref={ref}
        className="absolute bottom-28 right-8 bg-black/95 border border-white/20 rounded-xl p-3 min-w-[180px] z-40"
      >
        <p className="text-xs text-white/50 font-bold uppercase tracking-wider mb-2 px-2">
          {t('subtitles')}
        </p>
        <SubtitleItem
          label={t('off')}
          active={!currentTrack}
          onSelect={() => onSelect(null)}
        />
        {tracks.map((track) => (
          <SubtitleItem
            key={track.id}
            label={track.label}
            active={currentTrack === track.id}
            onSelect={() => onSelect(track.id)}
          />
        ))}
      </div>
    </FocusContext.Provider>
  );
}

function SubtitleItem({
  label,
  active,
  onSelect,
}: {
  label: string;
  active: boolean;
  onSelect: () => void;
}) {
  const { ref, focused } = useFocusable({ onEnterPress: onSelect });
  return (
    <div
      ref={ref}
      className={`px-3 py-2 rounded-lg text-sm transition-all ${
        focused
          ? 'bg-tv-focus text-white'
          : active
            ? 'text-tv-focus'
            : 'text-white/80'
      }`}
    >
      {label} {active && '✓'}
    </div>
  );
}

// ─── Audio Panel ───
function AudioPanel({
  tracks,
  currentTrack,
  onSelect,
}: {
  tracks: { id: string; label: string; language: string }[];
  currentTrack: string | null;
  onSelect: (id: string) => void;
}) {
  const t = useTranslations('common.tv.player');
  const { ref, focusKey, focusSelf } = useFocusable({
    focusKey: 'TV_AUDIO_PANEL',
    isFocusBoundary: true,
    trackChildren: true,
  });
  useEffect(() => {
    focusSelf();
  }, [focusSelf]);
  return (
    <FocusContext.Provider value={focusKey}>
      <div
        ref={ref}
        className="absolute bottom-28 right-8 bg-black/95 border border-white/20 rounded-xl p-3 min-w-[180px] z-40"
      >
        <p className="text-xs text-white/50 font-bold uppercase tracking-wider mb-2 px-2">
          {t('audio')}
        </p>
        {tracks.map((track) => (
          <AudioItem
            key={track.id}
            track={track}
            active={currentTrack === track.id}
            onSelect={() => onSelect(track.id)}
          />
        ))}
      </div>
    </FocusContext.Provider>
  );
}

function AudioItem({
  track,
  active,
  onSelect,
}: {
  track: { id: string; label: string };
  active: boolean;
  onSelect: () => void;
}) {
  const { ref, focused } = useFocusable({ onEnterPress: onSelect });
  return (
    <div
      ref={ref}
      className={`px-3 py-2 rounded-lg text-sm transition-all ${focused ? 'bg-tv-focus text-white' : active ? 'text-tv-focus' : 'text-white/80'}`}
    >
      {track.label} {active && '✓'}
    </div>
  );
}

// ─── Speed Panel ───
const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 2];

function SpeedItem({
  speed,
  active,
  onSelect,
}: {
  speed: number;
  active: boolean;
  onSelect: () => void;
}) {
  const { ref, focused } = useFocusable({ onEnterPress: onSelect });
  return (
    <div
      ref={ref}
      className={`px-3 py-2 rounded-lg text-sm transition-all ${
        focused
          ? 'bg-tv-focus text-white'
          : active
            ? 'text-indigo-400'
            : 'text-white/80'
      }`}
    >
      {speed === 1 ? 'Normal' : `${speed}×`} {active && '✓'}
    </div>
  );
}

function SpeedPanel({
  currentRate,
  onSelect,
}: {
  currentRate: number;
  onSelect: (rate: number) => void;
}) {
  const t = useTranslations('common.tv.player');
  const { ref, focusKey, focusSelf } = useFocusable({
    focusKey: 'TV_SPEED_PANEL',
    isFocusBoundary: true,
    trackChildren: true,
  });
  useEffect(() => {
    focusSelf();
  }, [focusSelf]);
  return (
    <FocusContext.Provider value={focusKey}>
      <div
        ref={ref}
        className="absolute bottom-28 right-8 bg-black/95 border border-white/20 rounded-xl p-3 min-w-[180px] z-40"
      >
        <p className="text-xs text-white/50 font-bold uppercase tracking-wider mb-2 px-2">
          {t('speed')}
        </p>
        {SPEEDS.map((s) => (
          <SpeedItem
            key={s}
            speed={s}
            active={currentRate === s}
            onSelect={() => onSelect(s)}
          />
        ))}
      </div>
    </FocusContext.Provider>
  );
}

// ─── Clip Button ───
function ClipButton({
  isClipping,
  clipDuration,
  onPress,
}: {
  isClipping?: boolean;
  clipDuration?: number;
  onPress: () => void;
}) {
  const { ref, focused } = useFocusable({ onEnterPress: onPress });
  return (
    <button
      ref={ref}
      type="button"
      aria-label={isClipping ? 'Stop clip' : 'Start clip'}
      className={`flex items-center gap-2 px-4 py-2 rounded-full transition-all ${
        isClipping
          ? focused
            ? 'bg-red-500 text-white scale-110'
            : 'bg-red-500/80 text-white'
          : focused
            ? 'bg-white text-black scale-110'
            : 'bg-white/20 text-white'
      }`}
    >
      <span
        className={`material-symbols-outlined text-xl ${isClipping ? 'animate-pulse' : ''}`}
      >
        {isClipping ? 'stop_circle' : 'content_cut'}
      </span>
      {isClipping && clipDuration != null && (
        <span className="text-xs font-mono font-bold">{clipDuration}s</span>
      )}
    </button>
  );
}

// ─── Main Controls Export ───
export function TvPlayerControls({
  isPlaying,
  currentTime,
  duration,
  isLive,
  qualities,
  currentQuality,
  subtitleTracks,
  currentSubtitleTrack,
  activePanel,
  hasNext,
  hasPrev,
  isClipping,
  clipDuration,
  onClipToggle,
  onPlayPause,
  onSeek,
  onNext,
  onPrev,
  onQualityChange,
  onSubtitleChange,
  onOpenPanel,
  audioTracks,
  currentAudioTrack,
  onAudioTrackChange,
  playbackRate,
  onPlaybackRateChange,
}: TvPlayerControlsProps) {
  const { ref, focusKey, focusSelf } = useFocusable({
    focusKey: FOCUS_KEYS.PLAYER_CONTROLS,
    trackChildren: true,
    isFocusBoundary: true,
    focusBoundaryDirections: ['down'],
  });

  useEffect(() => {
    focusSelf();
  }, [focusSelf]);

  return (
    <FocusContext.Provider value={focusKey}>
      <div ref={ref} className="tv-player-controls flex flex-col gap-4 z-30">
        {/* Seek bar */}
        <SeekBar
          currentTime={currentTime}
          duration={duration}
          isLive={isLive}
          onSeek={onSeek}
        />

        {/* Button row */}
        <div className="flex items-center justify-between">
          {/* Left: transport controls */}
          <div className="flex items-center gap-3">
            {hasPrev && (
              <ControlBtn
                icon="skip_previous"
                label="Previous episode"
                onPress={() => onPrev?.()}
              />
            )}
            <ControlBtn
              icon="replay_10"
              label="Rewind 10s"
              onPress={() => onSeek(currentTime - 10)}
            />
            <ControlBtn
              icon={isPlaying ? 'pause' : 'play_arrow'}
              label={isPlaying ? 'Pause' : 'Play'}
              onPress={onPlayPause}
            />
            <ControlBtn
              icon="forward_10"
              label="Forward 10s"
              onPress={() => onSeek(currentTime + 10)}
            />
            {hasNext && (
              <ControlBtn
                icon="skip_next"
                label="Next episode"
                onPress={() => onNext?.()}
              />
            )}
          </div>

          {/* Right: settings buttons */}
          <div className="flex items-center gap-3">
            {onClipToggle && (
              <ClipButton
                isClipping={isClipping}
                clipDuration={clipDuration}
                onPress={onClipToggle}
              />
            )}
            {audioTracks.length > 1 && (
              <ControlBtn
                icon="volume_up"
                label="Audio"
                onPress={() =>
                  onOpenPanel(activePanel === 'audio' ? 'none' : 'audio')
                }
              />
            )}
            {subtitleTracks.length > 0 && (
              <ControlBtn
                icon="subtitles"
                label="Subtitles"
                onPress={() =>
                  onOpenPanel(activePanel === 'subtitle' ? 'none' : 'subtitle')
                }
              />
            )}
            {!isLive && (
              <ControlBtn
                icon="speed"
                label="Speed"
                onPress={() =>
                  onOpenPanel(activePanel === 'speed' ? 'none' : 'speed')
                }
              />
            )}
            {qualities.length > 0 && (
              <ControlBtn
                icon="tune"
                label="Quality"
                onPress={() =>
                  onOpenPanel(activePanel === 'quality' ? 'none' : 'quality')
                }
              />
            )}
          </div>
        </div>

        {/* Panels */}
        {activePanel === 'quality' && (
          <QualityPanel
            qualities={qualities}
            currentQuality={currentQuality}
            onSelect={onQualityChange}
          />
        )}
        {activePanel === 'subtitle' && (
          <SubtitlePanel
            tracks={subtitleTracks}
            currentTrack={currentSubtitleTrack}
            onSelect={onSubtitleChange}
          />
        )}
        {activePanel === 'audio' && (
          <AudioPanel
            tracks={audioTracks}
            currentTrack={currentAudioTrack}
            onSelect={onAudioTrackChange}
          />
        )}
        {activePanel === 'speed' && (
          <SpeedPanel
            currentRate={playbackRate}
            onSelect={onPlaybackRateChange}
          />
        )}
      </div>
    </FocusContext.Provider>
  );
}
