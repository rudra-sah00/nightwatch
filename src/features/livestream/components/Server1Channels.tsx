import { ChevronLeft, ChevronRight, Play, Search, Tv } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { Channel } from '../api';
import { useChannels } from '../hooks/use-channels';
import { useLiveMatchCard } from '../hooks/use-live-match-card';
import { LiveMatchModal } from './LiveMatchModal';

export function Server1Channels() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Very simple debounce for search
  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearch(val);
    setPage(1); // reset to page 1 on search

    if (window.debounceTimer) clearTimeout(window.debounceTimer);
    window.debounceTimer = setTimeout(() => {
      setDebouncedSearch(val);
    }, 500);
  };

  const { channels, total, totalPages, isLoading, error } = useChannels(
    page,
    30,
    debouncedSearch,
  );

  if (error) {
    return (
      <div className="text-neo-red py-10 font-headline font-black text-center text-xl uppercase tracking-widest border-[4px] border-border bg-background p-6">
        Failed to load channels: {error.message}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Search Bar matching neo-brutalist style */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-center bg-card border-[3px] border-border p-4 md:p-6 mb-10 transition-colors rounded-md">
        <div className="relative w-full max-w-xl">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-6 h-6 text-foreground/50" />
          <Input
            className="pl-14 h-14 bg-background border-[3px] border-border font-headline font-bold text-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neo-blue focus-visible:ring-offset-2 uppercase tracking-widest placeholder:text-foreground/30 rounded-md transition-all"
            placeholder="SEARCH 900+ 24/7 CHANNELS..."
            value={search}
            onChange={handleSearch}
          />
        </div>

        {total > 0 && (
          <div className="text-foreground font-headline font-black text-xl uppercase tracking-[0.2em] whitespace-nowrap bg-neo-yellow px-4 py-2 border-[3px] border-border rounded-md">
            {total} <span className="text-sm">CHANNELS</span>
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              /* biome-ignore lint/suspicious/noArrayIndexKey: skeleton loading array mapped */
              key={`skeleton-${i}`}
              className="bg-card border-[3px] border-border p-4 h-[100px] flex animate-pulse items-center"
            />
          ))}
        </div>
      ) : channels.length === 0 ? (
        <div className="py-32 border-[4px] border-border border-dashed text-center flex flex-col items-center justify-center bg-card mb-10">
          <Tv className="w-16 h-16 text-foreground/20 mb-6" />
          <p className="font-headline font-black text-4xl uppercase tracking-widest text-foreground/40">
            No Channels Found
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {channels.map((channel) => (
            <ChannelRow key={channel.id} channel={channel} />
          ))}
        </div>
      )}

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 pt-10 pb-6 border-t-[4px] border-border mt-12">
          <Button
            variant="neo-outline"
            size="lg"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1 || isLoading}
            className="flex-1 sm:flex-none border-[3px] border-border font-headline font-black text-xl uppercase tracking-[0.2em] w-full sm:w-48 h-14"
          >
            <ChevronLeft className="w-6 h-6 mr-2" /> PREV
          </Button>
          <span className="font-headline font-black text-lg md:text-2xl uppercase tracking-widest px-6 py-2 bg-secondary border-[3px] border-border rounded-md">
            PAGE {page} <span className="opacity-40 px-1">OF</span> {totalPages}
          </span>
          <Button
            variant="neo-outline"
            size="lg"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages || isLoading}
            className="flex-1 sm:flex-none border-[3px] border-border font-headline font-black text-xl uppercase tracking-[0.2em] w-full sm:w-48 h-14"
          >
            NEXT <ChevronRight className="w-6 h-6 ml-2" />
          </Button>
        </div>
      )}
    </div>
  );
}

