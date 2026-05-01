'use client';

import { Loader2, Search, UserPlus } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import {
  type SearchUserResult,
  searchUsers,
  sendFriendRequest,
} from '@/features/friends/api';
import { useFriends } from '@/features/friends/hooks/use-friends';
import { Avatar } from './Avatar';

interface FriendSearchSpotlightProps {
  onClose: () => void;
}

export function FriendSearchSpotlight({ onClose }: FriendSearchSpotlightProps) {
  const {
    onlineFriends,
    offlineFriends,
    pendingRequests,
    sentRequests,
    refetch,
  } = useFriends();
  const t = useTranslations('common.friends');
  const [closing, setClosing] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchUserResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isSending, setIsSending] = useState<string | null>(null);
  const [justSent, setJustSent] = useState<Set<string>>(new Set());
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!window.Capacitor?.isNativePlatform?.()) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const close = () => {
    setClosing(true);
    setTimeout(() => {
      onClose();
    }, 200);
  };

  const handleQueryChange = useCallback((value: string) => {
    setQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (value.trim().length < 2) {
      setResults([]);
      setIsSearching(false);
      return;
    }
    setIsSearching(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const data = await searchUsers(value.trim());
        setResults(data);
      } catch {
        setResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 300);
  }, []);

  const handleSendRequest = async (username: string) => {
    setIsSending(username);
    try {
      await sendFriendRequest(username);
      toast.success(t('requestSent'));
      setJustSent((prev) => new Set(prev).add(username));
      refetch();
    } catch {
      toast.error(t('requestFailed'));
    } finally {
      setIsSending(null);
    }
  };

  return (
    <div
      className={`fixed inset-0 z-[100] flex items-start justify-center pt-[12vh] bg-black/40 backdrop-blur-sm transition-all duration-200 ${
        closing
          ? 'opacity-0 scale-95'
          : 'animate-in fade-in zoom-in-95 duration-200'
      }`}
      onClick={(e) => {
        if (e.target === e.currentTarget) close();
      }}
      onKeyDown={(e) => {
        if (e.key === 'Escape') close();
      }}
      role="dialog"
      tabIndex={-1}
    >
      <div className="w-full max-w-xl mx-4">
        <div className="flex items-center bg-white/10 backdrop-blur-2xl rounded-full border border-white/20 shadow-2xl px-5 py-3.5 gap-3">
          <Search className="w-5 h-5 text-white/40 shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => handleQueryChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') close();
            }}
            placeholder={t('addFriendPlaceholder')}
            className="flex-1 bg-transparent text-lg text-white font-body outline-none placeholder:text-white/40"
            autoComplete="off"
          />
          {isSearching && (
            <Loader2 className="w-5 h-5 animate-spin text-white/50 shrink-0" />
          )}
        </div>

        {results.length > 0 && (
          <div className="mt-2 bg-white/10 backdrop-blur-2xl rounded-2xl border border-white/20 shadow-2xl overflow-hidden">
            {results.map((user) => (
              <div
                key={user.id}
                className="flex items-center gap-3 px-4 py-3 hover:bg-white/10 transition-colors"
              >
                <Avatar
                  name={user.name}
                  photo={user.profilePhoto}
                  size={32}
                  light
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-headline font-bold text-white truncate">
                    {user.name}
                  </p>
                  {user.username && (
                    <p className="text-xs text-white/50">@{user.username}</p>
                  )}
                </div>
                {(() => {
                  const isFriend =
                    onlineFriends.some((f) => f.id === user.id) ||
                    offlineFriends.some((f) => f.id === user.id);
                  const hasSentReq =
                    sentRequests.some((r) => r.receiverId === user.id) ||
                    (user.username ? justSent.has(user.username) : false);
                  const hasIncomingReq = pendingRequests.some(
                    (r) => r.senderId === user.id,
                  );

                  if (isFriend) {
                    return (
                      <span className="px-3 py-1.5 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-headline font-bold">
                        {t('alreadyFriends')}
                      </span>
                    );
                  }
                  if (hasSentReq) {
                    return (
                      <span className="px-3 py-1.5 rounded-full bg-white/10 text-white/50 text-xs font-headline font-bold">
                        {t('requestSentLabel')}
                      </span>
                    );
                  }
                  if (hasIncomingReq) {
                    return (
                      <span className="px-3 py-1.5 rounded-full bg-neo-blue/20 text-neo-blue text-xs font-headline font-bold">
                        {t('requestReceived')}
                      </span>
                    );
                  }
                  return (
                    <button
                      type="button"
                      onClick={() =>
                        user.username && handleSendRequest(user.username)
                      }
                      disabled={isSending === user.username || !user.username}
                      className="px-3 py-1.5 rounded-full bg-white/20 text-white text-xs font-headline font-bold hover:bg-white/30 disabled:opacity-40 transition-all flex items-center gap-1.5"
                    >
                      {isSending === user.username ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <UserPlus className="w-3 h-3" />
                      )}
                      {t('addFriend')}
                    </button>
                  );
                })()}
              </div>
            ))}
          </div>
        )}

        {query.trim().length >= 2 && !isSearching && results.length === 0 && (
          <div className="mt-2 bg-white/10 backdrop-blur-2xl rounded-2xl border border-white/20 px-4 py-6 text-center">
            <p className="text-sm text-white/40 font-headline">
              {t('noUsersFound')}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
