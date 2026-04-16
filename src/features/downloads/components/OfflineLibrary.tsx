'use client';

import {
  Download,
  HardDriveDownload,
  MonitorDown,
  Play,
  Trash2,
  X,
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { useDownloads } from '../hooks/use-downloads';

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
    <div className="space-y-6">
      <div className="flex items-center gap-3 pb-4 border-b-[4px] border-border">
        <Download className="w-8 h-8 stroke-[3px] text-neo-yellow" />
        <h1 className="text-3xl font-headline font-black uppercase tracking-widest">
          Offline Vault
        </h1>
      </div>

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
            <div
              key={item.contentId}
              className="flex flex-col sm:flex-row bg-card border-[3px] border-border overflow-hidden group hover:border-foreground/30 transition-colors"
            >
              {/* Poster */}
              <div className="w-24 sm:w-28 shrink-0 bg-secondary relative border-r-[3px] border-border hidden sm:block">
                {item.posterUrl ? (
                  <Image
                    src={item.posterUrl}
                    alt={item.title}
                    fill
                    sizes="112px"
                    className="object-cover"
                  />
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
                          item.status === 'completed' &&
                            'text-neo-green font-black',
                          item.status === 'error' && 'text-neo-red font-black',
                          item.status === 'downloading' &&
                            'text-neo-yellow font-black',
                          item.status === 'cancelled' && 'text-foreground/50',
                        )}
                      >
                        {item.status}
                      </span>

                      {item.status === 'downloading' && (
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
                            {item.speed
                              ? item.speed
                              : `${item.progress.toFixed(1)}%`}
                          </span>
                          {item.speed && (
                            <>
                              <span className="w-1.5 h-1.5 rounded-full bg-foreground/20" />
                              <span className="text-neo-yellow tabular-nums">
                                {item.progress.toFixed(1)}%
                              </span>
                            </>
                          )}
                        </>
                      )}

                      {item.status === 'completed' && item.filesize && (
                        <>
                          <span className="w-1.5 h-1.5 rounded-full bg-foreground/20" />
                          <span className="text-foreground/80">
                            {formatBytes(item.filesize)}
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Actions Column */}
                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-start">
                    {item.status === 'completed' && (
                      <Link
                        href={`/watch/${item.contentId}`}
                        className="flex items-center gap-2 bg-neo-green text-black uppercase font-black tracking-wider text-xs px-6 py-3 border-[3px] border-black hover:bg-neo-green/80 hover:-translate-y-0.5 active:translate-y-0 transition-all shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                      >
                        <Play className="w-4 h-4 fill-black stroke-[3px]" />{' '}
                        Play
                      </Link>
                    )}

                    {(item.status === 'error' ||
                      item.status === 'cancelled' ||
                      item.status === 'completed') && (
                      <button
                        type="button"
                        onClick={() => cancelDownload(item.contentId)}
                        className="p-3 border-[3px] border-border bg-background hover:bg-neo-red hover:text-white transition-colors"
                        title="Remove Download"
                      >
                        <Trash2 className="w-4 h-4 stroke-[3px]" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Progress Bar Bottom Row */}
                {item.status === 'downloading' && (
                  <div className="mt-8 flex items-center gap-4">
                    <div className="flex-1 h-3 bg-secondary border-[2px] border-border overflow-hidden">
                      <div
                        className="h-full bg-neo-yellow transition-all duration-500 ease-out"
                        style={{
                          width: `${Math.max(0, Math.min(100, item.progress))}%`,
                        }}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => cancelDownload(item.contentId)}
                      className="flex items-center justify-center bg-background border-[2px] border-border p-1.5 text-foreground/50 hover:bg-neo-red hover:text-white transition-colors"
                      title="Cancel Download"
                    >
                      <X className="w-4 h-4 stroke-[3px]" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
