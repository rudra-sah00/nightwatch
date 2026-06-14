'use client';

import { Compass, Globe, Plus, Search } from 'lucide-react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';

/**
 * Props for the {@link MusicHeader} component.
 */
interface MusicHeaderProps {
  /** Currently selected music languages (e.g. `Set(['hindi', 'english'])`). */
  selectedLangs: Set<string>;
  /** Opens the {@link LanguagePickerDialog}. */
  onOpenLangPicker: () => void;
  /** Toggles the {@link CreatePlaylistDialog}. */
  onToggleCreatePlaylist: () => void;
  /** Opens the {@link MusicSearchSpotlight} overlay. */
  onOpenSearch: () => void;
}

/**
 * Header bar for the `/music` home page.
 *
 * Displays the localised "Music" title on the left and a row of action buttons
 * on the right:
 * - **Language pill** — shows the first two selected language codes (e.g. "HI, EN +1")
 *   and opens the language picker dialog on click.
 * - **Create playlist** button (plus icon).
 * - **Search** button (magnifying glass icon) that opens the Cmd+K spotlight overlay.
 *
 * All buttons use the neo-brutalist border/hover style from the design system.
 */
export function MusicHeader({
  selectedLangs,
  onOpenLangPicker,
  onToggleCreatePlaylist,
  onOpenSearch,
}: MusicHeaderProps) {
  const t = useTranslations('music');

  return (
    <div className="flex items-center justify-between px-6 pt-6 pb-2 gap-3">
      <h1 className="font-headline text-2xl md:text-3xl font-black uppercase tracking-tighter shrink-0">
        {t('title')}
      </h1>
      <button
        type="button"
        onClick={onOpenSearch}
        className="flex-1 max-w-md min-w-0 h-10 flex items-center gap-2 px-4 rounded-full bg-card border-[2px] border-border hover:border-neo-yellow hover:bg-neo-yellow/10 transition-colors cursor-pointer"
        aria-label={t('searchMusic')}
      >
        <Search className="w-4 h-4 text-foreground/40 shrink-0" />
        <span className="text-sm text-foreground/40 font-body truncate">
          {t('searchPlaceholder')}
        </span>
      </button>
      <div className="flex items-center gap-2 shrink-0">
        <Link
          href="/music/discover"
          className="h-10 px-4 flex items-center gap-1.5 rounded-full bg-neo-yellow border-[2px] border-border hover:brightness-110 transition-all font-headline font-bold text-[10px] uppercase tracking-wider text-black"
        >
          <Compass className="w-4 h-4" />
          <span className="hidden sm:inline">{t('explore')}</span>
        </Link>
        <button
          type="button"
          onClick={onOpenLangPicker}
          className="h-8 px-3 flex items-center gap-1.5 rounded-full bg-card border-[2px] border-border hover:border-neo-yellow hover:bg-neo-yellow/10 transition-colors"
        >
          <Globe className="w-3.5 h-3.5 text-foreground/50" />
          <span className="font-headline font-bold text-[9px] uppercase tracking-wider text-foreground/50">
            {[...selectedLangs]
              .slice(0, 2)
              .map((l) => l.slice(0, 2).toUpperCase())
              .join(', ')}
            {selectedLangs.size > 2 && ` +${selectedLangs.size - 2}`}
          </span>
        </button>
        <button
          type="button"
          onClick={onToggleCreatePlaylist}
          className="w-10 h-10 flex items-center justify-center rounded-full bg-card border-[2px] border-border hover:border-neo-yellow hover:bg-neo-yellow/10 transition-colors"
          aria-label={t('createPlaylist')}
        >
          <Plus className="w-4 h-4 text-foreground/50" />
        </button>
      </div>
    </div>
  );
}
