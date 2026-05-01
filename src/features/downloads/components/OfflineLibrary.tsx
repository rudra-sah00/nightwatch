'use client';

import {
  Download,
  HardDriveDownload,
  MonitorDown,
  Pause,
  Play,
  Trash2,
  X,
} from 'lucide-react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { NeoSearchBar } from '@/components/ui/neo-search-bar';
import { useIsMobile } from '@/hooks/use-is-mobile';
import type { DownloadItem } from '@/lib/electron-bridge';
import { cn, formatBytes } from '@/lib/utils';
import { useDownloads } from '../hooks/use-downloads';
import { OfflineContentDetailModal } from './offline-content-detail-modal';

export function OfflineLibrary() {
  const {
    downloads,
    isDesktopApp,
    isMounted,
    cancelDownload,
    pauseDownload,
    resumeDownload,
  } = useDownloads();
  const t = useTranslations('watch.offline');
  const mobile = useIsMobile();
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    if (!search.trim()) return downloads;
    const q = search.toLowerCase();
    return downloads.filter((d) => d.title.toLowerCase().includes(q));
  }, [downloads, search]);

  const statusLabels: Record<string, string> = {
    COMPLETED: t('statusCompleted'),
    FAILED: t('statusFailed'),
    DOWNLOADING: t('statusDownloading'),
    QUEUED: t('statusQueued'),
    CANCELLED: t('statusCancelled'),
    PAUSED: t('statusPaused'),
  };

  const [selectedItem, setSelectedItem] = useState<{
    contentId: string;
    season?: number;
    episode?: number;
  } | null>(null);

  const handleSelect = (item: DownloadItem) => {
    if (item.status !== 'COMPLETED') {
      toast.info(t('waitForComplete'));
      return;
    }

    const sEpMatch = item.contentId.match(/^(.*?)_S(\d+)E(\d+)$/);
    if (sEpMatch) {
      setSelectedItem({
        contentId: sEpMatch[1],
        season: parseInt(sEpMatch[2], 10),
        episode: parseInt(sEpMatch[3], 10),
      });
      return;
    }
    const epMatch = item.contentId.match(/^(.*?)-ep(\d+)$/);
    if (epMatch) {
      setSelectedItem({
        contentId: epMatch[1],
        season: 1,
        episode: parseInt(epMatch[2], 10),
      });
      return;
    }
    setSelectedItem({ contentId: item.contentId });
  };

  if (!isMounted) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center border-[4px] border-border bg-card min-h-[calc(100vh-80px)]">
        {/* Empty state while mounting to prevent flash */}
      </div>
    );
  }

  if (!isDesktopApp && !mobile) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center border-[4px] border-border bg-card">
        <MonitorDown className="w-16 h-16 stroke-[2px] text-foreground/30 mb-6" />
        <h2 className="text-2xl font-headline font-black uppercase tracking-widest mb-2">
          {t('desktopRequired')}
        </h2>
        <p className="text-foreground/70 font-semibold max-w-md mx-auto">
          {t('desktopRequiredDesc')}
        </p>
      </div>
    );
  }

  return (
    <main className="pb-32 animate-in fade-in">
      {/* Hero Header */}
      <div className="mb-12 bg-neo-cyan relative overflow-hidden rounded-2xl">
        {/* Abstract background shapes */}
        <div className="absolute -top-10 -right-10 w-64 h-64 border-[4px] border-border rounded-full opacity-20" />
        <div className="absolute top-10 left-1/4 w-24 h-24 bg-neo-blue border-[4px] border-border opacity-30 rotate-12" />

        <div className="container mx-auto px-6 py-12 md:px-10 relative z-10">
          <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-8">
            <div>
              <h1 className="text-6xl md:text-8xl lg:text-9xl font-black tracking-tighter text-foreground font-headline uppercase leading-none mb-4 min-w-0">
                {t('pageTitle')}
                <br />
                <span className="bg-background text-foreground px-4 inline-block border-[4px] border-border  -rotate-1 ml-2 mt-2">
                  {t('vault')}
                </span>
              </h1>
              <p className="font-headline font-bold uppercase tracking-widest text-foreground bg-background inline-block px-4 py-2 border-[3px] border-border">
                {t('yourDownloads')}
              </p>
            </div>

            <div className="bg-background text-foreground border-[4px] border-border px-6 py-4">
              <div className="flex items-center gap-4">
                <Download className="w-10 h-10 stroke-[3px] text-neo-blue" />
                <div className="space-y-1">
                  <h3 className="font-headline font-black uppercase text-xl md:text-2xl leading-none">
                    {t('downloadsCount', { count: downloads.length })}
                  </h3>
                  <p className="font-body text-sm font-bold text-muted-foreground">
                    {t('availableOffline')}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 md:px-10">
        <div className="max-w-5xl mx-auto space-y-6">
          <div className="flex flex-col sm:flex-row gap-4 justify-between items-center bg-card border-[3px] border-border p-4 md:p-6 rounded-md">
            <NeoSearchBar
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('searchPlaceholder')}
            />
          </div>
          {filtered.length === 0 ? (
            <div className="py-32 border-[4px] border-border border-dashed text-center flex flex-col items-center justify-center bg-card">
              <HardDriveDownload className="w-16 h-16 text-foreground/20 mb-6" />
              <p className="font-headline font-black text-4xl uppercase tracking-widest text-foreground/40">
                {search ? t('noResults') : t('emptyTitle')}
              </p>
              {!search && (
                <p className="font-headline font-bold uppercase tracking-widest text-foreground/20 text-sm mt-3 max-w-sm">
                  {t('emptyDescription')}
                </p>
              )}
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {filtered.map((item) => (
                // biome-ignore lint/a11y/useSemanticElements: Nested buttons are invalid DOM, must use div
                <div
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleSelect(item);
                    }
                  }}
                  key={item.contentId}
                  onClick={() => handleSelect(item)}
                  className="flex flex-col w-full sm:flex-row bg-card border-[3px] border-border overflow-hidden group hover:border-foreground/30 transition-colors cursor-pointer text-left outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  {/* Poster */}
                  <div className="w-24 sm:w-28 shrink-0 bg-secondary relative border-r-[3px] border-border hidden sm:block">
                    {item.posterUrl ? (
                      item.posterUrl.startsWith('offline-media://') ? (
                        <img
                          src={
                            item.posterUrl.startsWith('offline-media://local/')
                              ? item.posterUrl
                              : `offline-media://local/${encodeURIComponent(item.posterUrl.replace('offline-media://', ''))}`
                          }
                          alt={item.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <Image
                          src={item.posterUrl}
                          alt={item.title}
                          fill
                          sizes="112px"
                          className="object-cover"
                        />
                      )
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-foreground/20">
                        <MonitorDown className="w-8 h-8 stroke-[2px]" />
                      </div>
                    )}
                  </div>

                  {/* Detail Content */}
                  <div className="flex-1 p-5 flex flex-col justify-between">
                    {/* Top Section */}
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                      <div className="space-y-2 pr-4">
                        <h3 className="font-headline font-black uppercase tracking-wide text-base sm:text-xl leading-tight line-clamp-1">
                          {item.title}
                        </h3>

                        {/* Status Text & Speed */}
                        <div className="flex flex-wrap items-center gap-2 text-xs uppercase font-bold text-foreground/60 tracking-wider">
                          <span
                            className={cn(
                              item.status === 'COMPLETED' &&
                                'text-neo-green font-black',
                              item.status === 'FAILED' &&
                                'text-neo-red font-black',
                              item.status === 'DOWNLOADING' &&
                                'text-neo-yellow font-black',
                              item.status === 'QUEUED' &&
                                'text-neo-yellow font-black animate-pulse',
                              item.status === 'CANCELLED' &&
                                'text-foreground/50',
                            )}
                          >
                            {statusLabels[item.status] || item.status}
                          </span>

                          {(item.status === 'DOWNLOADING' ||
                            item.status === 'QUEUED') && (
                            <>
                              <span className="w-1.5 h-1.5 rounded-full bg-foreground/20" />
                              <span className="text-foreground/90 tabular-nums">
                                {formatBytes(item.downloadedBytes)}{' '}
                                {item.filesize
                                  ? `/ ${formatBytes(item.filesize)}`
                                  : ''}
                              </span>
                              <span className="w-1.5 h-1.5 rounded-full bg-foreground/20" />
                              <span className="text-neo-blue tabular-nums">
                                {item.status === 'QUEUED'
                                  ? t('waitingInQueue')
                                  : item.speed
                                    ? item.speed
                                    : !item.isMp4
                                      ? `${item.progress.toFixed(1)}%`
                                      : t('downloading')}
                              </span>
                              {item.speed &&
                                !item.isMp4 &&
                                item.status !== 'QUEUED' && (
                                  <>
                                    <span className="w-1.5 h-1.5 rounded-full bg-foreground/20" />
                                    <span className="text-neo-yellow tabular-nums">
                                      {item.progress.toFixed(1)}%
                                    </span>
                                  </>
                                )}
                            </>
                          )}

                          {item.status === 'COMPLETED' &&
                          (item.filesize || item.downloadedBytes) ? (
                            <>
                              <span className="w-1.5 h-1.5 rounded-full bg-foreground/20" />
                              <span className="text-foreground/80">
                                {formatBytes(
                                  item.filesize || item.downloadedBytes,
                                )}
                              </span>
                            </>
                          ) : null}
                        </div>
                      </div>

                      {/* Actions Column */}
                      <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                        {item.status === 'DOWNLOADING' && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              pauseDownload(item.contentId);
                            }}
                            className="p-3 border-[3px] border-border bg-background hover:bg-neo-yellow hover:text-black transition-colors"
                            aria-label={t('pauseDownload')}
                          >
                            <Pause className="w-4 h-4 stroke-[3px]" />
                          </button>
                        )}
                        {item.status === 'PAUSED' && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              resumeDownload(item.contentId);
                            }}
                            className="p-3 border-[3px] border-border bg-background hover:bg-neo-green hover:text-black transition-colors"
                            aria-label={t('resumeDownload')}
                          >
                            <Play className="w-4 h-4 stroke-[3px]" />
                          </button>
                        )}
                        {item.status === 'FAILED' ||
                        item.status === 'CANCELLED' ||
                        item.status === 'COMPLETED' ? (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              cancelDownload(item.contentId);
                            }}
                            className="p-3 border-[3px] border-border bg-background hover:bg-neo-red hover:text-white transition-colors"
                            aria-label={t('removeDownload')}
                          >
                            <Trash2 className="w-4 h-4 stroke-[3px]" />
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              cancelDownload(item.contentId);
                            }}
                            className="p-3 border-[3px] border-border bg-background hover:bg-neo-red hover:text-white transition-colors"
                            aria-label={t('cancelDownload')}
                          >
                            <X className="w-4 h-4 stroke-[3px]" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Progress Bar Bottom Row */}
                    {(item.status === 'DOWNLOADING' ||
                      item.status === 'QUEUED' ||
                      item.status === 'PAUSED') && (
                      <div className="mt-8 flex items-center gap-4">
                        <div
                          role="progressbar"
                          aria-valuenow={Math.round(item.progress || 0)}
                          aria-valuemin={0}
                          aria-valuemax={100}
                          aria-label={`Download progress: ${Math.round(item.progress || 0)}%`}
                          className={cn(
                            'flex-1 h-3 bg-secondary border-[2px] border-border overflow-hidden',
                            (item.status === 'QUEUED' ||
                              item.status === 'PAUSED') &&
                              'opacity-60',
                          )}
                        >
                          <div
                            className={cn(
                              'h-full bg-neo-yellow transition-all duration-500 ease-out',
                              ((item.isMp4 && item.status !== 'PAUSED') ||
                                item.status === 'QUEUED') &&
                                'w-full animate-pulse',
                              item.status === 'PAUSED' && 'opacity-50',
                            )}
                            style={{
                              width:
                                (item.isMp4 && item.status !== 'PAUSED') ||
                                item.status === 'QUEUED'
                                  ? '100%'
                                  : `${Math.max(0, Math.min(100, item.progress))}%`,
                            }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Content Details Modal / Sheet */}
      {selectedItem && (
        <OfflineContentDetailModal
          contentId={selectedItem.contentId}
          initialContext={
            selectedItem.season && selectedItem.episode
              ? { season: selectedItem.season, episode: selectedItem.episode }
              : undefined
          }
          onClose={() => setSelectedItem(null)}
          isOfflineMode={true}
        />
      )}
    </main>
  );
}
