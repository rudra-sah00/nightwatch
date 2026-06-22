'use client';

import { useQuery } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { getMangaChapter } from '@/features/manga/api';
import { useTvFocus } from '../hooks/use-tv-focus';

export function TvMangaReader() {
  const router = useRouter();
  const params = useParams<{ chapterId: string }>();
  const chapterId = Number(params.chapterId);
  const [pageIdx, setPageIdx] = useState(0);

  useTvFocus('tv-manga-reader', 'TV_MANGA_READER');

  const { data, isLoading } = useQuery({
    queryKey: ['manga', 'chapter', chapterId],
    queryFn: () => getMangaChapter(chapterId),
    enabled: chapterId > 0,
    retry: false,
  });

  const pages = data?.pages ?? [];
  const totalPages = pages.length;

  const goNext = useCallback(
    () => setPageIdx((i) => Math.min(totalPages - 1, i + 1)),
    [totalPages],
  );
  const goPrev = useCallback(() => setPageIdx((i) => Math.max(0, i - 1)), []);

  // D-pad: Left/Right or Up/Down to navigate pages, Escape to exit
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        e.preventDefault();
        goNext();
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault();
        goPrev();
      } else if (e.key === 'Escape' || e.key === 'GoBack') {
        e.preventDefault();
        router.back();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [goNext, goPrev, router]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-black">
        <div className="w-12 h-12 border-4 border-white/20 border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  if (!pages.length) {
    return (
      <div className="flex items-center justify-center h-screen bg-black">
        <p className="text-white/60">No pages available</p>
      </div>
    );
  }

  return (
    <div className="relative w-full h-screen bg-black flex items-center justify-center">
      <img
        src={pages[pageIdx].imageUrl}
        alt={`Page ${pageIdx + 1}`}
        className="max-w-full max-h-full object-contain"
        decoding="async"
      />
      {/* Page indicator */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-black/70 px-4 py-2 rounded-full text-sm text-white/70">
        {pageIdx + 1} / {totalPages}
      </div>
      {/* Title */}
      <div className="absolute top-6 left-6 bg-black/70 px-4 py-2 rounded-lg">
        <p className="text-sm text-white/80 font-bold">{data?.chapterName}</p>
      </div>
    </div>
  );
}
