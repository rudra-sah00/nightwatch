'use client';

import { cn } from '@/lib/utils';

interface ParticipantAvatarProps {
  name?: string;
  username?: string;
  isSpeaking?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

// Generate consistent color based on name
const getAvatarGradient = (name: string) => {
  const colors = [
    'from-violet-500 to-purple-600',
    'from-blue-500 to-cyan-500',
    'from-emerald-500 to-teal-500',
    'from-orange-500 to-amber-500',
    'from-pink-500 to-rose-500',
    'from-indigo-500 to-blue-600',
    'from-fuchsia-500 to-pink-600',
    'from-cyan-500 to-blue-500',
  ];
  const index = name.charCodeAt(0) % colors.length;
  return colors[index];
};

export function ParticipantAvatar({
  name,
  username,
  isSpeaking = false,
  size = 'md',
  className,
}: ParticipantAvatarProps) {
  const displayName = name || username || 'U';
  const displayText = displayName.substring(0, 2).toUpperCase();
  const gradient = getAvatarGradient(displayName);

  const sizeClasses = {
    sm: 'w-7 h-7 text-xs',
    md: 'w-9 h-9 text-sm',
    lg: 'w-11 h-11 text-base',
  };

  return (
    <div className="relative group">
      {/* Speaking ring animation */}
      {isSpeaking && (
        <div className="absolute inset-0 rounded-full bg-gradient-to-r from-green-400 to-emerald-500 animate-pulse scale-110" />
      )}
      <div
        className={cn(
          'relative rounded-full flex items-center justify-center font-semibold text-white shadow-lg',
          `bg-gradient-to-br ${gradient}`,
          'ring-2 ring-white/10',
          sizeClasses[size],
          isSpeaking && 'ring-2 ring-green-400/50',
          'transition-all duration-200',
          className
        )}
      >
        {displayText}
      </div>
      {/* Online indicator */}
      <div
        className={cn(
          'absolute -bottom-0.5 -right-0.5 rounded-full border-2 border-zinc-900',
          isSpeaking ? 'w-3.5 h-3.5 bg-green-500' : 'w-3 h-3 bg-green-500',
          'transition-all duration-200'
        )}
      />
    </div>
  );
}
