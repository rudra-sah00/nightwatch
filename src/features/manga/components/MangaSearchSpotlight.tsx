'use client';

import { BookOpen, Loader2, Search, X } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { MangaTitle } from '@/features/manga/api';
import { searchManga } from '@/features/manga/api';

export function MangaSearchSpotlight({ onClose }: { onClose: () => void }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<MangaTitle[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [closing, setClosing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const t = useTranslations('common.manga');

  useEffect(() => {
    if (!window.Capacitor?.isNativePlatform?.()) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const close = () => {
    setClosing(true);
    setTimeout(onClose, 200);
  };

  const handleQuery = useCallback((val: string) => {
    setQuery(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!val.trim()) {
      setResults(null);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        setResults((await searchManga(val)).titles);
      } catch {
        setResults([]);
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
        if (e.target === e.currentTarget) close();
      }}
      onKeyDown={(e) => {
        if (e.key === 'Escape') close();
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
              if (e.key === 'Escape') close();
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
        {results && results.length > 0 && (
          <div className="mt-2 bg-white/10 backdrop-blur-2xl rounded-2xl border border-white/20 shadow-2xl overflow-hidden max-h-[55vh] overflow-y-auto p-3 min-h-0">
            <p className="text-white/30 font-headline font-bold uppercase tracking-widest text-[10px] px-2 mb-2">
              {t('resultsCount', { count: results.length })}
            </p>
            {results.map((title) => (
              <Link
                key={title.titleId}
                href={`/manga/title/${title.titleId}`}
                onClick={close}
                className="w-full flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-white/10 transition-colors text-left"
              >
                <div className="w-10 h-14 relative rounded overflow-hidden flex-shrink-0 bg-white/5">
                  {title.portraitImageUrl ? (
                    <Image
                      src={title.portraitImageUrl}
                      alt={title.name}
                      fill
                      className="object-cover"
                      sizes="40px"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <BookOpen className="w-4 h-4 text-white/20" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-medium truncate">
                    {title.name}
                  </p>
                  <p className="text-white/40 text-xs truncate">
                    {title.author}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}

        {results && results.length === 0 && (
          <div className="mt-2 bg-white/10 backdrop-blur-2xl rounded-2xl border border-white/20 shadow-2xl p-8 text-center">
            <p className="text-white/30 font-headline uppercase tracking-widest text-sm">
              {t('noSearchResults')}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
