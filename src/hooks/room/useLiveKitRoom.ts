'use client';

import { useCallback, useEffect, useState } from 'react';
import {
    Room,
    RoomEvent,
    Track,
    LocalParticipant,
    RemoteParticipant,
    Participant,
    ConnectionState,
} from 'livekit-client';

interface UseLiveKitRoomProps {
    token: string | null;
    serverUrl?: string;
    enabled?: boolean;
}

interface UseLiveKitRoomReturn {
    room: Room | null;
    isConnected: boolean;
    isConnecting: boolean;
    connectionState: ConnectionState;
    localParticipant: LocalParticipant | null;
    remoteParticipants: RemoteParticipant[];
    isMuted: boolean;
    isVideoOff: boolean;
    toggleMute: () => Promise<void>;
    toggleVideo: () => Promise<void>;
    disconnect: () => void;
    error: string | null;
}

export function useLiveKitRoom({
    token,
    serverUrl,
    enabled = true,
}: UseLiveKitRoomProps): UseLiveKitRoomReturn {
    const [room, setRoom] = useState<Room | null>(null);
    const [isConnected, setIsConnected] = useState(false);
    const [isConnecting, setIsConnecting] = useState(false);
    const [connectionState, setConnectionState] = useState<ConnectionState>(ConnectionState.Disconnected);
    const [localParticipant, setLocalParticipant] = useState<LocalParticipant | null>(null);
    const [remoteParticipants, setRemoteParticipants] = useState<RemoteParticipant[]>([]);
    const [isMuted, setIsMuted] = useState(true); // Start muted by default
    const [isVideoOff, setIsVideoOff] = useState(true); // Start with video off by default
    const [error, setError] = useState<string | null>(null);

    // Connect to LiveKit room
    useEffect(() => {
        if (!enabled || !token) {
            return;
        }

        const livekitUrl = serverUrl || process.env.NEXT_PUBLIC_LIVEKIT_URL;
        if (!livekitUrl) {
            setError('LiveKit server URL not configured');
            return;
        }

        const newRoom = new Room({
            adaptiveStream: true,
            dynacast: true,
        });

        const handleConnectionStateChanged = (state: ConnectionState) => {
            console.log('LiveKit connection state:', state);
            setConnectionState(state);
            setIsConnected(state === ConnectionState.Connected);
            setIsConnecting(state === ConnectionState.Connecting);
        };

        const handleParticipantConnected = (participant: RemoteParticipant) => {
            console.log('Participant connected:', participant.identity);
            setRemoteParticipants(prev => [...prev, participant]);
        };

        const handleParticipantDisconnected = (participant: RemoteParticipant) => {
            console.log('Participant disconnected:', participant.identity);
            setRemoteParticipants(prev => prev.filter(p => p.sid !== participant.sid));
        };

        const handleLocalTrackPublished = () => {
            updateLocalMediaState(newRoom.localParticipant);
        };

        const handleLocalTrackUnpublished = () => {
            updateLocalMediaState(newRoom.localParticipant);
        };

        const handleTrackMuted = (track: any, participant: Participant) => {
            if (participant === newRoom.localParticipant) {
                updateLocalMediaState(newRoom.localParticipant);
            }
        };

        const handleTrackUnmuted = (track: any, participant: Participant) => {
            if (participant === newRoom.localParticipant) {
                updateLocalMediaState(newRoom.localParticipant);
            }
        };

        const updateLocalMediaState = (local: LocalParticipant) => {
            const audioTrack = local.getTrackPublication(Track.Source.Microphone);
            const videoTrack = local.getTrackPublication(Track.Source.Camera);
            
            setIsMuted(!audioTrack || audioTrack.isMuted || !audioTrack.track);
            setIsVideoOff(!videoTrack || videoTrack.isMuted || !videoTrack.track);
        };

        // Subscribe to events
        newRoom.on(RoomEvent.ConnectionStateChanged, handleConnectionStateChanged);
        newRoom.on(RoomEvent.ParticipantConnected, handleParticipantConnected);
        newRoom.on(RoomEvent.ParticipantDisconnected, handleParticipantDisconnected);
        newRoom.on(RoomEvent.LocalTrackPublished, handleLocalTrackPublished);
        newRoom.on(RoomEvent.LocalTrackUnpublished, handleLocalTrackUnpublished);
        newRoom.on(RoomEvent.TrackMuted, handleTrackMuted);
        newRoom.on(RoomEvent.TrackUnmuted, handleTrackUnmuted);

        // Connect
        setIsConnecting(true);
        setError(null);
        
        newRoom
            .connect(livekitUrl, token)
            .then(() => {
                console.log('Connected to LiveKit room');
                setRoom(newRoom);
                setLocalParticipant(newRoom.localParticipant);
                setRemoteParticipants(Array.from(newRoom.remoteParticipants.values()));
                updateLocalMediaState(newRoom.localParticipant);
            })
            .catch((err) => {
                console.error('Failed to connect to LiveKit:', err);
                setError(err.message || 'Failed to connect to LiveKit');
                setIsConnecting(false);
            });

        return () => {
            newRoom.off(RoomEvent.ConnectionStateChanged, handleConnectionStateChanged);
            newRoom.off(RoomEvent.ParticipantConnected, handleParticipantConnected);
            newRoom.off(RoomEvent.ParticipantDisconnected, handleParticipantDisconnected);
            newRoom.off(RoomEvent.LocalTrackPublished, handleLocalTrackPublished);
            newRoom.off(RoomEvent.LocalTrackUnpublished, handleLocalTrackUnpublished);
            newRoom.off(RoomEvent.TrackMuted, handleTrackMuted);
            newRoom.off(RoomEvent.TrackUnmuted, handleTrackUnmuted);
            
            newRoom.disconnect();
            setRoom(null);
            setIsConnected(false);
            setLocalParticipant(null);
            setRemoteParticipants([]);
        };
    }, [token, serverUrl, enabled]);

    // Toggle microphone
    const toggleMute = useCallback(async () => {
        if (!room || !localParticipant) return;

        try {
            const audioTrack = localParticipant.getTrackPublication(Track.Source.Microphone);
            
            if (!audioTrack || !audioTrack.track) {
                // No audio track, enable microphone
                await localParticipant.setMicrophoneEnabled(true);
                setIsMuted(false);
            } else if (audioTrack.isMuted) {
                // Track exists but is muted
                await audioTrack.unmute();
                setIsMuted(false);
            } else {
                // Track is active, mute it
                await audioTrack.mute();
                setIsMuted(true);
            }
        } catch (err) {
            console.error('Failed to toggle mute:', err);
        }
    }, [room, localParticipant]);

    // Toggle camera
    const toggleVideo = useCallback(async () => {
        if (!room || !localParticipant) return;

        try {
            const videoTrack = localParticipant.getTrackPublication(Track.Source.Camera);
            
            if (!videoTrack || !videoTrack.track) {
                // No video track, enable camera
                await localParticipant.setCameraEnabled(true);
                setIsVideoOff(false);
            } else if (videoTrack.isMuted) {
                // Track exists but is muted
                await videoTrack.unmute();
                setIsVideoOff(false);
            } else {
                // Track is active, mute it
                await videoTrack.mute();
                setIsVideoOff(true);
            }
        } catch (err) {
            console.error('Failed to toggle video:', err);
        }
    }, [room, localParticipant]);

    // Disconnect
    const disconnect = useCallback(() => {
        if (room) {
            room.disconnect();
        }
    }, [room]);

    return {
        room,
        isConnected,
        isConnecting,
        connectionState,
        localParticipant,
        remoteParticipants,
        isMuted,
        isVideoOff,
        toggleMute,
        toggleVideo,
        disconnect,
        error,
    };
}
