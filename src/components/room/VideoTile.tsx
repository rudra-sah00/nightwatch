'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { Track, Participant, TrackPublication, RemoteTrack, RemoteTrackPublication, LocalTrackPublication } from 'livekit-client';
import { cn } from '@/lib/utils';
import { Mic, MicOff, VideoOff } from 'lucide-react';
import { ParticipantAvatar } from '@/components/ui/ParticipantAvatar';

interface VideoTileProps {
    participant: Participant;
    name?: string;
    username?: string;
    isCurrentUser?: boolean;
    className?: string;
}

export function VideoTile({ 
    participant, 
    name, 
    username, 
    isCurrentUser = false,
    className 
}: VideoTileProps) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const audioRef = useRef<HTMLAudioElement>(null);
    const [videoEnabled, setVideoEnabled] = useState(false);
    const [audioMuted, setAudioMuted] = useState(true);
    
    // Function to check current track states
    const updateTrackStates = useCallback(() => {
        const videoTrack = participant.getTrackPublication(Track.Source.Camera);
        const audioTrack = participant.getTrackPublication(Track.Source.Microphone);
        setVideoEnabled(!!videoTrack?.track && !videoTrack?.isMuted);
        setAudioMuted(!audioTrack?.track || audioTrack?.isMuted);
    }, [participant]);
    
    // Subscribe to track changes
    useEffect(() => {
        // Check initial state
        updateTrackStates();
        
        // For remote participants - when track is subscribed
        const handleTrackSubscribed = (_track: RemoteTrack, pub: RemoteTrackPublication) => {
            console.log('VideoTile: Track subscribed:', pub.source, 'for', participant.identity);
            if (pub.source === Track.Source.Camera) {
                setVideoEnabled(!pub.isMuted && !!pub.track);
            } else if (pub.source === Track.Source.Microphone) {
                setAudioMuted(pub.isMuted || !pub.track);
            }
        };
        
        // For remote participants - when track is published (before subscription)
        const handleTrackPublished = (pub: RemoteTrackPublication) => {
            console.log('VideoTile: Track published:', pub.source, 'for', participant.identity);
            // Force re-check of states when any track is published
            updateTrackStates();
        };
        
        const handleTrackMuted = (pub: TrackPublication) => {
            console.log('VideoTile: Track muted:', pub.source, 'for', participant.identity);
            if (pub.source === Track.Source.Camera) {
                setVideoEnabled(false);
            } else if (pub.source === Track.Source.Microphone) {
                setAudioMuted(true);
            }
        };
        
        const handleTrackUnmuted = (pub: TrackPublication) => {
            console.log('VideoTile: Track unmuted:', pub.source, 'for', participant.identity);
            if (pub.source === Track.Source.Camera) {
                setVideoEnabled(!!pub.track);
            } else if (pub.source === Track.Source.Microphone) {
                setAudioMuted(!pub.track);
            }
        };
        
        // For local participant
        const handleLocalTrackPublished = (pub: LocalTrackPublication) => {
            console.log('VideoTile: Local track published:', pub.source, 'for', participant.identity);
            if (pub.source === Track.Source.Camera) {
                setVideoEnabled(!pub.isMuted && !!pub.track);
            } else if (pub.source === Track.Source.Microphone) {
                setAudioMuted(pub.isMuted || !pub.track);
            }
        };
        
        participant.on('trackSubscribed', handleTrackSubscribed);
        participant.on('trackPublished', handleTrackPublished);
        participant.on('trackMuted', handleTrackMuted);
        participant.on('trackUnmuted', handleTrackUnmuted);
        participant.on('localTrackPublished', handleLocalTrackPublished);
        participant.on('localTrackUnpublished', updateTrackStates);
        
        return () => {
            participant.off('trackSubscribed', handleTrackSubscribed);
            participant.off('trackPublished', handleTrackPublished);
            participant.off('trackMuted', handleTrackMuted);
            participant.off('trackUnmuted', handleTrackUnmuted);
            participant.off('localTrackPublished', handleLocalTrackPublished);
            participant.off('localTrackUnpublished', updateTrackStates);
        };
    }, [participant, updateTrackStates]);
    
    const isSpeaking = participant.isSpeaking;

    // Attach video track to video element
    useEffect(() => {
        const videoTrack = participant.getTrackPublication(Track.Source.Camera);
        if (videoRef.current && videoTrack?.track && videoEnabled) {
            videoTrack.track.attach(videoRef.current);
            return () => {
                videoTrack.track?.detach(videoRef.current!);
            };
        }
    }, [participant, videoEnabled]);

    // Attach audio track to audio element (for remote participants only)
    useEffect(() => {
        // Don't play our own audio back to us
        if (isCurrentUser) return;
        
        const audioTrack = participant.getTrackPublication(Track.Source.Microphone);
        if (audioRef.current && audioTrack?.track) {
            console.log('VideoTile: Attaching audio for:', participant.identity);
            audioTrack.track.attach(audioRef.current);
            return () => {
                console.log('VideoTile: Detaching audio for:', participant.identity);
                audioTrack.track?.detach(audioRef.current!);
            };
        }
    }, [participant, audioMuted, isCurrentUser]);

    const displayName = name || username || participant.identity || 'Unknown';

    return (
        <div 
            className={cn(
                "relative rounded-lg overflow-hidden bg-zinc-800/50 border transition-all duration-200",
                isSpeaking 
                    ? "border-green-500/50 shadow-lg shadow-green-500/10" 
                    : "border-white/5",
                className
            )}
        >
            {/* Video or Avatar */}
            {videoEnabled ? (
                <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted={isCurrentUser}
                    className="w-full h-full object-cover"
                />
            ) : (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-zinc-800 to-zinc-900">
                    <ParticipantAvatar 
                        name={name} 
                        username={username} 
                        size="md"
                    />
                </div>
            )}

            {/* Overlay info */}
            <div className="absolute inset-x-0 bottom-0 p-1.5 bg-gradient-to-t from-black/80 via-black/40 to-transparent">
                <div className="flex items-center justify-between gap-1">
                    <span className="text-[11px] font-medium text-white truncate">
                        {displayName}
                        {isCurrentUser && <span className="text-zinc-400 ml-1">(You)</span>}
                    </span>
                    <div className="flex items-center gap-0.5">
                        {audioMuted && (
                            <div className="p-0.5 rounded bg-red-500/80">
                                <MicOff className="w-2.5 h-2.5 text-white" />
                            </div>
                        )}
                        {!videoEnabled && (
                            <div className="p-0.5 rounded bg-zinc-600/80">
                                <VideoOff className="w-2.5 h-2.5 text-white" />
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Speaking indicator */}
            {isSpeaking && (
                <div className="absolute inset-0 border-2 border-green-500 rounded-lg pointer-events-none animate-pulse" />
            )}

            {/* Hidden audio element for remote participant audio playback */}
            {!isCurrentUser && (
                <audio ref={audioRef} autoPlay playsInline />
            )}
        </div>
    );
}
