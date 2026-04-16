import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import type { ShowDetails } from '@/types/content';
import {
  type DownloadQuality,
  fetchDownloadLinks,
  sortQualities,
  startElectronDownload,
} from '../utils/download';

interface UseDownloadOptions {
  contentId: string;
  showTitle: string;
  type: 'movie' | 'series';
  posterUrl?: string;
  season?: number;
  episode?: number;
  onComplete?: () => void;
  show?: ShowDetails;
}

export function useDownloadMenu({
  contentId,
  showTitle,
  type,
  posterUrl,
  season,
  episode,
  onComplete,
  show,
}: UseDownloadOptions) {
  const isS2 = contentId?.startsWith('s2:');
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
    if (isLoading) return;

    setIsLoading(true);
    try {
      const q = await fetchDownloadLinks(contentId, type, season, episode);
      setQualities(sortQualities(q));
    } catch {
      setQualities([]);
    } finally {
      setIsLoading(false);
    }
  }, [contentId, qualities, isS2, isLoading, type, season, episode]);

  const handleElectronClick = async (
    qualityUrl?: string,
    qualityLabel?: string,
  ) => {
    console.log('[useDownloadMenu] handleElectronClick', {
      qualityUrl,
      qualityLabel,
    });
    setElectronLoading(true);
    await startElectronDownload({
      contentId,
      showTitle,
      posterUrl,
      type,
      season,
      episode,
      directUrl: qualityUrl,
      quality: prefQuality,
      show,
    });

    console.log('[useDownloadMenu] handleElectronClick DONE');
    setDownloaded(qualityLabel || 'desktop');

    const epText = type === 'series' ? ` for Ep ${episode}` : '';
    toast.success(`Downloading${epText}! Check your Offline Library.`);

    // Immediately close window / notify complete without waiting
    if (onComplete) {
      onComplete();
    }

    setTimeout(() => setDownloaded(null), 3000);
    setElectronLoading(false);
  };

  return {
    isS2,
    qualities,
    isLoading,
    downloaded,
    isElectronLoading,
    prefQuality,
    loadQualities,
    handleElectronClick,
  };
}
