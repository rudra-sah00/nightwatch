'use client';

import { Loader2, Search, X } from 'lucide-react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  getTopSearches,
  type MusicSearchResult,
  searchMore,
  searchMusic,
} from '../api';
import { useMusicPlayerContext } from '../context/MusicPlayerContext';
import { formatTime } from '../utils';
import { showSongMenu } from './SongContextMenu';

/**
 * Cmd+K style search spotlight overlay for discovering music.
 *
 * Renders a full-screen backdrop with a floating search input and results panel:
 * - **Idle state** (no query): shows trending/top searches fetched from `getTopSearches`.
 * - **Searching**: debounces input by 400 ms, then calls `searchMusic` for songs, albums,
 *   and playlists. Songs are displayed as a clickable list (plays on click), albums and
 *   playlists as horizontal thumbnail rows linking to their detail pages.
 * - **Load More**: paginated song results (20 per page) with an inline "Load More" button.
 * - **No results**: a centered empty-state message.
 *
 * Closes on Escape, backdrop click, or after selecting a result. The close triggers a
 * 200 ms fade-out + scale animation before invoking `onClose`.
 *
 * On native mobile (Capacitor), auto-focus is skipped to prevent iOS zoom/scroll issues.
 *
 * @param props.onClose - Callback invoked after the closing animation completes.
 */
export function MusicSearchSpotlight({ onClose }: { onClose: () => void }) {
  const t = useTranslations('music');
  const player = useMusicPlayerContext();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<MusicSearchResult | null>(null);
  const [topSearches, setTopSearches] = useState<
    { id: string; title: string; type: string; image: string }[]
  >([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [closing, setClosing] = useState(false);
  const pageRef = useRef(1);
  const hasMoreRef = useRef(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressTriggered = useRef(false);

  useEffect(() => {
    // Don't auto-focus on mobile — causes iOS to zoom/scroll
    if (!window.Capacitor?.isNativePlatform?.()) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
    getTopSearches()
      .then(setTopSearches)
      .catch(() => {});
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
    pageRef.current = 1;
    hasMoreRef.current = false;
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const data = await searchMusic(val);
        setResults(data);
        hasMoreRef.current = data.songs.length >= 20;
      } catch {
        /* handled */
      } finally {
        setLoading(false);
      }
    }, 400);
  }, []);

  const handleLoadMore = useCallback(async () => {
    if (!query.trim() || !results || loadingMore) return;
    setLoadingMore(true);
    try {
      pageRef.current += 1;
      const more = await searchMore(query, pageRef.current);
      if (more.results.length > 0) {
        setResults((prev) =>
          prev ? { ...prev, songs: [...prev.songs, ...more.results] } : prev,
        );
        hasMoreRef.current = more.results.length >= 20;
      } else {
        hasMoreRef.current = false;
      }
    } catch {
      /* handled */
    } finally {
      setLoadingMore(false);
    }
  }, [query, results, loadingMore]);

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
      <div className="w-full max-w-xl mx-4 max-h-[80vh] flex flex-col overflow-hidden">
        {/* Input */}
        <div className="flex items-center bg-white/10 backdrop-blur-2xl rounded-full border border-white/20 shadow-2xl px-5 py-3.5 gap-3 shrink-0">
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

        {/* Top Searches (shown when no query) */}
        {!query && topSearches.length > 0 && (
          <div className="mt-2 bg-white/10 backdrop-blur-2xl rounded-2xl border border-white/20 shadow-2xl overflow-hidden max-h-[55vh] overflow-y-auto p-3 min-h-0">
            <p className="text-white/30 font-headline font-bold uppercase tracking-widest text-[10px] px-2 mb-2">
              {t('trendingSearches')}
            </p>
            {topSearches.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => handleQuery(item.title)}
                className="w-full flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-white/10 transition-colors text-left"
              >
                <img
                  src={item.image}
                  alt={item.title}
                  className="w-10 h-10 rounded object-cover flex-shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-medium truncate">
                    {item.title}
                  </p>
                  <p className="text-white/40 text-xs capitalize truncate">
                    {item.type}
                  </p>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Results */}
        {results &&
          (results.songs.length > 0 ||
            results.albums.length > 0 ||
            results.playlists.length > 0) && (
            <div className="mt-2 bg-white/10 backdrop-blur-2xl rounded-2xl border border-white/20 shadow-2xl overflow-hidden max-h-[55vh] overflow-y-auto min-h-0">
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
                        if (longPressTriggered.current) return;
                        player.play(song, results.songs);
                        close();
                      }}
                      onContextMenu={(e) => showSongMenu(e, song)}
                      onTouchStart={(e) => {
                        longPressTriggered.current = false;
                        const touch = e.touches[0];
                        longPressTimer.current = setTimeout(() => {
                          longPressTriggered.current = true;
                          showSongMenu(
                            {
                              clientX: touch.clientX,
                              clientY: touch.clientY,
                              preventDefault: () => {},
                            } as unknown as React.MouseEvent,
                            song,
                          );
                        }, 500);
                      }}
                      onTouchEnd={() => {
                        if (longPressTimer.current) {
                          clearTimeout(longPressTimer.current);
                          longPressTimer.current = null;
                        }
                      }}
                      onTouchMove={() => {
                        if (longPressTimer.current) {
                          clearTimeout(longPressTimer.current);
                          longPressTimer.current = null;
                        }
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
                  {hasMoreRef.current && (
                    <button
                      type="button"
                      onClick={handleLoadMore}
                      disabled={loadingMore}
                      className="w-full py-2 text-center text-white/40 hover:text-white font-headline font-bold uppercase text-[10px] tracking-widest transition-colors"
                    >
                      {loadingMore ? '...' : 'Load More'}
                    </button>
                  )}
                </div>
              )}
              {results.albums.length > 0 && (
                <div className="p-3 border-t border-white/10">
                  <p className="text-white/30 font-headline font-bold uppercase tracking-widest text-[10px] px-2 mb-2">
                    {t('albums')}
                  </p>
                  <div className="flex gap-3 overflow-x-auto pb-1 px-2">
                    {results.albums.map((album) => (
                      <Link
                        key={album.id}
                        href={`/music/album/${album.id}`}
                        onClick={close}
                        className="flex-shrink-0 w-24"
                      >
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
                      </Link>
                    ))}
                  </div>
                </div>
              )}
              {results.playlists.length > 0 && (
                <div className="p-3 border-t border-white/10">
                  <p className="text-white/30 font-headline font-bold uppercase tracking-widest text-[10px] px-2 mb-2">
                    {t('playlists')}
                  </p>
                  <div className="flex gap-3 overflow-x-auto pb-1 px-2">
                    {results.playlists.map((pl) => (
                      <Link
                        key={pl.id}
                        href={`/music/playlist/${pl.id}`}
                        onClick={close}
                        className="flex-shrink-0 w-24"
                      >
                        <img
                          src={pl.image}
                          alt={pl.title}
                          className="w-24 h-24 rounded object-cover"
                        />
                        <p className="text-white text-[11px] font-medium truncate mt-1">
                          {pl.title}
                        </p>
                        <p className="text-white/30 text-[10px] truncate">
                          {pl.songCount} songs
                        </p>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

        {results &&
          results.songs.length === 0 &&
          results.albums.length === 0 &&
          results.playlists.length === 0 && (
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
