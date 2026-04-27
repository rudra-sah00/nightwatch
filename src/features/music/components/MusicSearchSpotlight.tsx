'use client';

import { Loader2, Search, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useRef, useState } from 'react';
import { type MusicSearchResult, searchMusic } from '../api';
import { useMusicPlayerContext } from '../context/MusicPlayerContext';
import { formatTime } from '../utils';

export function MusicSearchSpotlight({ onClose }: { onClose: () => void }) {
  const t = useTranslations('music');
  const player = useMusicPlayerContext();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<MusicSearchResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [closing, setClosing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 100);
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  const close = () => {
    setClosing(true);
    setTimeout(onClose, 200);
  };

  const handleQuery = useCallback((val: string) => {
    setQuery(val);
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    if (!val.trim()) {
      setResults(null);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        setResults(await searchMusic(val));
      } catch {
        /* handled */
      } finally {
        setLoading(false);
      }
    }, 400);
  }, []);

  return (
    <div
      className={`fixed inset-0 z-[100] flex items-start justify-center pt-[12vh] bg-black/40 backdrop-blur-sm transition-all duration-200 ${
        closing
          ? 'opacity-0 scale-95'
          : 'animate-in fade-in zoom-in-95 duration-200'
      }`}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          close();
        }
      }}
      onKeyDown={(e) => {
        if (e.key === 'Escape') {
          close();
        }
      }}
      role="dialog"
      tabIndex={-1}
    >
      <div className="w-full max-w-xl mx-4">
        {/* Input */}
        <div className="flex items-center bg-white/10 backdrop-blur-2xl rounded-full border border-white/20 shadow-2xl px-5 py-3.5 gap-3">
          <Search className="w-5 h-5 text-white/40 shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => handleQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                close();
              }
            }}
            placeholder={t('searchPlaceholder')}
            className="flex-1 bg-transparent text-lg text-white font-body outline-none placeholder:text-white/40"
            autoComplete="off"
          />
          {loading && (
            <Loader2 className="w-5 h-5 animate-spin text-white/50 shrink-0" />
          )}
          {query && !loading && (
            <button
              type="button"
              onClick={() => {
                setQuery('');
                setResults(null);
                inputRef.current?.focus();
              }}
              className="text-white/40 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Results */}
        {results && (results.songs.length > 0 || results.albums.length > 0) && (
          <div className="mt-2 bg-white/10 backdrop-blur-2xl rounded-2xl border border-white/20 shadow-2xl overflow-hidden max-h-[60vh] overflow-y-auto">
            {results.songs.length > 0 && (
              <div className="p-3">
                <p className="text-white/30 font-headline font-bold uppercase tracking-widest text-[10px] px-2 mb-2">
                  {t('songs')}
                </p>
                {results.songs.map((song) => (
                  <button
                    key={song.id}
                    type="button"
                    onClick={() => {
                      player.play(song);
                      close();
                    }}
                    className="w-full flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-white/10 transition-colors text-left"
                  >
                    <img
                      src={song.image}
                      alt={song.title}
                      className="w-10 h-10 rounded object-cover flex-shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm font-medium truncate">
                        {song.title}
                      </p>
                      <p className="text-white/40 text-xs truncate">
                        {song.artist}
                      </p>
                    </div>
                    <span className="text-white/20 text-xs font-mono flex-shrink-0">
                      {formatTime(song.duration)}
                    </span>
                  </button>
                ))}
              </div>
            )}
            {results.albums.length > 0 && (
              <div className="p-3 border-t border-white/10">
                <p className="text-white/30 font-headline font-bold uppercase tracking-widest text-[10px] px-2 mb-2">
                  {t('albums')}
                </p>
                <div className="flex gap-3 overflow-x-auto pb-1 px-2">
                  {results.albums.map((album) => (
                    <div key={album.id} className="flex-shrink-0 w-24">
                      <img
                        src={album.image}
                        alt={album.title}
                        className="w-24 h-24 rounded object-cover"
                      />
                      <p className="text-white text-[11px] font-medium truncate mt-1">
                        {album.title}
                      </p>
                      <p className="text-white/30 text-[10px] truncate">
                        {album.artist}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {results &&
          results.songs.length === 0 &&
          results.albums.length === 0 && (
            <div className="mt-2 bg-white/10 backdrop-blur-2xl rounded-2xl border border-white/20 shadow-2xl p-8 text-center">
              <p className="text-white/30 font-headline uppercase tracking-widest text-sm">
                {t('noResults')}
              </p>
            </div>
          )}
      </div>
    </div>
  );
}
