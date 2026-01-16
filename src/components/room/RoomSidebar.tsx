'use client';

import { Room } from '@/lib/api/rooms';
import { Play, Pause, Video, VideoOff, Mic, MicOff, FastForward } from 'lucide-react';

interface ChatMessage {
    id: string;
    username: string;
    message: string;
    type: 'message' | 'join' | 'leave' | 'activity';
    activityType?: 'play' | 'pause' | 'seek' | 'video_on' | 'video_off' | 'mute' | 'unmute';
}

interface RoomSidebarProps {
    room: Room;
    username?: string;
    chatMessages: ChatMessage[];
    chatMessage: string;
    isSidebarCollapsed: boolean;
    onToggleCollapse: () => void;
    onChatMessageChange: (message: string) => void;
    onSendMessage: () => void;
}

const getActivityIcon = (activityType?: string) => {
    switch (activityType) {
        case 'play':
            return <Play className="w-3 h-3" />;
        case 'pause':
            return <Pause className="w-3 h-3" />;
        case 'seek':
            return <FastForward className="w-3 h-3" />;
        case 'video_on':
            return <Video className="w-3 h-3" />;
        case 'video_off':
            return <VideoOff className="w-3 h-3" />;
        case 'mute':
            return <MicOff className="w-3 h-3" />;
        case 'unmute':
            return <Mic className="w-3 h-3" />;
        default:
            return null;
    }
};

const getActivityColor = (activityType?: string) => {
    switch (activityType) {
        case 'play':
            return 'text-emerald-400 bg-emerald-500/10';
        case 'pause':
            return 'text-amber-400 bg-amber-500/10';
        case 'seek':
            return 'text-blue-400 bg-blue-500/10';
        case 'video_on':
            return 'text-green-400 bg-green-500/10';
        case 'video_off':
            return 'text-zinc-400 bg-zinc-500/10';
        case 'mute':
            return 'text-orange-400 bg-orange-500/10';
        case 'unmute':
            return 'text-cyan-400 bg-cyan-500/10';
        default:
            return 'text-zinc-400 bg-zinc-500/10';
    }
};

const getActivityMessage = (activityType?: string) => {
    switch (activityType) {
        case 'play':
            return 'started playback';
        case 'pause':
            return 'paused playback';
        case 'seek':
            return 'seeked video';
        case 'video_on':
            return 'turned on camera';
        case 'video_off':
            return 'turned off camera';
        case 'mute':
            return 'muted microphone';
        case 'unmute':
            return 'unmuted microphone';
        default:
            return 'performed action';
    }
};

