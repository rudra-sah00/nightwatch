'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { getRoom, updatePlaybackState, PlaybackState, Room } from '@/lib/api';

interface UseSyncOptions {
    roomCode: string;
    canControl: boolean;
    onPlaybackUpdate?: (playback: PlaybackState) => void;
}

interface SyncState {
    room: Room | null;
    playback: PlaybackState | null;
    isLoading: boolean;
    error: string | null;
}

/**
 * Real-time playback sync hook
 * - Polls server every 2 seconds for playback state
 * - Host/Admin can update playback (play/pause/seek)
 * - All participants sync to host's state
 */
export function usePlaybackSync({ roomCode, canControl, onPlaybackUpdate }: UseSyncOptions) {
    const [state, setState] = useState<SyncState>({
        room: null,
        playback: null,
        isLoading: true,
        error: null,
    });

    const lastUpdateRef = useRef<string>('');
    const intervalRef = useRef<NodeJS.Timeout | null>(null);

    // Fetch room state
    const fetchState = useCallback(async () => {
        const result = await getRoom(roomCode);

        if (result.data) {
            const { room } = result.data;
            setState(prev => ({
                ...prev,
                room,
                playback: room.playback,
                isLoading: false,
                error: null,
            }));

            // Notify if playback changed
            if (room.playback.updated_at !== lastUpdateRef.current) {
                lastUpdateRef.current = room.playback.updated_at;
                onPlaybackUpdate?.(room.playback);
            }
        } else {
            setState(prev => ({ ...prev, error: result.error || 'Failed to fetch', isLoading: false }));
        }
    }, [roomCode, onPlaybackUpdate]);

    // Start polling - use ref to avoid lint warning about setState in effect
    useEffect(() => {
        // Initial fetch via microtask to avoid synchronous setState
        queueMicrotask(() => {
            fetchState();
        });
        
        intervalRef.current = setInterval(fetchState, 2000); // Poll every 2s

        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
        };
    }, [fetchState]);

    // ============ Control Functions (Host/Admin only) ============

    const play = useCallback(async (currentTime: number) => {
        if (!canControl) return;

        const result = await updatePlaybackState(roomCode, true, currentTime);
        if (result.data) {
            setState(prev => ({ ...prev, playback: result.data!.playback }));
        }
    }, [roomCode, canControl]);

    const pause = useCallback(async (currentTime: number) => {
        if (!canControl) return;

        const result = await updatePlaybackState(roomCode, false, currentTime);
        if (result.data) {
            setState(prev => ({ ...prev, playback: result.data!.playback }));
        }
    }, [roomCode, canControl]);

    const seek = useCallback(async (currentTime: number, isPlaying: boolean) => {
        if (!canControl) return;

        const result = await updatePlaybackState(roomCode, isPlaying, currentTime);
        if (result.data) {
            setState(prev => ({ ...prev, playback: result.data!.playback }));
        }
    }, [roomCode, canControl]);

    const setPlaybackRate = useCallback(async (rate: number, currentTime: number, isPlaying: boolean) => {
        if (!canControl) return;

        const result = await updatePlaybackState(roomCode, isPlaying, currentTime, rate);
        if (result.data) {
            setState(prev => ({ ...prev, playback: result.data!.playback }));
        }
    }, [roomCode, canControl]);

    return {
        ...state,
        play,
        pause,
        seek,
        setPlaybackRate,
        refresh: fetchState,
    };
}
