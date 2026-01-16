'use client';

import { Participant } from '@/services/api/rooms';
import { ParticipantAvatar } from '@/components/ui/ParticipantAvatar';
import { RoleIcon } from '@/components/ui/RoleIcon';
import { MicOff, VideoOff } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ParticipantItemProps {
    participant: Participant;
    isCurrentUser: boolean;
    role: 'HOST' | 'ADMIN' | null;
    isMuted: boolean;
    isVideoOff: boolean;
}

export function ParticipantItem({
    participant,
    isCurrentUser,
    role,
    isMuted,
    isVideoOff,
}: ParticipantItemProps) {
    return (
        <div
            className={cn(
                "group px-2.5 py-2 rounded-xl flex items-center gap-3 transition-all duration-200",
                "hover:bg-white/5 cursor-pointer",
                isCurrentUser && "bg-gradient-to-r from-violet-500/10 to-purple-500/10 border border-violet-500/20"
            )}
        >
            <ParticipantAvatar
                name={participant.name}
                username={participant.username}
                isSpeaking={false}
            />

            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                    <span className={cn(
                        "text-sm font-medium truncate transition-colors",
                        isCurrentUser ? "text-white" : "text-zinc-300 group-hover:text-white"
                    )}>
                        {participant.name || participant.username || 'Unknown'}
                    </span>
                    {role && (
                        <span className={cn(
                            "inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-semibold uppercase tracking-wide",
                            role === 'HOST' 
                                ? "bg-gradient-to-r from-amber-500/20 to-orange-500/20 text-amber-400 border border-amber-500/30"
                                : "bg-gradient-to-r from-blue-500/20 to-cyan-500/20 text-blue-400 border border-blue-500/30"
                        )}>
                            <RoleIcon role={role} />
                            {role}
                        </span>
                    )}
                </div>
                {isCurrentUser && (
                    <span className="text-[11px] text-zinc-500">
                        (You)
                    </span>
                )}
            </div>

            <div className="flex items-center gap-1.5">
                {isCurrentUser && isMuted && (
                    <div className="w-6 h-6 rounded-lg bg-red-500/20 border border-red-500/30 flex items-center justify-center">
                        <MicOff className="w-3 h-3 text-red-400" />
                    </div>
                )}
                {isCurrentUser && isVideoOff && (
                    <div className="w-6 h-6 rounded-lg bg-red-500/20 border border-red-500/30 flex items-center justify-center">
                        <VideoOff className="w-3 h-3 text-red-400" />
                    </div>
                )}
            </div>
        </div>
    );
}
