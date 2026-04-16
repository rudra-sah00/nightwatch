'use client';

import {
  Check,
  ChevronDown,
  Download,
  Loader2,
  MonitorDown,
  X,
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { playVideo } from '@/features/watch/api';
import { useDesktopApp } from '@/hooks/use-desktop-app';
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

// Server 2 direct mp4 fallback
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
  }>(`/api/video/download-links?${params.toString()}`);

  return res.success && res.qualities ? res.qualities : [];
}

const QUALITY_ORDER = ['1080p', '720p', '480p', '360p'];
function sortQualities(qualities: DownloadQuality[]): DownloadQuality[] {
  return [...qualities].sort((a, b) => {
    const ai = QUALITY_ORDER.indexOf(a.quality);
    const bi = QUALITY_ORDER.indexOf(b.quality);
    if (ai !== -1 && bi !== -1) return ai - bi;
    if (ai !== -1) return -1;
    if (bi !== -1) return 1;
    return a.quality.localeCompare(b.quality);
  });
}

// ─── Shared Desktop Download Handler ────────────────────────────────────────

async function startElectronDownload({
  contentId,
  showTitle,
  posterUrl,
  type,
  season,
  episode,
  directUrl,
  quality = 'high',
}: {
  contentId: string;
  showTitle: string;
  posterUrl?: string;
  type: 'movie' | 'series';
  season?: number;
  episode?: number;
  directUrl?: string;
  quality?: 'low' | 'medium' | 'high';
}) {
  if (directUrl && window.electronAPI) {
    window.electronAPI.startDownload({
      contentId:
        type === 'series' && episode ? `${contentId}-ep${episode}` : contentId,
      title:
        type === 'series' && episode
          ? `${showTitle} - S${season}E${episode}`
          : showTitle,
      m3u8Url: directUrl,
      posterUrl,
      quality,
    });
    return;
  }

  const server = contentId.includes(':') ? contentId.split(':')[0] : 's1';
  const response = await playVideo({
    type,
    title: showTitle,
    server,
    movieId: type === 'movie' ? contentId : undefined,
    seriesId: type === 'series' ? contentId : undefined,
    season,
    episode,
  });

  if (response.success && response.masterPlaylistUrl) {
    if (window.electronAPI) {
      window.electronAPI.startDownload({
        contentId: `${contentId}${season ? `_S${season}E${episode}` : ''}`,
        title: `${showTitle}${season ? ` S${season} E${episode}` : ''}`,
        m3u8Url: response.masterPlaylistUrl,
        posterUrl,
        subtitleTracks: response.subtitleTracks,
        quality,
      });
      return true;
    }
  }
  return false;
}

// ─── Components ─────────────────────────────────────────────────────────────

function DesktopDownloadButton({
  onClick,
  isLoading,
}: {
  onClick: () => void;
  isLoading: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={isLoading}
      className={cn(
        'flex w-full items-center justify-between p-4 border-[3px] border-border bg-neo-yellow text-foreground hover:bg-neo-yellow/80 hover:text-black transition-colors font-headline font-black uppercase text-sm tracking-widest',
        isLoading && 'opacity-70 cursor-not-allowed',
      )}
    >
      <span className="flex items-center gap-3">
        {isLoading ? (
          <Loader2 className="w-5 h-5 animate-spin" />
        ) : (
          <MonitorDown className="w-5 h-5 stroke-[3px]" />
        )}
        {isLoading ? 'PREPARING...' : 'DOWNLOAD OFFLINE'}
      </span>
      <span className="px-2 py-0.5 bg-background text-[10px] font-bold tracking-widest border border-border rounded-sm">
        NATIVE
      </span>
    </button>
  );
}

