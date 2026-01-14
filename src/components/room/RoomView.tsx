'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Room, JoinRequest, getPendingRequests, getRoom } from '@/lib/api/rooms';
import { useAuth } from '@/hooks/useAuth';
import { RoomHeader } from './RoomHeader';
import { RoomSidebar } from './RoomSidebar';
import { RoomContent } from './RoomContent';
import { VideoPreview } from './VideoPreview';
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
    const [showSearch, setShowSearch] = useState(!room.video_id);
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
    const [chatMessage, setChatMessage] = useState('');
    const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
    const [pendingRequests, setPendingRequests] = useState<JoinRequest[]>([]);
    const [roomClosed, setRoomClosed] = useState(false);

    const audioElementRef = useRef<HTMLDivElement>(null);
    const localVideoRef = useRef<HTMLVideoElement>(null);

    const isHost = user?.id === room.host_id;
    const currentParticipant = room.participants.find(p => p.user_id === user?.id);
    const canControlPlayback = currentParticipant?.permissions.can_control_playback || false;

    // Initialize LiveKit connection
    const { roomRef: livekitRoomRef, isConnected } = useLiveKit({
        livekitToken,
        localVideoRef,
        audioElementRef,
    });

    // Poll for room status (non-host only) - detect when host ends room
    useEffect(() => {
        if (isHost || roomClosed) return;

        const checkRoomStatus = async () => {
            try {
                const result = await getRoom(room.code);

                // If room doesn't exist or error, the host likely ended it
                if (result.error) {
                    console.log('Room closed detected:', result.error);
                    setRoomClosed(true);
                    // Show brief message then leave
                    setChatMessages(prev => [...prev, {
                        id: `system-${Date.now()}`,
                        username: 'System',
                        message: 'The host has ended the room',
                        type: 'leave',
                    }]);
                    // Disconnect LiveKit
                    if (livekitRoomRef.current) {
                        livekitRoomRef.current.disconnect();
                    }
                    // Auto-leave after a short delay
                    setTimeout(() => {
                        onLeave();
                    }, 1500);
                }
            } catch (err) {
                console.error('Error checking room status:', err);
            }
        };

        // Check immediately on mount
        checkRoomStatus();

        // Then check every 2 seconds
        const interval = setInterval(checkRoomStatus, 2000);

        return () => clearInterval(interval);
    }, [isHost, room.code, roomClosed, onLeave, livekitRoomRef]);

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

    // Track participant changes for join/leave messages
    const previousParticipantsRef = useRef<string[]>([]);

    useEffect(() => {
        const currentIds = room.participants.map(p => p.user_id);
        const previousIds = previousParticipantsRef.current;

        const newParticipantIds = currentIds.filter(id => !previousIds.includes(id));

        if (newParticipantIds.length > 0) {
            const timestamp = Date.now();
            const newMessages: ChatMessage[] = newParticipantIds.map((id, index) => {
                const participant = room.participants.find(p => p.user_id === id);
                return {
                    id: `join-${id}-${timestamp}-${index}`,
                    username: participant?.username || 'Unknown',
                    message: '',
                    type: 'join' as const
                };
            });

            queueMicrotask(() => {
                setChatMessages(prev => [...prev, ...newMessages]);
            });
        }

        previousParticipantsRef.current = currentIds;
    }, [room.participants]);

    const handleSearch = async () => {
        setShowSearch(true);
    };

    const handleClearSearch = () => {
        setShowSearch(false);
    };

    const handleSendMessage = () => {
        if (chatMessage.trim() && user) {
            setChatMessages(prev => [...prev, {
                id: `msg-${Date.now()}`,
                username: user.username,
                message: chatMessage.trim(),
                type: 'message'
            }]);
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
                onLeave={onLeave}
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
                    showSearch={showSearch}
                    canControlPlayback={canControlPlayback}
                    hasVideo={!!room.video_id}
                    isPlaying={room.playback.is_playing}
                    onSearch={handleSearch}
                    onClearSearch={handleClearSearch}
                    onShowSearch={() => setShowSearch(true)}
                />
            </div>

            <VideoPreview
                username={user?.username}
                videoRef={localVideoRef}
                isHidden={isVideoOff}
            />

            {/* Hidden container for LiveKit audio/video elements */}
            <div ref={audioElementRef} className="hidden" />

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

