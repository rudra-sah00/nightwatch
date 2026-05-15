'use client';

import { ChevronDown, Play, Search, Tv, Users, X } from 'lucide-react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import type { IptvChannel } from '@/features/livestream/api';
import {
  useIptvCategories,
  useIptvChannels,
} from '@/features/livestream/hooks/use-iptv';
import { createPartyRoom } from '@/features/watch-party/room/services/watch-party.api';
import { generateRoomId } from '@/features/watch-party/room/utils';
import { useAuth } from '@/providers/auth-provider';

export default function LiveClient() {
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [page, setPage] = useState(1);
  const [isCatOpen, setIsCatOpen] = useState(false);
  const t = useTranslations('live');
  const router = useRouter();

  const { categories } = useIptvCategories();
  const { channels, total, totalPages, isLoading } = useIptvChannels(
    page,
    30,
    debouncedSearch,
    selectedCategory,
  );

  const [debounceTimer, setDebounceTimer] = useState<NodeJS.Timeout | null>(
    null,
  );
  const handleSearch = (val: string) => {
    setSearch(val);
    if (debounceTimer) clearTimeout(debounceTimer);
    setDebounceTimer(
      setTimeout(() => {
        setDebouncedSearch(val);
        setPage(1);
      }, 400),
    );
  };

  const handleCategorySelect = (cat: string) => {
    setSelectedCategory(cat === selectedCategory ? '' : cat);
    setPage(1);
    setIsCatOpen(false);
  };

  const { user } = useAuth();
  const [selectedChannel, setSelectedChannel] = useState<IptvChannel | null>(
    null,
  );
  const [isCreatingParty, setIsCreatingParty] = useState(false);

  const handleChannelClick = (channel: IptvChannel) => {
    if (channel.streamUrl) setSelectedChannel(channel);
  };

  const handleWatchSolo = () => {
    if (!selectedChannel) return;
    const params = new URLSearchParams({
      title: selectedChannel.name,
      type: 'iptv',
      ...(selectedChannel.icon && { poster: selectedChannel.icon }),
    });
    router.push(`/live/${selectedChannel.id}?${params.toString()}`);
    setSelectedChannel(null);
  };

  const handleWatchParty = async () => {
    if (!selectedChannel) return;
    if (!user) {
      toast.error(t('loginRequired'), { id: 'iptv-login' });
      setSelectedChannel(null);
      return;
    }
    setIsCreatingParty(true);
    const roomId = generateRoomId();
    const response = await createPartyRoom(roomId, {
      contentId: selectedChannel.id,
      title: selectedChannel.name,
      type: 'livestream',
      streamUrl: selectedChannel.streamUrl!,
      posterUrl: selectedChannel.icon || undefined,
    });
    setIsCreatingParty(false);
    setSelectedChannel(null);
    if (response.room) {
      router.push(`/watch-party/${response.room.id}?new=true`);
    } else {
      toast.error(response.error || 'Failed to create room');
    }
  };

  return (
    <div className="min-h-full pb-32 overflow-x-hidden">
      {/* Hero */}
      <div className="mb-8 bg-neo-yellow relative overflow-hidden rounded-2xl">
        <div className="absolute -top-10 -right-10 w-64 h-64 border-[4px] border-border rounded-full opacity-10" />
        <div className="absolute top-10 left-1/4 w-24 h-24 bg-neo-red border-[4px] border-border opacity-20 rotate-12" />
        <div className="container mx-auto px-6 py-12 md:px-10 relative z-10">
          <h1 className="text-6xl md:text-8xl lg:text-9xl font-black tracking-tighter text-foreground font-headline uppercase leading-none mb-4">
            {t('heroTitle')}
            <br />
            <span className="bg-background px-4 inline-block border-[4px] border-border -rotate-1 ml-2 mt-2">
              {t('heroTitleStream')}
            </span>
          </h1>
          <p className="font-headline font-bold uppercase tracking-widest text-foreground bg-background inline-block px-4 py-2 border-[3px] border-border">
            {t('heroSubtitle')}
          </p>
        </div>
      </div>

      <div className="container mx-auto px-6 md:px-10">
        {/* Search + Category */}
        <div className="flex flex-col sm:flex-row gap-4 mb-8">
          <div className="relative flex-grow">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder={t('searchChannels')}
              className="w-full pl-12 pr-4 py-4 bg-background border-[3px] border-border font-headline font-bold text-sm uppercase tracking-widest focus:outline-none focus:ring-2 focus:ring-neo-blue rounded-md"
            />
          </div>
          <div className="relative sm:w-64">
            <button
              type="button"
              onClick={() => setIsCatOpen(!isCatOpen)}
              className="flex items-center justify-between gap-2 px-5 py-4 font-headline font-black text-sm uppercase tracking-widest border-[3px] border-border w-full bg-background text-foreground hover:bg-muted cursor-pointer rounded-md"
            >
              <span className="truncate">
                {selectedCategory || 'All Categories'}
              </span>
              <ChevronDown
                className={`w-4 h-4 shrink-0 transition-transform ${isCatOpen ? 'rotate-180' : ''}`}
              />
            </button>
            {isCatOpen && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-background border-[3px] border-border z-50 p-2 max-h-[300px] overflow-y-auto no-scrollbar rounded-md shadow-md">
                <button
                  type="button"
                  onClick={() => handleCategorySelect('')}
                  className={`w-full px-4 py-2 text-left font-headline font-bold text-xs uppercase tracking-widest rounded ${!selectedCategory ? 'bg-muted' : 'hover:bg-muted/80'}`}
                >
                  All Categories
                </button>
                {categories.map((cat) => (
                  <button
                    type="button"
                    key={cat}
                    onClick={() => handleCategorySelect(cat)}
                    className={`w-full px-4 py-2 text-left font-headline font-bold text-xs uppercase tracking-widest rounded truncate ${selectedCategory === cat ? 'bg-muted' : 'hover:bg-muted/80'}`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Count */}
        <div className="mb-6 flex items-center justify-between">
          <span className="font-headline font-bold text-sm uppercase tracking-widest text-muted-foreground">
            {total.toLocaleString()} channels
          </span>
          {totalPages > 1 && (
            <span className="font-headline font-bold text-sm uppercase tracking-widest text-muted-foreground">
              Page {page}/{totalPages}
            </span>
          )}
        </div>

        {/* Grid */}
        {isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {[
              'a',
              'b',
              'c',
              'd',
              'e',
              'f',
              'g',
              'h',
              'i',
              'j',
              'k',
              'l',
              'm',
              'n',
              'o',
              'p',
              'q',
              'r',
            ].map((id) => (
              <div
                key={id}
                className="aspect-square bg-muted border-[3px] border-border rounded-lg animate-pulse"
              />
            ))}
          </div>
        ) : channels.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 bg-background border-[4px] border-border text-center max-w-2xl mx-auto rounded-lg">
            <Tv className="w-20 h-20 text-neo-blue mb-6" />
            <h3 className="text-3xl font-black font-headline uppercase tracking-tighter text-foreground mb-2">
              {t('noChannelsFound')}
            </h3>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {channels.map((channel) => (
                <button
                  key={channel.id}
                  type="button"
                  onClick={() => handleChannelClick(channel)}
                  className="group flex flex-col items-center gap-3 p-4 bg-background border-[3px] border-border rounded-lg hover:border-neo-blue hover:bg-muted/50 transition-colors cursor-pointer"
                >
                  <div className="w-16 h-16 relative shrink-0 rounded-lg overflow-hidden bg-muted border-[2px] border-border">
                    {channel.icon ? (
                      <Image
                        src={channel.icon}
                        alt={channel.name}
                        fill
                        className="object-contain p-1"
                        sizes="64px"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Tv className="w-8 h-8 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                  <div className="text-center min-w-0 w-full">
                    <p className="font-headline font-bold text-xs uppercase tracking-wider text-foreground truncate">
                      {channel.name}
                    </p>
                    {channel.category && (
                      <p className="font-headline text-[10px] uppercase tracking-widest text-muted-foreground truncate mt-1">
                        {channel.category}
                      </p>
                    )}
                  </div>
                </button>
              ))}
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-3 mt-10">
                <Button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="bg-background text-foreground border-[3px] border-border px-6 py-3 font-headline font-black uppercase tracking-widest hover:bg-foreground hover:text-background disabled:opacity-40"
                >
                  Prev
                </Button>
                <span className="font-headline font-black text-sm uppercase tracking-widest px-4">
                  {page}
                </span>
                <Button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="bg-background text-foreground border-[3px] border-border px-6 py-3 font-headline font-black uppercase tracking-widest hover:bg-foreground hover:text-background disabled:opacity-40"
                >
                  Next
                </Button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Channel Detail Modal */}
      {selectedChannel && (
        <div
          className="fixed inset-x-0 bottom-0 top-[var(--electron-titlebar-height,0px)] z-[100] bg-black/80 backdrop-blur-sm overscroll-contain"
          role="dialog"
          aria-modal="true"
          onKeyDown={(e) => {
            if (e.key === 'Escape') setSelectedChannel(null);
          }}
          tabIndex={-1}
          ref={(el) => el?.focus()}
        >
          <div className="relative w-full h-full flex flex-col bg-background overflow-hidden">
            {/* Header */}
            <div className="border-b-[4px] border-border bg-background text-foreground flex justify-between items-center px-[max(1rem,env(safe-area-inset-left))] pt-[max(1rem,env(safe-area-inset-top))] pb-4 flex-shrink-0 z-20">
              <span className="font-headline font-black uppercase tracking-widest text-foreground text-lg truncate flex-1 min-w-0 pr-4">
                {selectedChannel.name}
              </span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedChannel(null);
                }}
                onPointerDown={(e) => {
                  e.stopPropagation();
                  setSelectedChannel(null);
                }}
                className="p-2.5 border-[3px] border-border bg-neo-red text-white hover:bg-primary hover:text-primary-foreground transition-colors flex-shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neo-blue focus-visible:ring-offset-2 cursor-pointer relative z-50"
              >
                <X className="w-5 h-5 stroke-[3px]" />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto no-scrollbar flex flex-col bg-background">
              {/* Hero */}
              <div className="w-full aspect-video md:h-[40vh] md:aspect-auto bg-muted border-b-[4px] border-border relative flex-shrink-0 flex items-center justify-center">
                {selectedChannel.icon ? (
                  <Image
                    src={selectedChannel.icon}
                    alt={selectedChannel.name}
                    fill
                    className="object-contain p-8 md:p-16"
                    sizes="100vw"
                  />
                ) : (
                  <Tv className="w-24 h-24 text-muted-foreground" />
                )}
              </div>

              {/* Info */}
              <div className="p-6 md:p-10 pb-32 bg-background flex-1 space-y-4">
                <div className="flex items-center gap-2">
                  <span className="px-3 py-1 bg-card border-2 border-border text-xs font-black font-headline uppercase tracking-widest text-foreground flex items-center gap-2">
                    <Tv className="w-4 h-4 stroke-[3px]" /> Live TV
                  </span>
                </div>
                <h1 className="text-3xl sm:text-4xl md:text-5xl font-black font-headline uppercase tracking-tighter text-foreground leading-tight">
                  {selectedChannel.name}
                </h1>
                {selectedChannel.category && (
                  <p className="font-headline font-bold text-sm uppercase tracking-widest text-muted-foreground">
                    {selectedChannel.category}
                  </p>
                )}
              </div>
            </div>

            {/* Actions - sticky at bottom */}
            <div className="sticky bottom-0 z-30 px-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-4 bg-background border-t-[4px] border-border flex-shrink-0">
              <div className="flex flex-col sm:flex-row gap-3 pt-6">
                <button
                  type="button"
                  onClick={handleWatchSolo}
                  className="flex-1 flex items-center justify-center gap-3 px-6 py-4 bg-neo-blue border-[3px] border-border font-headline font-black text-base uppercase tracking-widest text-primary-foreground hover:opacity-90 transition-opacity"
                >
                  <Play className="w-5 h-5 fill-current stroke-[3px]" />
                  {t('watchSolo')}
                </button>
                <button
                  type="button"
                  onClick={handleWatchParty}
                  disabled={isCreatingParty}
                  className="flex-1 flex items-center justify-center gap-3 px-6 py-4 bg-neo-yellow border-[3px] border-border font-headline font-black text-base uppercase tracking-widest text-foreground hover:opacity-90 transition-opacity disabled:opacity-50 hidden sm:flex"
                >
                  <Users className="w-5 h-5 stroke-[3px]" />
                  {isCreatingParty ? 'Creating...' : t('watchTogether')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
