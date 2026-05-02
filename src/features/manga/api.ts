import { apiFetch } from '@/lib/fetch';

export interface MangaTitle {
  titleId: number;
  name: string;
  author: string;
  portraitImageUrl: string;
  landscapeImageUrl: string;
  viewCount: number;
  language: string;
  updateStatus: string;
}

export interface MangaChapter {
  titleId: number;
  chapterId: number;
  name: string;
  subTitle: string;
  thumbnailUrl: string;
  startTimestamp: number;
  endTimestamp: number;
  isVerticalOnly: boolean;
}

export interface MangaDetail {
  title: MangaTitle;
  imageUrl: string;
  overview: string;
  backgroundImageUrl: string;
  numberOfViews: number;
  chapters: MangaChapter[];
  tags: { tag: string; slug: string }[];
  releaseSchedule: string;
  rating: string;
  isSimulReleased: boolean;
}

export interface MangaPage {
  imageUrl: string;
  width: number;
  height: number;
  encryptionKey: string | null;
}

export interface MangaChapterViewer {
  titleId: number;
  titleName: string;
  chapterId: number;
  chapterName: string;
  pages: MangaPage[];
  isVerticalOnly: boolean;
  startFromRight: boolean;
}

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
  return apiFetch(`/api/manga/chapter/${chapterId}`);
}

// === Favorites ===
export interface MangaFavorite {
  id: string;
  titleId: number;
  title: string;
  author: string;
  portraitImageUrl: string;
  addedAt: string;
}

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
  return apiFetch('/api/manga/favorites', {
    method: 'POST',
    body: JSON.stringify(input),
    headers: { 'Content-Type': 'application/json' },
  });
}

export async function removeMangaFavorite(titleId: number) {
  return apiFetch(`/api/manga/favorites/${titleId}`, { method: 'DELETE' });
}

export async function checkMangaFavorite(
  titleId: number,
): Promise<{ isFavorite: boolean }> {
  return apiFetch(`/api/manga/favorites/${titleId}/check`);
}

// === Reading Progress ===
export interface MangaProgress {
  id: string;
  titleId: number;
  titleName: string;
  portraitImageUrl: string;
  chapterId: number;
  chapterName: string;
  pageIndex: number;
  totalPages: number;
  updatedAt: string;
}

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
