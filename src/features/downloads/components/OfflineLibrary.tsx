'use client';

import {
  Download,
  HardDriveDownload,
  MonitorDown,
  Trash2,
  X,
} from 'lucide-react';
import dynamic from 'next/dynamic';
import Image from 'next/image';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { useDownloads } from '../hooks/use-downloads';

const ContentDetailModal = dynamic(
  () =>
    import('@/features/search/components/content-detail-modal').then(
      (m) => m.ContentDetailModal,
    ),
  { ssr: false },
);

function formatBytes(bytes?: number, decimals = 2) {
  if (!bytes || bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / k ** i).toFixed(dm))} ${sizes[i]}`;
}

export function OfflineLibrary() {
  const { downloads, isDesktopApp, cancelDownload } = useDownloads();
  const [selectedContentId, setSelectedContentId] = useState<string | null>(
    null,
  );

  if (!isDesktopApp) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center border-[4px] border-border bg-card">
        <MonitorDown className="w-16 h-16 stroke-[2px] text-foreground/30 mb-6" />
        <h2 className="text-2xl font-headline font-black uppercase tracking-widest mb-2">
          Desktop Required
        </h2>
        <p className="text-foreground/70 font-semibold max-w-md mx-auto">
          Offline secure downloads are only available in the native desktop app.
          Download the app to save movies and series for travel.
        </p>
      </div>
    );
  }

  return (
    <main className="min-h-[calc(100vh-80px)] bg-background pb-32 animate-in fade-in">
      {/* Hero Header */}
      <div className="border-b-[4px] border-border mb-12 bg-neo-yellow relative overflow-hidden">
        {/* Abstract background shapes */}
        <div className="absolute -top-10 -right-10 w-64 h-64 border-[4px] border-border rounded-full opacity-20" />
        <div className="absolute top-10 left-1/4 w-24 h-24 bg-neo-blue border-[4px] border-border opacity-30 rotate-12" />

        <div className="container mx-auto px-6 py-12 md:px-10 relative z-10">
          <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-8">
            <div>
              <h1 className="text-6xl md:text-8xl lg:text-9xl font-black tracking-tighter text-foreground font-headline uppercase leading-none mb-4 min-w-0">
                OFFLINE
                <br />
                <span className="bg-background text-foreground px-4 inline-block border-[4px] border-border  -rotate-1 ml-2 mt-2">
                  VAULT
                </span>
              </h1>
              <p className="font-headline font-bold uppercase tracking-widest text-foreground bg-background inline-block px-4 py-2 border-[3px] border-border">
                Your Downloaded Content
              </p>
            </div>

            <div className="bg-background text-foreground border-[4px] border-border px-6 py-4">
              <div className="flex items-center gap-4">
                <Download className="w-10 h-10 stroke-[3px] text-neo-blue" />
                <div className="space-y-1">
                  <h3 className="font-headline font-black uppercase text-xl md:text-2xl leading-none">
                    {downloads.length} Download(s)
                  </h3>
                  <p className="font-body text-sm font-bold text-muted-foreground">
                    Available for offline viewing
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 md:px-10">
        <div className="max-w-5xl mx-auto space-y-6">
          {downloads.length === 0 ? (
            <div className="py-20 text-center border-[4px] border-dashed border-border/20 bg-card rounded-sm">
              <HardDriveDownload className="w-12 h-12 stroke-[2px] text-foreground/20 mx-auto mb-4" />
              <p className="text-xl font-headline font-black uppercase text-foreground/50 tracking-widest">
                Vault is empty
              </p>
              <p className="text-sm font-bold text-foreground/40 mt-2">
                Secure downloads will appear here.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {downloads.map((item) => (
                <button
                  type="button"
                  key={item.contentId}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setSelectedContentId(item.contentId);
                    }
                  }}
                  onClick={() => setSelectedContentId(item.contentId)}
                  className="flex flex-col w-full sm:flex-row bg-card border-[3px] border-border overflow-hidden group hover:border-foreground/30 transition-colors cursor-pointer text-left"
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
                            {item.status}
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
                                  ? 'Waiting in queue...'
                                  : item.speed
                                    ? item.speed
                                    : !item.isMp4
                                      ? `${item.progress.toFixed(1)}%`
                                      : 'Downloading...'}
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
                            title="Remove Download"
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
                            title="Cancel Download"
                          >
                            <X className="w-4 h-4 stroke-[3px]" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Progress Bar Bottom Row */}
                    {(item.status === 'DOWNLOADING' ||
                      item.status === 'QUEUED') && (
                      <div className="mt-8 flex items-center gap-4">
                        <div
                          className={cn(
                            'flex-1 h-3 bg-secondary border-[2px] border-border overflow-hidden',
                            item.status === 'QUEUED' && 'opacity-60',
                          )}
                        >
                          <div
                            className={cn(
                              'h-full bg-neo-yellow transition-all duration-500 ease-out',
                              (item.isMp4 || item.status === 'QUEUED') &&
                                'w-full animate-pulse',
                            )}
                            style={{
                              width:
                                item.isMp4 || item.status === 'QUEUED'
                                  ? '100%'
                                  : `${Math.max(0, Math.min(100, item.progress))}%`,
                            }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Content Details Modal / Sheet */}
      {selectedContentId && (
        <ContentDetailModal
          contentId={selectedContentId}
          onClose={() => setSelectedContentId(null)}
          isOfflineMode={true}
        />
      )}
    </main>
  );
}
