'use client';

import React, { useState, useCallback } from 'react';
import { Volume2, VolumeX, Volume1 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface VolumeProps {
    volume: number;
    isMuted: boolean;
    onVolumeChange: (volume: number) => void;
    onMuteToggle: () => void;
}

export function Volume({ volume, isMuted, onVolumeChange, onMuteToggle }: VolumeProps) {
    const [isHovered, setIsHovered] = useState(false);

    const handleSliderChange = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const percent = (e.clientX - rect.left) / rect.width;
        onVolumeChange(Math.max(0, Math.min(1, percent)));
    }, [onVolumeChange]);

    const VolumeIcon = isMuted || volume === 0
        ? VolumeX
        : volume < 0.5
            ? Volume1
            : Volume2;

    return (
        <div
            className="flex items-center gap-2 group"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            <button
                onClick={onMuteToggle}
                className={cn(
                    "p-3 rounded-full",
                    "transition-all duration-300 ease-out",
                    "bg-white/5 backdrop-blur-sm border border-white/10",
                    "hover:bg-white/15 hover:border-white/20 hover:scale-105",
                    "active:scale-95 active:bg-white/20",
                    "shadow-lg shadow-black/20"
                )}
            >
                <VolumeIcon className="w-5 h-5 text-white drop-shadow-sm" />
            </button>

            {/* Slider - expands on hover with premium styling */}
            <div
                className={cn(
                    "overflow-hidden transition-all duration-300 ease-out",
                    isHovered ? "w-28 opacity-100" : "w-0 opacity-0"
                )}
            >
                <div
                    className="relative h-1.5 w-28 bg-white/10 rounded-full cursor-pointer group/slider backdrop-blur-sm"
                    onClick={handleSliderChange}
                    onMouseMove={(e) => e.buttons === 1 && handleSliderChange(e)}
                >
                    {/* Volume fill with gradient */}
                    <div
                        className="absolute h-full rounded-full bg-gradient-to-r from-white/80 to-white transition-all duration-150"
                        style={{ width: `${isMuted ? 0 : volume * 100}%` }}
                    />
                    {/* Slider handle */}
                    <div
                        className={cn(
                            "absolute top-1/2 -translate-y-1/2 w-3.5 h-3.5 bg-white rounded-full shadow-md",
                            "transition-all duration-200 ease-out",
                            "group-hover/slider:scale-125 group-hover/slider:shadow-lg"
                        )}
                        style={{ left: `calc(${isMuted ? 0 : volume * 100}% - 7px)` }}
                    />
                </div>
            </div>
        </div>
    );
}

