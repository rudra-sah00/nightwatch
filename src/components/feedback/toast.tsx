'use client';

import React, { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { CheckCircle, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';

interface ToastProps {
    message: string;
    type?: 'success' | 'error' | 'warning' | 'info';
    duration?: number;
    onClose: () => void;
}

export function Toast({
    message,
    type = 'info',
    duration = 5000,
    onClose,
}: ToastProps) {
    const [isVisible, setIsVisible] = useState(false);
    const [isLeaving, setIsLeaving] = useState(false);

    useEffect(() => {
        // Animate in
        const showParams = requestAnimationFrame(() => setIsVisible(true));

        // Auto dismiss
        const timer = setTimeout(() => {
            handleClose();
        }, duration);

        return () => {
            clearTimeout(timer);
            cancelAnimationFrame(showParams);
        }
    }, [duration]);

    const handleClose = () => {
        setIsLeaving(true);
        setTimeout(() => {
            onClose();
        }, 300);
    };

    const typeStyles = {
        success: 'bg-green-500/10 border-green-500/20 text-green-500',
        error: 'bg-destructive/10 border-destructive/20 text-destructive',
        warning: 'bg-yellow-500/10 border-yellow-500/20 text-yellow-500',
        info: 'bg-primary/10 border-primary/20 text-primary',
    };

    const icons = {
        success: <CheckCircle className="w-5 h-5" />,
        error: <AlertCircle className="w-5 h-5" />,
        warning: <AlertTriangle className="w-5 h-5" />,
        info: <Info className="w-5 h-5" />,
    };

    return (
        <div
            className={cn(
                "fixed top-4 right-4 z-50 flex items-center gap-3 px-4 py-3 rounded-lg border backdrop-blur-md transition-all duration-300 ease-out shadow-lg",
                typeStyles[type],
                isVisible && !isLeaving ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-8'
            )}
        >
            {icons[type]}
            <span className="text-sm font-medium">{message}</span>
            <button
                onClick={handleClose}
                className="ml-2 p-1 rounded-full hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
            >
                <X className="w-4 h-4" />
            </button>
        </div>
    );
}
