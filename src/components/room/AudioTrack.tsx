'use client';

import { useEffect, useRef, useState } from 'react';
import { Track, Participant, TrackPublication, RemoteTrack, RemoteTrackPublication, LocalTrackPublication } from 'livekit-client';

interface AudioTrackProps {
    participant: Participant;
    isCurrentUser?: boolean;
}

/**
 * Renders a hidden audio element that plays the audio track of a remote participant.
 * This component should be rendered for each remote participant to enable audio playback.
 * It will not play audio for the current user (to avoid feedback).
 */
export function AudioTrack({ participant, isCurrentUser = false }: AudioTrackProps) {
    const audioRef = useRef<HTMLAudioElement>(null);
    const [hasAudio, setHasAudio] = useState(false);
    
    // Subscribe to track changes
    useEffect(() => {
        if (isCurrentUser) return;
        
        const checkAudioTrack = () => {
            const audioTrack = participant.getTrackPublication(Track.Source.Microphone);
            setHasAudio(!!audioTrack?.track && !audioTrack?.isMuted);
        };
        
        // Check initial state
        checkAudioTrack();
        
        const handleTrackSubscribed = (_track: RemoteTrack, pub: RemoteTrackPublication) => {
            if (pub.source === Track.Source.Microphone) {
                setHasAudio(!pub.isMuted && !!pub.track);
            }
        };
        
        const handleTrackMuted = (pub: TrackPublication) => {
            if (pub.source === Track.Source.Microphone) {
                setHasAudio(false);
            }
        };
        
        const handleTrackUnmuted = (pub: TrackPublication) => {
            if (pub.source === Track.Source.Microphone) {
                setHasAudio(!!pub.track);
            }
        };
        
        participant.on('trackSubscribed', handleTrackSubscribed);
        participant.on('trackMuted', handleTrackMuted);
        participant.on('trackUnmuted', handleTrackUnmuted);
        
        return () => {
            participant.off('trackSubscribed', handleTrackSubscribed);
            participant.off('trackMuted', handleTrackMuted);
            participant.off('trackUnmuted', handleTrackUnmuted);
        };
    }, [participant, isCurrentUser]);

    // Attach audio track
    useEffect(() => {
        if (isCurrentUser) return;
        
        const audioTrack = participant.getTrackPublication(Track.Source.Microphone);
        if (audioRef.current && audioTrack?.track) {
            console.log('AudioTrack: Attaching audio for:', participant.identity, 'hasAudio:', hasAudio);
            audioTrack.track.attach(audioRef.current);
            return () => {
                console.log('AudioTrack: Detaching audio for:', participant.identity);
                audioTrack.track?.detach(audioRef.current!);
            };
        }
    }, [participant, hasAudio, isCurrentUser]);

    // Don't render anything for current user
    if (isCurrentUser) return null;

    return <audio ref={audioRef} autoPlay playsInline />;
}
