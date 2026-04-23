'use client';

import { MessageSquare } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { getFriends } from '@/features/friends/api';
import { ConversationList } from '../messaging/ConversationList';
import { MessageThread } from '../messaging/MessageThread';
import type { ConversationPreview } from '../types';

export function MessagesClient() {
  const [selectedFriend, setSelectedFriend] =
    useState<ConversationPreview | null>(null);
  const searchParams = useSearchParams();
  const router = useRouter();
  const t = useTranslations('common.friends');

  // Deep-link: ?f=userId opens that conversation
  const friendParam = searchParams.get('f');
  useEffect(() => {
    if (!friendParam) return;
    let cancelled = false;
    (async () => {
      try {
        const friends = await getFriends();
        const match = friends.find((f) => f.id === friendParam);
        if (match && !cancelled) {
          setSelectedFriend({
            friendId: match.id,
            name: match.name,
            username: match.username,
            profilePhoto: match.profilePhoto,
            isOnline: match.isOnline,
            lastMessage: '',
            lastMessageAt: '',
            unreadCount: 0,
          });
          router.replace('/messages', { scroll: false });
        }
      } catch {
        // ignore
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [friendParam, router]);

  return (
    <div className="flex gap-4 h-[calc(100vh-8rem)] max-w-5xl mx-auto w-full">
      <ConversationList
        selected={selectedFriend}
        onSelect={setSelectedFriend}
        className={`${selectedFriend ? 'hidden md:flex' : 'flex'}`}
      />

      {selectedFriend ? (
        <MessageThread
          friend={selectedFriend}
          onBack={() => setSelectedFriend(null)}
        />
      ) : (
        <div className="hidden md:flex flex-1 items-center justify-center border-[3px] border-border rounded-xl bg-background">
          <div className="text-center">
            <MessageSquare className="w-12 h-12 text-foreground/10 mx-auto mb-3" />
            <p className="font-headline font-bold uppercase tracking-widest text-foreground/30 text-xs">
              {t('selectConversation')}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
