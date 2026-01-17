'use client';

/**
 * Profile Badge - Avatar in header that links to profile page
 */

import { User } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';

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
      className={`profile-badge ${className}`}
      title={`Profile - ${user.name || user.username}`}
    >
      <div className="avatar">{initials || <User size={18} />}</div>

      <style jsx>{`
        .profile-badge {
          display: flex;
          align-items: center;
          justify-content: center;
          text-decoration: none;
          transition: transform 0.2s ease;
        }
        
        .profile-badge:hover {
          transform: scale(1.05);
        }
        
        .avatar {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 14px;
          font-weight: 600;
          color: white;
          border: 2px solid rgba(255, 255, 255, 0.2);
          cursor: pointer;
          transition: all 0.2s ease;
        }
        
        .profile-badge:hover .avatar {
          border-color: rgba(255, 255, 255, 0.4);
          box-shadow: 0 0 12px rgba(102, 126, 234, 0.5);
        }
      `}</style>
    </Link>
  );
}