function MovieDownloadSection({
  contentId,
  showTitle,
  posterUrl,
}: {
  contentId: string;
  showTitle: string;
  posterUrl?: string;
}) {
  const isS2 = contentId.startsWith('s2:');
  const [qualities, setQualities] = useState<DownloadQuality[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [downloaded, setDownloaded] = useState<string | null>(null);
  const [isElectronLoading, setElectronLoading] = useState(false);
  const [prefQuality, setPrefQuality] = useState<'low' | 'medium' | 'high'>(
    'high',
  );

  useEffect(() => {
    if (window.electronAPI) {
      window.electronAPI.storeGet('downloadQuality').then((val: unknown) => {
        if (val === 'low' || val === 'medium' || val === 'high') {
          setPrefQuality(val);
        }
      });
    }
  }, []);

  useEffect(() => {
    if (contentId) {
      setQualities(null);
      setDownloaded(null);
    }
  }, [contentId]);

  const loadQualities = useCallback(async () => {
    if (qualities !== null || !isS2) return;
    setIsLoading(true);
    try {
      const q = await fetchDownloadLinks(contentId, 'movie');
      setQualities(sortQualities(q));
    } catch {
      setQualities([]);
    } finally {
      setIsLoading(false);
    }
  }, [contentId, qualities, isS2]);

  // Load on mount or when reset (Web only)
  if (isS2 && qualities === null && !isLoading) {
    loadQualities();
  }

  const handleElectronClick = async (
    qualityUrl?: string,
    qualityLabel?: string,
  ) => {
    setElectronLoading(true);
    await startElectronDownload({
      contentId,
      showTitle,
      posterUrl,
      type: 'movie',
      directUrl: qualityUrl,
      quality: prefQuality,
    });
    setDownloaded(qualityLabel || 'desktop');
    setTimeout(() => setDownloaded(null), 3000);
    setElectronLoading(false);
  };

  if (!isS2) {
    return (
      <div className="space-y-6">
        {downloaded === 'desktop' ? (
          <div className="p-4 bg-green-500/20 text-green-500 border-[3px] border-green-500 font-black font-headline uppercase tracking-widest text-center">
            Download Started! Check Offline Library
          </div>
        ) : (
          <DesktopDownloadButton
            onClick={() => handleElectronClick()}
            isLoading={isElectronLoading}
          />
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-2 h-6 bg-neo-yellow border-2 border-border" />
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
          <p className="text-sm font-headline font-black uppercase text-foreground/70">
            No valid download formats found.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {qualities.map((q) => (
            <button
              key={q.quality}
              type="button"
              disabled={isElectronLoading}
              onClick={() => handleElectronClick(q.url, q.quality)}
              className={cn(
                'flex items-center justify-center gap-3 px-6 py-4 border-[3px] border-border font-headline font-black uppercase text-sm tracking-widest transition-all duration-150 active:scale-[0.98]',
                downloaded === q.quality
                  ? 'bg-primary text-primary-foreground '
                  : 'bg-background text-foreground hover:bg-card hover:-translate-y-0.5 hover:shadow-[0_4px_0_0_rgb(0,0,0)] dark:hover:shadow-none',
              )}
            >
              {downloaded === q.quality ? (
                <Check className="w-3.5 h-3.5 stroke-[3px]" />
              ) : (
                <Download className="w-3.5 h-3.5 stroke-[3px]" />
              )}
              {q.quality}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function EpisodeItem({
  episode,
  contentId,
  showTitle,
  posterUrl,
}: {
  episode: Episode;
  contentId: string;
  showTitle: string;
  posterUrl?: string;
}) {
  const isS2 = contentId.startsWith('s2:');
  const [qualities, setQualities] = useState<DownloadQuality[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [downloaded, setDownloaded] = useState<string | null>(null);
  const [isElectronLoading, setElectronLoading] = useState(false);
  const [prefQuality, setPrefQuality] = useState<'low' | 'medium' | 'high'>(
    'high',
  );

  useEffect(() => {
    if (window.electronAPI) {
      window.electronAPI.storeGet('downloadQuality').then((val: unknown) => {
        if (val === 'low' || val === 'medium' || val === 'high') {
          setPrefQuality(val);
        }
      });
    }
  }, []);
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
    qualityUrl?: string,
    qualityLabel?: string,
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
      quality: prefQuality,
    });
    setDownloaded(qualityLabel || 'desktop');
    setTimeout(() => setDownloaded(null), 3000);
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
          {!isS2 ? (
            downloaded === 'desktop' ? (
              <div className="p-4 bg-green-500/20 text-green-500 border-[3px] border-green-500 font-black font-headline uppercase tracking-widest text-center text-xs">
                Downloaded to Offline Vault!
              </div>
            ) : (
              <DesktopDownloadButton
                onClick={() => handleElectronClick()}
                isLoading={isElectronLoading}
              />
            )
          ) : isLoading ? (
            <div className="flex items-center justify-center p-6 gap-3">
              <Loader2 className="w-5 h-5 animate-spin text-foreground" />
              <span className="text-xs font-headline font-black uppercase tracking-widest">
                Loading Qualities...
              </span>
            </div>
          ) : !qualities || qualities.length === 0 ? (
            <div className="text-center p-4">
              <span className="text-xs font-headline font-black uppercase text-foreground/50">
                No formats available
              </span>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {qualities.map((q) => (
                <button
                  key={q.quality}
                  type="button"
                  disabled={isElectronLoading}
                  onClick={() => handleElectronClick(q.url, q.quality)}
                  className={cn(
                    'flex items-center justify-center gap-2 px-4 py-3 border-[2px] border-border font-headline font-black uppercase text-xs sm:text-sm tracking-widest transition-all duration-150 active:scale-[0.98]',
                    downloaded === q.quality
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-background hover:bg-card hover:-translate-y-0.5',
                  )}
                >
                  {downloaded === q.quality ? (
                    <Check className="w-3.5 h-3.5 stroke-[3px]" />
                  ) : (
                    <MonitorDown className="w-3.5 h-3.5 stroke-[3px]" />
                  )}
                  {q.quality}
                </button>
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
  const { isDesktopApp } = useDesktopApp();

  // Desktop App Only feature
  if (!isDesktopApp) return null;

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
        className={cn(
          'flex items-center justify-center gap-3 px-6 py-4 md:px-8 md:py-5 border-[4px] border-border text-foreground transition-colors duration-200 font-headline font-black uppercase tracking-widest text-base md:text-lg h-auto',
          'bg-blue-500 hover:bg-blue-600 text-white',
        )}
      >
        <Download className="w-5 h-5 md:w-6 md:h-6 stroke-[3px]" />
        NATIVE DOWNLOAD
      </button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent
          showCloseButton={false}
          className="fixed z-[150] bg-card border-[4px] border-border -yellow max-w-lg max-h-[85vh] overflow-hidden flex flex-col p-0"
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
                      />
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
