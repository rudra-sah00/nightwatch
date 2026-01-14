'use client';

import { useEffect, useRef, useState } from 'react';
import { Room, RoomEvent, Track } from 'livekit-client';

interface LiveKitRoomProps {
    token: string;
    serverUrl: string;
    onConnected?: () => void;
    onDisconnected?: () => void;
}

export function LiveKitRoom({ token, serverUrl, onConnected, onDisconnected }: LiveKitRoomProps) {
    const roomRef = useRef<Room | null>(null);
    const [isConnecting, setIsConnecting] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const audioElementRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const connectToRoom = async () => {
            try {
                setIsConnecting(true);
                setError(null);

                // Create room instance
                const room = new Room();
                roomRef.current = room;

                // Set up event listeners
                room.on(RoomEvent.TrackSubscribed, (track) => {
                    if (track.kind === Track.Kind.Audio || track.kind === Track.Kind.Video) {
                        const element = track.attach();
                        audioElementRef.current?.appendChild(element);
                    }
                });

                room.on(RoomEvent.TrackUnsubscribed, (track) => {
                    track.detach();
                });

                room.on(RoomEvent.Connected, () => {
                    // Room connected successfully
                    setIsConnecting(false);
                    onConnected?.();
                });

                room.on(RoomEvent.Disconnected, () => {
                    // Room disconnected
                    onDisconnected?.();
                });

                // Connect to room
                await room.connect(serverUrl, token);

                // Enable camera and microphone
                await room.localParticipant.enableCameraAndMicrophone();

            } catch (err) {
                console.error('Failed to connect to LiveKit:', err);
                setError(err instanceof Error ? err.message : 'Failed to connect');
                setIsConnecting(false);
            }
        };

        connectToRoom();

        // Cleanup on unmount
        return () => {
            if (roomRef.current) {
                roomRef.current.disconnect();
                roomRef.current = null;
            }
        };
    }, [token, serverUrl, onConnected, onDisconnected]);

    if (error) {
        return (
            <div className="text-red-400 text-sm">
                Failed to connect: {error}
            </div>
        );
    }

    return (
        <div>
            {isConnecting && (
                <div className="text-zinc-400 text-sm">
                    Connecting to room...
                </div>
            )}
            {/* Audio/video elements will be attached here */}
            <div ref={audioElementRef} className="hidden" />
        </div>
    );
}