export function RoomSidebar({
    room,
    username,
    chatMessages,
    chatMessage,
    isSidebarCollapsed,
    onToggleCollapse,
    onChatMessageChange,
    onSendMessage,
}: RoomSidebarProps) {
    return (
        <div className={`bg-zinc-900 border-r border-zinc-800 flex flex-col transition-all duration-300 ${isSidebarCollapsed ? 'w-16' : 'w-80'}`}>
            {/* Header with collapse button */}
            <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
                {!isSidebarCollapsed && (
                    <h3 className="text-sm font-semibold text-white">
                        Room Chat
                    </h3>
                )}
                <button
                    onClick={onToggleCollapse}
                    className="p-2 hover:bg-zinc-800 rounded-lg transition-colors ml-auto"
                    title={isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                >
                    <svg className={`w-5 h-5 text-zinc-400 transition-transform ${isSidebarCollapsed ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                </button>
            </div>

            {!isSidebarCollapsed && (
                <>
                    {/* Chat messages area */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-2">
                        {chatMessages.map((msg) => (
                            <div key={msg.id}>
                                {msg.type === 'join' && (
                                    <div className="text-xs py-1.5 px-2 rounded-lg bg-green-500/10 border border-green-500/20">
                                        <span className="text-green-400 font-medium">{msg.username}</span>
                                        <span className="text-green-300/70"> joined the room</span>
                                    </div>
                                )}
                                {msg.type === 'leave' && (
                                    <div className="text-xs py-1.5 px-2 rounded-lg bg-zinc-500/10 border border-zinc-500/20">
                                        <span className="text-zinc-400 font-medium">{msg.username}</span>
                                        <span className="text-zinc-500"> left the room</span>
                                    </div>
                                )}
                                {msg.type === 'activity' && (
                                    <div className={`text-xs py-1.5 px-2 rounded-lg flex items-center gap-2 border border-zinc-700/50 ${getActivityColor(msg.activityType)}`}>
                                        <span className="p-1 rounded bg-black/20">
                                            {getActivityIcon(msg.activityType)}
                                        </span>
                                        <span>
                                            <span className="font-medium">{msg.username}</span>
                                            <span className="opacity-70"> {getActivityMessage(msg.activityType)}</span>
                                        </span>
                                    </div>
                                )}
                                {msg.type === 'message' && (
                                    <div className="py-1.5">
                                        <span className="text-zinc-400 text-xs font-medium">{msg.username}</span>
                                        <p className="text-white text-sm mt-0.5">{msg.message}</p>
                                    </div>
                                )}
                            </div>
                        ))}
                        {chatMessages.length === 0 && (
                            <div className="text-center text-zinc-500 text-sm py-8">
                                No messages yet
                            </div>
                        )}
                    </div>

                    {/* Participants Section */}
                    <div className="border-t border-zinc-800">
                        <div className="px-4 py-2 flex items-center justify-between">
                            <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wide">
                                Participants ({room.participants.length})
                            </span>
                        </div>
                        <div className="px-3 pb-3 flex flex-wrap gap-2">
                            {room.participants.map((participant) => {
                                // Generate consistent color from username
                                const colors = [
                                    'bg-blue-600', 'bg-green-600', 'bg-purple-600',
                                    'bg-pink-600', 'bg-indigo-600', 'bg-teal-600',
                                    'bg-orange-600', 'bg-cyan-600',
                                ];
                                const hash = participant.username.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
                                const color = colors[hash % colors.length];
                                const isHost = participant.user_id === room.host_id;
                                const isMe = participant.username === username;

                                return (
                                    <div
                                        key={participant.user_id}
                                        className={`relative w-10 h-10 ${color} rounded-full flex items-center justify-center ring-2 ${isHost ? 'ring-yellow-400' : isMe ? 'ring-green-400' : 'ring-zinc-700'}`}
                                        title={`${participant.username}${isHost ? ' (Host)' : ''}${isMe ? ' (You)' : ''}`}
                                    >
                                        <span className="text-white text-sm font-medium">
                                            {participant.username.substring(0, 2).toUpperCase()}
                                        </span>
                                        {isHost && (
                                            <div className="absolute -top-1 -right-1 w-4 h-4 bg-yellow-400 rounded-full flex items-center justify-center">
                                                <svg className="w-2.5 h-2.5 text-yellow-900" fill="currentColor" viewBox="0 0 20 20">
                                                    <path d="M10 2a.75.75 0 01.673.418l1.882 3.815 4.21.612a.75.75 0 01.416 1.279l-3.046 2.97.719 4.192a.75.75 0 01-1.088.791L10 14.347l-3.766 1.98a.75.75 0 01-1.088-.79l.72-4.194L2.818 8.124a.75.75 0 01.416-1.28l4.21-.611L9.327 2.42A.75.75 0 0110 2z" />
                                                </svg>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Message input */}
                    <div className="p-3 border-t border-zinc-800">
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={chatMessage}
                                onChange={(e) => onChatMessageChange(e.target.value)}
                                onKeyPress={(e) => {
                                    if (e.key === 'Enter') {
                                        onSendMessage();
                                    }
                                }}
                                placeholder="Message..."
                                className="flex-1 px-3 py-2 bg-zinc-800 border-none rounded text-white text-sm focus:outline-none focus:ring-1 focus:ring-zinc-700"
                            />
                        </div>
                    </div>

                    {/* Bottom controls - Discord style */}
                    <div className="p-3 border-t border-zinc-800 bg-zinc-950">
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-zinc-700 rounded-full flex items-center justify-center">
                                <span className="text-white text-xs font-medium">
                                    {username?.substring(0, 2).toUpperCase()}
                                </span>
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-white text-sm font-medium truncate">{username}</p>
                                <p className="text-zinc-500 text-xs truncate">Online</p>
                            </div>
                        </div>
                    </div>
                </>
            )}

            {isSidebarCollapsed && (
                <div className="flex-1 flex flex-col items-center py-4 gap-3">
                    {room.participants.map((participant) => (
                        <div
                            key={participant.user_id}
                            className="w-10 h-10 bg-zinc-700 rounded-full flex items-center justify-center"
                            title={participant.username}
                        >
                            <span className="text-white text-sm font-medium">
                                {participant.username.substring(0, 2).toUpperCase()}
                            </span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
