'use client';

import {
  BookOpen,
  Disc3,
  Film,
  Gamepad2,
  MonitorPlay,
  Radio,
} from 'lucide-react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import type { PostTag } from '@/features/explore/types';

const TAG_ICONS: Record<string, typeof Film> = {
  movie: Film,
  series: MonitorPlay,
  music: Disc3,
  game: Gamepad2,
  channel: Radio,
  manga: BookOpen,
};

const TAG_ROUTES: Record<string, (id: string) => string> = {
  movie: (id) => `/watch/${id}`,
  series: (id) => `/watch/${id}`,
  music: (id) => `/music?play=${id}`,
  game: (id) => `/games/${id}`,
  channel: (id) => `/live/${id}`,
  manga: (id) => `/manga/${id}`,
};

/**
 * Renders a tag chip with poster thumbnail + title.
 * On click navigates to the respective content page.
 * Music tags show a spinning disc animation.
 */
export function TagChip({ tag }: { tag: PostTag }) {
  const router = useRouter();
  const Icon = TAG_ICONS[tag.type] || Film;
  const isMusic = tag.type === 'music';

  const handleClick = () => {
    const routeFn = TAG_ROUTES[tag.type];
    if (routeFn) router.push(routeFn(tag.id));
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg border border-border bg-muted/50 hover:bg-muted transition-colors max-w-[200px] group"
    >
      {tag.image ? (
        <div
          className={`w-6 h-6 rounded overflow-hidden shrink-0 ${isMusic ? 'animate-spin-slow' : ''}`}
        >
          <Image
            src={tag.image}
            alt={tag.title}
            width={24}
            height={24}
            className="w-full h-full object-cover"
          />
        </div>
      ) : (
        <Icon
          className={`w-4 h-4 shrink-0 text-foreground/60 ${isMusic ? 'animate-spin-slow' : ''}`}
        />
      )}
      <span className="text-xs font-medium truncate">{tag.title}</span>
    </button>
  );
}
