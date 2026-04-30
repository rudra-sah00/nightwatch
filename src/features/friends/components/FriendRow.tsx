'use client';

import { Phone } from 'lucide-react';
import { formatActivity } from '@/features/friends/format-activity';
import { useCall } from '@/features/friends/hooks/use-call';
import type { FriendActivity } from '@/features/friends/types';
import { Avatar } from './Avatar';

interface FriendRowProps {
  id: string;
  name: string;
  photo: string | null;
  isOnline: boolean;
  activity: FriendActivity | null;
}

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
      <div className="group/name relative flex-1 min-w-0 cursor-default">
        <span
          className={`text-sm font-headline font-bold truncate block ${isOnline ? '' : 'text-foreground/40'}`}
        >
          {name}
        </span>
        {activity && (
          <span className="text-[10px] text-neo-yellow/70 truncate block leading-tight">
            {formatActivity(activity)}
          </span>
        )}
        {activity && (
          <div className="pointer-events-none absolute left-0 right-0 top-full z-50 pt-1 opacity-0 translate-y-1 transition-all duration-200 group-hover/name:opacity-100 group-hover/name:translate-y-0">
            <div className="pointer-events-auto bg-card border-[3px] border-border rounded-xl p-3 shadow-xl flex gap-3">
              {activity.posterUrl && (
                <img
                  src={activity.posterUrl}
                  alt={activity.title}
                  className="w-12 h-[72px] rounded-lg object-cover border border-border shrink-0"
                />
              )}
              <div className="min-w-0 flex flex-col justify-center gap-0.5">
                <span className="font-headline font-black text-xs uppercase tracking-tight truncate">
                  {activity.title}
                </span>
                {activity.type === 'series' &&
                  activity.season &&
                  activity.episode && (
                    <span className="text-[10px] text-foreground/50 font-headline uppercase tracking-widest">
                      S{activity.season} E{activity.episode}
                    </span>
                  )}
                {activity.episodeTitle && (
                  <span className="text-[10px] text-foreground/40 truncate">
                    {activity.episodeTitle}
                  </span>
                )}
              </div>
            </div>
          </div>
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
