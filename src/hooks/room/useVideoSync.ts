'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import { useRoom } from '@/providers/RoomProvider';
import { updatePlaybackState } from '@/services/api/rooms';

export interface PlaybackSyncState {
    isPlaying: boolean;
    currentTime: number;
    playbackRate: number;
    updatedBy: string;
}

interface UseVideoSyncOptions {
    videoRef: React.RefObject<HTMLVideoElement | null>;
    enabled: boolean;
    isHost: boolean;
    roomCode: string;
}

interface UseVideoSyncReturn {
    // Sync state
    syncState: PlaybackSyncState | null;
    isSyncing: boolean;
    
    // Host controls (only work if isHost)
    hostPlay: () => void;
    hostPause: () => void;
    hostSeek: (time: number) => void;
    hostSetPlaybackRate: (rate: number) => void;
    
    // For players - whether controls should be locked
    controlsLocked: boolean;
}

// Tolerance for sync (don't resync if within this threshold)
const SYNC_TOLERANCE_SECONDS = 2;
// How often host broadcasts their position
const HOST_SYNC_INTERVAL_MS = 5000;
// Debounce for seek operations
const SEEK_DEBOUNCE_MS = 500;

export function useVideoSync({
    videoRef,
    enabled,
    isHost,
    roomCode,
}: UseVideoSyncOptions): UseVideoSyncReturn {
    const { currentRoom } = useRoom();
    const [syncState, setSyncState] = useState<PlaybackSyncState | null>(null);
    const [isSyncing, setIsSyncing] = useState(false);
    
    // Refs for managing sync without causing re-renders
    const lastSyncRef = useRef<number>(0);
    const seekTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const syncIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const isSeekingRef = useRef(false);
    
    // Store pending sync state if video isn't ready yet
    const pendingSyncRef = useRef<PlaybackSyncState | null>(null);
    const [videoReady, setVideoReady] = useState(false);

    // Broadcast playback state to server (host only)
    const broadcastState = useCallback(async (isPlaying: boolean, currentTime: number, playbackRate: number = 1) => {
        if (!enabled || !roomCode) return;
        
        try {
            await updatePlaybackState(roomCode, isPlaying, currentTime, playbackRate);
        } catch (error) {
            console.error('Failed to broadcast playback state:', error);
        }
    }, [enabled, roomCode]);

    // Host controls
    const hostPlay = useCallback(() => {
        if (!isHost || !videoRef.current) return;
        const video = videoRef.current;
        video.play();
        broadcastState(true, video.currentTime, video.playbackRate);
    }, [isHost, videoRef, broadcastState]);

    const hostPause = useCallback(() => {
        if (!isHost || !videoRef.current) return;
        const video = videoRef.current;
        video.pause();
        broadcastState(false, video.currentTime, video.playbackRate);
    }, [isHost, videoRef, broadcastState]);

    const hostSeek = useCallback((time: number) => {
        if (!isHost || !videoRef.current) return;
        
        // Debounce seek operations
        if (seekTimeoutRef.current) {
            clearTimeout(seekTimeoutRef.current);
        }
        
        isSeekingRef.current = true;
        const video = videoRef.current;
        video.currentTime = time;
        
        seekTimeoutRef.current = setTimeout(() => {
            isSeekingRef.current = false;
            broadcastState(!video.paused, time, video.playbackRate);
        }, SEEK_DEBOUNCE_MS);
    }, [isHost, videoRef, broadcastState]);

    const hostSetPlaybackRate = useCallback((rate: number) => {
        if (!isHost || !videoRef.current) return;
        const video = videoRef.current;
        video.playbackRate = rate;
        broadcastState(!video.paused, video.currentTime, rate);
    }, [isHost, videoRef, broadcastState]);

    // Handle incoming sync state (for non-host participants)
    const handleSyncState = useCallback((state: PlaybackSyncState) => {
        console.log('[VideoSync] handleSyncState called:', { enabled, isHost, hasVideo: !!videoRef.current, readyState: videoRef.current?.readyState, state });
        
        if (!enabled || isHost) {
            console.log('[VideoSync] Skipping - enabled:', enabled, 'isHost:', isHost);
            return;
        }
        
        const video = videoRef.current;
        
        // If video isn't ready, store for later
        if (!video || video.readyState < 2) {
            console.log('[VideoSync] Video not ready, storing pending sync:', state);
            pendingSyncRef.current = state;
            setSyncState(state);
            return;
        }
        
        console.log('[VideoSync] Applying sync state:', state);
        setIsSyncing(true);
        
        // Sync playback rate
        if (video.playbackRate !== state.playbackRate) {
            video.playbackRate = state.playbackRate;
        }
        
        // Sync play/pause state
        if (state.isPlaying && video.paused) {
            console.log('[VideoSync] Playing video');
            video.play().catch((e) => console.error('[VideoSync] Play failed:', e));
        } else if (!state.isPlaying && !video.paused) {
            console.log('[VideoSync] Pausing video');
            video.pause();
        }
        
        // Sync position if needed (with tolerance)
        const timeDiff = Math.abs(video.currentTime - state.currentTime);
        if (timeDiff > SYNC_TOLERANCE_SECONDS) {
            video.currentTime = state.currentTime;
        }
        
        setSyncState(state);
        setIsSyncing(false);
    }, [enabled, videoRef, isHost]);

    // Periodic sync for host - broadcast position every few seconds
    useEffect(() => {
        if (!enabled || !isHost || !videoRef.current) return;
        
        const video = videoRef.current;
        
        // Set up periodic sync
        syncIntervalRef.current = setInterval(() => {
            if (!isSeekingRef.current && !video.paused) {
                broadcastState(!video.paused, video.currentTime, video.playbackRate);
            }
        }, HOST_SYNC_INTERVAL_MS);
        
        return () => {
            if (syncIntervalRef.current) {
                clearInterval(syncIntervalRef.current);
            }
        };
    }, [enabled, isHost, videoRef, broadcastState]);

    // Watch for video becoming ready and apply pending sync
    useEffect(() => {
        if (!enabled || isHost || !videoRef.current) return;
        
        const video = videoRef.current;
        
        const handleCanPlay = () => {
            console.log('[VideoSync] Video can play, checking for pending sync');
            setVideoReady(true);
            
            // Apply pending sync state if any
            if (pendingSyncRef.current) {
                console.log('[VideoSync] Applying pending sync:', pendingSyncRef.current);
                const state = pendingSyncRef.current;
                pendingSyncRef.current = null;
                
                // Sync playback rate
                if (video.playbackRate !== state.playbackRate) {
                    video.playbackRate = state.playbackRate;
                }
                
                // Sync position
                const timeDiff = Math.abs(video.currentTime - state.currentTime);
                if (timeDiff > SYNC_TOLERANCE_SECONDS) {
                    video.currentTime = state.currentTime;
                }
                
                // Sync play/pause state
                if (state.isPlaying && video.paused) {
                    video.play().catch(() => {});
                } else if (!state.isPlaying && !video.paused) {
                    video.pause();
                }
            } else if (syncState?.isPlaying) {
                // No pending but we have sync state saying play
                console.log('[VideoSync] Video ready, syncState says play');
                video.play().catch(() => {});
            }
        };
        
        // If video is already ready, call handler
        if (video.readyState >= 2) {
            handleCanPlay();
        } else {
            video.addEventListener('canplay', handleCanPlay);
        }
        
        return () => {
            video.removeEventListener('canplay', handleCanPlay);
        };
    }, [enabled, isHost, videoRef, syncState]);

    // Clean up on unmount
    useEffect(() => {
        return () => {
            if (seekTimeoutRef.current) {
                clearTimeout(seekTimeoutRef.current);
            }
            if (syncIntervalRef.current) {
                clearInterval(syncIntervalRef.current);
            }
        };
    }, []);

    // Initialize sync state from room's playback state (sets syncState even before video is ready)
    useEffect(() => {
        if (!enabled || !currentRoom?.playback || isHost) return;
        
        const playback = currentRoom.playback;
        
        // Calculate how much time has passed since last update
        const updatedAt = new Date(playback.updated_at).getTime();
        const elapsed = (Date.now() - updatedAt) / 1000;
        
        // Set initial position (add elapsed time if playing)
        let targetTime = playback.current_time ?? 0;
        if (playback.is_playing) {
            targetTime += elapsed;
        }
        
        // Set initial sync state - this will be applied when video is ready
        const initialState: PlaybackSyncState = {
            isPlaying: playback.is_playing,
            currentTime: targetTime,
            playbackRate: playback.playback_rate ?? 1,
            updatedBy: playback.updated_by ?? '',
        };
        
        console.log('[VideoSync] Setting initial sync state from room:', initialState);
        setSyncState(initialState);
        pendingSyncRef.current = initialState;
    }, [enabled, currentRoom?.playback, isHost]);

    // Expose sync handler for WebSocket events
    useEffect(() => {
        // This will be connected to WebSocket events from useRoomEvents
        // The parent component should call handleSyncState when receiving PlaybackUpdate events
        (window as any).__videoSyncHandler = handleSyncState;
        
        // Check if there's a pending sync state that arrived before this handler was registered
        const pendingState = (window as any).__pendingSyncState;
        if (pendingState && !isHost) {
            console.log('[VideoSync] Found pending sync state, applying:', pendingState);
            handleSyncState(pendingState);
            delete (window as any).__pendingSyncState;
        }
        
        return () => {
            delete (window as any).__videoSyncHandler;
        };
    }, [handleSyncState, isHost]);

    return {
        syncState,
        isSyncing,
        hostPlay,
        hostPause,
        hostSeek,
        hostSetPlaybackRate,
        // Controls locked only if non-host AND host hasn't started playing yet
        controlsLocked: enabled && !isHost && !syncState?.isPlaying && !videoReady,
    };
}
