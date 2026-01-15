'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { Room as LiveKitRoom, RoomEvent, Track, ConnectionState } from 'livekit-client';

interface UseLiveKitProps {
    livekitToken?: string;
    localVideoRef: React.RefObject<HTMLVideoElement | null>;
    audioElementRef: React.RefObject<HTMLDivElement | null>;
}

interface UseLiveKitReturn {
    roomRef: React.MutableRefObject<LiveKitRoom | null>;
    isConnected: boolean;
    connectionState: ConnectionState | null;
    cleanup: () => Promise<void>;
}

// Track connections globally to survive StrictMode remounts
const activeConnections = new Map<string, LiveKitRoom>();
const connectionAttempts = new Set<string>();

export function useLiveKit({ livekitToken, localVideoRef, audioElementRef }: UseLiveKitProps): UseLiveKitReturn {
    const livekitRoomRef = useRef<LiveKitRoom | null>(null);
    const [isConnected, setIsConnected] = useState(false);
    const [connectionState, setConnectionState] = useState<ConnectionState | null>(null);

    const attachLocalVideo = useCallback((room: LiveKitRoom) => {
        const videoPublication = Array.from(room.localParticipant.videoTrackPublications.values())[0];
        if (videoPublication?.track && localVideoRef.current) {
            videoPublication.track.attach(localVideoRef.current);
            return true;
        }
        return false;
    }, [localVideoRef]);

    useEffect(() => {
        if (!livekitToken) return;

        // Create a unique key for this token
        const tokenKey = livekitToken.substring(0, 50);

        // Check if we already have an active connection for this token
        const existingRoom = activeConnections.get(tokenKey);
        if (existingRoom && existingRoom.state === 'connected') {
            livekitRoomRef.current = existingRoom;
            setIsConnected(true);
            setConnectionState(ConnectionState.Connected);

            // Reattach local video
            setTimeout(() => attachLocalVideo(existingRoom), 100);
            return;
        }

        // Check if connection is already in progress
        if (connectionAttempts.has(tokenKey)) {
            return;
        }

        let isCleanedUp = false;
        connectionAttempts.add(tokenKey);

        const connectToLiveKit = async () => {
            // Small delay to handle StrictMode's rapid unmount/remount
            await new Promise(resolve => setTimeout(resolve, 100));

            if (isCleanedUp) {
                connectionAttempts.delete(tokenKey);
                return;
            }

            try {
                const livekitRoom = new LiveKitRoom({
                    // Adaptive streaming for better performance
                    adaptiveStream: true,
                    dynacast: true,
                });

                if (isCleanedUp) {
                    connectionAttempts.delete(tokenKey);
                    return;
                }

                livekitRoomRef.current = livekitRoom;
                activeConnections.set(tokenKey, livekitRoom);

                // Track connection state
                livekitRoom.on(RoomEvent.ConnectionStateChanged, (state) => {
                    if (!isCleanedUp) {
                        setConnectionState(state);
                        setIsConnected(state === ConnectionState.Connected);
                    }
                });

                // Handle track subscription
                livekitRoom.on(RoomEvent.TrackSubscribed, (track) => {
                    if (track.kind === Track.Kind.Audio || track.kind === Track.Kind.Video) {
                        const element = track.attach();
                        audioElementRef.current?.appendChild(element);
                    }
                });

                livekitRoom.on(RoomEvent.TrackUnsubscribed, (track) => {
                    track.detach();
                });

                // Connect to room
                const livekitUrl = process.env.NEXT_PUBLIC_LIVEKIT_URL || 'ws://localhost:7880';
                await livekitRoom.connect(livekitUrl, livekitToken);

                if (isCleanedUp) {
                    livekitRoom.disconnect();
                    activeConnections.delete(tokenKey);
                    connectionAttempts.delete(tokenKey);
                    return;
                }

                // Enable microphone and camera after connection
                await livekitRoom.localParticipant.setMicrophoneEnabled(true);
                await livekitRoom.localParticipant.setCameraEnabled(true);

                // Attach local video with retries
                let attempts = 0;
                const maxAttempts = 15;
                const tryAttach = () => {
                    attempts++;
                    if (!attachLocalVideo(livekitRoom) && attempts < maxAttempts && !isCleanedUp) {
                        setTimeout(tryAttach, 300);
                    }
                };
                setTimeout(tryAttach, 500);

                connectionAttempts.delete(tokenKey);

            } catch (err) {
                // Only log if it's not a user-initiated disconnect
                if (!isCleanedUp && !(err instanceof Error && err.message.includes('disconnect'))) {
                    console.error('Failed to connect to LiveKit:', err);
                }
                connectionAttempts.delete(tokenKey);
                activeConnections.delete(tokenKey);
                if (livekitRoomRef.current && !isCleanedUp) {
                    livekitRoomRef.current = null;
                }
            }
        };

        connectToLiveKit();

        return () => {
            isCleanedUp = true;

            // Don't immediately disconnect - let the connection persist briefly
            // This helps with StrictMode which remounts immediately
            const room = livekitRoomRef.current;
            if (room) {
                // Delay cleanup to allow remount to reuse connection
                setTimeout(() => {
                    // Only disconnect if no new component has claimed this connection
                    if (activeConnections.get(tokenKey) === room && room.state !== 'connected') {
                        room.disconnect();
                        activeConnections.delete(tokenKey);
                    }
                }, 200);
            }
            connectionAttempts.delete(tokenKey);
            setIsConnected(false);
            setConnectionState(null);
        };
    }, [livekitToken, localVideoRef, audioElementRef, attachLocalVideo]);

    // Cleanup function to properly stop all tracks and disconnect
    const cleanup = useCallback(async () => {
        const room = livekitRoomRef.current;
        if (!room) return;

        try {
            // Stop all local tracks
            const tracks = Array.from(room.localParticipant.trackPublications.values());
            for (const publication of tracks) {
                if (publication.track) {
                    publication.track.stop();
                    await room.localParticipant.unpublishTrack(publication.track);
                }
            }

            // Disconnect from room
            await room.disconnect();
            
            // Clear from active connections
            const tokenKey = livekitToken?.substring(0, 50);
            if (tokenKey) {
                activeConnections.delete(tokenKey);
            }
        } catch (err) {
            console.error('Error during cleanup:', err);
        }

        livekitRoomRef.current = null;
        setIsConnected(false);
        setConnectionState(null);
    }, [livekitToken]);

    return { roomRef: livekitRoomRef, isConnected, connectionState, cleanup };
}
