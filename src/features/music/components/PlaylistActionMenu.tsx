'use client';

import { Plus } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';

interface PlaylistActionMenuProps {
  onClose: () => void;
  onCreatePlaylist: () => void;
  onImportSpotify: () => void;
}

/**
 * Menu shown when user taps the + button in the music header.
 * Options: Create Playlist, Import from Spotify.
 */
export function PlaylistActionMenu({
  onClose,
  onCreatePlaylist,
  onImportSpotify,
}: PlaylistActionMenuProps) {
  const t = useTranslations('music');
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
  }, []);

  const close = () => {
    setVisible(false);
    setTimeout(onClose, 200);
  };

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm transition-all duration-200 ${visible ? 'bg-black/40 opacity-100' : 'bg-black/0 opacity-0'}`}
      onClick={close}
      onKeyDown={(e) => {
        if (e.key === 'Escape') close();
      }}
      role="dialog"
    >
      <div
        className={`flex flex-col gap-3 transition-all duration-200 ${visible ? 'scale-100 opacity-100' : 'scale-75 opacity-0'}`}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={() => {}}
        role="menu"
      >
        <button
          type="button"
          onClick={() => {
            close();
            onCreatePlaylist();
          }}
          className="flex items-center gap-3 px-6 py-4 bg-card border-[3px] border-border hover:border-neo-yellow hover:bg-neo-yellow/10 transition-colors cursor-pointer min-w-[260px]"
        >
          <Plus className="w-5 h-5 text-foreground" />
          <span className="font-headline font-black uppercase text-sm tracking-wider text-foreground">
            {t('createPlaylist')}
          </span>
        </button>

        <button
          type="button"
          onClick={() => {
            close();
            onImportSpotify();
          }}
          className="flex items-center gap-3 px-6 py-4 bg-card border-[3px] border-border hover:border-[#1DB954] hover:bg-[#1DB954]/10 transition-colors cursor-pointer min-w-[260px]"
        >
          <svg
            className="w-5 h-5"
            viewBox="0 0 24 24"
            fill="#1DB954"
            role="img"
            aria-label="Spotify"
          >
            <title>Spotify</title>
            <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" />
          </svg>
          <span className="font-headline font-black uppercase text-sm tracking-wider text-foreground">
            {t('importFromSpotify')}
          </span>
        </button>
      </div>
    </div>
  );
}
