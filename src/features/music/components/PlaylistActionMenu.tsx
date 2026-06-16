'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';

interface PlaylistActionMenuProps {
  onClose: () => void;
  onCreatePlaylist: () => void;
  onSpotifyAction: () => void;
  spotifyConnected: boolean;
}

export function PlaylistActionMenu({
  onClose,
  onCreatePlaylist,
  onSpotifyAction,
  spotifyConnected,
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
        className={`flex flex-col items-center gap-6 transition-all duration-200 ${visible ? 'scale-100 opacity-100' : 'scale-75 opacity-0'}`}
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
          className="text-white/60 text-lg font-headline font-black uppercase tracking-wider cursor-pointer hover:text-white transition-colors"
        >
          {t('createPlaylist')}
        </button>

        <button
          type="button"
          onClick={() => {
            close();
            onSpotifyAction();
          }}
          className="text-[#1DB954]/70 text-lg font-headline font-black uppercase tracking-wider cursor-pointer hover:text-[#1DB954] transition-colors"
        >
          {spotifyConnected
            ? t('selectPlaylistsToImport')
            : t('connectToSpotify')}
        </button>

        <button
          type="button"
          onClick={close}
          className="text-white/30 text-xs font-headline uppercase tracking-wider cursor-pointer hover:text-white/60 transition-colors mt-4"
        >
          cancel
        </button>
      </div>
    </div>
  );
}