function ChannelRow({ channel }: { channel: Channel }) {
  const pseudoMatch = {
    id: `live-server1:${channel.providerId}`,
    team1: { name: channel.name, id: '', score: '', avatar: '' },
    team2: { name: '', id: '', score: '', avatar: '' },
    status: 'MatchIng',
    startTime: Date.now(),
    endTime: Date.now() + 86400000,
    league: '24/7 Channel',
    type: channel.category || 'Live TV',
    channelName: channel.name,
    contentKind: 'channel' as const,
    playType: 'hls' as const,
  };

  const {
    showPrompt,
    isCreatingParty,
    setShowPrompt,
    handleWatchClick,
    handleWatchSolo,
    handleWatchParty,
  } = useLiveMatchCard(
    pseudoMatch as unknown as typeof pseudoMatch & { status: 'MatchIng' },
  );

  return (
    <>
      <div className="group bg-card border-[3px] border-border p-4 flex flex-col md:flex-row items-center gap-6 transition-colors hover:bg-accent rounded-md">
        {/* Left Side: Tag / Live Indicator */}
        <div className="flex flex-col items-center md:items-start w-full md:w-32 flex-shrink-0">
          <div className="animate-pulse mb-1">
            <span className="px-3 py-1 bg-neo-red text-white text-[10px] font-black uppercase tracking-widest border-[2px] border-border font-headline rounded-md inline-flex">
              24/7 LIVE
            </span>
          </div>
          <div className="flex flex-col items-center md:items-start gap-1 w-full mt-2">
            <span className="px-2 py-0.5 bg-secondary border-[2px] border-border text-[10px] font-bold uppercase tracking-[0.1em] text-foreground truncate max-w-full rounded-sm">
              {channel.category || 'TV Channel'}
            </span>
          </div>
        </div>

        {/* Middle Side: Channel Name */}
        <div className="flex flex-1 items-center justify-center md:justify-start gap-4 w-full px-4">
          <div className="flex w-full items-center justify-center md:justify-start gap-4">
            <div className="flex items-center gap-4 min-w-0">
              <div className="w-12 h-12 md:w-16 md:h-16 bg-secondary border-[2px] border-border flex-shrink-0 overflow-hidden flex items-center justify-center p-2 rounded-full transition-transform">
                {channel.icon ? (
                  <img
                    src={channel.icon || undefined}
                    alt={channel.name}
                    className="w-full h-full object-contain"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                      e.currentTarget.parentElement!.innerHTML =
                        '<div class="w-full h-full flex items-center justify-center"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-6 h-6 opacity-30"><rect width="20" height="15" x="2" y="7" rx="2" ry="2"/><polyline points="17 2 12 7 7 2"/></svg></div>';
                    }}
                  />
                ) : (
                  <Tv className="w-6 h-6 text-foreground/40" />
                )}
              </div>
              <div className="min-w-0 text-center md:text-left">
                <p className="font-headline font-black text-xl md:text-2xl lg:text-3xl uppercase tracking-tighter text-foreground group-hover:text-primary transition-colors">
                  {channel.name}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Watch Button */}
        <div className="w-full md:w-auto flex-shrink-0 flex justify-end mt-4 md:mt-0">
          <Button
            variant="neo-red"
            onClick={handleWatchClick}
            className="w-full md:w-48 h-12 md:h-16 flex items-center justify-center gap-3 font-black font-headline text-base md:text-xl uppercase tracking-[0.2em] border-[3px] md:border-[4px] border-border transition-colors hover:bg-foreground hover:text-background"
          >
            <Play className="w-5 h-5 md:w-6 md:h-6 fill-current" />
            Watch
          </Button>
        </div>
      </div>

      <LiveMatchModal
        match={
          pseudoMatch as unknown as typeof pseudoMatch & { status: 'MatchIng' }
        }
        isOpen={showPrompt}
        isCreatingParty={isCreatingParty}
        onClose={() => setShowPrompt(false)}
        onWatchSolo={handleWatchSolo}
        onWatchParty={handleWatchParty}
      />
    </>
  );
}

declare global {
  interface Window {
    debounceTimer?: NodeJS.Timeout;
  }
}
