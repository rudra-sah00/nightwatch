import { trackEvent } from '@/lib/analytics';
import { apiFetch } from '@/lib/fetch';
import type {
  MangaChapterViewer,
  MangaDetail,
  MangaFavorite,
  MangaProgress,
  MangaTitle,
} from './types';

export type {
  MangaChapter,
  MangaChapterViewer,
  MangaDetail,
  MangaFavorite,
  MangaPage,
  MangaProgress,
  MangaTitle,
} from './types';

export async function getMangaRanking(): Promise<{ titles: MangaTitle[] }> {
  return apiFetch('/api/manga/ranking');
}

export async function getMangaLatest(): Promise<{ titles: MangaTitle[] }> {
  return apiFetch('/api/manga/latest');
}

export async function searchManga(
  q: string,
): Promise<{ titles: MangaTitle[] }> {
  return apiFetch(`/api/manga/search?q=${encodeURIComponent(q)}`);
}

export async function getMangaDetail(titleId: number): Promise<MangaDetail> {
  return apiFetch(`/api/manga/title/${titleId}`);
}

export async function getMangaChapter(
  chapterId: number,
): Promise<MangaChapterViewer> {
  trackEvent('manga_chapter_read', { chapter_id: chapterId });
  return apiFetch(`/api/manga/chapter/${chapterId}`);
}

// === Favorites ===

export async function getMangaFavorites(): Promise<{
  favorites: MangaFavorite[];
}> {
  return apiFetch('/api/manga/favorites');
}

export async function addMangaFavorite(input: {
  titleId: number;
  title: string;
  author: string;
  portraitImageUrl: string;
}) {
  trackEvent('manga_favorite_add', {
    title_id: input.titleId,
    title: input.title,
  });
  return apiFetch('/api/manga/favorites', {
    method: 'POST',
    body: JSON.stringify(input),
    headers: { 'Content-Type': 'application/json' },
  });
}

export async function removeMangaFavorite(titleId: number) {
  const result = await apiFetch(`/api/manga/favorites/${titleId}`, {
    method: 'DELETE',
  });
  trackEvent('manga_favorite_remove', { title_id: titleId });
  return result;
}

export async function checkMangaFavorite(
  titleId: number,
): Promise<{ isFavorite: boolean }> {
  return apiFetch(`/api/manga/favorites/${titleId}/check`);
}

// === Reading Progress ===

export async function getMangaProgress(): Promise<{
  progress: MangaProgress[];
}> {
  return apiFetch('/api/manga/progress');
}

export async function updateMangaProgress(input: {
  titleId: number;
  titleName: string;
  portraitImageUrl: string;
  chapterId: number;
  chapterName: string;
  pageIndex: number;
  totalPages: number;
}) {
  return apiFetch('/api/manga/progress', {
    method: 'POST',
    body: JSON.stringify(input),
    headers: { 'Content-Type': 'application/json' },
  });
}

export async function removeMangaProgress(titleId: number) {
  return apiFetch(`/api/manga/progress/${titleId}`, { method: 'DELETE' });
}
