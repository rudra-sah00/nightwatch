import { create } from 'zustand';
import type { PostMedia, PostTag } from '@/features/explore/types';

const MAX_CONTENT_LENGTH = 500;
const MAX_TAGS = 5;
const MAX_IMAGES = 4;
const MAX_GIFS = 4;
const MAX_EMOJIS_IN_CONTENT = 30;

interface ComposerStore {
  content: string;
  tags: PostTag[];
  images: string[];
  gifs: string[];
  isSubmitting: boolean;
  isUploading: boolean;

  // Actions
  setContent: (text: string) => void;
  addTag: (tag: PostTag) => void;
  removeTag: (id: string, type: string) => void;
  addImages: (urls: string[]) => void;
  removeImage: (url: string) => void;
  addGif: (url: string) => void;
  removeGif: (url: string) => void;
  setSubmitting: (v: boolean) => void;
  setUploading: (v: boolean) => void;
  reset: () => void;

  // Computed
  canSubmit: () => boolean;
  getMedia: () => PostMedia | undefined;
}

const initialState = {
  content: '',
  tags: [] as PostTag[],
  images: [] as string[],
  gifs: [] as string[],
  isSubmitting: false,
  isUploading: false,
};

export const useComposerStore = create<ComposerStore>((set, get) => ({
  ...initialState,

  setContent: (text) => {
    if (text.length <= MAX_CONTENT_LENGTH) set({ content: text });
  },

  addTag: (tag) =>
    set((s) => {
      if (s.tags.length >= MAX_TAGS) return s;
      if (s.tags.some((t) => t.id === tag.id && t.type === tag.type)) return s;
      return { tags: [...s.tags, tag] };
    }),

  removeTag: (id, type) =>
    set((s) => ({
      tags: s.tags.filter((t) => !(t.id === id && t.type === type)),
    })),

  addImages: (urls) =>
    set((s) => {
      const remaining = MAX_IMAGES - s.images.length;
      if (remaining <= 0) return s;
      return { images: [...s.images, ...urls.slice(0, remaining)] };
    }),

  removeImage: (url) =>
    set((s) => ({
      images: s.images.filter((u) => u !== url),
    })),

  addGif: (url) =>
    set((s) => {
      if (s.gifs.length >= MAX_GIFS) return s;
      return { gifs: [...s.gifs, url] };
    }),

  removeGif: (url) =>
    set((s) => ({
      gifs: s.gifs.filter((u) => u !== url),
    })),

  setSubmitting: (v) => set({ isSubmitting: v }),
  setUploading: (v) => set({ isUploading: v }),

  reset: () => set(initialState),

  canSubmit: () => {
    const s = get();
    return (
      !s.isSubmitting &&
      !s.isUploading &&
      (s.content.trim().length > 0 ||
        s.images.length > 0 ||
        s.gifs.length > 0 ||
        s.tags.length > 0)
    );
  },

  getMedia: () => {
    const s = get();
    const allUrls = [...s.images, ...s.gifs];
    if (allUrls.length === 0) return undefined;
    return {
      urls: allUrls,
      type:
        s.gifs.length > 0 && s.images.length === 0
          ? ('image' as const)
          : ('image' as const),
    };
  },
}));

export {
  MAX_CONTENT_LENGTH,
  MAX_EMOJIS_IN_CONTENT,
  MAX_GIFS,
  MAX_IMAGES,
  MAX_TAGS,
};
