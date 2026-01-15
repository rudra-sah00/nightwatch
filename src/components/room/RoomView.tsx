'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Room, JoinRequest, getPendingRequests, getRoom } from '@/lib/api/rooms';
import { useAuth } from '@/hooks/useAuth';
import { useRoomEvents, RoomEvent } from '@/hooks/useRoomEvents';
import { RoomHeader } from './RoomHeader';
import { RoomSidebar } from './RoomSidebar';
import { RoomContent } from './RoomContent';
import { VideoPreview } from './VideoPreview';
import { ParticipantsGrid } from './ParticipantsGrid';
import { useLiveKit } from './useLiveKit';

interface RoomViewProps {
    room: Room;
    onLeave: () => void;
    livekitToken?: string;
}

interface ChatMessage {
    id: string;
    username: string;
    message: string;
    type: 'message' | 'join' | 'leave' | 'activity';
    activityType?: 'play' | 'pause' | 'seek' | 'video_on' | 'video_off' | 'mute' | 'unmute';
}

export function RoomView({ room, onLeave, livekitToken }: RoomViewProps) {
    const { user } = useAuth();
    const [isMuted, setIsMuted] = useState(false);
    const [isVideoOff, setIsVideoOff] = useState(false);
    const [isRoomAudioOff, setIsRoomAudioOff] = useState(false);
    const isHost = user?.id === room.host_id;
    // Remove showSearch state - host always has access to search
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
    const [chatMessage, setChatMessage] = useState('');
    const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
    const [pendingRequests, setPendingRequests] = useState<JoinRequest[]>([]);
    const [roomClosed, setRoomClosed] = useState(false);

    const audioElementRef = useRef<HTMLDivElement>(null);
    const localVideoRef = useRef<HTMLVideoElement>(null);

    const currentParticipant = room.participants.find(p => p.user_id === user?.id);
    const canControlPlayback = currentParticipant?.permissions.can_control_playback || false;

    // Initialize LiveKit connection
    const { roomRef: livekitRoomRef, isConnected, cleanup: cleanupLiveKit } = useLiveKit({
        livekitToken,
        localVideoRef,
        audioElementRef,
    });

    // Handle leave room - disconnect LiveKit before calling onLeave
    const handleLeave = useCallback(async () => {
        console.log('Leaving room...');
        
        // If host is ending room, broadcast to all participants
        if (isHost && livekitRoomRef.current && isConnected) {
            try {
                const textEncoder = new TextEncoder();
                const data = JSON.stringify({
                    type: 'room_ended',
                    message: 'The host has ended the room'
                });
                const encodedData = textEncoder.encode(data);
                
                console.log('Broadcasting room_ended message');
                await livekitRoomRef.current.localParticipant.publishData(
                    encodedData,
                    { reliable: true }
                );
            } catch (err) {
                console.error('Error broadcasting room_ended:', err);
            }
        }
        
        // Properly cleanup all tracks and disconnect
        await cleanupLiveKit();
        
        // Then call parent's onLeave handler which will call backend API
        onLeave();
    }, [livekitRoomRef, onLeave, isHost, isConnected, cleanupLiveKit]);

    // Handle room events from SSE
    const handleRoomEvent = useCallback((event: RoomEvent) => {
        console.log('Room event received:', event);
        
        switch (event.type) {
            case 'room_deleted':
                console.log('Room deleted event received');
                setRoomClosed(true);
                setChatMessages(prev => [...prev, {
                    id: `system-${Date.now()}`,
                    username: 'System',
                    message: event.reason || 'The host has ended the room',
                    type: 'leave',
                }]);
                // Cleanup and leave (async)
                (async () => {
                    await cleanupLiveKit();
                    setTimeout(() => {
                        onLeave();
                    }, 1500);
                })();
                break;

            case 'participant_joined':
                if (event.username) {
                    setChatMessages(prev => [...prev, {
                        id: `join-${event.user_id}-${Date.now()}`,
                        username: event.username!,
                        message: '',
                        type: 'join',
                    }]);
                }
                break;

            case 'participant_left':
                if (event.username) {
                    setChatMessages(prev => [...prev, {
                        id: `leave-${event.user_id}-${Date.now()}`,
                        username: event.username!,
                        message: '',
                        type: 'leave',
                    }]);
                }
                break;
        }
    }, [cleanupLiveKit, onLeave]);

    // Subscribe to room events via SSE (replaces polling!)
    useRoomEvents({
        roomCode: room.code,
        enabled: !roomClosed,
        onEvent: handleRoomEvent,
    });

    // Subscribe to room events via SSE (replaces polling!)
    useRoomEvents({
        roomCode: room.code,
        enabled: !roomClosed,
        onEvent: handleRoomEvent,
    });

    // Poll for pending join requests (host only)
    useEffect(() => {
        if (!isHost) return;

        const fetchPendingRequests = async () => {
            const result = await getPendingRequests(room.code);
            if (result.data?.requests) {
                setPendingRequests(result.data.requests);
            }
        };

        // Initial fetch
        fetchPendingRequests();

        // Poll every 3 seconds
        const interval = setInterval(fetchPendingRequests, 3000);

        return () => clearInterval(interval);
    }, [isHost, room.code]);

    // Handle request approval/rejection
    const handleRequestHandled = useCallback((userId: string, approved: boolean) => {
        // Remove from pending list
        setPendingRequests(prev => prev.filter(r => r.user_id !== userId));

        // Find the username
        const request = pendingRequests.find(r => r.user_id === userId);
        const username = request?.username || 'Unknown';

        // Add activity to chat
        setChatMessages(prev => [...prev, {
            id: `activity-${Date.now()}`,
            username: user?.username || 'Host',
            message: `${approved ? 'approved' : 'rejected'} ${username}'s join request`,
            type: 'activity',
            activityType: approved ? 'play' : 'pause',
        }]);
    }, [pendingRequests, user?.username]);

    // Handle mute/unmute with LiveKit - only when connected
    useEffect(() => {
        if (isConnected && livekitRoomRef.current?.localParticipant) {
            livekitRoomRef.current.localParticipant.setMicrophoneEnabled(!isMuted);
        }
    }, [isMuted, isConnected, livekitRoomRef]);

    // Handle video on/off with LiveKit and reattach track - only when connected
    useEffect(() => {
        if (!isConnected) return;
        const lkRoom = livekitRoomRef.current;
        if (!lkRoom?.localParticipant) return;

        const toggleCamera = async () => {
            await lkRoom.localParticipant.setCameraEnabled(!isVideoOff);

            // When video is turned back on, reattach the video track
            if (!isVideoOff && localVideoRef.current) {
                let attempts = 0;
                const maxAttempts = 20;

                const reattachVideo = () => {
                    attempts++;
                    const videoPublication = Array.from(
                        lkRoom.localParticipant.videoTrackPublications.values()
                    )[0];

                    if (videoPublication?.track && localVideoRef.current) {
                        videoPublication.track.detach(localVideoRef.current);
                        videoPublication.track.attach(localVideoRef.current);
                    } else if (attempts < maxAttempts) {
                        setTimeout(reattachVideo, 200);
                    }
                };

                setTimeout(reattachVideo, 500);
            }
        };

        toggleCamera();
    }, [isVideoOff, isConnected, livekitRoomRef, localVideoRef]);

    // Handle room audio on/off
    useEffect(() => {
        if (audioElementRef.current) {
            const audioElements = audioElementRef.current.querySelectorAll('audio');
            audioElements.forEach((audio) => {
                audio.muted = isRoomAudioOff;
            });
        }
    }, [isRoomAudioOff]);

    // Listen for chat messages via LiveKit DataChannel
    useEffect(() => {
        if (!livekitRoomRef.current || !isConnected) return;

        const handleDataReceived = async (
            payload: Uint8Array,
            participant: any
        ) => {
            try {
                const textDecoder = new TextDecoder();
                const text = textDecoder.decode(payload);
                const data = JSON.parse(text);

                if (data.type === 'chat') {
                    console.log('Received chat message:', data, 'from:', participant?.name);
                    setChatMessages(prev => [...prev, {
                        id: `msg-${Date.now()}-${Math.random()}`,
                        username: data.username || participant?.name || 'Unknown',
                        message: data.message,
                        type: 'message'
                    }]);
                } else if (data.type === 'room_ended') {
                    console.log('Received room_ended message from host');
                    setRoomClosed(true);
                    setChatMessages(prev => [...prev, {
                        id: `system-${Date.now()}`,
                        username: 'System',
                        message: data.message || 'The host has ended the room',
                        type: 'leave',
                    }]);
                    // Cleanup LiveKit properly (wrap in async IIFE)
                    (async () => {
                        await cleanupLiveKit();
                        // Auto-leave after a short delay
                        setTimeout(() => {
                            onLeave();
                        }, 1500);
                    })();
                }
            } catch (err) {
                console.error('Error parsing data:', err);
            }
        };

        livekitRoomRef.current.on('dataReceived', handleDataReceived);

        return () => {
            livekitRoomRef.current?.off('dataReceived', handleDataReceived);
        };
    }, [livekitRoomRef, isConnected, onLeave, cleanupLiveKit]);

    const handleSearch = async () => {
        // Search is always visible for host
    };

    const handleClearSearch = () => {
        // Search is always visible for host
    };

    const handleSendMessage = async () => {
        if (chatMessage.trim() && user && livekitRoomRef.current && isConnected) {
            const message = chatMessage.trim();
            
            // Add to local chat immediately
            setChatMessages(prev => [...prev, {
                id: `msg-${Date.now()}`,
                username: user.username,
                message: message,
                type: 'message'
            }]);

            // Broadcast to other participants via LiveKit
            try {
                const textEncoder = new TextEncoder();
                const data = JSON.stringify({
                    type: 'chat',
                    username: user.username,
                    message: message
                });
                const encodedData = textEncoder.encode(data);
                
                console.log('Broadcasting message:', data);
                await livekitRoomRef.current.localParticipant.publishData(
                    encodedData,
                    { reliable: true }
                );
                console.log('Message broadcast successful');
            } catch (err) {
                console.error('Error broadcasting message:', err);
            }

            setChatMessage('');
        }
    };

    return (
        <div className="fixed inset-0 bg-black z-50 flex flex-col">
            <RoomHeader
                room={room}
                isHost={isHost}
                isMuted={isMuted}
                isRoomAudioOff={isRoomAudioOff}
                isVideoOff={isVideoOff}
                pendingRequests={pendingRequests}
                onToggleMute={() => setIsMuted(!isMuted)}
                onToggleRoomAudio={() => setIsRoomAudioOff(!isRoomAudioOff)}
                onToggleVideo={() => setIsVideoOff(!isVideoOff)}
                onLeave={handleLeave}
                onRequestHandled={handleRequestHandled}
            />

            <div className="flex-1 flex">
                <RoomSidebar
                    room={room}
                    username={user?.username}
                    chatMessages={chatMessages}
                    chatMessage={chatMessage}
                    isSidebarCollapsed={isSidebarCollapsed}
                    onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                    onChatMessageChange={setChatMessage}
                    onSendMessage={handleSendMessage}
                />

                <RoomContent
                    showSearch={true}
                    canControlPlayback={canControlPlayback}
                    hasVideo={!!room.video_id}
                    isPlaying={room.playback.is_playing}
                    isHost={isHost}
                    onSearch={handleSearch}
                    onClearSearch={handleClearSearch}
                    onShowSearch={() => {}}
                />
            </div>

            <VideoPreview
                username={user?.username}
                videoRef={localVideoRef}
                isHidden={isVideoOff}
            />

            {/* Hidden container for LiveKit audio/video elements */}
            <div ref={audioElementRef} className="hidden" />

            {/* Participants Grid */}
            <ParticipantsGrid 
                livekitRoom={livekitRoomRef.current}
                isConnected={isConnected}
                hostId={room.host_id}
                currentUserId={user?.id || ''}
            />

            {/* Room Closed Overlay */}
            {roomClosed && (
                <div className="absolute inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-[100] animate-in fade-in duration-300">
                    <div className="text-center space-y-4">
                        <div className="w-20 h-20 mx-auto bg-red-900/30 rounded-full flex items-center justify-center ring-2 ring-red-500/30">
                            <svg className="w-10 h-10 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                            </svg>
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold text-white mb-2">Room Closed</h2>
                            <p className="text-zinc-400">The host has ended this room</p>
                        </div>
                        <p className="text-zinc-500 text-sm animate-pulse">Redirecting...</p>
                    </div>
                </div>
            )}
        </div>
    );
}

