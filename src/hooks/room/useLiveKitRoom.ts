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
    TrackPublication,
    RemoteTrackPublication,
} from 'livekit-client';

interface UseLiveKitRoomProps {
    token: string | null;
    serverUrl?: string;
    enabled?: boolean;
}

interface ParticipantState {
    participant: Participant;
    isMuted: boolean;
    isVideoOff: boolean;
    isSpeaking: boolean;
}

interface UseLiveKitRoomReturn {
    room: Room | null;
    isConnected: boolean;
    isConnecting: boolean;
    connectionState: ConnectionState;
    localParticipant: LocalParticipant | null;
    remoteParticipants: RemoteParticipant[];
    participantStates: Map<string, ParticipantState>;
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
    const [participantStates, setParticipantStates] = useState<Map<string, ParticipantState>>(new Map());
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
            console.log('Local track published');
            updateLocalMediaState(newRoom.localParticipant);
            updateParticipantStates(newRoom);
        };

        const handleLocalTrackUnpublished = () => {
            console.log('Local track unpublished');
            updateLocalMediaState(newRoom.localParticipant);
            updateParticipantStates(newRoom);
        };

        const handleTrackMuted = (track: any, participant: Participant) => {
            if (participant === newRoom.localParticipant) {
                updateLocalMediaState(newRoom.localParticipant);
            }
            updateParticipantStates(newRoom);
        };

        const handleTrackUnmuted = (track: any, participant: Participant) => {
            if (participant === newRoom.localParticipant) {
                updateLocalMediaState(newRoom.localParticipant);
            }
            updateParticipantStates(newRoom);
        };

        const handleTrackSubscribed = (
            track: any,
            publication: RemoteTrackPublication,
            participant: RemoteParticipant
        ) => {
            console.log('Track subscribed:', track.kind, 'from', participant.identity, 'trackSid:', publication.trackSid);
            updateParticipantStates(newRoom);
        };

        const handleTrackUnsubscribed = (
            track: any,
            publication: RemoteTrackPublication,
            participant: RemoteParticipant
        ) => {
            console.log('Track unsubscribed:', track.kind, 'from', participant.identity);
            updateParticipantStates(newRoom);
        };

        // Handle when a remote participant publishes a track
        const handleTrackPublished = (
            publication: RemoteTrackPublication,
            participant: RemoteParticipant
        ) => {
            console.log('Remote track published:', publication.kind, 'from', participant.identity, 'subscribed:', publication.isSubscribed);
            // Auto-subscribe is enabled by default, but force update state
            updateParticipantStates(newRoom);
        };

        const handleActiveSpeakersChanged = (speakers: Participant[]) => {
            updateParticipantStates(newRoom);
        };

        const updateParticipantStates = (r: Room) => {
            const states = new Map<string, ParticipantState>();
            
            // Add local participant
            if (r.localParticipant) {
                const local = r.localParticipant;
                const audioTrack = local.getTrackPublication(Track.Source.Microphone);
                const videoTrack = local.getTrackPublication(Track.Source.Camera);
                states.set(local.identity, {
                    participant: local,
                    isMuted: !audioTrack || audioTrack.isMuted || !audioTrack.track,
                    isVideoOff: !videoTrack || videoTrack.isMuted || !videoTrack.track,
                    isSpeaking: local.isSpeaking,
                });
            }
            
            // Add remote participants
            r.remoteParticipants.forEach((remote) => {
                const audioTrack = remote.getTrackPublication(Track.Source.Microphone);
                const videoTrack = remote.getTrackPublication(Track.Source.Camera);
                states.set(remote.identity, {
                    participant: remote,
                    isMuted: !audioTrack || audioTrack.isMuted || !audioTrack.track,
                    isVideoOff: !videoTrack || videoTrack.isMuted || !videoTrack.track,
                    isSpeaking: remote.isSpeaking,
                });
            });
            
            setParticipantStates(states);
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
        newRoom.on(RoomEvent.TrackSubscribed, handleTrackSubscribed);
        newRoom.on(RoomEvent.TrackUnsubscribed, handleTrackUnsubscribed);
        newRoom.on(RoomEvent.TrackPublished, handleTrackPublished);
        newRoom.on(RoomEvent.ActiveSpeakersChanged, handleActiveSpeakersChanged);

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
                updateParticipantStates(newRoom);
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
            newRoom.off(RoomEvent.TrackSubscribed, handleTrackSubscribed);
            newRoom.off(RoomEvent.TrackUnsubscribed, handleTrackUnsubscribed);
            newRoom.off(RoomEvent.TrackPublished, handleTrackPublished);
            newRoom.off(RoomEvent.ActiveSpeakersChanged, handleActiveSpeakersChanged);
            
            newRoom.disconnect();
            setRoom(null);
            setIsConnected(false);
            setLocalParticipant(null);
            setRemoteParticipants([]);
            setParticipantStates(new Map());
        };
    }, [token, serverUrl, enabled]);

    // Toggle microphone
    const toggleMute = useCallback(async () => {
        if (!room || !localParticipant) return;

        try {
            const audioTrack = localParticipant.getTrackPublication(Track.Source.Microphone);
            
            if (!audioTrack || !audioTrack.track) {
                // No audio track, request permission and enable microphone
                try {
                    // Request microphone permission first
                    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                    stream.getTracks().forEach(track => track.stop()); // Stop the test stream
                    
                    await localParticipant.setMicrophoneEnabled(true);
                    setIsMuted(false);
                } catch (permErr: any) {
                    if (permErr.name === 'NotAllowedError' || permErr.name === 'PermissionDeniedError') {
                        setError('Microphone permission denied. Please allow microphone access in your browser settings.');
                    } else {
                        setError('Failed to access microphone: ' + permErr.message);
                    }
                    console.error('Microphone permission error:', permErr);
                    return;
                }
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
                // No video track, request permission and enable camera
                try {
                    // Request camera permission first
                    const stream = await navigator.mediaDevices.getUserMedia({ video: true });
                    stream.getTracks().forEach(track => track.stop()); // Stop the test stream
                    
                    await localParticipant.setCameraEnabled(true);
                    setIsVideoOff(false);
                } catch (permErr: any) {
                    if (permErr.name === 'NotAllowedError' || permErr.name === 'PermissionDeniedError') {
                        setError('Camera permission denied. Please allow camera access in your browser settings.');
                    } else {
                        setError('Failed to access camera: ' + permErr.message);
                    }
                    console.error('Camera permission error:', permErr);
                    return;
                }
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
        participantStates,
        isMuted,
        isVideoOff,
        toggleMute,
        toggleVideo,
        disconnect,
        error,
    };
}
