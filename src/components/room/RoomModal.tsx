'use client';

import { useState, useEffect } from 'react';
import { createRoom, joinRoom } from '@/lib/api';
import { Room } from '@/services/api/rooms';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckIcon, ClockIcon, XMarkIcon, ClipboardIcon, UsersIcon } from '@heroicons/react/24/outline';

interface RoomModalProps {
    isOpen: boolean;
    onClose: () => void;
    videoId?: string;
    videoTitle?: string;
    initialMode?: 'select' | 'create' | 'join';
    onRoomJoined?: (room: Room, token?: string) => void;
}

export function RoomModal({ isOpen, onClose, videoId, videoTitle, initialMode = 'select', onRoomJoined }: RoomModalProps) {
    const [mode, setMode] = useState<'select' | 'create' | 'join'>(initialMode);
    const [joinCode, setJoinCode] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [roomInfo, setRoomInfo] = useState<{ code: string; token: string } | null>(null);
    const [pendingMessage, setPendingMessage] = useState('');
    const [copied, setCopied] = useState(false);

    // Reset state when modal opens
    useEffect(() => {
        if (isOpen) {
            setMode(initialMode);
            setJoinCode('');
            setError('');
            setRoomInfo(null);
            setPendingMessage('');
            setCopied(false);
        }
    }, [isOpen, initialMode]);

    // Auto-create room when opened in create mode
    useEffect(() => {
        if (isOpen && mode === 'create' && !roomInfo && !isLoading && !error) {
            handleCreate();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen, mode]);

    // Poll for approval when in pending state
    useEffect(() => {
        if (!pendingMessage || !joinCode) return;

        const checkApproval = async () => {
            const result = await joinRoom(joinCode.toUpperCase());

            if (result.data && 'livekit_token' in result.data && 'room' in result.data) {
                // Approved! Join the room
                setRoomInfo({ code: joinCode.toUpperCase(), token: result.data.livekit_token });
                setPendingMessage('');
                if (onRoomJoined) {
                    onRoomJoined(result.data.room as Room, result.data.livekit_token);
                }
            } else if (result.error && result.error.includes('rejected')) {
                // Rejected
                setPendingMessage('');
                setError('Your join request was rejected by the host.');
            }
            // If still pending, keep polling
        };

        // Poll every 2 seconds
        const interval = setInterval(checkApproval, 2000);

        return () => clearInterval(interval);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [pendingMessage, joinCode]);

    if (!isOpen) return null;

    const handleCreate = async () => {
        setIsLoading(true);
        setError('');

        const result = await createRoom(videoId, videoTitle);

        if (result.data) {
            setRoomInfo({
                code: result.data.code || result.data.room.code,
                token: result.data.livekit_token || ''
            });
            if (onRoomJoined && result.data.room) {
                onRoomJoined(result.data.room, result.data.livekit_token);
            }
        } else {
            setError(result.error || 'Failed to create room');
        }

        setIsLoading(false);
    };

    const handleJoin = async () => {
        if (!joinCode.trim() || joinCode.length !== 6) {
            setError('Enter valid 6-digit code');
            return;
        }

        setIsLoading(true);
        setError('');

        const result = await joinRoom(joinCode.toUpperCase());

        if (result.data) {
            if ('status' in result.data && result.data.status === 'pending') {
                const pendingData = result.data as { message: string; status: 'pending' };
                setPendingMessage(pendingData.message);
            } else if ('livekit_token' in result.data && 'room' in result.data) {
                // It's a JoinRoomResponse
                const joinData = result.data as { room: Room; livekit_token: string };
                setRoomInfo({ code: joinCode.toUpperCase(), token: joinData.livekit_token });
                if (onRoomJoined) {
                    onRoomJoined(joinData.room, joinData.livekit_token);
                }
            }
        } else {
            setError(result.error || 'Failed to join');
        }

        setIsLoading(false);
    };

    const handleClose = () => {
        setMode(initialMode);
        setJoinCode('');
        setError('');
        setRoomInfo(null);
        setPendingMessage('');
        onClose();
    };

    const handleCopy = async () => {
        if (roomInfo) {
            await navigator.clipboard.writeText(roomInfo.code);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    return (
        <div
            className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 animate-in fade-in duration-200"
            onClick={handleClose}
        >
            <Card
                className="w-full max-w-md mx-4 border-zinc-700/50 bg-zinc-900/95 backdrop-blur-xl shadow-2xl animate-in slide-in-from-bottom-4 duration-300"
                onClick={(e) => e.stopPropagation()}
            >
                <CardHeader className="relative">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-zinc-800">
                            <UsersIcon className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <CardTitle className="text-xl">
                                {mode === 'create' ? 'Create Room' : 'Join Room'}
                            </CardTitle>
                            <CardDescription>
                                {mode === 'create' ? 'Start a watch party' : 'Enter a room code to join'}
                            </CardDescription>
                        </div>
                    </div>
                    <button
                        onClick={handleClose}
                        className="absolute top-4 right-4 p-2 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
                    >
                        <XMarkIcon className="w-5 h-5" />
                    </button>
                </CardHeader>

                <CardContent className="space-y-6">
                    {/* Success State */}
                    {roomInfo && (
                        <div className="text-center space-y-6 py-4">
                            <div className="w-16 h-16 mx-auto bg-green-900/30 rounded-full flex items-center justify-center ring-2 ring-green-500/30">
                                <CheckIcon className="w-8 h-8 text-green-400" />
                            </div>
                            <div>
                                <Badge variant="success" className="mb-3">Room Created</Badge>
                                <p className="text-zinc-400 text-sm mb-2">Share this code with friends</p>
                                <div className="relative">
                                    <p className="text-5xl font-mono font-bold text-white tracking-[0.3em] py-4 px-6 bg-zinc-800/50 rounded-xl border border-zinc-700/50">
                                        {roomInfo.code}
                                    </p>
                                </div>
                            </div>
                            <Button
                                onClick={handleCopy}
                                variant="secondary"
                                className="gap-2"
                            >
                                <ClipboardIcon className="w-4 h-4" />
                                {copied ? 'Copied!' : 'Copy Code'}
                            </Button>
                        </div>
                    )}

                    {/* Pending State */}
                    {pendingMessage && (
                        <div className="text-center space-y-6 py-4">
                            <div className="w-16 h-16 mx-auto bg-yellow-900/30 rounded-full flex items-center justify-center ring-2 ring-yellow-500/30">
                                <ClockIcon className="w-8 h-8 text-yellow-400 animate-pulse" />
                            </div>
                            <div>
                                <Badge variant="warning" className="mb-3">Waiting for Approval</Badge>
                                <p className="text-white mb-2">{pendingMessage}</p>
                                <p className="text-zinc-500 text-sm">Checking every 2 seconds...</p>
                            </div>
                            <Button
                                variant="outline"
                                onClick={handleClose}
                                className="text-zinc-400 hover:text-white"
                            >
                                Cancel Request
                            </Button>
                        </div>
                    )}

                    {/* Create Mode - Loading */}
                    {mode === 'create' && !roomInfo && (
                        <div className="space-y-4">
                            {error && (
                                <div className="p-4 bg-amber-900/20 border border-amber-800/50 rounded-lg text-amber-400 text-sm flex items-center gap-2">
                                    <XMarkIcon className="w-4 h-4 flex-shrink-0" />
                                    {error}
                                </div>
                            )}
                            {isLoading && (
                                <div className="text-center py-12">
                                    <div className="w-12 h-12 mx-auto mb-4 border-4 border-zinc-700 border-t-white rounded-full animate-spin" />
                                    <p className="text-white font-medium">Creating your room...</p>
                                    <p className="text-zinc-500 text-sm mt-1">This will only take a moment</p>
                                </div>
                            )}
                            {!isLoading && error && (
                                <Button onClick={handleCreate} className="w-full">
                                    Try Again
                                </Button>
                            )}
                        </div>
                    )}

                    {/* Join Mode */}
                    {mode === 'join' && !roomInfo && !pendingMessage && (
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Input
                                    type="text"
                                    value={joinCode}
                                    onChange={(e) => setJoinCode(e.target.value.toUpperCase().slice(0, 6))}
                                    className="text-center text-3xl font-mono tracking-[0.3em] h-16 bg-zinc-800/50 border-zinc-700/50 placeholder:text-zinc-600 placeholder:tracking-[0.2em]"
                                    placeholder="ABC123"
                                    maxLength={6}
                                    autoFocus
                                />
                                <p className="text-zinc-500 text-xs text-center">Enter the 6-character room code</p>
                            </div>

                            {error && (
                                <div className="p-4 bg-amber-900/20 border border-amber-800/50 rounded-lg text-amber-400 text-sm flex items-center gap-2">
                                    <XMarkIcon className="w-4 h-4 flex-shrink-0" />
                                    {error}
                                </div>
                            )}

                            <Button
                                onClick={handleJoin}
                                disabled={isLoading || joinCode.length !== 6}
                                className="w-full h-12 text-base"
                            >
                                {isLoading ? (
                                    <span className="flex items-center gap-2">
                                        <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                                        Joining...
                                    </span>
                                ) : 'Join Room'}
                            </Button>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
