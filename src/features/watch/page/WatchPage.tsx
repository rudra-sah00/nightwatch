'use client';

import React, { useReducer, useRef, useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';

// Player components
import { VideoElement } from '../player/VideoElement';
import { useHls } from '../player/useHls';
import { useKeyboard } from '../player/useKeyboard';
import { useFullscreen } from '../player/useFullscreen';
import { useWatchProgress } from '../player/useWatchProgress';
import { playerReducer, initialPlayerState, VideoMetadata, SubtitleTrack } from '../player/types';

// Controls
import { ControlBar } from '../controls/ControlBar';
import { CenterPlayButton } from '../controls/PlayPause';

// Overlays
import { LoadingOverlay } from '../overlays/LoadingOverlay';
import { BufferingOverlay } from '../overlays/BufferingOverlay';
import { ErrorOverlay } from '../overlays/ErrorOverlay';

interface WatchPageProps {
    movieId: string;
    streamUrl: string | null;
    metadata: VideoMetadata;
    captionUrl?: string | null;
    spriteVtt?: string;
    description?: string;
}

export function WatchPage({ movieId, streamUrl, metadata, captionUrl, spriteVtt, description }: WatchPageProps) {
    const router = useRouter();
    const videoRef = useRef<HTMLVideoElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    const [state, dispatch] = useReducer(playerReducer, initialPlayerState);
    const [retryCount, setRetryCount] = useState(0);

    // Initialize HLS
    const { setQuality, setAudioTrack } = useHls({
        videoRef,
        streamUrl,
        dispatch,
    });

    // Load subtitle tracks from captionUrl
    useEffect(() => {
        if (!captionUrl || !videoRef.current) return;

        const video = videoRef.current;

        // Create subtitle track for state
        const subtitleTrack: SubtitleTrack = {
            id: 'en',
            label: 'English',
            language: 'en',
            src: captionUrl,
        };
        dispatch({ type: 'SET_SUBTITLE_TRACKS', subtitleTracks: [subtitleTrack] });

        // Check if track already exists
        const existingTrackEl = video.querySelector('track[data-subtitle="true"]');
        if (existingTrackEl) {
            return; // Track already added
        }

        // Create and add new track element
        const trackElement = document.createElement('track');
        trackElement.kind = 'subtitles';
        trackElement.label = 'English';
        trackElement.srclang = 'en';
        trackElement.src = captionUrl;
        trackElement.setAttribute('data-subtitle', 'true');
        // Don't set default - let user enable manually

        // Add the track to video
        video.appendChild(trackElement);

        // Listen for the track to load
        const handleTrackLoad = () => {
            console.log('Subtitle track loaded successfully');
            // Verify textTracks is available
            if (video.textTracks && video.textTracks.length > 0) {
                console.log('TextTracks available:', video.textTracks.length);
            }
        };

        const handleTrackError = () => {
            console.error('Failed to load subtitle track:', captionUrl);
        };

        trackElement.addEventListener('load', handleTrackLoad);
        trackElement.addEventListener('error', handleTrackError);

        return () => {
            trackElement.removeEventListener('load', handleTrackLoad);
            trackElement.removeEventListener('error', handleTrackError);
            // Cleanup track on unmount
            const track = video.querySelector('track[data-subtitle="true"]');
            if (track) {
                video.removeChild(track);
            }
        };
    }, [captionUrl]);

    // Handle resume progress
    const handleProgressLoaded = useCallback((seconds: number) => {
        if (seconds > 0 && videoRef.current) {
            videoRef.current.currentTime = seconds;
        }
    }, []);

    // Track watch progress
    useWatchProgress({
        videoRef,
        metadata,
        isPlaying: state.isPlaying && !state.isPaused && !state.isBuffering,
        onProgressLoaded: handleProgressLoaded,
    });

    // Handle going back
    const handleBack = useCallback(() => {
        router.back();
    }, [router]);

    // Keyboard controls
    const { togglePlay, toggleMute, toggleFullscreen, seek } = useKeyboard({
        videoRef,
        containerRef,
        dispatch,
        isFullscreen: state.isFullscreen,
        onBack: handleBack,
    });

    // Fullscreen
    useFullscreen({
        containerRef,
        dispatch,
    });

    // Auto-hide controls
    const showControls = useCallback(() => {
        dispatch({ type: 'SHOW_CONTROLS' });

        if (controlsTimeoutRef.current) {
            clearTimeout(controlsTimeoutRef.current);
        }

        controlsTimeoutRef.current = setTimeout(() => {
            if (state.isPlaying && !state.isPaused) {
                dispatch({ type: 'HIDE_CONTROLS' });
            }
        }, 3000);
    }, [state.isPlaying, state.isPaused]);

    // Show controls on pause
    useEffect(() => {
        if (state.isPaused) {
            dispatch({ type: 'SHOW_CONTROLS' });
        }
    }, [state.isPaused]);

    // Control handlers
    const handleSeek = useCallback((time: number) => {
        if (videoRef.current) {
            videoRef.current.currentTime = time;
        }
        showControls();
    }, [showControls]);

    const handleSkip = useCallback((seconds: number) => {
        seek(seconds);
        showControls();
    }, [seek, showControls]);

    const handleVolumeChange = useCallback((volume: number) => {
        if (videoRef.current) {
            videoRef.current.volume = volume;
            videoRef.current.muted = volume === 0;
        }
        dispatch({ type: 'SET_VOLUME', volume });
        showControls();
    }, [showControls]);

    const handleMuteToggle = useCallback(() => {
        if (videoRef.current) {
            videoRef.current.muted = !videoRef.current.muted;
        }
        toggleMute();
        showControls();
    }, [toggleMute, showControls]);

    const handleTogglePlay = useCallback(() => {
        togglePlay();
        showControls();
    }, [togglePlay, showControls]);

    const handleRetry = useCallback(() => {
        setRetryCount(prev => prev + 1);
        dispatch({ type: 'SET_ERROR', error: null });
        dispatch({ type: 'SET_LOADING', isLoading: true });
    }, []);

    const handleVideoClick = useCallback(() => {
        handleTogglePlay();
    }, [handleTogglePlay]);

    // Quality change handler
    const handleQualityChange = useCallback((quality: string) => {
        if (quality === 'auto') {
            setQuality(-1); // Auto quality
        } else {
            // Find quality level index
            const levelIndex = state.qualities.findIndex(q => q.label === quality);
            if (levelIndex !== -1) {
                setQuality(levelIndex);
            }
        }
        dispatch({ type: 'SET_CURRENT_QUALITY', quality });
        showControls();
    }, [setQuality, state.qualities, showControls]);

    // Playback rate handler
    const handlePlaybackRateChange = useCallback((rate: number) => {
        if (videoRef.current) {
            videoRef.current.playbackRate = rate;
        }
        dispatch({ type: 'SET_PLAYBACK_RATE', rate });
        showControls();
    }, [showControls]);

    // Audio track change handler
    const handleAudioChange = useCallback((trackId: string) => {
        setAudioTrack(trackId);
        dispatch({ type: 'SET_CURRENT_AUDIO_TRACK', trackId });
        showControls();
    }, [setAudioTrack, showControls]);

    // Subtitle track change handler
    const handleSubtitleChange = useCallback((trackId: string | null) => {
        if (videoRef.current && videoRef.current.textTracks) {
            const textTracks = videoRef.current.textTracks;
            console.log('Subtitle change requested:', trackId, 'Available tracks:', textTracks.length);

            // TextTrackList is not an array, use for loop
            for (let i = 0; i < textTracks.length; i++) {
                const track = textTracks[i];
                console.log(`Track ${i}: label=${track.label}, language=${track.language}, mode=${track.mode}`);

                if (trackId === null || trackId === 'off') {
                    // Turn off all subtitles
                    track.mode = 'disabled';
                } else {
                    // Enable if matches - check various conditions
                    const matches =
                        track.language === trackId ||
                        track.label?.toLowerCase().includes(trackId.toLowerCase()) ||
                        trackId === 'en'; // Default English

                    if (matches) {
                        track.mode = 'showing';
                        console.log('Enabled subtitle track:', track.label, track.language);
                    } else {
                        track.mode = 'disabled';
                    }
                }
            }
        }
        dispatch({ type: 'SET_CURRENT_SUBTITLE_TRACK', trackId });
        showControls();
    }, [showControls]);

    // Cleanup
    useEffect(() => {
        return () => {
            if (controlsTimeoutRef.current) {
                clearTimeout(controlsTimeoutRef.current);
            }
        };
    }, []);

    // Extended metadata for pause overlay
    const pauseOverlayMetadata = {
        title: metadata.title,
        type: metadata.type,
        season: metadata.season,
        episode: metadata.episode,
        description: description || metadata.description,
        year: metadata.year,
        posterUrl: metadata.posterUrl,
    };

    return (
        <div
            ref={containerRef}
            className={cn(
                "relative w-full h-screen bg-black overflow-hidden select-none",
                "cursor-none",
                state.showControls && "cursor-auto"
            )}
            onMouseMove={showControls}
            onMouseEnter={showControls}
        >
            {/* Video Element */}
            <VideoElement
                ref={videoRef}
                dispatch={dispatch}
                onClick={handleVideoClick}
            />

            {/* Loading Overlay */}
            <LoadingOverlay isVisible={state.isLoading} />

            {/* Buffering Overlay */}
            <BufferingOverlay isVisible={state.isBuffering && !state.isLoading} />

            {/* Error Overlay */}
            <ErrorOverlay
                isVisible={!!state.error}
                message={state.error || 'An error occurred'}
                onRetry={handleRetry}
                onBack={handleBack}
            />

            {/* Center Play Button - Netflix style pause overlay with movie info */}
            <CenterPlayButton
                isPlaying={state.isPlaying}
                onToggle={handleTogglePlay}
                metadata={pauseOverlayMetadata}
            />

            {/* Control Bar */}
            <ControlBar
                state={state}
                metadata={metadata}
                spriteVtt={spriteVtt}
                onTogglePlay={handleTogglePlay}
                onSeek={handleSeek}
                onSkip={handleSkip}
                onVolumeChange={handleVolumeChange}
                onMuteToggle={handleMuteToggle}
                onFullscreenToggle={toggleFullscreen}
                onBack={handleBack}
                onQualityChange={handleQualityChange}
                onPlaybackRateChange={handlePlaybackRateChange}
                onAudioChange={handleAudioChange}
                onSubtitleChange={handleSubtitleChange}
            />
        </div>
    );
}

