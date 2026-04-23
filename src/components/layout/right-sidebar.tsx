'use client';

import {
  Check,
  Loader2,
  MessageSquare,
  Phone,
  Search,
  UserPlus,
  X,
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { useSidebar } from '@/app/(protected)/(main)/layout';
import {
  type SearchUserResult,
  searchUsers,
  sendFriendRequest,
} from '@/features/friends/api';
import { formatActivity } from '@/features/friends/format-activity';
import { useCall } from '@/features/friends/hooks/use-call';
import { useFriends } from '@/features/friends/hooks/use-friends';
import type { FriendActivity } from '@/features/friends/types';

export function RightSidebar() {
  const { rightOpen: open } = useSidebar();
  const {
    onlineFriends,
    offlineFriends,
    pendingRequests,
    sentRequests,
    blockedUsers,
    isLoading,
    accept,
    reject,
    cancel,
    unblock,
    refetch,
  } = useFriends();
  const t = useTranslations('common.friends');
  const [filterQuery, setFilterQuery] = useState('');

  const fq = filterQuery.toLowerCase();
  const matchesFilter = (name: string) =>
    !fq || name.toLowerCase().includes(fq);
  const filteredOnline = onlineFriends.filter((f) => matchesFilter(f.name));
  const filteredOffline = offlineFriends.filter((f) => matchesFilter(f.name));
  const filteredBlocked = blockedUsers.filter((b) => matchesFilter(b.name));

  const [showSpotlight, setShowSpotlight] = useState(false);
  const [spotlightClosing, setSpotlightClosing] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchUserResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isSending, setIsSending] = useState<string | null>(null);
  const [justSent, setJustSent] = useState<Set<string>>(new Set());
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  const openSpotlight = () => {
    setSpotlightClosing(false);
    setShowSpotlight(true);
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const closeSpotlight = () => {
    setSpotlightClosing(true);
    setTimeout(() => {
      setShowSpotlight(false);
      setSpotlightClosing(false);
      setQuery('');
      setResults([]);
      setJustSent(new Set());
    }, 200);
  };

  // Debounced search
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

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
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
    <>
      {/* Spotlight Search Overlay */}
      {showSpotlight && (
        <div
          className={`fixed inset-0 z-[100] flex items-start justify-center pt-[18vh] bg-black/40 backdrop-blur-sm transition-all duration-200 ${
            spotlightClosing
              ? 'opacity-0 scale-95'
              : 'animate-in fade-in zoom-in-95 duration-200'
          }`}
          onClick={(e) => {
            if (e.target === e.currentTarget) closeSpotlight();
          }}
          onKeyDown={(e) => {
            if (e.key === 'Escape') closeSpotlight();
          }}
          role="dialog"
          tabIndex={-1}
        >
          <div className="w-full max-w-lg mx-4">
            {/* Search Input */}
            <div className="flex items-center bg-white/10 backdrop-blur-2xl rounded-full border border-white/20 shadow-2xl px-5 py-3.5 gap-3">
              <Search className="w-5 h-5 text-white/40 shrink-0" />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => handleQueryChange(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') closeSpotlight();
                }}
                placeholder={t('addFriendPlaceholder')}
                className="flex-1 bg-transparent text-lg text-white font-body outline-none placeholder:text-white/40"
                autoComplete="off"
              />
              {isSearching && (
                <Loader2 className="w-5 h-5 animate-spin text-white/50 shrink-0" />
              )}
            </div>

            {/* Results */}
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
                        <p className="text-xs text-white/50">
                          @{user.username}
                        </p>
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
                          disabled={
                            isSending === user.username || !user.username
                          }
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

            {/* No results */}
            {query.trim().length >= 2 &&
              !isSearching &&
              results.length === 0 && (
                <div className="mt-2 bg-white/10 backdrop-blur-2xl rounded-2xl border border-white/20 px-4 py-6 text-center">
                  <p className="text-sm text-white/40 font-headline">
                    {t('noUsersFound')}
                  </p>
                </div>
              )}
          </div>
        </div>
      )}

      <aside
        className={`shrink-0 h-full bg-card flex flex-col overflow-hidden transition-all duration-300 ease-in-out ${
          open ? 'w-80 rounded-2xl' : 'w-11 hover:w-14 rounded-l-2xl -mr-2'
        }`}
      >
        {open ? (
          <>
            {/* Header */}
            <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-border">
              <span className="text-sm font-black uppercase tracking-widest font-headline text-foreground">
                {t('title')}
              </span>
              <button
                type="button"
                onClick={openSpotlight}
                className="p-1.5 rounded-lg hover:bg-muted transition-colors"
                aria-label={t('addFriend')}
              >
                <UserPlus className="w-4 h-4 text-foreground/60" />
              </button>
            </div>

            {/* Search filter */}
            <div className="px-3 pt-2 pb-1">
              <input
                value={filterQuery}
                onChange={(e) => setFilterQuery(e.target.value)}
                placeholder={t('searchFriends')}
                className="w-full bg-muted rounded-lg px-3 py-1.5 text-xs font-body outline-none focus:ring-1 focus:ring-neo-blue placeholder:text-foreground/30"
              />
            </div>

            <div className="flex-1 overflow-y-auto">
              {isLoading ? (
                <div className="p-4 space-y-3">
                  {['fs1', 'fs2', 'fs3', 'fs4'].map((id) => (
                    <div key={id} className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-muted animate-pulse shrink-0" />
                      <div className="h-4 bg-muted animate-pulse rounded flex-1" />
                    </div>
                  ))}
                </div>
              ) : (
                <>
                  {/* Pending Requests */}
                  {pendingRequests.length > 0 && (
                    <div className="px-4 pt-3">
                      <p className="text-xs font-headline font-black uppercase tracking-widest text-foreground/40 mb-2">
                        {t('pendingRequests')} — {pendingRequests.length}
                      </p>
                      {pendingRequests.map((req) => (
                        <div
                          key={req.id}
                          className="flex items-center gap-3 py-2"
                        >
                          <Avatar
                            name={req.name}
                            photo={req.profilePhoto}
                            size={32}
                          />
                          <span className="text-sm font-headline font-bold truncate flex-1">
                            {req.name}
                          </span>
                          <button
                            type="button"
                            onClick={() => accept(req.id)}
                            className="p-1.5 rounded-lg hover:bg-emerald-500/10 text-emerald-500"
                            aria-label={t('accept')}
                          >
                            <Check className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => reject(req.id)}
                            className="p-1.5 rounded-lg hover:bg-destructive/10 text-destructive"
                            aria-label={t('reject')}
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                      <div className="border-b border-border mt-2" />
                    </div>
                  )}

                  {/* Sent Requests (outgoing) */}
                  {sentRequests.length > 0 && (
                    <div className="px-4 pt-3">
                      <p className="text-xs font-headline font-black uppercase tracking-widest text-foreground/40 mb-2">
                        {t('sentRequests')} — {sentRequests.length}
                      </p>
                      {sentRequests.map((req) => (
                        <div
                          key={req.id}
                          className="flex items-center gap-3 py-2"
                        >
                          <Avatar
                            name={req.name}
                            photo={req.profilePhoto}
                            size={32}
                          />
                          <span className="text-sm font-headline font-bold truncate flex-1">
                            {req.name}
                          </span>
                          <button
                            type="button"
                            onClick={() => cancel(req.id)}
                            className="px-2.5 py-1 rounded-lg text-xs font-headline font-bold uppercase tracking-widest text-destructive hover:bg-destructive/10 transition-colors"
                          >
                            {t('cancelRequest')}
                          </button>
                        </div>
                      ))}
                      <div className="border-b border-border mt-2" />
                    </div>
                  )}

                  {/* Online Friends */}
                  {filteredOnline.length > 0 && (
                    <div className="px-4 pt-3">
                      <p className="text-xs font-headline font-black uppercase tracking-widest text-foreground/40 mb-2">
                        {t('online')} — {filteredOnline.length}
                      </p>
                      {filteredOnline.map((f) => (
                        <FriendRow
                          key={f.id}
                          id={f.id}
                          name={f.name}
                          photo={f.profilePhoto}
                          isOnline
                          activity={f.activity ?? null}
                        />
                      ))}
                    </div>
                  )}

                  {/* Offline Friends */}
                  {filteredOffline.length > 0 && (
                    <div className="px-4 pt-3">
                      <p className="text-xs font-headline font-black uppercase tracking-widest text-foreground/40 mb-2">
                        {t('offline')} — {filteredOffline.length}
                      </p>
                      {filteredOffline.map((f) => (
                        <FriendRow
                          key={f.id}
                          id={f.id}
                          name={f.name}
                          photo={f.profilePhoto}
                          isOnline={false}
                          activity={null}
                        />
                      ))}
                    </div>
                  )}

                  {/* Blocked Users */}
                  {filteredBlocked.length > 0 && (
                    <div className="px-4 pt-3">
                      <p className="text-xs font-headline font-black uppercase tracking-widest text-foreground/40 mb-2">
                        {t('blockedLabel')} — {filteredBlocked.length}
                      </p>
                      {filteredBlocked.map((b) => (
                        <div
                          key={b.id}
                          className="flex items-center gap-3 py-2"
                        >
                          <Avatar
                            name={b.name}
                            photo={b.profilePhoto}
                            size={32}
                          />
                          <span className="text-sm font-headline font-bold truncate flex-1 text-foreground/30 line-through">
                            {b.name}
                          </span>
                          <button
                            type="button"
                            onClick={() => unblock(b.userId)}
                            className="px-2.5 py-1 rounded-lg text-xs font-headline font-bold uppercase tracking-widest text-neo-blue hover:bg-neo-blue/10 transition-colors"
                          >
                            {t('unblockLabel')}
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Empty state */}
                  {filteredOnline.length === 0 &&
                    filteredOffline.length === 0 &&
                    pendingRequests.length === 0 &&
                    sentRequests.length === 0 &&
                    filteredBlocked.length === 0 && (
                      <div className="flex-1 flex items-center justify-center p-6">
                        <p className="text-xs text-foreground/30 font-headline uppercase tracking-widest text-center">
                          {t('noFriends')}
                        </p>
                      </div>
                    )}
                </>
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <span className="material-symbols-outlined text-xl text-foreground/60">
              group
            </span>
          </div>
        )}
      </aside>
    </>
  );
}

function Avatar({
  name,
  photo,
  size = 32,
  light,
}: {
  name: string;
  photo: string | null;
  size?: number;
  light?: boolean;
}) {
  if (photo) {
    return (
      <Image
        src={photo}
        alt={name}
        width={size}
        height={size}
        className="rounded-full border-2 border-border object-cover shrink-0"
        unoptimized
      />
    );
  }
  return (
    <div
      className={`rounded-full border-2 flex items-center justify-center font-headline font-black text-[10px] uppercase shrink-0 ${
        light
          ? 'border-white/20 bg-white/10 text-white'
          : 'border-border bg-muted'
      }`}
      style={{ width: size, height: size }}
    >
      {name[0]}
    </div>
  );
}

function FriendRow({
  id,
  name,
  photo,
  isOnline,
  activity,
}: {
  id: string;
  name: string;
  photo: string | null;
  isOnline: boolean;
  activity: FriendActivity | null;
}) {
  const { initiateCall, callState } = useCall();

  return (
    <div className="group/row relative flex items-center gap-3 py-2">
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
          <span className="text-[10px] text-neo-yellow/70 truncate block leading-tight">
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
      <Link
        href={`/messages?f=${id}`}
        className="p-1.5 rounded-lg hover:bg-muted transition-colors"
        aria-label={`Message ${name}`}
      >
        <MessageSquare className="w-4 h-4 text-foreground/40" />
      </Link>

      {/* Activity hover card */}
      {activity && (
        <div className="pointer-events-none absolute left-0 right-0 top-full z-50 pt-1 opacity-0 translate-y-1 transition-all duration-200 group-hover/row:opacity-100 group-hover/row:translate-y-0">
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
  );
}
