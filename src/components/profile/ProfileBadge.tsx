'use client';

/**
 * Profile Badge - Avatar in header that links to profile page
 * Tailwind CSS optimized
 */

import { User } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';

interface ProfileBadgeProps {
  className?: string;
}

export function ProfileBadge({ className = '' }: ProfileBadgeProps) {
  const { user } = useAuth();

  if (!user) return null;

  // Get initials from name
  const initials = user.name
    ? user.name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : user.username.slice(0, 2).toUpperCase();

  return (
    <Link
      href="/profile"
      className={cn(
        'group flex items-center justify-center no-underline transition-transform duration-200 hover:scale-105 active:scale-95',
        className
      )}
      title={`Profile - ${user.name || user.username}`}
    >
      <div className="relative w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-sm font-semibold text-white border-2 border-white/10 cursor-pointer transition-all duration-200 overflow-hidden group-hover:border-white/40 group-hover:shadow-[0_0_12px_rgba(102,126,234,0.5)]">
        <span className="relative z-[1]">{initials || <User size={18} />}</span>
        {user.avatar_url && (
          <img
            src={user.avatar_url}
            alt={user.username}
            className="absolute inset-0 w-full h-full object-cover z-[2] rounded-full"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
            }}
          />
        )}
      </div>
    </Link>
  );
}
