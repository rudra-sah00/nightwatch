'use client';

import { Archive, BellOff, ChevronDown, Lock } from 'lucide-react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { useMemo, useState } from 'react';
import { DMContextMenu } from './DMContextMenu';
import type { Conversation } from './DMView';

interface DMConversationListProps {
  conversations: Conversation[] | null;
  userId: string | undefined;
  onOpenChat: (conv: Conversation) => void;
  onArchive: (peerId: string) => void;
  onUnarchive: (peerId: string) => void;
  onClear: (peerId: string) => void;
  onLock: (peerId: string) => void;
  onUnlock: (peerId: string) => void;
  onMute: (peerId: string) => void;
  onUnmute: (peerId: string) => void;
  onMarkUnread: (peerId: string) => void;
}

export function DMConversationList({
  conversations,
  userId,
  onOpenChat,
  onArchive,
  onUnarchive,
  onClear,
  onLock,
  onUnlock,
  onMute,
  onUnmute,
  onMarkUnread,
}: DMConversationListProps) {
  const [showArchived, setShowArchived] = useState(false);
  const t = useTranslations('common.dm');

  const activeConversations = useMemo(
    () => conversations?.filter((c) => !c.archived) ?? [],
    [conversations],
  );
  const archivedConversations = useMemo(
    () => conversations?.filter((c) => c.archived) ?? [],
    [conversations],
  );

  if (conversations === null) {
    return (
      <div className="space-y-1 p-2">
        {['c0', 'c1', 'c2', 'c3', 'c4', 'c5', 'c6', 'c7'].map((key) => (
          <div
            key={key}
            className="flex items-center gap-3 px-4 py-3 rounded-xl"
          >
            <div className="w-11 h-11 rounded-full bg-muted animate-pulse shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-3.5 w-24 bg-muted animate-pulse rounded" />
              <div className="h-3 w-40 bg-muted animate-pulse rounded" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (activeConversations.length === 0 && archivedConversations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-foreground/40">
        <p className="font-headline font-bold">{t('noMessages')}</p>
        <p className="text-sm mt-1">{t('startConversation')}</p>
      </div>
    );
  }

  return (
    <div className="p-2 space-y-0.5">
      {activeConversations.map((conv) => (
        <DMContextMenu
          key={conv.peer_id}
          peerId={conv.peer_id}
          isArchived={false}
          isLocked={conv.locked}
          isMuted={conv.muted}
          onArchive={() => onArchive(conv.peer_id)}
          onUnarchive={() => onUnarchive(conv.peer_id)}
          onClear={() => onClear(conv.peer_id)}
          onLock={() => onLock(conv.peer_id)}
          onUnlock={() => onUnlock(conv.peer_id)}
          onMute={() => onMute(conv.peer_id)}
          onUnmute={() => onUnmute(conv.peer_id)}
          onMarkUnread={() => onMarkUnread(conv.peer_id)}
        >
          <button
            type="button"
            onClick={() => onOpenChat(conv)}
            className="flex items-center gap-3 w-full px-4 py-3 rounded-xl hover:bg-muted/50 transition-colors text-left"
          >
            <div className="w-11 h-11 rounded-full overflow-hidden bg-muted border-2 border-border shrink-0">
              {conv.peer_photo ? (
                <Image
                  src={conv.peer_photo}
                  alt=""
                  width={44}
                  height={44}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center font-bold text-sm">
                  {conv.peer_name[0]}
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold truncate">{conv.peer_name}</p>
              <p className="text-xs text-foreground/50 truncate">
                {conv.content ?? t('tapToStart')}
              </p>
            </div>
            {conv.locked && (
              <Lock className="w-4 h-4 text-foreground/30 shrink-0" />
            )}
            {conv.muted && (
              <BellOff className="w-3.5 h-3.5 text-foreground/30 shrink-0" />
            )}
            {(conv.marked_unread ||
              (!conv.read_at &&
                conv.sender_id &&
                conv.sender_id !== userId)) && (
              <div className="w-2.5 h-2.5 rounded-full bg-primary shrink-0" />
            )}
          </button>
        </DMContextMenu>
      ))}

      {archivedConversations.length > 0 && (
        <>
          <button
            type="button"
            onClick={() => setShowArchived(!showArchived)}
            className="flex items-center gap-2 w-full px-4 py-2.5 mt-2 text-xs text-foreground/50 hover:bg-muted/30 rounded-lg transition-colors"
          >
            <Archive className="w-3.5 h-3.5" />
            {t('archived')} ({archivedConversations.length})
            <ChevronDown
              className={`w-3.5 h-3.5 ml-auto transition-transform ${showArchived ? 'rotate-180' : ''}`}
            />
          </button>
          {showArchived &&
            archivedConversations.map((conv) => (
              <DMContextMenu
                key={conv.peer_id}
                peerId={conv.peer_id}
                isArchived
                isLocked={conv.locked}
                isMuted={conv.muted}
                onArchive={() => onArchive(conv.peer_id)}
                onUnarchive={() => onUnarchive(conv.peer_id)}
                onClear={() => onClear(conv.peer_id)}
                onLock={() => onLock(conv.peer_id)}
                onUnlock={() => onUnlock(conv.peer_id)}
                onMute={() => onMute(conv.peer_id)}
                onUnmute={() => onUnmute(conv.peer_id)}
                onMarkUnread={() => onMarkUnread(conv.peer_id)}
              >
                <button
                  type="button"
                  onClick={() => onOpenChat(conv)}
                  className="flex items-center gap-3 w-full px-4 py-3 rounded-xl hover:bg-muted/50 transition-colors text-left opacity-70"
                >
                  <div className="w-11 h-11 rounded-full overflow-hidden bg-muted border-2 border-border shrink-0">
                    {conv.peer_photo ? (
                      <Image
                        src={conv.peer_photo}
                        alt=""
                        width={44}
                        height={44}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center font-bold text-sm">
                        {conv.peer_name[0]}
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold truncate">
                      {conv.peer_name}
                    </p>
                    <p className="text-xs text-foreground/50 truncate">
                      {conv.content ?? t('tapToStart')}
                    </p>
                  </div>
                  {conv.locked && (
                    <Lock className="w-4 h-4 text-foreground/30 shrink-0" />
                  )}
                </button>
              </DMContextMenu>
            ))}
        </>
      )}
    </div>
  );
}
