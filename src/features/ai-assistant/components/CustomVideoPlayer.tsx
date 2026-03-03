'use client';

import { Loader2, Pause, Play, Volume2, VolumeX } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCustomVideoPlayer } from '../hooks/use-custom-video-player';

interface CustomVideoPlayerProps {
  src: string;
  poster?: string;
  autoPlay?: boolean;
  className?: string;
}

export function CustomVideoPlayer({
  src,
  poster,
  autoPlay = false,
  className,
}: CustomVideoPlayerProps) {
  const {
    videoRef,
    containerRef,
    isPlaying,
    progress,
    duration,
    volume,
    isMuted,
    isBuffering,
    showControls,
    setShowControls,
    togglePlay,
    toggleMute,
    handleVolumeChange,
    handleSeek,
    formatTime,
    handleMouseMove,
  } = useCustomVideoPlayer(src, autoPlay);

  return (
    <section
      ref={containerRef}
      className={cn(
        'relative w-full h-full bg-black group overflow-hidden select-none',
        className,
      )}
      aria-label="Video Player"
      onMouseMove={handleMouseMove}
      onMouseLeave={() => isPlaying && setShowControls(false)}
    >
      {/* Video Element */}
      <video
        ref={videoRef}
        src={src || undefined}
        poster={poster}
        className="w-full h-full object-contain"
        onClick={togglePlay}
        playsInline
      >
        <track
          kind="captions"
          src="data:text/vtt;charset=utf-8,WEBVTT"
          label="English"
        />
      </video>

      {/* Loading Spinner */}
      {isBuffering ? (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-20 pointer-events-none">
          <Loader2 className="w-10 h-10 text-primary animate-spin" />
        </div>
      ) : null}

      {/* Big Play Button (Center) */}
      {!isPlaying && !isBuffering ? (
        <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
          <div className="w-16 h-16 rounded-full bg-black/50 backdrop-blur-sm border border-white/20 flex items-center justify-center animate-in zoom-in-90 duration-200">
            <Play className="w-8 h-8 text-white fill-white ml-1" />
          </div>
        </div>
      ) : null}

      {/* Controls Overlay */}
      <div
        className={cn(
          'absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/60 to-transparent pt-12 pb-4 px-4 transition-opacity duration-300 z-30',
          showControls ? 'opacity-100' : 'opacity-0',
        )}
      >
        {/* Progress Bar */}
        <div className="group/slider relative h-1.5 mb-4 cursor-pointer">
          <div className="absolute inset-0 bg-white/20 rounded-full" />
          <div
            className="absolute inset-y-0 left-0 bg-primary rounded-full"
            style={{ width: `${progress}%` }}
          />
          <input
            type="range"
            min="0"
            max="100"
            step="0.1"
            value={progress}
            onChange={handleSeek}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />
        </div>

        {/* Buttons Row */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={togglePlay}
              className="text-white hover:text-primary transition-colors focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:rounded focus:outline-none"
            >
              {isPlaying ? (
                <Pause className="w-6 h-6 fill-current" />
              ) : (
                <Play className="w-6 h-6 fill-current" />
              )}
            </button>

            {/* Volume */}
            <div className="flex items-center gap-2 group/vol">
              <button
                type="button"
                onClick={toggleMute}
                className="text-white hover:text-primary transition-colors focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:rounded focus:outline-none"
              >
                {isMuted || volume === 0 ? (
                  <VolumeX className="w-5 h-5" />
                ) : (
                  <Volume2 className="w-5 h-5" />
                )}
              </button>
              <div className="w-0 overflow-hidden group-hover/vol:w-20 transition-[width] duration-300">
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={isMuted ? 0 : volume}
                  onChange={handleVolumeChange}
                  className="w-20 h-1 accent-primary cursor-pointer"
                />
              </div>
            </div>

            {/* Time Display */}
            <div className="text-xs font-medium text-white/70">
              {formatTime(videoRef.current?.currentTime || 0)} /{' '}
              {formatTime(duration)}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
