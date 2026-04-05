'use client';

import { Check, ChevronDown, Download, Loader2, X } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { apiFetch } from '@/lib/fetch';
import { cn } from '@/lib/utils';
import {
  ContentType,
  type Episode,
  type Season,
  type ShowDetails,
} from '../types';

// ─── API ────────────────────────────────────────────────────────────────────

interface DownloadQuality {
  quality: string;
  url: string;
}

async function fetchDownloadLinks(
  id: string,
  type: 'movie' | 'series',
  season?: number,
  episode?: number,
): Promise<DownloadQuality[]> {
  const params = new URLSearchParams({ id, type });
  if (season != null) params.set('season', String(season));
  if (episode != null) params.set('episode', String(episode));

  const res = await apiFetch<{
    success: boolean;
    qualities: DownloadQuality[];
  }>(`/api/video/download-links?${params}`);
  return res.qualities ?? [];
}

// ─── Quality Badge ──────────────────────────────────────────────────────────

const QUALITY_ORDER = ['1080p', '720p', '480p', '360p', '240p'];

function sortQualities(qualities: DownloadQuality[]): DownloadQuality[] {
  return [...qualities].sort((a, b) => {
    const ai = QUALITY_ORDER.indexOf(a.quality);
    const bi = QUALITY_ORDER.indexOf(b.quality);
    if (ai === -1 && bi === -1) return 0;
    if (ai === -1) return 1;
    if (bi === -1) return -1;
    return ai - bi;
  });
}

function qualityColor(q: string): string {
  if (q === '1080p') return 'bg-[#ffcc00] text-foreground border-border ';
  if (q === '720p') return 'bg-[#0055ff] text-white border-border ';
  return 'bg-white text-foreground border-border ';
}

function sanitizeFilename(name: string): string {
  return name.replace(/[^a-z0-9]/gi, '_').replace(/_{2,}/g, '_');
}

// ─── Episode Item ────────────────────────────────────────────────────────────

interface EpisodeDownloadItemProps {
  episode: Episode;
  contentId: string;
  seasonNumber: number;
  showTitle: string;
}

