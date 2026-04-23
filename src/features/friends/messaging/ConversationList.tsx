'use client';

import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { useConversations } from '../hooks/use-messages';
import type { ConversationPreview } from '../types';

export function ConversationList({
  selected,
  onSelect,
  className,
}: {
  selected: ConversationPreview | null;
  onSelect: (c: ConversationPreview) => void;
  className?: string;
}) {
  const { conversations, isLoading, clearUnread } = useConversations();
  const t = useTranslations('common.friends');

  return (
    <div className={`w-full md:w-72 shrink-0 flex-col min-h-0 ${className}`}>
      <div className="border-[3px] border-border rounded-xl overflow-hidden flex flex-col h-full bg-background">
        <div className="px-4 py-3 border-b-[3px] border-border">
          <h2 className="font-headline font-black uppercase tracking-widest text-sm">
            {t('conversations')}
          </h2>
        </div>

        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="p-4 space-y-3">
              {['sk-1', 'sk-2', 'sk-3', 'sk-4'].map((id) => (
                <div
                  key={id}
                  className="h-16 bg-muted rounded-lg animate-pulse"
                />
              ))}
            </div>
          ) : conversations.length === 0 ? (
            <div className="flex-1 flex items-center justify-center p-8">
              <p className="font-headline font-bold uppercase tracking-widest text-foreground/30 text-xs text-center">
                {t('noConversations')}
              </p>
            </div>
          ) : (
            conversations.map((conv) => (
              <button
                key={conv.friendId}
                type="button"
                onClick={() => {
                  clearUnread(conv.friendId);
                  onSelect(conv);
                }}
                className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/50 ${
                  selected?.friendId === conv.friendId ? 'bg-muted' : ''
                }`}
              >
                <div className="relative shrink-0">
                  {conv.profilePhoto ? (
                    <Image
                      src={conv.profilePhoto}
                      alt={conv.name}
                      width={40}
                      height={40}
                      className="rounded-full border-2 border-border object-cover"
                      unoptimized
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full border-2 border-border bg-muted flex items-center justify-center font-headline font-black text-sm uppercase">
                      {conv.name[0]}
                    </div>
                  )}
                  {conv.isOnline && (
                    <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-500 border-2 border-background rounded-full" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="font-headline font-bold text-sm truncate">
                      {conv.name}
                    </span>
                    {conv.unreadCount > 0 && (
                      <span className="bg-neo-blue text-white text-xs font-black font-headline px-1.5 py-0.5 rounded-full min-w-[20px] text-center">
                        {conv.unreadCount}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-foreground/50 truncate">
                    {conv.lastMessage || t('noMessages')}
                  </p>
                </div>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
