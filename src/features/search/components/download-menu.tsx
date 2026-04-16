'use client';

import { Check, ChevronDown, Download, Loader2, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { useDownloadMenu } from '../hooks/use-download-menu';
import {
  ContentType,
  type Episode,
  type Season,
  type ShowDetails,
} from '../types';
import {
  type DownloadQuality,
  fetchDownloadLinks,
  sortQualities,
  startElectronDownload,
} from '../utils/download';

// ─── Components ─────────────────────────────────────────────────────────────

function QualitySelectionOptions({
  isS2,
  qualities,
  isLoading,
  downloaded,
  isElectronLoading,
  onPick,
}: {
  isS2: boolean;
  qualities: DownloadQuality[] | null;
  isLoading: boolean;
  downloaded: string | null;
  isElectronLoading: boolean;
  onPick: (quality: 'high' | 'medium' | 'low', url?: string) => void;
}) {
  const getQualityUrl = (
    target: 'high' | 'medium' | 'low',
  ): string | undefined => {
    if (!qualities || qualities.length === 0) return undefined;
    if (target === 'high') {
      return (
        qualities.find((q) => q.quality.includes('1080'))?.url ||
        qualities[0]?.url
      );
    }
    if (target === 'medium') {
      return (
        qualities.find((q) => q.quality.includes('720'))?.url ||
        qualities[Math.floor(qualities.length / 2)]?.url
      );
    }
    if (target === 'low') {
      return (
        qualities.find(
          (q) => q.quality.includes('480') || q.quality.includes('360'),
        )?.url || qualities[qualities.length - 1]?.url
      );
    }
  };

  if (isS2 && isLoading) {
    return (
      <div className="flex flex-col items-center gap-4 py-8 justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-foreground stroke-[3px]" />
        <span className="text-xs font-headline font-black uppercase tracking-widest text-foreground">
          FETCHING LINK FORMATS…
        </span>
      </div>
    );
  }

  if (isS2 && qualities !== null && qualities.length === 0) {
    return (
      <div className="py-6 text-center border-[3px] border-dashed border-border/20">
        <p className="text-xs font-headline font-black uppercase text-foreground/70">
          No valid formats available.
        </p>
      </div>
    );
  }

  const options: Array<{ label: string; value: 'high' | 'medium' | 'low' }> = [
    { label: 'HIGH (1080p+)', value: 'high' },
    { label: 'MEDIUM (720p)', value: 'medium' },
    { label: 'LOW (480p+)', value: 'low' },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          disabled={isElectronLoading || downloaded !== null}
          onClick={() => {
            const url = isS2 ? getQualityUrl(opt.value) : undefined;
            onPick(opt.value, url);
          }}
          className={cn(
            'flex items-center justify-center gap-2 px-3 py-3 sm:py-4 border-[3px] border-border font-headline font-black uppercase text-xs tracking-widest transition-all duration-150 active:scale-[0.98]',
            downloaded === opt.value
              ? 'bg-neo-green text-green-950 border-neo-green scale-[0.98]'
              : 'bg-background text-foreground hover:bg-card hover:-translate-y-0.5 hover:shadow-[0_4px_0_0_rgb(0,0,0)] dark:hover:shadow-none',
          )}
        >
          {isElectronLoading && downloaded === opt.value ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin stroke-[3px]" />
          ) : downloaded === opt.value ? (
            <Check className="w-3.5 h-3.5 stroke-[4px]" />
          ) : (
            <Download className="w-3.5 h-3.5 stroke-[3px]" />
          )}
          {downloaded === opt.value ? 'STARTED' : opt.label}
        </button>
      ))}
    </div>
  );
}

