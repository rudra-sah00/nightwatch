import { ChevronLeft, ChevronRight, Play, Search, Tv } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useRef, useState } from 'react';
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
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const t = useTranslations('live');

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearch(val);
    setPage(1);

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
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
        {t('failedToLoadChannels')}: {error.message}
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
            placeholder={t('searchChannels')}
            value={search}
            onChange={handleSearch}
          />
        </div>

        {total > 0 && (
          <div className="text-foreground font-headline font-black text-xl uppercase tracking-[0.2em] whitespace-nowrap bg-neo-yellow px-4 py-2 border-[3px] border-border rounded-md">
            {total} <span className="text-sm">{t('channels')}</span>
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
            {t('noChannelsFoundSearch')}
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
            <ChevronLeft className="w-6 h-6 mr-2" /> {t('prev')}
          </Button>
          <span className="font-headline font-black text-lg md:text-2xl uppercase tracking-widest px-6 py-2 bg-secondary border-[3px] border-border rounded-md">
            {t('page')} {page}{' '}
            <span className="opacity-40 px-1">{t('of')}</span> {totalPages}
          </span>
          <Button
            variant="neo-outline"
            size="lg"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages || isLoading}
            className="flex-1 sm:flex-none border-[3px] border-border font-headline font-black text-xl uppercase tracking-[0.2em] w-full sm:w-48 h-14"
          >
            {t('next')} <ChevronRight className="w-6 h-6 ml-2" />
          </Button>
        </div>
      )}
    </div>
  );
}

function ChannelRow({ channel }: { channel: Channel }) {
  const [imgError, setImgError] = useState(false);
  const t = useTranslations('live');
  // Extract just the channel number if providerId is a daddylive URL
  // This prevents Vercel WAF from blocking the /live/live-server1:https:/... path.
  let cleanProviderId = channel.providerId || '';
  const streamMatch = cleanProviderId.match(/stream-(\d+)/);
  if (streamMatch) {
    cleanProviderId = streamMatch[1];
  } else {
    const digitsMatch = cleanProviderId.match(/(\d+)/);
    if (digitsMatch) cleanProviderId = digitsMatch[1];
  }

  const pseudoMatch = {
    id: `live-server1:${cleanProviderId}`,
    team1: {
      name: channel.name,
      id: '',
      score: '',
      avatar: channel.icon || '',
    },
    team2: { name: '', id: '', score: '', avatar: '' },
    status: 'MatchIng',
    startTime: Date.now(),
    endTime: Date.now() + 86400000,
    league: t('twentyFourSevenChannel'),
    type: channel.category || t('liveTVType'),
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
      <LiveMatchModal
        match={
          pseudoMatch as unknown as typeof pseudoMatch & { status: 'MatchIng' }
        }
        isOpen={showPrompt}
        onClose={() => setShowPrompt(false)}
        onWatchSolo={handleWatchSolo}
        onWatchParty={handleWatchParty}
        isCreatingParty={isCreatingParty}
      />
      <div className="group bg-card border-[3px] border-border p-4 flex flex-col md:flex-row items-center gap-6 transition-colors hover:bg-accent rounded-md">
        {/* Left Side: Tag / Live Indicator */}
        <div className="flex flex-col items-center md:items-start w-full md:w-32 flex-shrink-0">
          <div className="flex gap-2 animate-pulse mb-1">
            <span className="px-3 py-1 bg-neo-red text-white text-[10px] font-black uppercase tracking-widest border-[2px] border-border font-headline rounded-md inline-flex">
              {t('twentyFourSeven')}
            </span>
          </div>
          <div className="flex flex-col items-center md:items-start gap-1 w-full mt-1">
            <span className="px-2 py-0.5 bg-neo-blue text-white border-[2px] border-border text-[9px] font-black uppercase tracking-widest rounded-sm">
              {t('desktopOnly')}
            </span>
            <span className="px-2 py-0.5 bg-secondary border-[2px] border-border text-[9px] font-bold uppercase tracking-[0.1em] text-foreground truncate max-w-full rounded-sm">
              {channel.category || t('tvChannel')}
            </span>
          </div>
        </div>

        {/* Middle Side: Channel Name */}
        <div className="flex flex-1 items-center justify-center md:justify-start gap-4 w-full px-4">
          <div className="flex w-full items-center justify-center md:justify-start gap-4">
            <div className="flex items-center gap-4 min-w-0">
              <div className="w-12 h-12 md:w-16 md:h-16 bg-secondary border-[2px] border-border flex-shrink-0 overflow-hidden flex items-center justify-center p-2 rounded-full transition-transform">
                {channel.icon && !imgError ? (
                  <img
                    src={channel.icon}
                    alt={channel.name}
                    className="w-full h-full object-contain"
                    onError={() => setImgError(true)}
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
            {t('watch')}
          </Button>
        </div>
      </div>
    </>
  );
}
