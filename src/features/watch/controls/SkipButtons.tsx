'use client';

import React from 'react';
import { SkipBack, SkipForward } from 'lucide-react';

interface SkipButtonProps {
    direction: 'back' | 'forward';
    seconds?: number;
    onSkip: () => void;
}

export function SkipButton({ direction, seconds = 10, onSkip }: SkipButtonProps) {
    const Icon = direction === 'back' ? SkipBack : SkipForward;

    return (
        <button
            onClick={onSkip}
            className="p-2 rounded-full hover:bg-white/20 transition-colors group relative"
            title={`Skip ${direction === 'back' ? 'back' : 'forward'} ${seconds}s`}
        >
            <Icon className="w-5 h-5 text-white" />
            <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 text-[10px] text-white/70 font-medium">
                {seconds}
            </span>
        </button>
    );
}

// Animated skip indicator that shows on seek
interface SeekIndicatorProps {
    seconds: number;
    direction: 'back' | 'forward';
    isVisible: boolean;
}

export function SeekIndicator({ seconds, direction, isVisible }: SeekIndicatorProps) {
    if (!isVisible) return null;

    return (
        <div
            className={`absolute top-1/2 -translate-y-1/2 ${direction === 'back' ? 'left-1/4' : 'right-1/4'} 
                        flex flex-col items-center gap-1 animate-in fade-in zoom-in-50 duration-200`}
        >
            <div className="w-16 h-16 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center">
                {direction === 'back' ? (
                    <SkipBack className="w-8 h-8 text-white" />
                ) : (
                    <SkipForward className="w-8 h-8 text-white" />
                )}
            </div>
            <span className="text-white font-medium text-sm">{seconds}s</span>
        </div>
    );
}
