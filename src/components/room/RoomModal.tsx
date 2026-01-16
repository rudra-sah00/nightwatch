'use client';

import { useState, useEffect, useRef } from 'react';
import { createRoom, joinRoom } from '@/lib/api';
import { Room } from '@/services/api/rooms';
import { getWebSocketToken } from '@/services/api/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckIcon, ClockIcon, XMarkIcon, ClipboardIcon, UsersIcon } from '@heroicons/react/24/outline';

const PENDING_TIMEOUT_MS = 30000; // 30 seconds timeout
const MAX_ATTEMPTS = 3;

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
    const [attemptCount, setAttemptCount] = useState(0);
    const [timeRemaining, setTimeRemaining] = useState(0);
    
    const wsRef = useRef<WebSocket | null>(null);
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Reset state when modal opens
    useEffect(() => {
        if (isOpen) {
            setMode(initialMode);
            setJoinCode('');
            setError('');
            setRoomInfo(null);
            setPendingMessage('');
            setCopied(false);
            setAttemptCount(0);
            setTimeRemaining(0);
        }
    }, [isOpen, initialMode]);

    // Auto-create room when opened in create mode
    useEffect(() => {
        if (isOpen && mode === 'create' && !roomInfo && !isLoading && !error) {
            handleCreate();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen, mode]);

    // WebSocket connection for pending state
    useEffect(() => {
        if (!pendingMessage || !joinCode) return;

        let ws: WebSocket | null = null;
        let countdownInterval: NodeJS.Timeout | null = null;

        const connectWebSocket = async () => {
            // Get a short-lived token for WebSocket authentication
            const token = await getWebSocketToken();
            if (!token) {
                setError('Authentication required');
                setPendingMessage('');
                return;
            }

            // Connect to pending WebSocket - use backend URL directly (not through Next.js proxy)
            const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8080';
            const wsBackendUrl = backendUrl.replace(/^http/, 'ws');
            const wsUrl = `${wsBackendUrl}/api/rooms/${joinCode.toUpperCase()}/ws/pending?token=${token}`;
            
            console.log('Connecting to pending WebSocket:', wsUrl);
            ws = new WebSocket(wsUrl);
            wsRef.current = ws;

            // Start countdown timer
            setTimeRemaining(PENDING_TIMEOUT_MS / 1000);
            countdownInterval = setInterval(() => {
                setTimeRemaining(prev => {
                    if (prev <= 1) {
                        if (countdownInterval) clearInterval(countdownInterval);
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);

            // Set timeout for request
            timeoutRef.current = setTimeout(() => {
                ws?.close();
                setPendingMessage('');
                setError('Request timed out. The host did not respond in time.');
            }, PENDING_TIMEOUT_MS);

            ws.onopen = () => {
                console.log('Connected to pending WebSocket');
            };

            ws.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    console.log('Received WebSocket event:', data);
                    
                    if (data.type === 'join_request_approved') {
                        // Clear timeout and close WS
                        if (timeoutRef.current) clearTimeout(timeoutRef.current);
                        if (countdownInterval) clearInterval(countdownInterval);
                        ws?.close();
                        
                        // Fetch the room data now that we're approved
                        handleApproved();
                    } else if (data.type === 'join_request_rejected') {
                        if (timeoutRef.current) clearTimeout(timeoutRef.current);
                        if (countdownInterval) clearInterval(countdownInterval);
                        ws?.close();
                        
                        setPendingMessage('');
                        setError('Your join request was rejected by the host.');
                    }
                } catch (e) {
                    console.error('Error parsing WebSocket message:', e);
                }
            };

            ws.onerror = (error) => {
                console.error('WebSocket error:', error);
            };

            ws.onclose = () => {
                console.log('Pending WebSocket closed');
            };
        };

        connectWebSocket();

        return () => {
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
            if (countdownInterval) clearInterval(countdownInterval);
            if (wsRef.current) {
                wsRef.current.close();
                wsRef.current = null;
            }
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [pendingMessage, joinCode]);

    // Cleanup on unmount or close
    useEffect(() => {
        return () => {
            if (wsRef.current) {
                wsRef.current.close();
                wsRef.current = null;
            }
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
        };
    }, []);

    const handleApproved = async () => {
        // Re-fetch room data after approval
        const result = await joinRoom(joinCode.toUpperCase());
        
        if (result.data && 'livekit_token' in result.data && 'room' in result.data) {
            setRoomInfo({ code: joinCode.toUpperCase(), token: result.data.livekit_token });
            setPendingMessage('');
            if (onRoomJoined) {
                onRoomJoined(result.data.room as Room, result.data.livekit_token);
            }
        } else {
            setError('Failed to join room after approval');
            setPendingMessage('');
        }
    };

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

        // Check attempt limit
        if (attemptCount >= MAX_ATTEMPTS) {
            setError(`Maximum attempts reached (${MAX_ATTEMPTS}). Please try again later.`);
            return;
        }

        setIsLoading(true);
        setError('');

        const result = await joinRoom(joinCode.toUpperCase());

        if (result.data) {
            if ('status' in result.data && result.data.status === 'pending') {
                const pendingData = result.data as { message: string; status: 'pending' };
                setPendingMessage(pendingData.message);
                setAttemptCount(prev => prev + 1);
            } else if ('status' in result.data && result.data.status === 'rejected') {
                // Previously rejected - increment attempt and show error
                setAttemptCount(prev => prev + 1);
                setError('Your previous request was rejected. You can try again.');
            } else if ('livekit_token' in result.data && 'room' in result.data) {
                // It's a JoinRoomResponse (direct join or already approved)
                const joinData = result.data as { room: Room; livekit_token: string };
                setRoomInfo({ code: joinCode.toUpperCase(), token: joinData.livekit_token });
                if (onRoomJoined) {
                    onRoomJoined(joinData.room, joinData.livekit_token);
                }
            }
        } else {
            // Check if error mentions max attempts
            if (result.error?.includes('Maximum')) {
                setAttemptCount(MAX_ATTEMPTS);
            }
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
                            <div className="w-16 h-16 mx-auto bg-yellow-900/30 rounded-full flex items-center justify-center ring-2 ring-yellow-500/30 relative">
                                <ClockIcon className="w-8 h-8 text-yellow-400 animate-pulse" />
                                {/* Countdown ring */}
                                <svg className="absolute inset-0 w-16 h-16 -rotate-90" viewBox="0 0 64 64">
                                    <circle
                                        cx="32"
                                        cy="32"
                                        r="28"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="4"
                                        className="text-yellow-500/20"
                                    />
                                    <circle
                                        cx="32"
                                        cy="32"
                                        r="28"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="4"
                                        strokeDasharray={`${(timeRemaining / 30) * 176} 176`}
                                        className="text-yellow-500 transition-all duration-1000"
                                    />
                                </svg>
                            </div>
                            <div>
                                <Badge variant="warning" className="mb-3">Waiting for Approval</Badge>
                                <p className="text-white mb-2">{pendingMessage}</p>
                                <div className="flex items-center justify-center gap-2 text-zinc-500 text-sm">
                                    <span className="font-mono text-yellow-400">{timeRemaining}s</span>
                                    <span>remaining</span>
                                    <span className="text-zinc-600">•</span>
                                    <span>Attempt {attemptCount}/{MAX_ATTEMPTS}</span>
                                </div>
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

                            {attemptCount > 0 && attemptCount < MAX_ATTEMPTS && (
                                <p className="text-zinc-500 text-xs text-center">
                                    Attempts remaining: {MAX_ATTEMPTS - attemptCount}
                                </p>
                            )}

                            <Button
                                onClick={handleJoin}
                                disabled={isLoading || joinCode.length !== 6 || attemptCount >= MAX_ATTEMPTS}
                                className="w-full h-12 text-base"
                            >
                                {isLoading ? (
                                    <span className="flex items-center gap-2">
                                        <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                                        Joining...
                                    </span>
                                ) : attemptCount >= MAX_ATTEMPTS ? 'Max Attempts Reached' : 'Join Room'}
                            </Button>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
