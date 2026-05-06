'use client';

import { ArrowLeft, ChevronLeft, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { MangaChapterViewer } from '@/features/manga/api';
import {
  getMangaChapter,
  getMangaDetail,
  getMangaProgress,
  updateMangaProgress,
} from '@/features/manga/api';
import { checkIsDesktop, desktopBridge } from '@/lib/electron-bridge';

export default function ChapterReaderPage() {
  const { chapterId } = useParams<{ chapterId: string }>();
  const [viewer, setViewer] = useState<MangaChapterViewer | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(0);
  const pageRefs = useRef<(HTMLDivElement | null)[]>([]);
  const coverUrl = useRef('');
  const [prevChapterId, setPrevChapterId] = useState<number | null>(null);
  const [nextChapterId, setNextChapterId] = useState<number | null>(null);

  useEffect(() => {
    if (!chapterId) return;
    setLoading(true);
    setCurrentPage(0);
    getMangaChapter(Number(chapterId))
      .then((v) => {
        setViewer(v);
        document.title = `${v.chapterName} — ${v.titleName} — Nightwatch`;
        getMangaDetail(v.titleId)
          .then((d) => {
            coverUrl.current = d.title.portraitImageUrl;
            const idx = d.chapters.findIndex(
              (c) => c.chapterId === Number(chapterId),
            );
            setPrevChapterId(idx > 0 ? d.chapters[idx - 1].chapterId : null);
            setNextChapterId(
              idx >= 0 && idx < d.chapters.length - 1
                ? d.chapters[idx + 1].chapterId
                : null,
            );
          })
          .catch(() => {});
        // Restore reading position
        getMangaProgress()
          .then((res) => {
            const saved = res.progress.find((p) => p.titleId === v.titleId);
            if (
              saved &&
              saved.chapterId === Number(chapterId) &&
              saved.pageIndex > 0
            ) {
              setCurrentPage(saved.pageIndex);
              const scrollToSaved = () => {
                const el = pageRefs.current[saved.pageIndex];
                if (el) el.scrollIntoView({ behavior: 'instant' });
              };
              // Wait for the target image to have dimensions before scrolling
              const waitForImage = () => {
                const el = pageRefs.current[saved.pageIndex];
                const img = el?.querySelector('img');
                if (img && img.naturalHeight > 0) {
                  scrollToSaved();
                } else if (img) {
                  img.addEventListener('load', scrollToSaved, { once: true });
                  // Fallback if image takes too long
                  setTimeout(scrollToSaved, 3000);
                } else {
                  setTimeout(scrollToSaved, 500);
                }
              };
              setTimeout(waitForImage, 100);
            }
          })
          .catch(() => {});
      })
      .catch(() => setViewer(null))
      .finally(() => setLoading(false));
  }, [chapterId]);

  // Track scroll position to determine current page

  // Discord Rich Presence for manga reading
  useEffect(() => {
    if (!viewer || !checkIsDesktop()) return;
    desktopBridge.updateDiscordPresence({
      details: `Reading: ${viewer.titleName}`,
      state: viewer.chapterName,
      largeImageText: viewer.titleName,
      largeImageKey: 'nightwatch_logo',
      startTimestamp: Date.now(),
    });
    return () => desktopBridge.clearDiscordPresence();
  }, [viewer]);
  useEffect(() => {
    if (!viewer) return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const idx = Number(entry.target.getAttribute('data-page'));
            if (!Number.isNaN(idx)) setCurrentPage(idx);
          }
        }
      },
      { threshold: 0.5 },
    );
    for (const ref of pageRefs.current) {
      if (ref) observer.observe(ref);
    }
    return () => observer.disconnect();
  }, [viewer]);

  // Track latest page in a ref so the save-on-exit always has the current value
  const currentPageRef = useRef(0);
  currentPageRef.current = currentPage;

  const saveProgress = useCallback(() => {
    if (!viewer || viewer.pages.length === 0) return;
    updateMangaProgress({
      titleId: viewer.titleId,
      titleName: viewer.titleName,
      portraitImageUrl: coverUrl.current,
      chapterId: viewer.chapterId,
      chapterName: viewer.chapterName,
      pageIndex: currentPageRef.current,
      totalPages: viewer.pages.length,
    }).catch(() => {});
  }, [viewer]);

  // Save on unmount, tab close, and every 30s as crash safety net
  useEffect(() => {
    if (!viewer) return;
    const onBeforeUnload = () => saveProgress();
    window.addEventListener('beforeunload', onBeforeUnload);
    const interval = setInterval(saveProgress, 30_000);
    return () => {
      window.removeEventListener('beforeunload', onBeforeUnload);
      clearInterval(interval);
      saveProgress();
    };
  }, [viewer, saveProgress]);

  if (loading) {
    return (
      <main className="pb-32 animate-in fade-in container mx-auto px-4 md:px-10 pt-6">
        <div className="max-w-3xl mx-auto space-y-2">
          {['a', 'b', 'c'].map((id) => (
            <div
              key={id}
              className="aspect-[2/3] bg-muted animate-pulse border-[2px] border-border"
            />
          ))}
        </div>
      </main>
    );
  }

  if (!viewer) {
    return (
      <main className="pb-32 container mx-auto px-6 md:px-10 pt-6 text-center py-32">
        <p className="font-headline font-black text-2xl uppercase tracking-widest text-foreground/40">
          Chapter not found
        </p>
      </main>
    );
  }

  return (
    <main className="pb-32 animate-in fade-in">
      {/* Sticky header */}
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-sm border-b-[3px] border-border">
        <div className="container mx-auto px-4 md:px-10 py-3 flex items-center gap-4">
          <Link
            href={`/manga/title/${viewer.titleId}`}
            className="p-1.5 hover:bg-foreground/5 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex-1 min-w-0">
            <p className="font-headline font-black uppercase tracking-wide text-xs line-clamp-1">
              {viewer.titleName}
            </p>
            <p className="text-[10px] text-foreground/50 font-bold uppercase tracking-widest">
              {viewer.chapterName} · {currentPage + 1}/{viewer.pages.length}
            </p>
          </div>
          <div className="flex gap-1">
            {prevChapterId ? (
              <Link
                href={`/manga/chapter/${prevChapterId}`}
                className="p-2 bg-card border-[2px] border-border hover:bg-foreground/5 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </Link>
            ) : (
              <span className="p-2 bg-card border-[2px] border-border opacity-30">
                <ChevronLeft className="w-4 h-4" />
              </span>
            )}
            {nextChapterId ? (
              <Link
                href={`/manga/chapter/${nextChapterId}`}
                className="p-2 bg-card border-[2px] border-border hover:bg-foreground/5 transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </Link>
            ) : (
              <span className="p-2 bg-card border-[2px] border-border opacity-30">
                <ChevronRight className="w-4 h-4" />
              </span>
            )}
          </div>
        </div>
        {/* Progress bar */}
        <div className="h-0.5 bg-border">
          <div
            className="h-full bg-neo-cyan transition-all duration-300"
            style={{
              width: `${viewer.pages.length ? ((currentPage + 1) / viewer.pages.length) * 100 : 0}%`,
            }}
          />
        </div>
      </div>

      {/* Pages */}
      <div className="max-w-3xl mx-auto px-0 md:px-4">
        {viewer.pages.map((page, i) => (
          <div
            key={page.imageUrl}
            ref={(el) => {
              pageRefs.current[i] = el;
            }}
            data-page={i}
            className="w-full"
          >
            <img
              src={page.imageUrl}
              alt={`Page ${i + 1}`}
              className="w-full h-auto"
              loading={i <= currentPage + 1 ? 'eager' : 'lazy'}
            />
          </div>
        ))}
      </div>

      {/* Bottom nav */}
      <div className="container mx-auto px-6 md:px-10 mt-8">
        <div className="max-w-3xl mx-auto flex justify-between items-center bg-card border-[3px] border-border p-4">
          <Link
            href={`/manga/title/${viewer.titleId}`}
            className="font-headline font-black uppercase text-xs tracking-widest hover:text-neo-cyan transition-colors"
          >
            ← All Chapters
          </Link>
          <span className="font-headline font-bold uppercase text-[10px] tracking-widest text-foreground/40">
            {currentPage + 1} / {viewer.pages.length}
          </span>
        </div>
      </div>
    </main>
  );
}
