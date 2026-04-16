'use client';

import { Download, MonitorDown, Play, Trash2, X } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useDesktopApp } from '@/hooks/use-desktop-app';
import type { DownloadItem } from '@/types/electron';

export function OfflineLibrary() {
  const { isDesktopApp } = useDesktopApp();
  const [downloads, setDownloads] = useState<DownloadItem[]>([]);

  useEffect(() => {
    if (!isDesktopApp || !window.electronAPI) return;

    window.electronAPI.getDownloads().then(setDownloads);

    const unsubscribe = window.electronAPI.onDownloadProgress((updatedItem) => {
      setDownloads((prev) => {
        const exists = prev.find((i) => i.contentId === updatedItem.contentId);
        if (exists) {
          return prev.map((i) =>
            i.contentId === updatedItem.contentId ? updatedItem : i,
          );
        }
        return [...prev, updatedItem];
      });
    });

    return () => unsubscribe();
  }, [isDesktopApp]);

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

  const cancelDownload = (contentId: string) => {
    if (window.electronAPI) {
      window.electronAPI.cancelDownload(contentId);
    }
  };

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
          <p className="text-xl font-headline font-black uppercase text-foreground/50 tracking-widest">
            Vault is empty
          </p>
          <p className="text-sm font-bold text-foreground/40 mt-2">
            Secure downloads will appear here.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {downloads.map((item) => (
            <div
              key={item.contentId}
              className="flex bg-card border-[3px] border-border overflow-hidden"
            >
              <div className="w-24 shrink-0 bg-secondary relative border-r-[3px] border-border">
                {item.posterUrl && (
                  <Image
                    src={item.posterUrl}
                    alt={item.title}
                    fill
                    sizes="96px"
                    className="object-cover"
                  />
                )}
              </div>
              <div className="flex-1 p-4 flex flex-col justify-between">
                <div>
                  <h3 className="font-headline font-black uppercase tracking-wide text-sm line-clamp-2 leading-tight">
                    {item.title}
                  </h3>
                  <div className="text-[10px] uppercase font-bold text-foreground/60 mt-1">
                    {item.status === 'completed' && (
                      <span className="text-neo-green">READY</span>
                    )}
                    {item.status === 'downloading' &&
                      `${Math.round(item.progress)}%`}
                    {item.status === 'error' && (
                      <span className="text-neo-red">ERROR</span>
                    )}
                    {item.status === 'cancelled' && (
                      <span className="text-foreground/50">CANCELLED</span>
                    )}
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-between">
                  {item.status === 'downloading' ? (
                    <div className="w-full flex items-center gap-3">
                      <div className="flex-1 h-2 bg-secondary border border-border overflow-hidden">
                        <div
                          className="h-full bg-neo-yellow transition-all duration-300"
                          style={{ width: `${item.progress}%` }}
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => cancelDownload(item.contentId)}
                        className="text-foreground/50 hover:text-neo-red"
                      >
                        <X className="w-4 h-4 stroke-[3px]" />
                      </button>
                    </div>
                  ) : item.status === 'completed' ? (
                    <div className="flex gap-2 w-full">
                      <Link
                        href={`/watch/${item.contentId}`}
                        className="flex-1 flex justify-center items-center gap-2 bg-neo-green text-black uppercase font-black tracking-wider text-[10px] py-2 border-[2px] border-black hover:bg-neo-green/80"
                      >
                        <Play className="w-3 h-3 fill-black stroke-[3px]" />{' '}
                        Play
                      </Link>
                      <button
                        type="button"
                        onClick={() => cancelDownload(item.contentId)}
                        className="px-3 border-[2px] border-border bg-background hover:bg-neo-red hover:text-white transition-colors"
                      >
                        <Trash2 className="w-3 h-3 stroke-[3px]" />
                      </button>
                    </div>
                  ) : (
                    <div className="w-full flex justify-end">
                      <button
                        type="button"
                        onClick={() => cancelDownload(item.contentId)}
                        className="text-[10px] tracking-widest font-black uppercase border-[2px] border-border px-3 py-1 hover:bg-card"
                      >
                        REMOVE
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
