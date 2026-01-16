'use client';

import { useState } from 'react';
import { JoinRequest, handleJoinRequest } from '@/services/api/rooms';
import { ParticipantAvatar } from '@/components/ui/ParticipantAvatar';
import { Clock, Check, X } from 'lucide-react';

interface PendingRequestItemProps {
    request: JoinRequest;
    roomCode: string;
    onRequestHandled: (userId: string, approved: boolean) => void;
}

export function PendingRequestItem({ request, roomCode, onRequestHandled }: PendingRequestItemProps) {
    const [isProcessing, setIsProcessing] = useState(false);

    const handleApprove = async (e: React.MouseEvent) => {
        e.stopPropagation();
        setIsProcessing(true);
        const result = await handleJoinRequest(roomCode, request.user_id, true);
        if (result.data) {
            onRequestHandled(request.user_id, true);
        }
        setIsProcessing(false);
    };

    const handleReject = async (e: React.MouseEvent) => {
        e.stopPropagation();
        setIsProcessing(true);
        const result = await handleJoinRequest(roomCode, request.user_id, false);
        if (result.data) {
            onRequestHandled(request.user_id, false);
        }
        setIsProcessing(false);
    };

    return (
        <div
            className="group px-2.5 py-2 rounded-xl flex items-center gap-3 transition-all duration-200 hover:bg-amber-500/10 border border-transparent hover:border-amber-500/20"
        >
            <ParticipantAvatar
                name={request.name}
                username={request.username}
            />
            <div className="flex-1 min-w-0">
                <span className="text-sm text-zinc-300 group-hover:text-white truncate block font-medium transition-colors">
                    {request.name || request.username || 'Unknown'}
                </span>
                <span className="flex items-center gap-1 text-[11px] text-amber-500/80">
                    <Clock className="w-3 h-3" />
                    Waiting to join
                </span>
            </div>
            {/* Approve/Reject buttons - always visible */}
            <div className="flex items-center gap-1">
                <button
                    onClick={handleReject}
                    disabled={isProcessing}
                    className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 transition-all disabled:opacity-50"
                    title="Reject"
                >
                    <X className="w-4 h-4" />
                </button>
                <button
                    onClick={handleApprove}
                    disabled={isProcessing}
                    className="p-1.5 rounded-lg bg-green-500/10 hover:bg-green-500/20 text-green-400 hover:text-green-300 transition-all disabled:opacity-50"
                    title="Approve"
                >
                    {isProcessing ? (
                        <div className="w-4 h-4 border-2 border-zinc-500/30 border-t-zinc-300 rounded-full animate-spin" />
                    ) : (
                        <Check className="w-4 h-4" />
                    )}
                </button>
            </div>
        </div>
    );
}
