'use client';

import { Check, Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { apiFetch } from '@/lib/fetch';

interface SpotifyPlaylist {
  id: string;
  name: string;
  image: string;
  trackCount: number;
}

interface SpotifyPlaylistPickerProps {
  onClose: () => void;
  onImported: () => void;
  /** Pre-fetched playlists (from connect response). If not provided, fetches from API. */
  initialPlaylists?: SpotifyPlaylist[];
}

export function SpotifyPlaylistPicker({
  onClose,
  onImported,
  initialPlaylists,
}: SpotifyPlaylistPickerProps) {
  const t = useTranslations('music');
  const [playlists, setPlaylists] = useState<SpotifyPlaylist[]>(
    initialPlaylists ?? [],
  );
  const [loading, setLoading] = useState(!initialPlaylists);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [importing, setImporting] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
  }, []);

  useEffect(() => {
    if (initialPlaylists) return;
    apiFetch<SpotifyPlaylist[]>('/api/music/spotify/user-playlists')
      .then(setPlaylists)
      .catch(() => {
        toast.error(t('spotifyAuthFailed'));
        onClose();
      })
      .finally(() => setLoading(false));
  }, [initialPlaylists, onClose, t]);

  const toggle = useCallback((id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleImport = async () => {
    if (selected.size === 0) return;
    setImporting(true);
    try {
      await apiFetch('/api/music/spotify/import-selected', {
        method: 'POST',
        body: JSON.stringify({ playlistIds: [...selected] }),
        headers: { 'Content-Type': 'application/json' },
      });
      toast.success(t('spotifyImportStarted'));
      onImported();
      close();
    } catch {
      toast.error(t('spotifyImportFailed'));
    } finally {
      setImporting(false);
    }
  };

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
        className={`bg-card border-[3px] border-border rounded-xl w-[90vw] max-w-md max-h-[70vh] flex flex-col overflow-hidden transition-all duration-200 ${visible ? 'scale-100 opacity-100' : 'scale-75 opacity-0'}`}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={() => {}}
        role="dialog"
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-border flex items-center justify-between">
          <h2 className="font-headline font-black uppercase text-sm tracking-wider">
            {t('selectPlaylistsToImport')}
          </h2>
          <span className="text-xs text-muted-foreground font-headline">
            {selected.size}/{playlists.length}
          </span>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-[#1DB954]" />
            </div>
          ) : (
            playlists.map((pl) => (
              <button
                key={pl.id}
                type="button"
                onClick={() => toggle(pl.id)}
                className="w-full flex items-center gap-3 px-5 py-3 hover:bg-secondary/50 transition-colors cursor-pointer"
              >
                <div className="w-10 h-10 bg-secondary rounded overflow-hidden flex-shrink-0">
                  {pl.image && (
                    <img
                      src={pl.image}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  )}
                </div>
                <div className="flex-1 text-left min-w-0">
                  <p className="text-sm font-bold truncate">{pl.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {t('tracks', { count: pl.trackCount })}
                  </p>
                </div>
                <div
                  className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                    selected.has(pl.id)
                      ? 'bg-[#1DB954] border-[#1DB954]'
                      : 'border-border'
                  }`}
                >
                  {selected.has(pl.id) && (
                    <Check className="w-3 h-3 text-white" />
                  )}
                </div>
              </button>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-border flex gap-3">
          <button
            type="button"
            onClick={close}
            className="flex-1 py-2 text-xs font-headline font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          >
            {t('cancel')}
          </button>
          <button
            type="button"
            onClick={handleImport}
            disabled={selected.size === 0 || importing}
            className="flex-1 py-2 text-xs font-headline font-bold uppercase tracking-wider bg-[#1DB954] text-white rounded disabled:opacity-40 cursor-pointer hover:bg-[#1DB954]/80 transition-colors"
          >
            {importing ? '...' : t('importSelected', { count: selected.size })}
          </button>
        </div>
      </div>
    </div>
  );
}
