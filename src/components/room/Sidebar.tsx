'use client';

import { Room, JoinRequest } from '@/services/api/rooms';
import { 
    Mic, MicOff, Video, VideoOff, PhoneOff, 
    Users, Tv, Volume2, VolumeX, ChevronRight, ChevronLeft, Sparkles, Copy, Check, Loader2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ParticipantItem } from './ParticipantItem';
import { PendingRequestItem } from './PendingRequestItem';
import { ParticipantAvatar } from '@/components/ui/ParticipantAvatar';
import { ControlButton } from '@/components/ui/ControlButton';
import { useState } from 'react';

interface SidebarProps {
    room: Room;
    currentUserId?: string;
    isMuted: boolean;
    isVideoOff: boolean;
    isRoomAudioOff: boolean;
    isCollapsed: boolean;
    pendingRequests: JoinRequest[];
    isLiveKitConnected?: boolean;
    onToggleMute: () => void | Promise<void>;
    onToggleVideo: () => void | Promise<void>;
    onToggleRoomAudio: () => void;
    onToggleCollapse: () => void;
    onLeaveRoom: () => void;
    onRequestHandled?: (userId: string, approved: boolean) => void;
}

export function Sidebar({
    room,
    currentUserId,
    isMuted,
    isVideoOff,
    isRoomAudioOff,
    isCollapsed,
    pendingRequests,
    isLiveKitConnected = false,
    onToggleMute,
    onToggleVideo,
    onToggleRoomAudio,
    onToggleCollapse,
    onLeaveRoom,
    onRequestHandled,
}: SidebarProps) {
    const [copied, setCopied] = useState(false);
    const isHost = currentUserId === room.host_id;
    const currentParticipant = room.participants.find(p => p.user_id === currentUserId);

    const getRoleBadge = (userId: string): 'HOST' | 'ADMIN' | null => {
        if (userId === room.host_id) return 'HOST';
        const participant = room.participants.find(p => p.user_id === userId);
        if (participant?.permissions.can_control_playback) return 'ADMIN';
        return null;
    };

    const copyRoomCode = async () => {
        await navigator.clipboard.writeText(room.code);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="relative flex">
            {/* Main Sidebar Container with smooth width transition */}
            <div 
                className={cn(
                    "bg-gradient-to-b from-zinc-900/95 to-zinc-950/95 backdrop-blur-xl flex flex-col h-screen border-r border-white/5",
                    "transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]",
                    "overflow-hidden",
                    isCollapsed ? "w-0 opacity-0" : "w-72 opacity-100"
                )}
            >
                {/* Inner content wrapper to prevent content squishing */}
                <div className={cn(
                    "w-72 flex flex-col h-full",
                    "transition-all duration-300 ease-out",
                    isCollapsed ? "opacity-0 -translate-x-4" : "opacity-100 translate-x-0"
                )}>
                    {/* Room Header */}
                    <div className="p-4 border-b border-white/5">
                        <div className="flex items-start gap-3">
                            <div className="p-2.5 rounded-xl bg-gradient-to-br from-violet-500/20 to-purple-500/20 border border-violet-500/20">
                                <Tv className="w-5 h-5 text-violet-400" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <h2 className="font-semibold text-white truncate">
                                    {room.video_title || 'Watch Party'}
                                </h2>
                                <div className="flex items-center gap-2 mt-1">
                                    <button
                                        onClick={copyRoomCode}
                                        className={cn(
                                            "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-mono",
                                            "bg-white/5 hover:bg-white/10 border border-white/10",
                                            "text-zinc-400 hover:text-white transition-all duration-200"
                                        )}
                                    >
                                        {copied ? (
                                            <>
                                                <Check className="w-3 h-3 text-green-400" />
                                                <span className="text-green-400">Copied!</span>
                                            </>
                                        ) : (
                                            <>
                                                <Copy className="w-3 h-3" />
                                                {room.code}
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>
                            <button
                                onClick={onToggleCollapse}
                                className="p-1.5 hover:bg-white/10 rounded-lg transition-all duration-200 text-zinc-500 hover:text-white group"
                                title="Collapse sidebar"
                            >
                                <ChevronLeft className="w-4 h-4 transition-transform duration-200 group-hover:-translate-x-0.5" />
                            </button>
                        </div>
                    </div>

                    {/* Voice Channel Section */}
                    <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
                        <div className="p-3">
                            {/* Section Header */}
                            <div className="flex items-center gap-2 px-2 py-2 mb-2">
                                <div className="flex items-center gap-2 text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                                    <Volume2 className="w-4 h-4" />
                                    <span>In Room</span>
                                </div>
                                <div className="flex-1 h-px bg-gradient-to-r from-white/10 to-transparent" />
                                <span className="px-2 py-0.5 rounded-full bg-white/5 text-xs font-medium text-zinc-400">
                                    {room.participants.length}
                                </span>
                            </div>

                            {/* Participants List */}
                            <div className="space-y-1">
                                {room.participants.map((participant, index) => (
                                    <div
                                        key={participant.user_id}
                                        className="transition-all duration-300"
                                        style={{ transitionDelay: `${index * 50}ms` }}
                                    >
                                        <ParticipantItem
                                            participant={participant}
                                            isCurrentUser={participant.user_id === currentUserId}
                                            role={getRoleBadge(participant.user_id)}
                                            isMuted={isMuted}
                                            isVideoOff={isVideoOff}
                                        />
                                    </div>
                                ))}
                            </div>

                            {/* Pending Requests */}
                            {isHost && pendingRequests.length > 0 && (
                                <div className="mt-6">
                                    <div className="flex items-center gap-2 px-2 py-2 mb-2">
                                        <div className="flex items-center gap-2 text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                                            <Users className="w-4 h-4" />
                                            <span>Waiting</span>
                                        </div>
                                        <div className="flex-1 h-px bg-gradient-to-r from-white/10 to-transparent" />
                                        <span className="px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/30 text-xs font-medium text-amber-400 animate-pulse">
                                            {pendingRequests.length}
                                        </span>
                                    </div>
                                    <div className="space-y-1">
                                        {pendingRequests.map((request) => (
                                            <PendingRequestItem
                                                key={request.user_id}
                                                request={request}
                                                roomCode={room.code}
                                                onRequestHandled={(userId, approved) => onRequestHandled?.(userId, approved)}
                                            />
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* User Controls (Bottom) */}
                    <div className="border-t border-white/5 bg-black/20 p-3">
                        {/* Current User Info */}
                        <div className="flex items-center gap-3 p-2.5 rounded-xl bg-white/5 border border-white/5 mb-3">
                            <ParticipantAvatar
                                name={currentParticipant?.name}
                                username={currentParticipant?.username}
                                size="md"
                            />
                            <div className="flex-1 min-w-0">
                                <div className="text-sm font-medium text-white truncate">
                                    {currentParticipant?.name || currentParticipant?.username || 'You'}
                                </div>
                                <div className="flex items-center gap-1.5 mt-0.5">
                                    {isHost ? (
                                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-400">
                                            <Sparkles className="w-3 h-3" />
                                            Host
                                        </span>
                                    ) : (
                                        <span className="text-[11px] text-zinc-500">Member</span>
                                    )}
                                    {/* LiveKit connection status */}
                                    <span className={cn(
                                        "inline-flex items-center gap-1 text-[10px] ml-1",
                                        isLiveKitConnected ? "text-green-400" : "text-zinc-500"
                                    )}>
                                        <span className={cn(
                                            "w-1.5 h-1.5 rounded-full",
                                            isLiveKitConnected ? "bg-green-400 animate-pulse" : "bg-zinc-500"
                                        )} />
                                        {isLiveKitConnected ? "Voice" : "Connecting..."}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Control Buttons */}
                        <div className="flex items-center gap-2">
                            <ControlButton
                                icon={isMuted ? MicOff : Mic}
                                onClick={onToggleMute}
                                isActive={isMuted}
                                disabled={!isLiveKitConnected}
                                title={!isLiveKitConnected ? "Connecting..." : isMuted ? "Unmute" : "Mute"}
                            />
                            <ControlButton
                                icon={isVideoOff ? VideoOff : Video}
                                onClick={onToggleVideo}
                                isActive={isVideoOff}
                                disabled={!isLiveKitConnected}
                                title={!isLiveKitConnected ? "Connecting..." : isVideoOff ? "Turn on camera" : "Turn off camera"}
                            />
                            <ControlButton
                                icon={isRoomAudioOff ? VolumeX : Volume2}
                                onClick={onToggleRoomAudio}
                                isActive={isRoomAudioOff}
                                title={isRoomAudioOff ? "Unmute room audio" : "Mute room audio"}
                            />
                            <ControlButton
                                icon={PhoneOff}
                                onClick={onLeaveRoom}
                                isDanger={true}
                                title="Leave room"
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Expand button - shows when collapsed */}
            <button
                onClick={onToggleCollapse}
                className={cn(
                    "absolute top-1/2 -translate-y-1/2 z-50",
                    "bg-zinc-900/95 backdrop-blur-xl text-zinc-400 hover:text-white",
                    "p-2 rounded-r-xl",
                    "border-r border-t border-b border-white/10",
                    "transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]",
                    "shadow-xl shadow-black/30",
                    "hover:bg-zinc-800/95 hover:pr-3",
                    isCollapsed 
                        ? "left-0 opacity-100 translate-x-0" 
                        : "left-72 opacity-0 -translate-x-4 pointer-events-none"
                )}
                title="Open sidebar"
            >
                <ChevronRight className={cn(
                    "w-5 h-5 transition-transform duration-200",
                    !isCollapsed && "rotate-180"
                )} />
            </button>
        </div>
    );
}
