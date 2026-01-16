'use client';

import { useState } from 'react';
import { JoinRequest, handleJoinRequest } from '@/lib/api/rooms';
import { Button } from '@/components/ui';
import { Bell, Check, X, UserPlus } from 'lucide-react';

interface JoinRequestsPanelProps {
    roomCode: string;
    requests: JoinRequest[];
    onRequestHandled: (userId: string, approved: boolean) => void;
}

export function JoinRequestsPanel({ roomCode, requests, onRequestHandled }: JoinRequestsPanelProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());

    const handleRequest = async (userId: string, approve: boolean) => {
        setProcessingIds(prev => new Set(prev).add(userId));

        const result = await handleJoinRequest(roomCode, userId, approve);

        if (result.data) {
            onRequestHandled(userId, approve);
        }

        setProcessingIds(prev => {
            const next = new Set(prev);
            next.delete(userId);
            return next;
        });
    };

    const pendingCount = requests.length;

    return (
        <div className="relative">
            {/* Notification Bell Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`relative p-2 rounded-lg transition-colors ${isOpen ? 'bg-zinc-700' : 'hover:bg-zinc-800'
                    } ${pendingCount > 0 ? 'text-yellow-400' : 'text-zinc-400'}`}
                title={pendingCount > 0 ? `${pendingCount} pending request(s)` : 'No pending requests'}
            >
                <Bell className={`w-5 h-5 ${pendingCount > 0 ? 'animate-pulse' : ''}`} />

                {/* Notification Badge */}
                {pendingCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-white text-black rounded-full flex items-center justify-center text-[10px] font-bold">
                        {pendingCount > 9 ? '9+' : pendingCount}
                    </span>
                )}
            </button>

            {/* Dropdown Panel */}
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <div
                        className="fixed inset-0 z-40"
                        onClick={() => setIsOpen(false)}
                    />

                    {/* Panel */}
                    <div className="absolute right-0 mt-2 w-80 bg-zinc-800/95 backdrop-blur-md border border-zinc-700/50 rounded-xl shadow-2xl shadow-black/50 z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                        <div className="px-4 py-3 border-b border-zinc-700/50 flex items-center gap-2">
                            <UserPlus className="w-4 h-4 text-zinc-400" />
                            <span className="text-sm font-medium text-white">Join Requests</span>
                            {pendingCount > 0 && (
                                <span className="ml-auto px-2 py-0.5 bg-yellow-500/20 rounded text-xs text-yellow-400 font-medium">
                                    {pendingCount} pending
                                </span>
                            )}
                        </div>

                        <div className="max-h-80 overflow-y-auto">
                            {requests.length === 0 ? (
                                <div className="px-4 py-8 text-center">
                                    <Bell className="w-8 h-8 mx-auto mb-2 text-zinc-600" />
                                    <p className="text-zinc-500 text-sm">No pending requests</p>
                                </div>
                            ) : (
                                <div className="divide-y divide-zinc-700/50">
                                    {requests.map((request) => {
                                        const isProcessing = processingIds.has(request.user_id);
                                        return (
                                            <div
                                                key={request.user_id}
                                                className="px-4 py-3 flex items-center gap-3"
                                            >
                                                {/* Avatar */}
                                                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center flex-shrink-0">
                                                    <span className="text-white font-medium text-sm">
                                                        {request.username.substring(0, 2).toUpperCase()}
                                                    </span>
                                                </div>

                                                {/* Info */}
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-white font-medium text-sm truncate">
                                                        {request.username}
                                                    </p>
                                                    <p className="text-zinc-500 text-xs">
                                                        Wants to join
                                                    </p>
                                                </div>

                                                {/* Actions */}
                                                <div className="flex items-center gap-1">
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        onClick={() => handleRequest(request.user_id, false)}
                                                        disabled={isProcessing}
                                                        className="p-2 h-8 w-8 hover:bg-zinc-600/20 hover:text-zinc-300"
                                                    >
                                                        <X className="w-4 h-4" />
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        onClick={() => handleRequest(request.user_id, true)}
                                                        disabled={isProcessing}
                                                        className="p-2 h-8 w-8 bg-green-600 hover:bg-green-700"
                                                    >
                                                        {isProcessing ? (
                                                            <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                                        ) : (
                                                            <Check className="w-4 h-4" />
                                                        )}
                                                    </Button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
