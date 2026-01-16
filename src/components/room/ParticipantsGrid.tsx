'use client';

import { useEffect, useState, useRef } from 'react';
import { Room as LiveKitRoom, RemoteParticipant, RemoteTrackPublication, Track } from 'livekit-client';
import { Mic, MicOff, Crown } from 'lucide-react';

interface ParticipantTile {
    identity: string;
    name: string;
    isLocal: boolean;
    isHost: boolean;
    videoElement: HTMLVideoElement | null;
    audioMuted: boolean;
}

interface ParticipantsGridProps {
    livekitRoom: LiveKitRoom | null;
    isConnected: boolean;
    hostId: string;
    currentUserId: string;
}

export function ParticipantsGrid({ livekitRoom, isConnected, hostId, currentUserId }: ParticipantsGridProps) {
    const [participants, setParticipants] = useState<ParticipantTile[]>([]);
    const videoRefs = useRef<Map<string, HTMLVideoElement>>(new Map());

    useEffect(() => {
        if (!livekitRoom || !isConnected) {
            setParticipants([]);
            return;
        }

        const updateParticipants = () => {
            const tiles: ParticipantTile[] = [];

            // Add local participant
            const localParticipant = livekitRoom.localParticipant;
            tiles.push({
                identity: localParticipant.identity,
                name: localParticipant.name || localParticipant.identity,
                isLocal: true,
                isHost: localParticipant.identity === hostId,
                videoElement: null, // Local video is handled separately
                audioMuted: !localParticipant.isMicrophoneEnabled,
            });

            // Add remote participants
            livekitRoom.remoteParticipants.forEach((participant: RemoteParticipant) => {
                tiles.push({
                    identity: participant.identity,
                    name: participant.name || participant.identity,
                    isLocal: false,
                    isHost: participant.identity === hostId,
                    videoElement: null,
                    audioMuted: !participant.isMicrophoneEnabled,
                });
            });

            setParticipants(tiles);
        };

        // Initial update
        updateParticipants();

        // Subscribe to participant events
        const handleParticipantConnected = () => updateParticipants();
        const handleParticipantDisconnected = () => updateParticipants();
        const handleTrackSubscribed = (track: Track, publication: RemoteTrackPublication, participant: RemoteParticipant) => {
            if (track.kind === Track.Kind.Video) {
                const videoElement = videoRefs.current.get(participant.identity);
                if (videoElement) {
                    track.attach(videoElement);
                }
            }
            updateParticipants();
        };
        const handleTrackUnsubscribed = (track: Track) => {
            track.detach();
            updateParticipants();
        };
        const handleTrackMuted = () => updateParticipants();
        const handleTrackUnmuted = () => updateParticipants();

        livekitRoom.on('participantConnected', handleParticipantConnected);
        livekitRoom.on('participantDisconnected', handleParticipantDisconnected);
        livekitRoom.on('trackSubscribed', handleTrackSubscribed);
        livekitRoom.on('trackUnsubscribed', handleTrackUnsubscribed);
        livekitRoom.on('trackMuted', handleTrackMuted);
        livekitRoom.on('trackUnmuted', handleTrackUnmuted);

        // Attach existing remote video tracks
        livekitRoom.remoteParticipants.forEach((participant: RemoteParticipant) => {
            participant.videoTrackPublications.forEach((publication: RemoteTrackPublication) => {
                if (publication.track && publication.isSubscribed) {
                    const videoElement = videoRefs.current.get(participant.identity);
                    if (videoElement) {
                        publication.track.attach(videoElement);
                    }
                }
            });
        });

        return () => {
            livekitRoom.off('participantConnected', handleParticipantConnected);
            livekitRoom.off('participantDisconnected', handleParticipantDisconnected);
            livekitRoom.off('trackSubscribed', handleTrackSubscribed);
            livekitRoom.off('trackUnsubscribed', handleTrackUnsubscribed);
            livekitRoom.off('trackMuted', handleTrackMuted);
            livekitRoom.off('trackUnmuted', handleTrackUnmuted);
        };
    }, [livekitRoom, isConnected, hostId]);

    if (participants.length === 0) {
        return null;
    }

    return (
        <div className="fixed bottom-6 left-0 right-0 z-50 px-6">
            <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-transparent">
                {participants.map((participant) => {
                    const hasVideo = !participant.isLocal && livekitRoom ? 
                        (() => {
                            const remoteParticipant = livekitRoom.remoteParticipants.get(participant.identity);
                            return remoteParticipant ? remoteParticipant.videoTrackPublications.size > 0 : false;
                        })() : false;
                    
                    return (
                        <div
                            key={participant.identity}
                            className="relative flex-shrink-0 w-40 h-28 bg-zinc-900 rounded-lg overflow-hidden border-2 border-zinc-700 shadow-xl"
                        >
                            {/* Video Element */}
                            {!participant.isLocal && (
                                <video
                                    ref={(el) => {
                                        if (el) {
                                            videoRefs.current.set(participant.identity, el);
                                            // Try to attach track if it already exists
                                            if (livekitRoom) {
                                                const remoteParticipant = livekitRoom.remoteParticipants.get(participant.identity);
                                                if (remoteParticipant) {
                                                    remoteParticipant.videoTrackPublications.forEach((pub: RemoteTrackPublication) => {
                                                        if (pub.track && pub.isSubscribed) {
                                                            pub.track.attach(el);
                                                        }
                                                    });
                                                }
                                            }
                                        } else {
                                            videoRefs.current.delete(participant.identity);
                                        }
                                    }}
                                    className="w-full h-full object-cover"
                                    autoPlay
                                    playsInline
                                />
                            )}

                            {/* Avatar fallback - only show when no video */}
                            {!hasVideo && (
                                <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-zinc-800 to-zinc-900">
                                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center text-white text-lg font-bold">
                                        {participant.name.substring(0, 2).toUpperCase()}
                                    </div>
                                </div>
                            )}

                            {/* Overlay Info */}
                            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2 flex-1 min-w-0">
                                        <span className="text-white text-xs font-medium truncate">
                                            {participant.name}
                                        </span>
                                        {participant.isHost && (
                                            <Crown className="w-3 h-3 text-yellow-400 flex-shrink-0" />
                                        )}
                                        {participant.isLocal && (
                                            <span className="text-[10px] text-green-400 flex-shrink-0">(You)</span>
                                        )}
                                    </div>
                                    {participant.audioMuted ? (
                                        <MicOff className="w-3 h-3 text-zinc-400 flex-shrink-0" />
                                    ) : (
                                        <Mic className="w-3 h-3 text-green-400 flex-shrink-0" />
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
