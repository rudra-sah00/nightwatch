'use client';

import {
  ArrowLeft,
  BookOpen,
  Clock,
  Eye,
  Heart,
  Play,
  Star,
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import type { MangaDetail, MangaProgress } from '@/features/manga/api';
import {
  addMangaFavorite,
  checkMangaFavorite,
  getMangaDetail,
  getMangaProgress,
  removeMangaFavorite,
} from '@/features/manga/api';

export default function MangaTitlePage() {
  const { titleId } = useParams<{ titleId: string }>();
  const router = useRouter();
  const [detail, setDetail] = useState<MangaDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [isFav, setIsFav] = useState(false);
  const [favLoading, setFavLoading] = useState(false);
  const [resumeProgress, setResumeProgress] = useState<MangaProgress | null>(
    null,
  );

  useEffect(() => {
    if (!titleId) return;
    setLoading(true);
    getMangaDetail(Number(titleId))
      .then(setDetail)
      .catch(() => setDetail(null))
      .finally(() => setLoading(false));
    checkMangaFavorite(Number(titleId))
      .then((r) => setIsFav(r.isFavorite))
      .catch(() => {});
    getMangaProgress()
      .then((r) => {
        const p = r.progress.find((x) => x.titleId === Number(titleId));
        if (p) setResumeProgress(p);
      })
      .catch(() => {});
  }, [titleId]);

  const toggleFav = async () => {
    if (!detail || favLoading) return;
    setFavLoading(true);
    try {
      if (isFav) {
        await removeMangaFavorite(detail.title.titleId);
        setIsFav(false);
      } else {
        await addMangaFavorite({
          titleId: detail.title.titleId,
          title: detail.title.name,
          author: detail.title.author,
          portraitImageUrl: detail.title.portraitImageUrl,
        });
        setIsFav(true);
      }
    } catch {
    } finally {
      setFavLoading(false);
    }
  };

  if (loading) {
    return (
      <main className="pb-32 animate-in fade-in container mx-auto px-6 md:px-10 pt-6">
        <div className="flex gap-6">
          <div className="w-40 md:w-52 shrink-0 aspect-[2/3] bg-muted animate-pulse border-[3px] border-border" />
          <div className="flex-1 space-y-4 pt-2">
            <div className="h-8 bg-muted animate-pulse w-3/4" />
            <div className="h-4 bg-muted animate-pulse w-1/3" />
            <div className="h-20 bg-muted animate-pulse w-full" />
          </div>
        </div>
      </main>
    );
  }

  if (!detail) {
    return (
      <main className="pb-32 container mx-auto px-6 md:px-10 pt-6">
        <p className="font-headline font-black text-2xl uppercase tracking-widest text-foreground/40 text-center py-32">
          Manga not found
        </p>
      </main>
    );
  }

  const {
    title,
    overview,
    chapters,
    tags,
    releaseSchedule,
    rating,
    numberOfViews,
  } = detail;

  return (
    <main className="pb-32 animate-in fade-in">
      <div className="container mx-auto px-6 md:px-10 pt-4">
        {/* Back */}
        <Link
          href="/manga"
          className="inline-flex items-center gap-2 font-headline font-bold uppercase text-xs tracking-widest text-foreground/50 hover:text-foreground transition-colors mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </Link>

        {/* Title Header */}
        <div className="flex flex-col sm:flex-row gap-6 mb-10">
          <div className="w-36 sm:w-44 md:w-52 shrink-0 aspect-[2/3] relative bg-muted border-[3px] border-border overflow-hidden mx-auto sm:mx-0">
            {detail.imageUrl ? (
              <Image
                src={detail.imageUrl}
                alt={title.name}
                fill
                className="object-cover"
                sizes="220px"
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center">
                <BookOpen className="w-12 h-12 text-foreground/20" />
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="font-headline font-black text-2xl md:text-4xl uppercase tracking-tight leading-tight mb-2">
              {title.name}
            </h1>
            <p className="font-headline font-bold uppercase tracking-widest text-xs text-foreground/50 mb-4">
              {title.author}
            </p>

            {/* Actions */}
            <div className="flex gap-2 mb-5">
              <button
                type="button"
                onClick={toggleFav}
                disabled={favLoading}
                className={`flex items-center gap-2 px-4 py-2 font-headline font-black uppercase text-xs tracking-widest border-[3px] border-border transition-colors ${
                  isFav
                    ? 'bg-neo-red text-white'
                    : 'bg-card hover:bg-foreground/5'
                }`}
              >
                <Heart className={`w-4 h-4 ${isFav ? 'fill-current' : ''}`} />
                {isFav ? 'Saved' : 'Save'}
              </button>
              {resumeProgress &&
                (() => {
                  const pct = resumeProgress.totalPages
                    ? resumeProgress.pageIndex / resumeProgress.totalPages
                    : 0;
                  if (pct >= 0.95) {
                    // Find next chapter
                    const idx = chapters.findIndex(
                      (c) => c.chapterId === resumeProgress.chapterId,
                    );
                    const next =
                      idx >= 0 && idx < chapters.length - 1
                        ? chapters[idx + 1]
                        : null;
                    if (!next) return null; // Last chapter, 95%+ done — no resume
                    return (
                      <button
                        type="button"
                        onClick={() =>
                          router.push(`/manga/chapter/${next.chapterId}`)
                        }
                        className="flex items-center gap-2 px-4 py-2 font-headline font-black uppercase text-xs tracking-widest border-[3px] border-border bg-neo-cyan text-black hover:brightness-110 transition-colors"
                      >
                        <Play className="w-4 h-4 fill-current" />
                        Next {next.name}
                      </button>
                    );
                  }
                  return (
                    <button
                      type="button"
                      onClick={() =>
                        router.push(
                          `/manga/chapter/${resumeProgress.chapterId}`,
                        )
                      }
                      className="flex items-center gap-2 px-4 py-2 font-headline font-black uppercase text-xs tracking-widest border-[3px] border-border bg-neo-cyan text-black hover:brightness-110 transition-colors"
                    >
                      <Play className="w-4 h-4 fill-current" />
                      Resume {resumeProgress.chapterName}
                    </button>
                  );
                })()}
            </div>

            {/* Meta badges */}
            <div className="flex flex-wrap gap-2 mb-5">
              {releaseSchedule && releaseSchedule !== 'other' && (
                <span className="flex items-center gap-1.5 bg-card border-[2px] border-border px-3 py-1 font-headline font-bold uppercase text-[10px] tracking-widest">
                  <Clock className="w-3 h-3" />
                  {releaseSchedule}
                </span>
              )}
              {rating && (
                <span className="flex items-center gap-1.5 bg-card border-[2px] border-border px-3 py-1 font-headline font-bold uppercase text-[10px] tracking-widest">
                  <Star className="w-3 h-3" />
                  {rating.replace('_', ' ')}
                </span>
              )}
              {numberOfViews > 0 && (
                <span className="flex items-center gap-1.5 bg-card border-[2px] border-border px-3 py-1 font-headline font-bold uppercase text-[10px] tracking-widest">
                  <Eye className="w-3 h-3" />
                  {numberOfViews.toLocaleString()}
                </span>
              )}
            </div>

            {/* Tags */}
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-5">
                {tags.map((t) => (
                  <span
                    key={t.slug}
                    className="bg-neo-cyan/10 border-[2px] border-border px-2.5 py-0.5 font-headline font-bold uppercase text-[9px] tracking-widest"
                  >
                    {t.tag}
                  </span>
                ))}
              </div>
            )}

            {/* Overview */}
            {overview && (
              <p className="text-sm text-foreground/70 leading-relaxed line-clamp-4 sm:line-clamp-none">
                {overview}
              </p>
            )}
          </div>
        </div>

        {/* Chapter List */}
        <div className="border-[3px] border-border bg-card">
          <div className="px-5 py-4 border-b-[3px] border-border">
            <h2 className="font-headline font-black uppercase tracking-widest text-sm">
              Chapters ({chapters.length})
            </h2>
          </div>
          {chapters.length > 0 ? (
            <div className="divide-y-[2px] divide-border">
              {chapters.map((ch) => (
                <Link
                  key={ch.chapterId}
                  href={`/manga/chapter/${ch.chapterId}`}
                  className="flex items-center gap-4 px-5 py-3.5 hover:bg-foreground/[0.03] transition-colors group"
                >
                  {ch.thumbnailUrl && (
                    <div className="w-14 h-10 relative shrink-0 bg-muted border-[2px] border-border overflow-hidden hidden sm:block">
                      <Image
                        src={ch.thumbnailUrl}
                        alt={ch.name}
                        fill
                        className="object-cover"
                        sizes="56px"
                      />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-headline font-black uppercase tracking-wide text-xs group-hover:text-neo-cyan transition-colors">
                      {ch.name}
                    </p>
                    {ch.subTitle && (
                      <p className="text-[11px] text-foreground/50 font-bold tracking-wide line-clamp-1 mt-0.5">
                        {ch.subTitle}
                      </p>
                    )}
                  </div>
                  <span className="text-[10px] text-foreground/30 font-bold uppercase tracking-widest shrink-0">
                    {ch.startTimestamp
                      ? new Date(ch.startTimestamp * 1000).toLocaleDateString(
                          'en-US',
                          {
                            month: 'short',
                            day: 'numeric',
                          },
                        )
                      : ''}
                  </span>
                </Link>
              ))}
            </div>
          ) : (
            <div className="py-16 text-center">
              <p className="font-headline font-black uppercase tracking-widest text-foreground/30 text-sm">
                No chapters available
              </p>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
