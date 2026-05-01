'use client';

import { Search } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useEffect, useRef, useState } from 'react';
import { getFriends } from '@/features/friends/api';
import type { CallPeer } from '@/features/friends/hooks/use-call';
import type { FriendProfile } from '@/features/friends/types';
import { PeerAvatar } from './PeerAvatar';

/**
 * Spotlight overlay for inviting online friends to an active voice call.
 *
 * Fetches the friend list on mount, filters out peers already in the call,
 * and allows searching by name. Selecting a friend triggers the `onInvite` callback.
 *
 * @param props.onClose - Callback to close the spotlight.
 * @param props.onInvite - Callback invoked with the selected {@link CallPeer}.
 * @param props.existing - Peers already participating in the call (excluded from results).
 */
export function InviteSpotlight({
  onClose,
  onInvite,
  existing,
}: {
  onClose: () => void;
  onInvite: (peer: CallPeer) => void;
  existing: CallPeer[];
}) {
  const [onlineFriends, setOnlineFriends] = useState<FriendProfile[]>([]);
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const t = useTranslations('common.friends.call');

  useEffect(() => {
    getFriends().then((friends) =>
      setOnlineFriends(friends.filter((f) => f.isOnline)),
    );
  }, []);

  const available = onlineFriends.filter(
    (f) =>
      !existing.some((e) => e.id === f.id) &&
      (!query || f.name.toLowerCase().includes(query.toLowerCase())),
  );

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  return (
    <div
      className="fixed inset-x-0 bottom-0 top-[var(--electron-titlebar-height,0px)] z-[10020] flex items-start justify-center pt-[18vh] bg-black/40 backdrop-blur-sm animate-in fade-in zoom-in-95 duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      onKeyDown={(e) => {
        if (e.key === 'Escape') onClose();
      }}
      role="dialog"
      tabIndex={-1}
    >
      <div className="w-full max-w-lg mx-4">
        <div className="flex items-center bg-white/10 backdrop-blur-2xl rounded-full border border-white/20 shadow-2xl px-5 py-3.5 gap-3">
          <Search className="w-5 h-5 text-white/40 shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('searchFriends')}
            className="flex-1 bg-transparent text-lg text-white font-body outline-none placeholder:text-white/40"
            autoComplete="off"
          />
        </div>

        {available.length > 0 && (
          <div className="mt-2 bg-white/10 backdrop-blur-2xl rounded-2xl border border-white/20 shadow-2xl overflow-hidden max-h-64 overflow-y-auto">
            {available.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() =>
                  onInvite({ id: f.id, name: f.name, photo: f.profilePhoto })
                }
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/10 transition-colors text-left"
              >
                <PeerAvatar
                  peer={{ id: f.id, name: f.name, photo: f.profilePhoto }}
                  size={32}
                />
                <span className="text-white text-sm font-headline font-bold truncate">
                  {f.name}
                </span>
              </button>
            ))}
          </div>
        )}

        {query && available.length === 0 && (
          <div className="mt-2 bg-white/10 backdrop-blur-2xl rounded-2xl border border-white/20 shadow-2xl px-4 py-6 text-center">
            <p className="text-white/40 text-sm font-headline">
              {t('noFriendsFound')}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
