'use client';

import { useQuery } from '@tanstack/react-query';
import { Loader2, Search, X } from 'lucide-react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  getTopSearches,
  type MusicSearchResult,
  searchAlbums,
  searchArtists,
  searchMore,
  searchMusic,
  searchPlaylists,
  searchSongs,
} from '../api';
import { useMusicStore } from '../store/use-music-store';
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
  const play = useMusicStore((s) => s.play);
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [loadingMore, setLoadingMore] = useState(false);
  const [visible, setVisible] = useState(false);
  const [activeTab, setActiveTab] = useState<
    'all' | 'songs' | 'albums' | 'artists' | 'playlists'
  >('all');
  const [extraSongs, setExtraSongs] = useState<MusicSearchResult['songs']>([]);
  const pageRef = useRef(1);
  const hasMoreRef = useRef(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const searchBarRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressTriggered = useRef(false);

  const { data: topSearches = [] } = useQuery({
    queryKey: ['music', 'top-searches'],
    queryFn: getTopSearches,
  });

  const { data: searchData = null, isLoading: loading } = useQuery({
    queryKey: ['music', 'search', debouncedQuery],
    queryFn: () => searchMusic(debouncedQuery),
    enabled: !!debouncedQuery && debouncedQuery.length >= 2,
  });

  const results: MusicSearchResult | null = searchData
    ? { ...searchData, songs: [...searchData.songs, ...extraSongs] }
    : null;

  // Update hasMoreRef when searchData changes
  useEffect(() => {
    if (searchData) {
      hasMoreRef.current = searchData.songs.length >= 20;
    }
  }, [searchData]);

  // Reset extra songs when query changes
  useEffect(() => {
    void debouncedQuery; // trigger dependency
    setExtraSongs([]);
    pageRef.current = 1;
  }, [debouncedQuery]);

  const fetchFacetedResults = async (q: string, tab: typeof activeTab) => {
    if (tab === 'songs')
      return {
        songs: (await searchSongs(q)).results,
        albums: [],
        artists: [],
        playlists: [],
      };
    if (tab === 'albums')
      return {
        songs: [],
        albums: (await searchAlbums(q)).results,
        artists: [],
        playlists: [],
      };
    if (tab === 'artists')
      return {
        songs: [],
        albums: [],
        artists: (await searchArtists(q)).results,
        playlists: [],
      };
    return {
      songs: [],
      albums: [],
      artists: [],
      playlists: (await searchPlaylists(q)).results,
    };
  };

  const { data: facetedResults } = useQuery({
    queryKey: ['music', 'search', debouncedQuery, activeTab],
    queryFn: () => fetchFacetedResults(debouncedQuery, activeTab),
    enabled: !!debouncedQuery && activeTab !== 'all',
  });

  // Smooth entrance animation
  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));

    if (searchBarRef.current) {
      searchBarRef.current.animate(
        [
          { transform: 'translateY(8px)', opacity: 0 },
          { transform: 'translateY(0)', opacity: 1 },
        ],
        { duration: 250, easing: 'cubic-bezier(0.2, 0, 0, 1)', fill: 'both' },
      );
    }

    // Don't auto-focus on mobile — causes iOS to zoom/scroll
    if (!window.Capacitor?.isNativePlatform?.()) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  const close = () => {
    setVisible(false);
    setTimeout(onClose, 200);
  };

  const handleQuery = useCallback((val: string) => {
    setQuery(val);
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    if (!val.trim()) {
      setDebouncedQuery('');
      return;
    }
    pageRef.current = 1;
    hasMoreRef.current = false;
    debounceRef.current = setTimeout(() => {
      setDebouncedQuery(val);
    }, 400);
  }, []);

  const handleLoadMore = useCallback(async () => {
    if (!query.trim() || !results || loadingMore) return;
    setLoadingMore(true);
    try {
      pageRef.current += 1;
      const more = await searchMore(query, pageRef.current);
      if (more.results.length > 0) {
        setExtraSongs((prev) => [...prev, ...more.results]);
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

  const handleTabChange = useCallback((tab: typeof activeTab) => {
    setActiveTab(tab);
  }, []);

  return (
    <div
      className={`fixed inset-0 z-[100] flex items-start justify-center pt-[12vh] backdrop-blur-sm transition-all duration-200 ${
        visible ? 'bg-black/40 opacity-100' : 'bg-black/0 opacity-0'
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
      <div
        className={`w-full max-w-xl mx-4 max-h-[80vh] flex flex-col overflow-hidden transition-all duration-200 ${visible ? 'scale-100 opacity-100' : 'scale-100 opacity-0'}`}
      >
        {/* Input */}
        <div
          ref={searchBarRef}
          className="flex items-center bg-white/10 backdrop-blur-2xl rounded-full border border-white/20 shadow-2xl px-5 py-3.5 gap-3 shrink-0"
        >
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
                setDebouncedQuery('');
                setActiveTab('all');
                inputRef.current?.focus();
              }}
              className="text-white/40 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Tabs (shown when query exists) */}
        {query && (
          <div className="flex gap-2 mt-2 px-1 shrink-0">
            {(['all', 'songs', 'albums', 'artists', 'playlists'] as const).map(
              (tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => handleTabChange(tab)}
                  className={`px-3 py-1.5 text-[10px] font-headline font-bold uppercase tracking-widest rounded-full transition-colors ${
                    activeTab === tab
                      ? 'bg-white/20 text-white'
                      : 'text-white/40 hover:text-white/70'
                  }`}
                >
                  {t(tab === 'all' ? 'allResults' : tab)}
                </button>
              ),
            )}
          </div>
        )}

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
        {activeTab === 'all' &&
          results &&
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
                        play(song, results.songs);
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

        {activeTab === 'all' &&
          results &&
          results.songs.length === 0 &&
          results.albums.length === 0 &&
          results.playlists.length === 0 && (
            <div className="mt-2 bg-white/10 backdrop-blur-2xl rounded-2xl border border-white/20 shadow-2xl p-8 text-center">
              <p className="text-white/30 font-headline uppercase tracking-widest text-sm">
                {t('noResults')}
              </p>
            </div>
          )}

        {/* Faceted: Songs */}
        {activeTab === 'songs' &&
          facetedResults?.songs &&
          facetedResults.songs.length > 0 && (
            <div className="mt-2 bg-white/10 backdrop-blur-2xl rounded-2xl border border-white/20 shadow-2xl overflow-hidden max-h-[55vh] overflow-y-auto p-3 min-h-0">
              {facetedResults.songs.map((song) => (
                <button
                  key={song.id}
                  type="button"
                  onClick={() => {
                    play(
                      song as Parameters<typeof play>[0],
                      facetedResults.songs as Parameters<typeof play>[1],
                    );
                    close();
                  }}
                  onContextMenu={(e) =>
                    showSongMenu(e, song as Parameters<typeof showSongMenu>[1])
                  }
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

        {/* Faceted: Albums */}
        {activeTab === 'albums' &&
          facetedResults?.albums &&
          facetedResults.albums.length > 0 && (
            <div className="mt-2 bg-white/10 backdrop-blur-2xl rounded-2xl border border-white/20 shadow-2xl overflow-hidden max-h-[55vh] overflow-y-auto p-3 min-h-0">
              {facetedResults.albums.map((album) => (
                <Link
                  key={album.id}
                  href={`/music/album/${album.id}`}
                  onClick={close}
                  className="w-full flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-white/10 transition-colors"
                >
                  <img
                    src={album.image}
                    alt={album.title}
                    className="w-10 h-10 rounded object-cover flex-shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-medium truncate">
                      {album.title}
                    </p>
                    <p className="text-white/40 text-xs truncate">
                      {album.artist}
                    </p>
                  </div>
                  <span className="text-white/20 text-xs font-mono flex-shrink-0">
                    {album.year}
                  </span>
                </Link>
              ))}
            </div>
          )}

        {/* Faceted: Artists */}
        {activeTab === 'artists' &&
          facetedResults?.artists &&
          facetedResults.artists.length > 0 && (
            <div className="mt-2 bg-white/10 backdrop-blur-2xl rounded-2xl border border-white/20 shadow-2xl overflow-hidden max-h-[55vh] overflow-y-auto p-3 min-h-0">
              {facetedResults.artists.map((artist) => (
                <Link
                  key={artist.id}
                  href={`/music/artist/${artist.id}`}
                  onClick={close}
                  className="w-full flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-white/10 transition-colors"
                >
                  <img
                    src={artist.image}
                    alt={artist.name}
                    className="w-10 h-10 rounded-full object-cover flex-shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-medium truncate">
                      {artist.name}
                    </p>
                    <p className="text-white/40 text-xs truncate capitalize">
                      {artist.role}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          )}

        {/* Faceted: Playlists */}
        {activeTab === 'playlists' &&
          facetedResults?.playlists &&
          facetedResults.playlists.length > 0 && (
            <div className="mt-2 bg-white/10 backdrop-blur-2xl rounded-2xl border border-white/20 shadow-2xl overflow-hidden max-h-[55vh] overflow-y-auto p-3 min-h-0">
              {facetedResults.playlists.map((pl) => (
                <Link
                  key={pl.id}
                  href={`/music/playlist/${pl.id}`}
                  onClick={close}
                  className="w-full flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-white/10 transition-colors"
                >
                  <img
                    src={pl.image}
                    alt={pl.title}
                    className="w-10 h-10 rounded object-cover flex-shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-medium truncate">
                      {pl.title}
                    </p>
                    <p className="text-white/40 text-xs truncate">
                      {pl.songCount} songs
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          )}
      </div>
    </div>
  );
}
