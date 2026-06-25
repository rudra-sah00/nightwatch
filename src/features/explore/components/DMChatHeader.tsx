'use client';

import { ArrowLeft, Phone, Search, X } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import type { Conversation } from './DMView';

interface DMChatHeaderProps {
  peer: Conversation;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onBack: () => void;
  onCall: () => void;
}

export function DMChatHeader({
  peer,
  searchQuery,
  onSearchChange,
  onBack,
  onCall,
}: DMChatHeaderProps) {
  return (
    <div className="sticky top-0 z-10 bg-card/90 backdrop-blur-lg px-4 py-3 flex items-center gap-2">
      <button
        type="button"
        onClick={onBack}
        className="p-1 rounded-full hover:bg-muted shrink-0"
      >
        <ArrowLeft className="w-5 h-5" />
      </button>
      <div className="flex-1 flex items-center bg-muted/30 rounded-full px-3 h-8 min-w-0">
        <Search className="w-3.5 h-3.5 text-foreground/30 shrink-0 mr-2" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search..."
          className="flex-1 bg-transparent text-xs outline-none placeholder:text-foreground/30 min-w-0"
        />
        {searchQuery && (
          <button
            type="button"
            onClick={() => onSearchChange('')}
            className="p-0.5"
          >
            <X className="w-3 h-3 text-foreground/40" />
          </button>
        )}
      </div>
      <button
        type="button"
        onClick={onCall}
        className="p-2 rounded-full hover:bg-muted text-foreground/50 shrink-0"
      >
        <Phone className="w-4 h-4" />
      </button>
      <Link
        href={`/user/${peer.peer_username || peer.peer_id}`}
        className="w-7 h-7 rounded-full overflow-hidden bg-muted border border-border shrink-0"
      >
        {peer.peer_photo ? (
          <Image
            src={peer.peer_photo}
            alt=""
            width={28}
            height={28}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-[9px] font-bold">
            {peer.peer_name[0]}
          </div>
        )}
      </Link>
    </div>
  );
}
