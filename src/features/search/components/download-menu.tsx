'use client';

import { Check, ChevronDown, Download, Loader2 } from 'lucide-react';
import { useCallback, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { apiFetch } from '@/lib/fetch';
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
  if (q === '1080p')
    return 'text-yellow-400 border-yellow-500/40 bg-yellow-500/10';
  if (q === '720p') return 'text-blue-400 border-blue-500/40 bg-blue-500/10';
  return 'text-zinc-400 border-zinc-700/50 bg-zinc-800/40';
}

// ─── Episode Item ────────────────────────────────────────────────────────────

interface EpisodeDownloadItemProps {
  episode: Episode;
  contentId: string;
  seasonNumber: number;
}

function EpisodeDownloadItem({
  episode,
  contentId,
  seasonNumber,
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

  const triggerDownload = (quality: string) => {
    setDownloaded(quality);
  };

  return (
    <div className="border border-zinc-800/50 rounded-lg overflow-hidden">
      <button
        type="button"
        onClick={handleExpand}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-zinc-800/30 transition-colors text-left"
      >
        <div className="flex items-center gap-3">
          <span className="text-xs font-semibold text-zinc-500 w-6 tabular-nums">
            E{episode.episodeNumber}
          </span>
          <span className="text-sm text-zinc-200 truncate max-w-[240px]">
            {episode.title || `Episode ${episode.episodeNumber}`}
          </span>
        </div>
        <ChevronDown
          className={`w-4 h-4 text-zinc-500 flex-shrink-0 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
        />
      </button>

      {isExpanded && (
        <div className="px-4 pb-3 pt-1 border-t border-zinc-800/30 bg-zinc-900/30">
          {isLoading ? (
            <div className="flex items-center gap-2 py-2 text-zinc-500 text-xs">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              Fetching links…
            </div>
          ) : !qualities || qualities.length === 0 ? (
            <p className="text-xs text-zinc-600 py-2">
              No download links available.
            </p>
          ) : (
            <div className="flex flex-wrap gap-2 pt-1">
              {qualities.map((q) => (
                <a
                  key={q.quality}
                  href={q.url}
                  download
                  referrerPolicy="no-referrer"
                  onClick={() => triggerDownload(q.quality)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border text-xs font-semibold transition-all duration-150 hover:opacity-80 active:scale-95 ${qualityColor(q.quality)}`}
                >
                  {downloaded === q.quality ? (
                    <Check className="w-3 h-3" />
                  ) : (
                    <Download className="w-3 h-3" />
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

export function DownloadMenu({
  show,
  selectedSeason,
  episodes = [],
}: DownloadMenuProps) {
  const [isOpen, setIsOpen] = useState(false);

  // Only Server 2 content supports downloads
  const isS2 = show.id.startsWith('s2:') || show.id.includes('::');
  if (!isS2) return null;

  const isSeries = show.contentType === ContentType.Series;
  const seasonNumber = selectedSeason?.seasonNumber ?? 1;
  const seasonEpisodes = episodes.filter(
    (e) => !e.seasonNumber || e.seasonNumber === seasonNumber,
  );

  return (
    <>
      <Button
        size="lg"
        variant="outline"
        className="gap-2.5 px-6 py-4 md:px-8 md:py-6 text-base md:text-lg font-semibold shadow-lg border-zinc-700/60 hover:bg-zinc-800/60 text-zinc-200 transition-colors"
        onClick={() => setIsOpen(true)}
      >
        <Download className="w-5 h-5" />
        Download
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="bg-zinc-950 border-zinc-800/80 max-w-lg max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle className="text-white text-lg flex items-center gap-2.5">
              <Download className="w-5 h-5 text-zinc-400" />
              Download
            </DialogTitle>
            <p className="text-zinc-500 text-sm mt-1 truncate">{show.title}</p>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto -mx-6 px-6 pb-2">
            {!isSeries ? (
              <MovieDownloadSection contentId={show.id} />
            ) : (
              <SeriesDownloadSection
                contentId={show.id}
                seasonNumber={seasonNumber}
                seasonEpisodes={seasonEpisodes}
                allSeasonEpisodes={episodes}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ─── Movie Download Section ──────────────────────────────────────────────────

function MovieDownloadSection({ contentId }: { contentId: string }) {
  const [qualities, setQualities] = useState<DownloadQuality[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [downloaded, setDownloaded] = useState<string | null>(null);

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

  // Load on mount
  if (qualities === null && !isLoading) {
    loadQualities();
  }

  const triggerDownload = (quality: string) => {
    setDownloaded(quality);
  };

  return (
    <div className="pt-4 space-y-4">
      <div className="flex items-center gap-2">
        <div className="w-1 h-4 rounded-full bg-zinc-600" />
        <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
          Select Quality
        </span>
      </div>

      {isLoading ? (
        <div className="flex items-center gap-3 py-6 justify-center">
          <Loader2 className="w-5 h-5 animate-spin text-zinc-500" />
          <span className="text-sm text-zinc-500">
            Fetching download links…
          </span>
        </div>
      ) : !qualities || qualities.length === 0 ? (
        <div className="py-8 text-center">
          <p className="text-sm text-zinc-600">
            No download links available for this title.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-2.5">
          {qualities.map((q) => (
            <a
              key={q.quality}
              href={q.url}
              download
              referrerPolicy="no-referrer"
              onClick={() => triggerDownload(q.quality)}
              className={`flex items-center justify-between w-full px-5 py-3.5 rounded-xl border transition-all duration-150 hover:opacity-90 active:scale-[0.98] no-underline ${qualityColor(q.quality)}`}
            >
              <div className="flex items-center gap-3">
                {downloaded === q.quality ? (
                  <Check className="w-4 h-4" />
                ) : (
                  <Download className="w-4 h-4" />
                )}
                <span className="text-sm font-semibold">
                  {q.quality}
                  <span className="ml-2 text-xs font-normal opacity-60">
                    {q.quality === '1080p'
                      ? 'Full HD'
                      : q.quality === '720p'
                        ? 'HD'
                        : q.quality === '480p'
                          ? 'SD'
                          : 'Low'}
                  </span>
                </span>
              </div>
              <span className="text-[11px] opacity-50">
                {downloaded === q.quality ? 'Downloading…' : 'MP4'}
              </span>
            </a>
          ))}
        </div>
      )}

      <p className="text-[11px] text-zinc-700 leading-relaxed pt-2">
        Downloads are served directly from the content CDN.
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
}

function SeriesDownloadSection({
  contentId,
  seasonNumber,
  seasonEpisodes,
}: SeriesDownloadSectionProps) {
  return (
    <div className="pt-4 space-y-1.5">
      {seasonEpisodes.length === 0 ? (
        <p className="text-sm text-zinc-600 py-4 text-center">
          No episodes found.
        </p>
      ) : (
        seasonEpisodes.map((ep) => (
          <EpisodeDownloadItem
            key={ep.episodeId}
            episode={ep}
            contentId={contentId}
            seasonNumber={seasonNumber}
          />
        ))
      )}
    </div>
  );
}
