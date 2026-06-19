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

export interface MangaFavorite {
  id: string;
  titleId: number;
  title: string;
  author: string;
  portraitImageUrl: string;
  addedAt: string;
}

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
