'use client';

import { useEffect, MutableRefObject } from 'react';
import { PlayerAction } from './types';

interface UseFullscreenOptions {
    containerRef: MutableRefObject<HTMLDivElement | null>;
    dispatch: React.Dispatch<PlayerAction>;
}

export function useFullscreen({ containerRef, dispatch }: UseFullscreenOptions) {
    useEffect(() => {
        const handleFullscreenChange = () => {
            const isFullscreen = !!document.fullscreenElement;
            dispatch({ type: 'SET_FULLSCREEN', isFullscreen });
        };

        document.addEventListener('fullscreenchange', handleFullscreenChange);
        return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
    }, [dispatch]);

    const enterFullscreen = async () => {
        if (!containerRef.current) return;
        try {
            await containerRef.current.requestFullscreen();
        } catch (error) {
            console.error('Failed to enter fullscreen:', error);
        }
    };

    const exitFullscreen = async () => {
        try {
            await document.exitFullscreen();
        } catch (error) {
            console.error('Failed to exit fullscreen:', error);
        }
    };

    const toggleFullscreen = async () => {
        if (document.fullscreenElement) {
            await exitFullscreen();
        } else {
            await enterFullscreen();
        }
    };

    return { enterFullscreen, exitFullscreen, toggleFullscreen };
}
