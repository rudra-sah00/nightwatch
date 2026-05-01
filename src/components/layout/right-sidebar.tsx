'use client';

import { Check, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { useSidebar } from '@/app/(protected)/(main)/layout';
import { Avatar } from '@/features/friends/components/Avatar';
import { FriendRow } from '@/features/friends/components/FriendRow';
import { FriendSearchSpotlight } from '@/features/friends/components/FriendSearchSpotlight';
import { useFriends } from '@/features/friends/hooks/use-friends';
import { useIsMobile } from '@/hooks/use-is-mobile';
import { MobileSidebarShell } from './sidebar/MobileSidebarShell';
import { useSidebarAnimation } from './sidebar/use-sidebar-animation';

/**
 * Right sidebar displaying the user's friend list, pending/sent friend
 * requests, blocked users, and an inline search filter.
 *
 * **Sections** (rendered in order when non-empty):
 * 1. Pending incoming requests — with accept/reject buttons.
 * 2. Sent outgoing requests — with a cancel button.
 * 3. Online friends — each rendered as a {@link FriendRow} with activity info.
 * 4. Offline friends — same row, greyed out.
 * 5. Blocked users — with an unblock button.
 *
 * **Filter** — a text input at the top filters online, offline, and blocked
 * lists by name (case-insensitive substring match). Pending/sent requests are
 * always shown unfiltered.
 *
 * **Spotlight integration** — the "+ Add Friend" button closes the sidebar and
 * opens a {@link FriendSearchSpotlight} modal for searching and sending friend
 * requests.
 *
 * **Responsive** — on mobile, renders inside a {@link MobileSidebarShell}
 * (slide-in drawer from the right). On desktop, renders as a collapsible
 * `<aside>` that shrinks to a 44 px icon strip when closed.
 *
 * @returns The right sidebar element.
 */
export function RightSidebar() {
  const { rightOpen: open, setRightOpen } = useSidebar();
  const mobile = useIsMobile();
  const { visible, closing } = useSidebarAnimation(open);
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
  } = useFriends();
  const t = useTranslations('common.friends');
  const [filterQuery, setFilterQuery] = useState('');
  const [showSpotlight, setShowSpotlight] = useState(false);

  const fq = filterQuery.toLowerCase();
  const matchesFilter = (name: string) =>
    !fq || name.toLowerCase().includes(fq);
  const filteredOnline = onlineFriends.filter((f) => matchesFilter(f.name));
  const filteredOffline = offlineFriends.filter((f) => matchesFilter(f.name));
  const filteredBlocked = blockedUsers.filter((b) => matchesFilter(b.name));

  const sidebarContent = (
    <>
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-border">
        <span className="text-sm font-black uppercase tracking-widest font-headline text-foreground">
          {t('title')}
        </span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => {
              setRightOpen(false);
              setShowSpotlight(true);
            }}
            className="px-3 py-1.5 rounded-lg hover:bg-muted transition-colors text-xs font-headline font-black uppercase tracking-widest text-foreground/60"
          >
            + {t('addFriend')}
          </button>
        </div>
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
            {pendingRequests.length > 0 && (
              <div className="px-4 pt-3">
                <p className="text-xs font-headline font-black uppercase tracking-widest text-foreground/40 mb-2">
                  {t('pendingRequests')} — {pendingRequests.length}
                </p>
                {pendingRequests.map((req) => (
                  <div key={req.id} className="flex items-center gap-3 py-2">
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

            {sentRequests.length > 0 && (
              <div className="px-4 pt-3">
                <p className="text-xs font-headline font-black uppercase tracking-widest text-foreground/40 mb-2">
                  {t('sentRequests')} — {sentRequests.length}
                </p>
                {sentRequests.map((req) => (
                  <div key={req.id} className="flex items-center gap-3 py-2">
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

            {filteredBlocked.length > 0 && (
              <div className="px-4 pt-3">
                <p className="text-xs font-headline font-black uppercase tracking-widest text-foreground/40 mb-2">
                  {t('blockedLabel')} — {filteredBlocked.length}
                </p>
                {filteredBlocked.map((b) => (
                  <div key={b.id} className="flex items-center gap-3 py-2">
                    <Avatar name={b.name} photo={b.profilePhoto} size={32} />
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
  );

  return (
    <>
      {showSpotlight && (
        <FriendSearchSpotlight onClose={() => setShowSpotlight(false)} />
      )}

      {mobile ? (
        <MobileSidebarShell
          visible={visible}
          closing={closing}
          direction="right"
          onClose={() => setRightOpen(false)}
        >
          {sidebarContent}
        </MobileSidebarShell>
      ) : (
        <aside
          className={`shrink-0 h-full bg-card flex flex-col overflow-hidden transition-all duration-300 ease-in-out ${
            open ? 'w-80 rounded-2xl' : 'w-11 hover:w-14 rounded-l-2xl -mr-2'
          }`}
        >
          {open ? (
            sidebarContent
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <span className="material-symbols-outlined text-xl text-foreground/60">
                group
              </span>
            </div>
          )}
        </aside>
      )}
    </>
  );
}
