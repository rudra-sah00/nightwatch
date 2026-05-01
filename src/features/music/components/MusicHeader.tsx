'use client';

import { Globe, Plus, Search } from 'lucide-react';
import { useTranslations } from 'next-intl';

interface MusicHeaderProps {
  selectedLangs: Set<string>;
  onOpenLangPicker: () => void;
  onToggleCreatePlaylist: () => void;
  onOpenSearch: () => void;
}

export function MusicHeader({
  selectedLangs,
  onOpenLangPicker,
  onToggleCreatePlaylist,
  onOpenSearch,
}: MusicHeaderProps) {
  const t = useTranslations('music');

  return (
    <div className="flex items-center justify-between px-6 pt-6 pb-2">
      <h1 className="font-headline text-2xl md:text-3xl font-black uppercase tracking-tighter">
        {t('title')}
      </h1>
      <div className="flex items-center gap-2">
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
        <button
          type="button"
          onClick={onOpenSearch}
          className="w-10 h-10 flex items-center justify-center rounded-full bg-card border-[2px] border-border hover:border-neo-yellow hover:bg-neo-yellow/10 transition-colors"
          aria-label={t('searchMusic')}
        >
          <Search className="w-4 h-4 text-foreground/50" />
        </button>
      </div>
    </div>
  );
}
