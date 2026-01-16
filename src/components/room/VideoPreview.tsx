'use client';

interface VideoPreviewProps {
    username?: string;
    videoRef: React.RefObject<HTMLVideoElement | null>;
    isHidden?: boolean;
}

export function VideoPreview({ username, videoRef, isHidden = false }: VideoPreviewProps) {
    // Get initials from username
    const getInitials = (name?: string) => {
        if (!name) return 'ME';
        const parts = name.trim().split(/\s+/);
        if (parts.length === 1) {
            return parts[0].substring(0, 2).toUpperCase();
        }
        return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    };

    // Generate consistent color from username
    const getAvatarColor = (name?: string) => {
        const colors = [
            'from-blue-500 to-blue-700',
            'from-green-500 to-green-700',
            'from-purple-500 to-purple-700',
            'from-pink-500 to-pink-700',
            'from-indigo-500 to-indigo-700',
            'from-teal-500 to-teal-700',
            'from-orange-500 to-orange-700',
            'from-cyan-500 to-cyan-700',
        ];
        if (!name) return colors[0];
        const hash = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
        return colors[hash % colors.length];
    };

    return (
        <div className="fixed bottom-6 right-6 z-40 w-48 h-36 bg-zinc-900 rounded-xl overflow-hidden border-2 border-zinc-700 shadow-2xl shadow-black/50 transition-all duration-300">
            {/* Video Element - always rendered but hidden when video is off */}
            <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className={`w-full h-full object-cover mirror transition-opacity duration-300 ${isHidden ? 'opacity-0' : 'opacity-100'}`}
            />

            {/* Avatar Placeholder when video is off */}
            {isHidden && (
                <div className={`absolute inset-0 bg-gradient-to-br ${getAvatarColor(username)} flex items-center justify-center`}>
                    <span className="text-3xl font-bold text-white">
                        {getInitials(username)}
                    </span>
                </div>
            )}

            {/* Username Badge */}
            <div className="absolute bottom-2 left-2 px-2.5 py-1 bg-black/70 backdrop-blur-sm rounded-lg text-xs text-white font-medium flex items-center gap-1.5">
                {isHidden && (
                    <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M3.41 2L2 3.41l3.12 3.12A11.92 11.92 0 002.5 12C4 18.21 8.5 22 15 22c1.95 0 3.75-.5 5.27-1.35L22.59 23 24 21.59 3.41 2zM15 19.5c-5.04 0-8.64-3.17-9.99-7.5.57-1.8 1.54-3.39 2.78-4.67l2.35 2.33a3.5 3.5 0 004.2 4.2l2.35 2.33c-1.01.53-2.17.81-3.69.81zM15 4.5c5.04 0 8.64 3.17 9.99 7.5-.42 1.32-1.06 2.55-1.89 3.66l-1.46-1.46a5.98 5.98 0 00-1.14-7.55A5.99 5.99 0 0015 4.5c-.67 0-1.31.1-1.92.29l-1.46-1.46A10.44 10.44 0 0115 4.5z" />
                    </svg>
                )}
                {username || 'You'}
            </div>

            {/* Live indicator */}
            {!isHidden && (
                <div className="absolute top-2 right-2 flex items-center gap-1.5 px-2 py-0.5 bg-white/90 text-black rounded-full">
                    <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                    <span className="text-[10px] font-bold text-white">LIVE</span>
                </div>
            )}
        </div>
    );
}

