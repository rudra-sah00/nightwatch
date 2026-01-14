'use client';

import React, { useEffect, useRef, useState } from 'react';
import videojs from 'video.js';
import 'video.js/dist/video-js.css';
import Player from 'video.js/dist/types/player';

// Import quality selector
import 'videojs-contrib-quality-levels';
import 'videojs-hls-quality-selector';

interface VideoPlayerProps {
  src: string;
  poster?: string;
  title?: string;
  subtitles?: Array<{
    language: string;
    url: string;
  }>;
  thumbnailsUrl?: string;
}

export default function VideoPlayer({ 
  src, 
  poster, 
  title, 
  subtitles,
  thumbnailsUrl 
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<Player | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // Make sure Video.js player is only initialized once
    if (!playerRef.current && videoRef.current) {
      const videoElement = document.createElement('video-js');
      videoElement.classList.add('vjs-big-play-centered');
      videoRef.current.appendChild(videoElement);

      const player = videojs(videoElement, {
        autoplay: false,
        controls: true,
        responsive: true,
        fluid: true,
        preload: 'auto',
        poster: poster,
        html5: {
          vhs: {
            enableLowInitialPlaylist: true,
            smoothQualityChange: true,
            overrideNative: true,
          },
          nativeAudioTracks: false,
          nativeVideoTracks: false,
        },
        controlBar: {
          children: [
            'playToggle',
            'volumePanel',
            'currentTimeDisplay',
            'timeDivider',
            'durationDisplay',
            'progressControl',
            'liveDisplay',
            'seekToLive',
            'remainingTimeDisplay',
            'customControlSpacer',
            'playbackRateMenuButton',
            'chaptersButton',
            'descriptionsButton',
            'subsCapsButton',
            'audioTrackButton',
            'qualitySelector',
            'fullscreenToggle',
          ],
        },
      });

      playerRef.current = player;

      // Set source
      player.src({
        src: src,
        type: 'application/x-mpegURL',
      });

      // Add subtitles
      if (subtitles && subtitles.length > 0) {
        subtitles.forEach((subtitle, index) => {
          player.addRemoteTextTrack({
            kind: 'subtitles',
            label: subtitle.language,
            srclang: subtitle.language,
            src: subtitle.url,
            default: index === 0,
          }, false);
        });
      }

      // Enable quality selector plugin
      player.ready(() => {
        // @ts-ignore - plugin type
        if (player.qualityLevels && player.hlsQualitySelector) {
          // @ts-ignore
          player.hlsQualitySelector({
            displayCurrentQuality: true,
          });
        }
        setIsReady(true);
      });

      // Handle errors
      player.on('error', () => {
        console.error('Video.js Error');
        const mediaError = player.error();
        if (mediaError) {
          console.error('Media Error Code:', mediaError.code);
          console.error('Media Error Message:', mediaError.message);
        }
      });

      // Log audio tracks when manifest is loaded
      player.on('loadedmetadata', () => {
        const audioTracks = player.audioTracks();
        if (audioTracks) {
          const trackCount = audioTracks.tracks_ ? audioTracks.tracks_.length : 0;
          console.log('Available audio tracks:', trackCount);
          // Iterate using tracks_ array
          if (audioTracks.tracks_) {
            audioTracks.tracks_.forEach((track: any, i: number) => {
              if (track) {
                console.log(`Audio Track ${i}:`, {
                  label: track.label,
                  language: track.language,
                  enabled: track.enabled,
                });
              }
            });
          }
        }
      });

      // Add keyboard shortcuts for better UX
      player.ready(() => {
        const playerEl = player.el();
        if (playerEl) {
          playerEl.setAttribute('tabindex', '0');
          playerEl.addEventListener('keydown', (e: Event) => {
            const keyEvent = e as unknown as KeyboardEvent;
            if (!player) return;
            
            switch(keyEvent.key) {
              case 'ArrowRight':
                keyEvent.preventDefault();
                player.currentTime((player.currentTime() || 0) + 10); // Skip forward 10s
                break;
              case 'ArrowLeft':
                keyEvent.preventDefault();
                player.currentTime((player.currentTime() || 0) - 10); // Skip backward 10s
                break;
              case 'ArrowUp':
                keyEvent.preventDefault();
                player.volume(Math.min((player.volume() || 0) + 0.1, 1)); // Increase volume
                break;
              case 'ArrowDown':
                keyEvent.preventDefault();
                player.volume(Math.max((player.volume() || 0) - 0.1, 0)); // Decrease volume
                break;
              case ' ':
              case 'k':
                keyEvent.preventDefault();
                if (player.paused()) {
                  player.play();
                } else {
                  player.pause();
                }
                break;
              case 'f':
                keyEvent.preventDefault();
                if (player.isFullscreen()) {
                  player.exitFullscreen();
                } else {
                  player.requestFullscreen();
                }
                break;
              case 'm':
                keyEvent.preventDefault();
                player.muted(!player.muted());
                break;
              case 'j':
                keyEvent.preventDefault();
                player.currentTime((player.currentTime() || 0) - 15); // Skip backward 15s
                break;
              case 'l':
                keyEvent.preventDefault();
                player.currentTime((player.currentTime() || 0) + 15); // Skip forward 15s
                break;
            }
          });
        }
      });

      // Remember playback position
      const videoId = src;
      const savedTime = localStorage.getItem(`video-time-${videoId}`);
      if (savedTime) {
        player.currentTime(parseFloat(savedTime));
      }

      // Save playback position periodically
      player.on('timeupdate', () => {
        const currentTime = player.currentTime() || 0;
        if (currentTime > 0) {
          localStorage.setItem(`video-time-${videoId}`, currentTime.toString());
        }
      });

      // Clear saved position when video ends
      player.on('ended', () => {
        localStorage.removeItem(`video-time-${videoId}`);
      });
    }

    // Cleanup function
    return () => {
      const player = playerRef.current;
      if (player && !player.isDisposed()) {
        player.dispose();
        playerRef.current = null;
      }
    };
  }, []);

  // Update source when src changes
  useEffect(() => {
    const player = playerRef.current;
    if (player && isReady) {
      player.src({
        src: src,
        type: 'application/x-mpegURL',
      });
    }
  }, [src, isReady]);

  return (
    <div className="video-player-wrapper w-full">
      <style jsx global>{`
        .video-js {
          width: 100%;
          height: 100%;
        }
        
        .vjs-big-play-button {
          font-size: 4em;
          line-height: 1.5em;
          height: 1.5em;
          width: 1.5em;
          border-radius: 50%;
          background-color: rgba(217, 119, 6, 0.9);
          border: 0.06666em solid rgba(251, 191, 36, 0.5);
          left: 50%;
          top: 50%;
          transform: translate(-50%, -50%);
        }
        
        .vjs-big-play-button:hover {
          background-color: rgba(217, 119, 6, 1);
        }
        
        .video-js .vjs-control-bar {
          background-color: rgba(251, 191, 36, 0.15);
          backdrop-filter: blur(10px);
        }
        
        .video-js .vjs-progress-control .vjs-progress-holder {
          font-size: 1.7em;
        }
        
        .video-js .vjs-play-progress {
          background-color: rgb(217, 119, 6);
        }
        
        .video-js .vjs-volume-level {
          background-color: rgb(217, 119, 6);
        }
        
        .video-js .vjs-load-progress {
          background: rgba(217, 119, 6, 0.3);
        }
        
        .video-js .vjs-slider {
          background-color: rgba(255, 255, 255, 0.3);
        }
        
        .video-js .vjs-menu-button-popup .vjs-menu {
          background-color: rgba(254, 243, 199, 0.98);
          backdrop-filter: blur(10px);
          color: rgb(120, 53, 15);
        }
        
        .video-js .vjs-menu li.vjs-selected,
        .video-js .vjs-menu li.vjs-selected:focus,
        .video-js .vjs-menu li.vjs-selected:hover {
          background-color: rgb(217, 119, 6);
          color: white;
        }
        
        .video-js .vjs-menu li:focus,
        .video-js .vjs-menu li:hover {
          background-color: rgba(217, 119, 6, 0.3);
        }
        
        .video-js .vjs-remaining-time {
          display: none;
        }
        
        .video-js .vjs-subs-caps-button .vjs-menu-content {
          max-height: 300px;
          overflow-y: auto;
        }
        
        .video-js .vjs-audio-button .vjs-menu-content {
          max-height: 300px;
          overflow-y: auto;
        }
        
        /* Custom styling for quality selector */
        .vjs-quality-selector .vjs-menu {
          max-height: 300px;
          overflow-y: auto;
        }
        
        .video-js .vjs-text-track-display {
          font-size: 1.4em;
          bottom: 3em;
        }
        
        .video-js .vjs-text-track-cue {
          background-color: rgba(0, 0, 0, 0.85);
          padding: 0.3em 0.6em;
          border-radius: 0.3em;
        }
        
        /* Loading spinner */
        .vjs-loading-spinner {
          border-color: rgba(217, 119, 6, 0.3);
          border-top-color: rgb(217, 119, 6);
        }
      `}</style>
      
      <div data-vjs-player className="relative aspect-video bg-amber-950/10 rounded-lg overflow-hidden shadow-xl">
        <div ref={videoRef} />
      </div>
      
      {title && (
        <div className="mt-4">
          <h2 className="text-2xl font-bold text-amber-950">{title}</h2>
        </div>
      )}
    </div>
  );
}
