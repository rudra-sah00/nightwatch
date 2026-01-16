'use client';

import { cn } from '@/lib/utils';
import { LucideIcon, Loader2 } from 'lucide-react';

interface ControlButtonProps {
    icon: LucideIcon;
    onClick: () => void | Promise<void>;
    isActive?: boolean;
    isDanger?: boolean;
    disabled?: boolean;
    title?: string;
    className?: string;
}

export function ControlButton({ 
    icon: Icon, 
    onClick, 
    isActive = false, 
    isDanger = false,
    disabled = false,
    title,
    className 
}: ControlButtonProps) {
    return (
        <button
            onClick={onClick}
            disabled={disabled}
            className={cn(
                "flex-1 h-9 rounded-xl flex items-center justify-center transition-all duration-200",
                "backdrop-blur-sm border",
                disabled 
                    ? "opacity-50 cursor-not-allowed"
                    : "hover:scale-[1.02] active:scale-[0.98]",
                isActive 
                    ? "bg-red-500/90 hover:bg-red-500 text-white border-red-400/30 shadow-lg shadow-red-500/20" 
                    : isDanger
                        ? "bg-red-500/90 hover:bg-red-500 text-white border-red-400/30 shadow-lg shadow-red-500/20"
                        : "bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white border-white/10",
                className
            )}
            title={title}
        >
            {disabled ? (
                <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
                <Icon className="w-4 h-4" />
            )}
        </button>
    );
}