function MovieDownloadSection({
  contentId,
  showTitle,
  posterUrl,
  onComplete,
  show,
}: {
  contentId: string;
  showTitle: string;
  posterUrl?: string;
  onComplete?: () => void;
  show?: ShowDetails;
}) {
  const {
    isS2,
    qualities,
    isLoading,
    downloaded,
    isElectronLoading,
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

  // Load on mount or when reset (Web only)
  useEffect(() => {
    if (isS2 && qualities === null && !isLoading) {
      loadQualities();
    }
  }, [isS2, qualities, isLoading, loadQualities]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h3 className="font-headline font-black uppercase text-sm tracking-widest text-foreground/80 flex items-center justify-between pb-2 border-b-[3px] border-border/40">
          SELECT QUALITY
        </h3>
        <span className="text-xs font-semibold text-foreground/60 italic tracking-wide">
          {showTitle}
        </span>
      </div>

      <QualitySelectionOptions
        isS2={isS2}
        qualities={qualities}
        isLoading={isLoading}
        downloaded={downloaded}
        isElectronLoading={isElectronLoading}
        onPick={(quality, url) => handleElectronClick(quality, url)}
      />
    </div>
  );
}

function EpisodeItem({
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
  onComplete?: () => void;
  show?: ShowDetails;
}) {
  const isS2 = contentId?.startsWith('s2:');
  const [qualities, setQualities] = useState<DownloadQuality[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [downloaded, setDownloaded] = useState<string | null>(null);
  const [isElectronLoading, setElectronLoading] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  const loadLinks = async () => {
    if (!isS2) return;
    if (qualities !== null || isLoading) return;
    setIsLoading(true);
    try {
      const q = await fetchDownloadLinks(
        contentId,
        'series',
        episode.seasonNumber || 1,
        episode.episodeNumber,
      );
      setQualities(sortQualities(q));
    } catch {
      setQualities([]);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleExpand = () => {
    const isNowExpanded = !isExpanded;
    setIsExpanded(isNowExpanded);
    if (isNowExpanded && isS2 && qualities === null) {
      loadLinks();
    }
  };

  const handleElectronClick = async (
    qualityLabel: 'high' | 'medium' | 'low',
    qualityUrl?: string,
  ) => {
    setElectronLoading(true);
    await startElectronDownload({
      contentId,
      showTitle,
      posterUrl,
      type: 'series',
      season: episode.seasonNumber || 1,
      episode: episode.episodeNumber,
      directUrl: qualityUrl,
      quality: qualityLabel,
      show,
    });
    setDownloaded(qualityLabel);
    toast.success(
      `Download Started for Ep ${episode.episodeNumber}! Check your Offline Library.`,
    );
    setTimeout(() => {
      setDownloaded(null);
      if (onComplete) onComplete();
    }, 800);
    setElectronLoading(false);
  };

  return (
    <div className="flex flex-col border-[3px] border-border bg-background transition-colors duration-200">
      <button
        type="button"
        onClick={toggleExpand}
        className="flex items-center justify-between p-4 sm:p-5 w-full text-left hover:bg-card transition-colors focus-visible:outline-none"
      >
        <div className="flex flex-col gap-1 pr-4 truncate">
          <span className="text-foreground text-xs sm:text-sm font-headline font-black uppercase tracking-widest truncate leading-tight">
            Episode {episode.episodeNumber}
          </span>
          <span className="text-foreground/70 text-[10px] sm:text-xs font-semibold truncate leading-none">
            {episode.title || 'Untitled'}
          </span>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <div className="w-8 h-8 flex items-center justify-center border-2 border-border bg-neo-blue text-white shrink-0">
            <Download className="w-4 h-4 stroke-[3px]" />
          </div>
          <ChevronDown
            className={cn(
              'w-4 h-4 text-foreground/50 transition-transform duration-200',
              isExpanded && 'rotate-180',
            )}
          />
        </div>
      </button>

      {isExpanded && (
        <div className="p-4 sm:p-6 pb-6 border-t-[3px] border-border bg-card animate-in slide-in-from-top-2 duration-200">
          <QualitySelectionOptions
            isS2={isS2}
            qualities={qualities}
            isLoading={isLoading}
            downloaded={downloaded}
            isElectronLoading={isElectronLoading}
            onPick={(quality, url) => handleElectronClick(quality, url)}
          />
        </div>
      )}
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

interface DownloadMenuProps {
  show: ShowDetails;
  selectedSeason?: Season | null;
  episodes?: Episode[];
}

const EMPTY_EPISODES: Episode[] = [];

export function DownloadMenu({
  show,
  selectedSeason,
  episodes = EMPTY_EPISODES,
}: DownloadMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedDubId, setSelectedDubId] = useState<string>(show.id);
  const [selectedDubType, setSelectedDubType] = useState<ContentType>(
    show.contentType,
  );

  // Desktop App Only feature

  const isSeries = selectedDubType === ContentType.Series;
  const seasonNumber = selectedSeason?.seasonNumber ?? 1;
  const seasonEpisodes = episodes.filter(
    (e) => !e.seasonNumber || e.seasonNumber === seasonNumber,
  );

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <button
          type="button"
          className={cn(
            'flex w-full items-center justify-center gap-3 px-6 py-4 md:px-8 md:py-5 border-[4px] border-border text-foreground transition-colors duration-200 font-headline font-black uppercase tracking-widest text-base md:text-lg h-auto',
            'bg-blue-500 hover:bg-blue-600 text-white',
          )}
        >
          <Download className="w-5 h-5 md:w-6 md:h-6 stroke-[3px]" />
          DOWNLOAD
        </button>
      </DialogTrigger>

      <DialogContent
        onPointerDownOutside={(e) => {
          // Because the modal overlaps the initial trigger visually due to z-index layers,
          // we ignore pointer down events that try to autoclose.
          e.preventDefault();
        }}
        showCloseButton={false}
        className="fixed z-[10100] bg-card border-[4px] border-border -yellow max-w-lg max-h-[85vh] overflow-hidden flex flex-col p-0"
      >
        <DialogHeader className="flex-shrink-0 px-4 sm:px-6 py-4 bg-background border-b-[4px] border-border flex-row items-center justify-between space-y-0">
          <div className="flex flex-col gap-0.5 truncate pr-4 text-left">
            <DialogTitle className="text-foreground text-lg sm:text-xl font-headline font-black uppercase tracking-widest flex items-center gap-3 leading-none">
              <Download className="w-5 h-5 sm:w-6 sm:h-6 text-foreground stroke-[3px]" />
              OFFLINE SECURE DOWNLOAD
            </DialogTitle>
            <DialogDescription className="sr-only">
              Download links for {show.title}. Choose a language and quality,
              then start downloading the selected file.
            </DialogDescription>
            <p className="text-foreground/70 text-[10px] sm:text-xs font-headline font-bold uppercase tracking-widest truncate opacity-80">
              {show.title}
            </p>
          </div>
          <DialogClose asChild>
            <button
              type="button"
              className="p-2 border-[4px] border-border bg-neo-red text-white hover:bg-primary hover:text-primary-foreground transition-colors flex-shrink-0"
              aria-label="Close modal"
            >
              <X className="w-5 h-5 stroke-[3px]" />
            </button>
          </DialogClose>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-6 bg-card no-scrollbar">
          {/* Dub/Language Selector */}
          {show.dubs && show.dubs.length > 1 && (
            <div className="mb-8 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-2 h-6 bg-neo-blue border-2 border-border" />
                <span className="text-xs font-headline font-black uppercase tracking-widest text-foreground">
                  SELECT LANGUAGE
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {show.dubs.map((dub) => {
                  const dubId = `s2:${dub.detailPath}::${dub.subjectId}`;
                  const isSelected = selectedDubId === dubId;
                  return (
                    <button
                      key={dubId}
                      type="button"
                      onClick={() => {
                        setSelectedDubId(dubId);
                        setSelectedDubType(dub.contentType);
                      }}
                      className={cn(
                        'px-4 py-2 border-[2px] border-border font-headline font-black uppercase text-xs tracking-widest transition-[background-color,color,transform] duration-150 active:scale-95',
                        isSelected
                          ? 'bg-neo-yellow text-foreground '
                          : 'bg-background text-foreground hover:bg-secondary',
                      )}
                    >
                      {dub.lanName}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {!isSeries ? (
            <MovieDownloadSection
              contentId={selectedDubId}
              showTitle={show.title}
              posterUrl={show.posterUrl}
              show={show}
            />
          ) : (
            <div className="space-y-6">
              <div className="flex items-center justify-between gap-4 sticky top-0 bg-card z-10 py-2 border-b-2 border-border/20">
                <div className="flex flex-col">
                  <span className="text-sm font-headline font-black uppercase tracking-widest">
                    SEASON {seasonNumber}
                  </span>
                  <span className="text-xs text-foreground/60 font-semibold tracking-wider">
                    {seasonEpisodes.length} Episodes
                  </span>
                </div>
              </div>

              <div className="space-y-3 pb-8">
                {seasonEpisodes.length === 0 ? (
                  <div className="py-8 text-center border-[3px] border-dashed border-border/20">
                    <p className="text-sm font-headline font-black uppercase text-foreground/70">
                      No episodes available
                    </p>
                  </div>
                ) : (
                  seasonEpisodes.map((ep) => (
                    <EpisodeItem
                      key={ep.episodeId}
                      episode={ep}
                      contentId={selectedDubId}
                      showTitle={show.title}
                      posterUrl={show.posterUrl}
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
