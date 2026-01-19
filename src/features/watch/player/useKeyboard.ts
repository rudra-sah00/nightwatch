'use client';

import { useCallback, useEffect, MutableRefObject } from 'react';
import { PlayerAction } from './types';

interface UseKeyboardOptions {
    videoRef: MutableRefObject<HTMLVideoElement | null>;
    containerRef: MutableRefObject<HTMLDivElement | null>;
    dispatch: React.Dispatch<PlayerAction>;
    isFullscreen: boolean;
    onBack: () => void;
}

export function useKeyboard({ videoRef, containerRef, dispatch, isFullscreen, onBack }: UseKeyboardOptions) {
    const seek = useCallback((seconds: number) => {
        const video = videoRef.current;
        if (!video) return;
        video.currentTime = Math.max(0, Math.min(video.duration, video.currentTime + seconds));
    }, [videoRef]);

    const adjustVolume = useCallback((delta: number) => {
        const video = videoRef.current;
        if (!video) return;
        const newVolume = Math.max(0, Math.min(1, video.volume + delta));
        video.volume = newVolume;
        dispatch({ type: 'SET_VOLUME', volume: newVolume });
    }, [videoRef, dispatch]);

    const togglePlay = useCallback(() => {
        const video = videoRef.current;
        if (!video) return;
        if (video.paused) {
            video.play();
        } else {
            video.pause();
        }
    }, [videoRef]);

    const toggleMute = useCallback(() => {
        const video = videoRef.current;
        if (!video) return;
        video.muted = !video.muted;
        dispatch({ type: 'TOGGLE_MUTE' });
    }, [videoRef, dispatch]);

    const toggleFullscreen = useCallback(async () => {
        if (!containerRef.current) return;

        try {
            if (document.fullscreenElement) {
                await document.exitFullscreen();
            } else {
                await containerRef.current.requestFullscreen();
            }
        } catch (error) {
            console.error('Fullscreen error:', error);
        }
    }, [containerRef]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Ignore if typing in an input
            if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
                return;
            }

            switch (e.code) {
                case 'Space':
                case 'KeyK':
                    e.preventDefault();
                    togglePlay();
                    dispatch({ type: 'SHOW_CONTROLS' });
                    break;
                case 'ArrowLeft':
                case 'KeyJ':
                    e.preventDefault();
                    seek(-10);
                    dispatch({ type: 'SHOW_CONTROLS' });
                    break;
                case 'ArrowRight':
                case 'KeyL':
                    e.preventDefault();
                    seek(10);
                    dispatch({ type: 'SHOW_CONTROLS' });
                    break;
                case 'ArrowUp':
                    e.preventDefault();
                    adjustVolume(0.1);
                    dispatch({ type: 'SHOW_CONTROLS' });
                    break;
                case 'ArrowDown':
                    e.preventDefault();
                    adjustVolume(-0.1);
                    dispatch({ type: 'SHOW_CONTROLS' });
                    break;
                case 'KeyM':
                    toggleMute();
                    dispatch({ type: 'SHOW_CONTROLS' });
                    break;
                case 'KeyF':
                    toggleFullscreen();
                    break;
                case 'Escape':
                    if (isFullscreen) {
                        document.exitFullscreen();
                    } else {
                        onBack();
                    }
                    break;
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [togglePlay, seek, adjustVolume, toggleMute, toggleFullscreen, isFullscreen, onBack, dispatch]);

    return { togglePlay, toggleMute, toggleFullscreen, seek, adjustVolume };
}
