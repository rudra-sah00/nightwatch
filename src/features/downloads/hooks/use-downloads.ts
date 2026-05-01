'use client';

import { useCallback, useEffect, useState } from 'react';
import { useDesktopApp } from '@/hooks/use-desktop-app';
import { useIsMobile } from '@/hooks/use-is-mobile';
import type { DownloadItem } from '@/lib/electron-bridge';
import { checkIsDesktop, desktopBridge } from '@/lib/electron-bridge';

/**
 * Manages the list of downloaded content across Electron (desktop) and Capacitor (mobile).
 *
 * Subscribes to real-time download progress events and provides callbacks to
 * cancel, pause, and resume individual downloads. Automatically detects the
 * current platform and uses the appropriate bridge API.
 *
 * @returns Download items, platform flags, and download control functions.
 */
export function useDownloads() {
  const { isDesktopApp, isMounted } = useDesktopApp();
  const mobile = useIsMobile();
  const [downloads, setDownloads] = useState<DownloadItem[]>([]);

  // Desktop (Electron)
  useEffect(() => {
    if (!isDesktopApp || !checkIsDesktop()) return;

    desktopBridge
      .getDownloads()
      .then((items: DownloadItem[]) => setDownloads(items || []))
      .catch(console.error);

    const unsubscribe = desktopBridge.onDownloadProgress(
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

  // Mobile (Capacitor)
  useEffect(() => {
    if (!mobile) return;

    let unsubscribe: (() => void) | undefined;

    import('@/capacitor/downloads').then(({ mobileDownloadManager }) => {
      mobileDownloadManager
        .getDownloads()
        .then((items) => setDownloads(items || []));

      unsubscribe = mobileDownloadManager.onProgress(
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
    });

    return () => unsubscribe?.();
  }, [mobile]);

  const cancelDownload = useCallback(
    (contentId: string) => {
      if (checkIsDesktop()) {
        desktopBridge.cancelDownload(contentId);
      } else if (mobile) {
        import('@/capacitor/downloads').then(({ mobileDownloadManager }) =>
          mobileDownloadManager.cancelDownload(contentId),
        );
      }
      setDownloads((prev) => prev.filter((i) => i.contentId !== contentId));
    },
    [mobile],
  );

  const pauseDownload = useCallback(
    (contentId: string) => {
      if (checkIsDesktop()) {
        desktopBridge.pauseDownload(contentId);
      } else if (mobile) {
        import('@/capacitor/downloads').then(({ mobileDownloadManager }) =>
          mobileDownloadManager.pauseDownload(contentId),
        );
      }
      setDownloads((prev) =>
        prev.map((i) =>
          i.contentId === contentId ? { ...i, status: 'PAUSED' } : i,
        ),
      );
    },
    [mobile],
  );

  const resumeDownload = useCallback(
    (contentId: string) => {
      if (checkIsDesktop()) {
        desktopBridge.resumeDownload(contentId);
      } else if (mobile) {
        import('@/capacitor/downloads').then(({ mobileDownloadManager }) =>
          mobileDownloadManager.resumeDownload(contentId),
        );
      }
      setDownloads((prev) =>
        prev.map((i) =>
          i.contentId === contentId ? { ...i, status: 'QUEUED' } : i,
        ),
      );
    },
    [mobile],
  );

  return {
    downloads,
    isDesktopApp,
    isMounted,
    isMobile: mobile,
    cancelDownload,
    pauseDownload,
    resumeDownload,
  };
}
