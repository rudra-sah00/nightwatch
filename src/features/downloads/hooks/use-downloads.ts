'use client';

import { useCallback, useEffect, useState } from 'react';
import { useDesktopApp } from '@/hooks/use-desktop-app';
import type { DownloadItem } from '@/types/electron';

export function useDownloads() {
  const { isDesktopApp, isMounted } = useDesktopApp();
  const [downloads, setDownloads] = useState<DownloadItem[]>([]);

  useEffect(() => {
    if (!isDesktopApp || typeof window === 'undefined' || !window.electronAPI)
      return;

    // Initial load
    window.electronAPI
      .getDownloads()
      .then((items: DownloadItem[]) => {
        setDownloads(items || []);
      })
      .catch(console.error);

    // Subscribe to progress
    const unsubscribe = window.electronAPI.onDownloadProgress(
      (updatedItem: DownloadItem) => {
        setDownloads((prev) => {
          if (updatedItem.status === 'CANCELLED') {
            return prev.filter((i) => i.contentId !== updatedItem.contentId);
          }
          const exists = prev.find(
            (i) => i.contentId === updatedItem.contentId,
          );
          if (exists) {
            return prev.map((i) =>
              i.contentId === updatedItem.contentId ? updatedItem : i,
            );
          }
          return [...prev, updatedItem];
        });
      },
    );

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [isDesktopApp]);

  const cancelDownload = useCallback((contentId: string) => {
    if (typeof window !== 'undefined' && window.electronAPI) {
      window.electronAPI.cancelDownload(contentId);

      // Optimistically remove it instantly from the UI
      setDownloads((prev) => prev.filter((i) => i.contentId !== contentId));
    }
  }, []);

  return {
    downloads,
    isDesktopApp,
    isMounted,
    cancelDownload,
  };
}