function EpisodeDownloadItem({
  episode,
  contentId,
  seasonNumber,
  showTitle,
}: EpisodeDownloadItemProps) {
  const [qualities, setQualities] = useState<DownloadQuality[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [downloaded, setDownloaded] = useState<string | null>(null);

  const handleExpand = useCallback(async () => {
    if (isExpanded) {
      setIsExpanded(false);
      return;
    }
    setIsExpanded(true);
    if (!qualities) {
      setIsLoading(true);
      try {
        const q = await fetchDownloadLinks(
          contentId,
          'series',
          seasonNumber,
          episode.episodeNumber,
        );
        setQualities(sortQualities(q));
      } catch {
        setQualities([]);
      } finally {
        setIsLoading(false);
      }
    }
  }, [isExpanded, qualities, contentId, seasonNumber, episode.episodeNumber]);

  useEffect(() => {
    // Reset qualities when contentId or isExpanded changes
    if (contentId || isExpanded) {
      setQualities(null);
      setDownloaded(null);
    }
  }, [contentId, isExpanded]);

  const triggerDownload = (quality: string) => {
    setDownloaded(quality);
    setTimeout(() => setDownloaded(null), 3000);
  };

  return (
    <div className="border border-transparent mb-2">
      <button
        type="button"
        onClick={handleExpand}
        className="w-full flex items-center justify-between px-6 py-4 hover:bg-background transition-colors duration-200 text-left border-[3px] border-border bg-white"
      >
        <div className="flex items-center gap-4">
          <span className="text-xs font-black font-headline uppercase tracking-tighter text-foreground bg-[#ffe066] px-2 py-0.5 border-2 border-border">
            EP {episode.episodeNumber}
          </span>
          <span className="text-sm font-headline font-black uppercase text-foreground truncate">
            {episode.title || `EPISODE ${episode.episodeNumber}`}
          </span>
        </div>
        <ChevronDown
          className={`w-5 h-5 text-foreground flex-shrink-0 transition-transform duration-200 stroke-[3px] ${isExpanded ? 'rotate-180' : ''}`}
        />
      </button>

      {isExpanded && (
        <div className="px-6 pb-4 pt-2 border-x-[3px] border-b-[3px] border-border bg-background  ml-2 mr-2 -mt-1 relative z-0">
          {isLoading ? (
            <div className="flex items-center gap-2 py-2 text-foreground text-xs font-headline font-black uppercase">
              <Loader2 className="w-4 h-4 animate-spin stroke-[3px]" />
              FETCHING LINKS…
            </div>
          ) : !qualities || qualities.length === 0 ? (
            <p className="text-xs font-headline font-black uppercase text-[#e63b2e] py-2">
              NO DOWNLOAD LINKS AVAILABLE.
            </p>
          ) : (
            <div className="flex flex-wrap gap-3 pt-2">
              {qualities.map((q) => (
                <a
                  key={q.quality}
                  href={q.url}
                  download={`${sanitizeFilename(showTitle)}_S${seasonNumber}E${episode.episodeNumber}_${q.quality}.mp4`}
                  referrerPolicy="no-referrer"
                  onClick={() => triggerDownload(q.quality)}
                  className={cn(
                    'inline-flex items-center gap-1.5 px-4 py-2 border-[2px] text-xs font-headline font-black uppercase transition-[background-color,color,border-color,transform] duration-150 active:scale-95 no-underline',
                    qualityColor(q.quality),
                  )}
                >
                  {downloaded === q.quality ? (
                    <Check className="w-3.5 h-3.5 stroke-[3px]" />
                  ) : (
                    <Download className="w-3.5 h-3.5 stroke-[3px]" />
                  )}
                  {q.quality}
                </a>
              ))}
            </div>
          )}
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

  // Only Server 2 (Balanced Server) content supports downloads
  const isS2 = show.id.startsWith('s2:');
  if (!isS2) return null;

  const isSeries = selectedDubType === ContentType.Series;
  const seasonNumber = selectedSeason?.seasonNumber ?? 1;
  const seasonEpisodes = episodes.filter(
    (e) => !e.seasonNumber || e.seasonNumber === seasonNumber,
  );

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="flex items-center justify-center gap-3 px-6 py-4 md:px-8 md:py-5 border-[4px] border-border bg-[#ffcc00] text-foreground hover:bg-[#ffe066] transition-colors duration-200 font-headline font-black uppercase tracking-widest text-base md:text-lg h-auto"
      >
        <Download className="w-5 h-5 md:w-6 md:h-6 stroke-[3px]" />
        DOWNLOAD
      </button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent
          showCloseButton={false}
          className="fixed z-[150] bg-white border-[4px] border-border -yellow max-w-lg max-h-[85vh] overflow-hidden flex flex-col p-0"
        >
          <DialogHeader className="flex-shrink-0 px-4 sm:px-6 py-4 bg-background border-b-[4px] border-border flex-row items-center justify-between space-y-0">
            <div className="flex flex-col gap-0.5 truncate pr-4 text-left">
              <DialogTitle className="text-foreground text-lg sm:text-xl font-headline font-black uppercase tracking-widest flex items-center gap-3 leading-none">
                <Download className="w-5 h-5 sm:w-6 sm:h-6 text-foreground stroke-[3px]" />
                DOWNLOAD
              </DialogTitle>
              <DialogDescription className="sr-only">
                Download links for {show.title}. Choose a language and quality,
                then start downloading the selected file.
              </DialogDescription>
              <p className="text-[#4a4a4a] text-[10px] sm:text-xs font-headline font-bold uppercase tracking-widest truncate opacity-80">
                {show.title}
              </p>
            </div>
            <DialogClose asChild>
              <button
                type="button"
                className="p-2 border-[4px] border-border bg-[#e63b2e] text-white hover:bg-[#1a1a1a] hover:text-white transition-colors flex-shrink-0"
                aria-label="Close modal"
              >
                <X className="w-5 h-5 stroke-[3px]" />
              </button>
            </DialogClose>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto p-6 bg-white no-scrollbar">
            {/* Dub/Language Selector */}
            {show.dubs && show.dubs.length > 1 && (
              <div className="mb-8 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-6 bg-[#0055ff] border-2 border-border" />
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
                            ? 'bg-[#ffcc00] text-foreground '
                            : 'bg-white text-foreground hover:bg-background',
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
              />
            ) : (
              <SeriesDownloadSection
                contentId={selectedDubId}
                seasonNumber={seasonNumber}
                seasonEpisodes={seasonEpisodes}
                allSeasonEpisodes={episodes}
                showTitle={show.title}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ─── Movie Download Section ──────────────────────────────────────────────────

function MovieDownloadSection({
  contentId,
  showTitle,
}: {
  contentId: string;
  showTitle: string;
}) {
  const [qualities, setQualities] = useState<DownloadQuality[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [downloaded, setDownloaded] = useState<string | null>(null);

  useEffect(() => {
    if (contentId) {
      setQualities(null);
      setDownloaded(null);
    }
  }, [contentId]);

  const loadQualities = useCallback(async () => {
    if (qualities !== null) return;
    setIsLoading(true);
    try {
      const q = await fetchDownloadLinks(contentId, 'movie');
      setQualities(sortQualities(q));
    } catch {
      setQualities([]);
    } finally {
      setIsLoading(false);
    }
  }, [contentId, qualities]);

  // Load on mount or when reset
  if (qualities === null && !isLoading) {
    loadQualities();
  }

  const triggerDownload = (quality: string) => {
    setDownloaded(quality);
    setTimeout(() => setDownloaded(null), 3000);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-2 h-6 bg-[#ffcc00] border-2 border-border" />
        <span className="text-xs font-headline font-black uppercase tracking-widest text-foreground">
          SELECT QUALITY
        </span>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center gap-4 py-12 justify-center">
          <Loader2 className="w-10 h-10 animate-spin text-foreground stroke-[3px]" />
          <span className="text-sm font-headline font-black uppercase tracking-widest text-foreground">
            FETCHING DOWNLOAD LINKS…
          </span>
        </div>
      ) : !qualities || qualities.length === 0 ? (
        <div className="py-8 text-center border-[3px] border-dashed border-border/20">
          <p className="text-sm font-headline font-black uppercase text-[#4a4a4a]">
            NO DOWNLOAD LINKS AVAILABLE FOR THIS TITLE.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {qualities.map((q) => (
            <a
              key={q.quality}
              href={q.url}
              download={`${sanitizeFilename(showTitle)}_${q.quality}.mp4`}
              referrerPolicy="no-referrer"
              onClick={() => triggerDownload(q.quality)}
              className={cn(
                'flex items-center justify-between w-full px-6 py-5 border-[3px] border-border transition-[background-color,color,border-color,transform] duration-150 hover: active:scale-[0.98] no-underline',
                qualityColor(q.quality),
              )}
            >
              <div className="flex items-center gap-4">
                {downloaded === q.quality ? (
                  <Check className="w-5 h-5 stroke-[4px]" />
                ) : (
                  <Download className="w-5 h-5 stroke-[4px]" />
                )}
                <span className="text-lg font-headline font-black uppercase tracking-tight">
                  {q.quality}
                  <span className="ml-3 text-xs font-bold opacity-60">
                    {q.quality === '1080p'
                      ? 'FULL HD'
                      : q.quality === '720p'
                        ? 'HD'
                        : q.quality === '480p'
                          ? 'SD'
                          : 'LOW'}
                  </span>
                </span>
              </div>
              <span className="text-xs font-black font-headline uppercase tracking-widest opacity-80">
                {downloaded === q.quality ? 'DOWNLOADING…' : 'MP4'}
              </span>
            </a>
          ))}
        </div>
      )}

      <p className="text-[10px] text-[#4a4a4a] font-headline font-bold uppercase tracking-widest leading-loose pt-4 border-t-2 border-border/10">
        DOWNLOADS ARE SERVED DIRECTLY FROM THE CONTENT CDN.
      </p>
    </div>
  );
}

// ─── Series Download Section ─────────────────────────────────────────────────

interface SeriesDownloadSectionProps {
  contentId: string;
  seasonNumber: number;
  seasonEpisodes: Episode[];
  allSeasonEpisodes: Episode[];
  showTitle: string;
}

function SeriesDownloadSection({
  contentId,
  seasonNumber,
  seasonEpisodes,
  showTitle,
}: SeriesDownloadSectionProps) {
  return (
    <div className="space-y-3">
      {seasonEpisodes.length === 0 ? (
        <p className="text-sm font-headline font-black uppercase text-[#4a4a4a] py-8 text-center border-[3px] border-dashed border-border/10">
          NO EPISODES FOUND.
        </p>
      ) : (
        seasonEpisodes.map((ep) => (
          <EpisodeDownloadItem
            key={ep.episodeId}
            episode={ep}
            contentId={contentId}
            seasonNumber={seasonNumber}
            showTitle={showTitle}
          />
        ))
      )}
    </div>
  );
}
