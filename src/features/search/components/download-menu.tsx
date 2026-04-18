'use client';

import { Check, Download, HardDriveDownload, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { useDownloads } from '@/features/downloads/hooks/use-downloads';
import { cn } from '@/lib/utils';
import type { DownloadItem } from '@/types/electron';
import { useDownloadMenu } from '../hooks/use-download-menu';
import {
  ContentType,
  type Episode,
  type Season,
  type ShowDetails,
} from '../types';
import type { DownloadQuality } from '../utils/download';

function TransparentQualityOptions({
  isS2,
  qualities,
  isLoading,
  downloaded,
  isElectronLoading,
  existingDownload,
  onPick,
}: {
  isS2: boolean;
  qualities: DownloadQuality[] | null;
  isLoading: boolean;
  downloaded: string | null;
  isElectronLoading: boolean;
  existingDownload?: DownloadItem;
  onPick: (quality: 'high' | 'medium' | 'low', url?: string) => void;
}) {
  const getQualityUrl = (
    target: 'high' | 'medium' | 'low',
  ): string | undefined => {
    if (!qualities || qualities.length === 0) return undefined;
    if (target === 'high')
      return (
        qualities.find((q) => q.quality.includes('1080'))?.url ||
        qualities[0]?.url
      );
    if (target === 'medium')
      return (
        qualities.find((q) => q.quality.includes('720'))?.url ||
        qualities[Math.floor(qualities.length / 2)]?.url
      );
    if (target === 'low')
      return (
        qualities.find(
          (q) => q.quality.includes('480') || q.quality.includes('360'),
        )?.url || qualities[qualities.length - 1]?.url
      );
  };

  if (isS2 && isLoading) {
    return (
      <div className="flex items-center gap-3 text-black/50 dark:text-white/50 animate-pulse">
        <Loader2 className="w-5 h-5 animate-spin" />
        <span className="text-xl font-headline font-black uppercase tracking-wider">
          Gathering sources...
        </span>
      </div>
    );
  }

  if (isS2 && qualities !== null && qualities.length === 0) {
    return (
      <p className="text-xl font-headline font-black uppercase text-red-400">
        No formats available
      </p>
    );
  }

  const options: Array<{ label: string; value: 'high' | 'medium' | 'low' }> = [
    { label: '480P', value: 'low' },
    { label: '720P', value: 'medium' },
    { label: '1080P+', value: 'high' },
  ];

  return (
    <div className="flex flex-col gap-6 w-full">
      {isElectronLoading && (
        <div className="fixed inset-0 z-[10200] flex flex-col items-center justify-center bg-white/80 dark:bg-black/60 backdrop-blur-md animate-in fade-in duration-300">
          <Loader2
            className="w-16 h-16 md:w-24 md:h-24 text-black dark:text-white animate-spin mb-6"
            strokeWidth={2}
          />
          <span className="text-xl md:text-3xl font-headline font-black uppercase tracking-[0.2em] text-black dark:text-white animate-pulse">
            Securely Starting Download...
          </span>
        </div>
      )}
      {options.map((opt) => {
        const isCurrentActive =
          downloaded === opt.value || existingDownload?.quality === opt.value;
        const isBlocked =
          isElectronLoading ||
          downloaded !== null ||
          existingDownload?.quality === opt.value;

        return (
          <button
            type="button"
            key={opt.value}
            disabled={isBlocked}
            onClick={() =>
              onPick(opt.value, isS2 ? getQualityUrl(opt.value) : undefined)
            }
            className={cn(
              'group relative flex items-center justify-between w-full text-left focus:outline-none transition-all duration-500 py-2',
              isBlocked && !isCurrentActive
                ? 'opacity-30 cursor-not-allowed'
                : 'cursor-pointer',
            )}
          >
            <div className="flex items-center gap-6">
              <span
                className={cn(
                  'text-4xl md:text-5xl lg:text-7xl font-headline font-black uppercase tracking-tighter transition-all duration-300',
                  isCurrentActive
                    ? 'text-green-400'
                    : 'text-black/40 dark:text-white/40 group-hover:text-black dark:text-white',
                )}
              >
                {opt.label}
              </span>
            </div>

            <div
              className={cn(
                'flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300',
                isCurrentActive && 'opacity-100',
              )}
            >
              {isElectronLoading && downloaded === opt.value ? (
                <Loader2 className="w-8 h-8 md:w-10 md:h-10 text-black dark:text-white animate-spin" />
              ) : isCurrentActive ? (
                <div className="flex items-center gap-3 text-green-400">
                  <Check className="w-8 h-8 md:w-12 md:h-12 stroke-[3]" />
                  <span className="hidden md:inline text-xl font-black uppercase tracking-widest">
                    Saved
                  </span>
                </div>
              ) : (
                <Download className="w-8 h-8 md:w-10 md:h-10 text-black dark:text-white stroke-[3]" />
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}

function TransparentMovieSection({
  contentId,
  showTitle,
  posterUrl,
  onComplete,
  show,
}: {
  contentId: string;
  showTitle: string;
  posterUrl?: string;
  onComplete: () => void;
  show: ShowDetails;
}) {
  const {
    isS2,
    qualities,
    isLoading,
    downloaded,
    isElectronLoading,
    existingDownload,
    loadQualities,
    handleElectronClick,
  } = useDownloadMenu({
    contentId,
    showTitle,
    posterUrl,
    type: 'movie',
    onComplete,
    show,
  });

  useEffect(() => {
    if (isS2 && qualities === null && !isLoading) loadQualities();
  }, [isS2, qualities, isLoading, loadQualities]);

  return (
    <div className="flex flex-col gap-8 flex-1 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:slide-out-to-right-8 data-[state=open]:fade-in data-[state=open]:slide-in-from-right-8 duration-700 delay-100 fill-mode-both">
      <div className="space-y-2">
        <h3 className="text-lg md:text-xl font-headline font-black uppercase tracking-[0.2em] text-black/40 dark:text-white/40">
          Select Quality
        </h3>
        <p className="text-2xl font-bold text-black/80 dark:text-white/80">
          {showTitle}
        </p>
      </div>
      <TransparentQualityOptions
        isS2={isS2}
        qualities={qualities}
        isLoading={isLoading}
        downloaded={downloaded}
        isElectronLoading={isElectronLoading}
        existingDownload={existingDownload}
        onPick={handleElectronClick}
      />
    </div>
  );
}

function TransparentEpisodeItem({
  episode,
  contentId,
  showTitle,
  posterUrl,
  onComplete,
  show,
}: {
  episode: Episode;
  contentId: string;
  showTitle: string;
  posterUrl?: string;
  onComplete: () => void;
  show: ShowDetails;
}) {
  const router = useRouter();
  const {
    isS2,
    qualities,
    isLoading,
    downloaded,
    isElectronLoading,
    existingDownload,
    loadQualities,
    handleElectronClick,
  } = useDownloadMenu({
    contentId,
    showTitle,
    posterUrl,
    type: 'series',
    season: episode.seasonNumber || 1,
    episode: episode.episodeNumber,
    onComplete,
    show,
  });

  const [expanded, setExpanded] = useState(false);

  return (
    <div className="flex flex-col mb-4">
      <button
        type="button"
        onClick={() => {
          if (existingDownload) {
            onComplete();
            router.push('/downloads');
            return;
          }
          setExpanded(!expanded);
          if (!expanded && isS2 && qualities === null) loadQualities();
        }}
        className={cn(
          'group flex items-end justify-between py-4 focus:outline-none transition-all duration-300 border-b border-black/10 dark:border-white/10',
          expanded || existingDownload
            ? 'border-black/40 dark:border-white/40'
            : 'hover:border-black/30 dark:border-white/30',
        )}
      >
        <div className="flex flex-col text-left">
          <span
            className={cn(
              'text-2xl md:text-3xl font-headline font-black uppercase tracking-tighter transition-colors duration-300 flex items-center gap-4',
              expanded || existingDownload
                ? 'text-neo-blue dark:text-neo-blue'
                : 'text-black/50 dark:text-white/50 group-hover:text-black/80 dark:text-white/80',
            )}
          >
            Episode {episode.episodeNumber}
            {existingDownload && (
              <Check className="w-5 h-5 md:w-6 md:h-6 shrink-0 stroke-[3px]" />
            )}
          </span>
          <span
            className={cn(
              'text-sm transition-colors uppercase tracking-widest mt-1',
              existingDownload
                ? 'text-neo-blue/80 dark:text-neo-blue/80'
                : 'text-black/40 dark:text-white/40 group-hover:text-black/60 dark:text-white/60',
            )}
          >
            {existingDownload ? 'View in Vault' : episode.title || 'Untitled'}
          </span>
        </div>
      </button>

      {expanded && !existingDownload && (
        <div className="pt-6 pb-2 animate-in fade-in slide-in-from-top-4 duration-300">
          <TransparentQualityOptions
            isS2={isS2}
            qualities={qualities}
            isLoading={isLoading}
            downloaded={downloaded}
            isElectronLoading={isElectronLoading}
            existingDownload={existingDownload}
            onPick={handleElectronClick}
          />
        </div>
      )}
    </div>
  );
}

interface DownloadMenuProps {
  show: ShowDetails;
  selectedSeason?: Season | null;
  episodes?: Episode[];
}

export function DownloadMenu({
  show,
  selectedSeason,
  episodes = [],
}: DownloadMenuProps) {
  const router = useRouter();
  const { downloads } = useDownloads();
  const [isOpen, setIsOpen] = useState(false);
  const [selectedDubId, setSelectedDubId] = useState<string>(show.id);
  const [selectedDubType, setSelectedDubType] = useState<ContentType>(
    show.contentType,
  );

  const isSeries = selectedDubType === ContentType.Series;
  const seasonNumber = selectedSeason?.seasonNumber ?? 1;
  const seasonEpisodes = episodes.filter(
    (e) => !e.seasonNumber || e.seasonNumber === seasonNumber,
  );

  const isFullyDownloaded = useMemo(() => {
    const showDownloads = downloads.filter(
      (d) =>
        (d.showData &&
          typeof d.showData === 'object' &&
          'id' in d.showData &&
          d.showData.id === show.id) ||
        d.contentId.includes(show.id),
    );
    if (show.contentType === ContentType.Movie) {
      return showDownloads.length > 0;
    }
    if (seasonEpisodes.length === 0) return false;
    return seasonEpisodes.every((ep) =>
      showDownloads.some(
        (d) =>
          d.contentId.includes(`ep${ep.episodeNumber}`) ||
          d.contentId.includes(`E${ep.episodeNumber}`),
      ),
    );
  }, [downloads, show, seasonEpisodes]);

  // Close menu and prevent body lock issues
  const onComplete = () => {
    setTimeout(() => setIsOpen(false), 800);
  };

  if (isFullyDownloaded) {
    return (
      <button
        type="button"
        onClick={() => router.push('/downloads')}
        className={cn(
          'w-full sm:w-auto sm:min-w-[220px] flex-1',
          'flex items-center justify-center gap-3 px-6 py-4 md:px-8 md:py-5 border-[4px] border-border font-black font-headline uppercase tracking-widest text-base md:text-lg transition-[background-color,color,border-color,opacity,transform] duration-200 whitespace-nowrap',
          'bg-white hover:bg-gray-100 text-black dark:bg-neo-blue dark:hover:bg-neo-blue/80 dark:text-primary-foreground',
        )}
      >
        <HardDriveDownload className="w-5 h-5 md:w-6 md:h-6 stroke-[3px]" />
        <span className="truncate">View in Vault</span>
      </button>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <button
          type="button"
          className={cn(
            'w-full sm:w-auto sm:min-w-[220px] flex-1',
            'flex items-center justify-center gap-3 px-6 py-4 md:px-8 md:py-5 border-[4px] border-border font-black font-headline uppercase tracking-widest text-base md:text-lg transition-[background-color,color,border-color,opacity,transform] duration-200 whitespace-nowrap',
            'bg-white hover:bg-gray-100 text-black dark:bg-blue-500 dark:hover:bg-blue-600 dark:text-white',
          )}
        >
          <Download className="w-5 h-5 md:w-6 md:h-6 stroke-[3px]" />
          <span className="truncate">Download</span>
        </button>
      </DialogTrigger>

      <DialogContent
        className="!fixed !inset-0 !left-0 !top-0 !translate-x-0 !translate-y-0 z-[10100] !max-w-none w-screen h-screen m-0 p-0 border-none bg-white/80 dark:bg-black/60 backdrop-blur-2xl shadow-none !flex flex-col md:flex-row [-webkit-app-region:no-drag] data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 duration-500"
        showCloseButton={false}
      >
        <DialogTitle className="sr-only">Download {show.title}</DialogTitle>

        <button
          type="button"
          onClick={() => setIsOpen(false)}
          className="absolute top-8 right-8 z-50 text-black/50 dark:text-white/50 hover:text-black dark:hover:text-white font-headline font-black uppercase tracking-[0.2em] text-sm transition-colors duration-300 focus:outline-none [-webkit-app-region:no-drag]"
        >
          Cancel
        </button>

        {/* Left Column: Languages */}
        <div className="w-full md:w-1/3 border-b md:border-b-0 md:border-r border-black/10 dark:border-white/10 p-8 md:p-16 flex flex-col justify-start data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:slide-out-to-left-8 data-[state=open]:fade-in data-[state=open]:slide-in-from-left-8 duration-700 h-full overflow-hidden">
          <h2 className="text-lg md:text-xl font-headline font-black uppercase tracking-[0.2em] text-black/40 dark:text-white/40 mb-12">
            Language
          </h2>

          <div className="flex flex-col gap-6 overflow-y-auto custom-scrollbar pr-4">
            {show.dubs && show.dubs.length > 1 ? (
              show.dubs.map((dub) => {
                const dubId = `s2:${dub.detailPath}::${dub.subjectId}`;
                const isSelected = selectedDubId === dubId;

                return (
                  <button
                    type="button"
                    key={dubId}
                    onClick={() => {
                      setSelectedDubId(dubId);
                      setSelectedDubType(dub.contentType);
                    }}
                    className={cn(
                      'text-left group flex items-center gap-6 focus:outline-none transition-all duration-300',
                    )}
                  >
                    <span
                      className={cn(
                        'text-3xl md:text-4xl lg:text-5xl font-headline font-black uppercase tracking-tighter transition-all duration-300',
                        isSelected
                          ? 'text-black dark:text-white translate-x-2'
                          : 'text-black/30 dark:text-white/30 group-hover:text-black/60 dark:text-white/60',
                      )}
                    >
                      {dub.lanName}
                    </span>
                    {isSelected && (
                      <div className="w-3 h-3 rounded-full bg-black dark:bg-white animate-pulse" />
                    )}
                  </button>
                );
              })
            ) : show.dubs && show.dubs.length === 1 ? (
              <div className="text-3xl md:text-4xl lg:text-5xl font-headline font-black uppercase tracking-tighter text-black dark:text-white">
                {show.dubs[0].lanName}
              </div>
            ) : (
              <div className="text-3xl md:text-4xl lg:text-5xl font-headline font-black uppercase tracking-tighter text-black dark:text-white">
                Original
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Qualities or Episodes */}
        <div className="w-full md:w-2/3 p-8 md:p-16 flex flex-col justify-start overflow-y-auto custom-scrollbar">
          {!isSeries ? (
            <TransparentMovieSection
              contentId={selectedDubId}
              showTitle={show.title}
              posterUrl={show.posterUrl}
              onComplete={onComplete}
              show={show}
            />
          ) : (
            <div className="flex flex-col gap-6 w-full max-w-3xl data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:slide-out-to-right-8 data-[state=open]:fade-in data-[state=open]:slide-in-from-right-8 duration-700 delay-100 fill-mode-both">
              <div className="space-y-2 mb-8">
                <h3 className="text-lg md:text-xl font-headline font-black uppercase tracking-[0.2em] text-black/40 dark:text-white/40">
                  Select Episode
                </h3>
                <p className="text-2xl font-bold text-black/80 dark:text-white/80">
                  Season {seasonNumber}
                </p>
              </div>

              <div className="flex flex-col pr-4">
                {seasonEpisodes.length === 0 ? (
                  <p className="text-xl font-headline font-black uppercase text-black/30 dark:text-white/30">
                    No episodes available
                  </p>
                ) : (
                  seasonEpisodes.map((ep) => (
                    <TransparentEpisodeItem
                      key={ep.episodeId}
                      episode={ep}
                      contentId={selectedDubId}
                      showTitle={show.title}
                      posterUrl={show.posterUrl}
                      onComplete={onComplete}
                      show={show}
                    />
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
