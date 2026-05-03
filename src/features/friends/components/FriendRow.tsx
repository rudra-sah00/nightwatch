'use client';

import { Phone } from 'lucide-react';
import { formatActivity } from '@/features/friends/format-activity';
import { useCall } from '@/features/friends/hooks/use-call';
import type { FriendActivity } from '@/features/friends/types';
import { Avatar } from './Avatar';

/** Props for the {@link FriendRow} component. */
interface FriendRowProps {
  /** The friend's user ID. */
  id: string;
  /** Display name. */
  name: string;
  /** Profile photo URL, or `null`. */
  photo: string | null;
  /** Whether the friend is currently online. */
  isOnline: boolean;
  /** The friend's current watching activity, or `null`. */
  activity: FriendActivity | null;
}

/**
 * A single row in the friends list showing avatar, online indicator, activity
 * text, and a call button.
 */
export function FriendRow({
  id,
  name,
  photo,
  isOnline,
  activity,
}: FriendRowProps) {
  const { initiateCall, callState } = useCall();

  return (
    <div className="relative flex items-center gap-3 py-2">
      <div className="relative shrink-0">
        <Avatar name={name} photo={photo} size={32} />
        {isOnline && (
          <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 border-2 border-card rounded-full" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <span
          className={`text-sm font-headline font-bold truncate block ${isOnline ? '' : 'text-foreground/40'}`}
        >
          {name}
        </span>
        {activity && (
          <span
            className={`text-[10px] truncate block leading-tight ${activity.type === 'music' ? 'text-neo-blue/70' : 'text-neo-yellow/70'}`}
          >
            {formatActivity(activity)}
          </span>
        )}
      </div>
      <button
        type="button"
        onClick={() => initiateCall({ id, name, photo })}
        disabled={callState !== 'idle'}
        className="p-1.5 rounded-lg hover:bg-muted transition-colors disabled:opacity-30"
        aria-label={`Call ${name}`}
      >
        <Phone className="w-4 h-4 text-foreground/40" />
      </button>
    </div>
  );
}
