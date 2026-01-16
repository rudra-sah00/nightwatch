'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Room } from '@/services/api/rooms';
import { Room as LiveKitRoom, RoomEvent, Track, ConnectionState } from 'livekit-client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
    Mic,
    MicOff,
    Video,
    VideoOff,
    Volume2,
    VolumeX,
    Users,
    LogOut,
    Maximize2,
    Crown,
} from 'lucide-react';

interface RoomBannerProps {
    room: Room;
    onExpand: () => void;
    onLeave: () => void;
    isHost: boolean;
    livekitToken?: string;
}

export function RoomBanner({ room, onExpand, onLeave, isHost, livekitToken }: RoomBannerProps) {
    const [isMuted, setIsMuted] = useState(false);
    const [isVideoOff, setIsVideoOff] = useState(false);
    const [isRoomAudioOff, setIsRoomAudioOff] = useState(false);
    const livekitRoomRef = useRef<LiveKitRoom | null>(null);
    const audioElementRef = useRef<HTMLDivElement>(null);
    const localVideoRef = useRef<HTMLVideoElement>(null);
    const connectionAttemptRef = useRef<number>(0);

    // Memoized connect function to avoid recreating on each render
    const connectToLiveKit = useCallback(async (token: string, attemptId: number) => {
        // Early exit if this attempt has been superseded
        if (attemptId !== connectionAttemptRef.current) {
            return;
        }

        // Don't connect if already connected
        if (livekitRoomRef.current?.state === ConnectionState.Connected) {
            return;
        }

        try {
            // Create a new LiveKit room instance
            const livekitRoom = new LiveKitRoom({
                adaptiveStream: true,
                dynacast: true,
            });

            // Check again if this attempt is still valid
            if (attemptId !== connectionAttemptRef.current) {
                livekitRoom.disconnect();
                return;
            }

            // Set up event listeners before connecting
            livekitRoom.on(RoomEvent.TrackSubscribed, (track) => {
                if (track.kind === Track.Kind.Audio || track.kind === Track.Kind.Video) {
                    const element = track.attach();
                    audioElementRef.current?.appendChild(element);
                }
            });

            livekitRoom.on(RoomEvent.TrackUnsubscribed, (track) => {
                track.detach();
            });

            // Store reference before async operation
            livekitRoomRef.current = livekitRoom;

            // Connect to room
            const livekitUrl = process.env.NEXT_PUBLIC_LIVEKIT_URL || 'ws://localhost:7880';
            await livekitRoom.connect(livekitUrl, token);

            // Check if still valid after connect
            if (attemptId !== connectionAttemptRef.current) {
                livekitRoom.disconnect();
                return;
            }

            // Enable microphone and camera after successful connection
            try {
                await livekitRoom.localParticipant.setMicrophoneEnabled(true);
                await livekitRoom.localParticipant.setCameraEnabled(true);
            } catch {
                // Media permissions might be denied, continue anyway
            }

            // Attach local video track when it becomes available
            livekitRoom.localParticipant.on('trackPublished', (publication) => {
                if (publication.track && publication.kind === 'video' && localVideoRef.current) {
                    publication.track.attach(localVideoRef.current);
                }
            });

            // Also try to attach immediately if already published
            const videoPublication = Array.from(livekitRoom.localParticipant.videoTrackPublications.values())[0];
            if (videoPublication?.track && localVideoRef.current) {
                videoPublication.track.attach(localVideoRef.current);
            }

        } catch (err) {
            // Only log if this is still the current attempt
            if (attemptId === connectionAttemptRef.current) {
                // Clean up on error
                if (livekitRoomRef.current) {
                    try {
                        livekitRoomRef.current.disconnect();
                    } catch {
                        // Ignore disconnect errors
                    }
                    livekitRoomRef.current = null;
                }
            }
        }
    }, []);

    // Initialize LiveKit connection
    useEffect(() => {
        if (!livekitToken) return;

        // Increment attempt ID to invalidate any previous attempts
        const currentAttempt = ++connectionAttemptRef.current;
        // Copy ref value for cleanup
        const cleanupAttemptId = currentAttempt;

        // Use queueMicrotask to avoid synchronous setState in effect
        queueMicrotask(() => {
            connectToLiveKit(livekitToken, currentAttempt);
        });

        // Cleanup function
        return () => {
            // Invalidate this attempt by setting a higher value
            if (connectionAttemptRef.current === cleanupAttemptId) {
                connectionAttemptRef.current++;
            }

            // Disconnect if we have a room
            const room = livekitRoomRef.current;
            if (room) {
                livekitRoomRef.current = null;

                // Use setTimeout to avoid React state updates during unmount
                setTimeout(() => {
                    try {
                        room.disconnect();
                    } catch {
                        // Ignore errors during cleanup
                    }
                }, 0);
            }
        };
    }, [livekitToken, connectToLiveKit]);

    // Handle mute/unmute with LiveKit
    useEffect(() => {
        if (livekitRoomRef.current?.localParticipant) {
            livekitRoomRef.current.localParticipant.setMicrophoneEnabled(!isMuted);
        }
    }, [isMuted]);

    // Handle video on/off with LiveKit
    useEffect(() => {
        if (livekitRoomRef.current?.localParticipant) {
            livekitRoomRef.current.localParticipant.setCameraEnabled(!isVideoOff);
        }
    }, [isVideoOff]);

    // Handle room audio on/off
    useEffect(() => {
        if (audioElementRef.current) {
            const audioElements = audioElementRef.current.querySelectorAll('audio');
            audioElements.forEach((audio) => {
                audio.muted = isRoomAudioOff;
            });
        }
    }, [isRoomAudioOff]);

    return (
        <TooltipProvider delayDuration={0}>
            <div className="bg-gradient-to-r from-zinc-900 via-zinc-900/95 to-zinc-900 border-b border-zinc-800/50 px-6 py-3 relative z-[60] backdrop-blur-sm">
                <div className="max-w-7xl mx-auto flex items-center justify-between">
                    {/* Left Section - Room Info */}
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-3">
                            <div className="relative">
                                <div className="w-2.5 h-2.5 bg-green-500 rounded-full animate-pulse"></div>
                                <div className="absolute inset-0 w-2.5 h-2.5 bg-green-500 rounded-full animate-ping opacity-75"></div>
                            </div>
                            <span className="text-white font-semibold tracking-tight">Room: {room.code}</span>
                            {isHost && (
                                <Badge variant="warning" className="text-xs gap-1">
                                    <Crown className="w-3 h-3" />
                                    Host
                                </Badge>
                            )}
                        </div>
                        <Badge variant="secondary" className="gap-1.5 text-xs">
                            <Users className="w-3 h-3" />
                            {room.participants.length} participant{room.participants.length !== 1 ? 's' : ''}
                        </Badge>
                        {room.video_title && (
                            <span className="text-zinc-400 text-sm truncate max-w-[200px]">
                                • {room.video_title}
                            </span>
                        )}
                    </div>

                    {/* Right Section - Controls */}
                    <div className="flex items-center gap-3">
                        {/* Audio/Video Controls */}
                        <div className="flex items-center gap-1.5 px-2 py-1 bg-zinc-800/80 rounded-lg border border-zinc-700/50">
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button
                                        variant={isMuted ? 'destructive' : 'ghost'}
                                        size="icon"
                                        className="h-8 w-8"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setIsMuted(!isMuted);
                                        }}
                                    >
                                        {isMuted ? (
                                            <MicOff className="h-4 w-4" />
                                        ) : (
                                            <Mic className="h-4 w-4" />
                                        )}
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent side="bottom">
                                    {isMuted ? 'Unmute Microphone' : 'Mute Microphone'}
                                </TooltipContent>
                            </Tooltip>

                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button
                                        variant={isRoomAudioOff ? 'destructive' : 'ghost'}
                                        size="icon"
                                        className="h-8 w-8"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setIsRoomAudioOff(!isRoomAudioOff);
                                        }}
                                    >
                                        {isRoomAudioOff ? (
                                            <VolumeX className="h-4 w-4" />
                                        ) : (
                                            <Volume2 className="h-4 w-4" />
                                        )}
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent side="bottom">
                                    {isRoomAudioOff ? 'Listen to Room Audio' : 'Mute Room Audio'}
                                </TooltipContent>
                            </Tooltip>

                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button
                                        variant={isVideoOff ? 'destructive' : 'ghost'}
                                        size="icon"
                                        className="h-8 w-8"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setIsVideoOff(!isVideoOff);
                                        }}
                                    >
                                        {isVideoOff ? (
                                            <VideoOff className="h-4 w-4" />
                                        ) : (
                                            <Video className="h-4 w-4" />
                                        )}
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent side="bottom">
                                    {isVideoOff ? 'Turn Camera On' : 'Turn Camera Off'}
                                </TooltipContent>
                            </Tooltip>
                        </div>

                        {/* Expand Button */}
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={onExpand}
                                    className="text-zinc-400 hover:text-white gap-1.5"
                                >
                                    <Maximize2 className="h-4 w-4" />
                                    <span className="hidden sm:inline">Expand</span>
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent side="bottom">
                                Open Room View
                            </TooltipContent>
                        </Tooltip>

                        {/* Leave/End Room Button */}
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    variant="destructive"
                                    size="sm"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onLeave();
                                    }}
                                    className="gap-1.5"
                                >
                                    <LogOut className="h-4 w-4" />
                                    <span className="hidden sm:inline">{isHost ? 'End Room' : 'Leave'}</span>
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent side="bottom">
                                {isHost ? 'End Room for Everyone' : 'Leave Room'}
                            </TooltipContent>
                        </Tooltip>
                    </div>
                </div>
            </div>

            {/* Local Video Preview - Bottom Right Corner */}
            {!isVideoOff && (
                <div className="fixed bottom-6 right-6 z-40 w-48 h-36 bg-zinc-900 rounded-xl overflow-hidden border-2 border-zinc-700/50 shadow-2xl shadow-black/50 ring-1 ring-white/5 transition-transform hover:scale-105">
                    <video
                        ref={localVideoRef}
                        autoPlay
                        playsInline
                        muted
                        className="w-full h-full object-cover mirror"
                    />
                    <div className="absolute bottom-2 left-2">
                        <Badge variant="secondary" className="text-xs bg-black/60 border-none backdrop-blur-sm">
                            You
                        </Badge>
                    </div>
                </div>
            )}

            {/* Hidden container for LiveKit audio/video elements */}
            <div ref={audioElementRef} className="hidden" />
        </TooltipProvider>
    );
}
