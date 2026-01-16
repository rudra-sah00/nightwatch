'use client';

import { Room, JoinRequest } from '@/lib/api/rooms';
import { JoinRequestsPanel } from './JoinRequestsPanel';
import { Badge } from '@/components/ui';
import { Maximize2 } from 'lucide-react';

interface RoomHeaderProps {
    room: Room;
    isHost: boolean;
    isMuted: boolean;
    isRoomAudioOff: boolean;
    isVideoOff: boolean;
    pendingRequests?: JoinRequest[];
    onToggleMute: () => void;
    onToggleRoomAudio: () => void;
    onToggleVideo: () => void;
    onLeave: () => void;
    onRequestHandled?: (userId: string, approved: boolean) => void;
    onExpand?: () => void;
}

export function RoomHeader({
    room,
    isHost,
    isMuted,
    isRoomAudioOff,
    isVideoOff,
    pendingRequests = [],
    onToggleMute,
    onToggleRoomAudio,
    onToggleVideo,
    onLeave,
    onRequestHandled,
    onExpand,
}: RoomHeaderProps) {
    return (
        <div className="bg-zinc-900 border-b border-zinc-800 px-6 py-3 flex items-center justify-between relative z-[60]">
            <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                    <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                    <span className="text-white font-medium">Room: {room.code}</span>
                </div>
                {isHost && (
                    <Badge variant="default" className="bg-white text-black hover:bg-zinc-200">
                        Host
                    </Badge>
                )}
                <span className="text-zinc-400 text-sm flex items-center gap-1">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    {room.participants.length} participant{room.participants.length !== 1 ? 's' : ''}
                </span>
            </div>

            <div className="flex items-center gap-3">
                {/* Audio Controls */}
                <div className="flex items-center gap-1 px-2 py-1 bg-zinc-800 rounded-lg">
                    <button
                        onClick={onToggleMute}
                        className={`p-2 rounded transition-colors ${isMuted
                                ? 'bg-white/20 ring-1 ring-white/50 text-white'
                                : 'hover:bg-zinc-700 text-white'
                            }`}
                        title={isMuted ? 'Unmute Microphone' : 'Mute Microphone'}
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            {isMuted ? (
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
                            ) : (
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                            )}
                        </svg>
                    </button>
                    <button
                        onClick={onToggleRoomAudio}
                        className={`p-2 rounded transition-colors ${isRoomAudioOff
                                ? 'bg-white/20 ring-1 ring-white/50 text-white'
                                : 'hover:bg-zinc-700 text-white'
                            }`}
                        title={isRoomAudioOff ? 'Listen to Room Audio' : 'Mute Room Audio'}
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            {isRoomAudioOff ? (
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
                            ) : (
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                            )}
                        </svg>
                    </button>
                    <button
                        onClick={onToggleVideo}
                        className={`p-2 rounded transition-colors ${isVideoOff
                                ? 'bg-white/20 ring-1 ring-white/50 text-white'
                                : 'hover:bg-zinc-700 text-white'
                            }`}
                        title={isVideoOff ? 'Turn Camera On' : 'Turn Camera Off'}
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            {isVideoOff ? (
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                            ) : (
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            )}
                        </svg>
                    </button>
                </div>

                {/* Join Requests Panel - Only for host */}
                {isHost && onRequestHandled && (
                    <JoinRequestsPanel
                        roomCode={room.code}
                        requests={pendingRequests}
                        onRequestHandled={onRequestHandled}
                    />
                )}

                {/* Expand Button */}
                {onExpand && (
                    <button
                        onClick={onExpand}
                        className="p-2 hover:bg-zinc-800 rounded-lg transition-colors text-zinc-400 hover:text-white flex items-center gap-2"
                        title="Expand"
                    >
                        <Maximize2 className="w-4 h-4" />
                        <span className="text-sm">Expand</span>
                    </button>
                )}

                {/* Leave/End Room Button */}
                <button
                    onClick={onLeave}
                    className="px-4 py-2 bg-white text-black hover:bg-zinc-200 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                    {isHost ? 'End Room' : 'Leave Room'}
                </button>
            </div>
        </div>
    );
}

