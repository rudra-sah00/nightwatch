'use client';

import {
  FocusContext,
  useFocusable,
} from '@noriginmedia/norigin-spatial-navigation';
import { useQuery } from '@tanstack/react-query';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useCallback, useState } from 'react';
import { searchContent } from '@/features/search/api';
import { useDebounce } from '@/hooks/use-debounce';
import { useTvFocus } from '../hooks/use-tv-focus';

// ─── Letter Grid Keyboard ───
const ROWS = [
  'ABCDEFG'.split(''),
  'HIJKLMN'.split(''),
  'OPQRSTU'.split(''),
  'VWXYZ12'.split(''),
  '3456789'.split(''),
  '0'.split(''),
];

function LetterKey({ char, onPress }: { char: string; onPress: () => void }) {
  const { ref, focused } = useFocusable({ onEnterPress: onPress });
  return (
    <div
      ref={ref}
      className={`w-11 h-11 flex items-center justify-center rounded-lg text-base font-bold transition-all ${
        focused
          ? 'bg-tv-focus text-white scale-110'
          : 'bg-white/10 text-white/80'
      }`}
    >
      {char}
    </div>
  );
}

function ActionKey({
  icon,
  label,
  onPress,
}: {
  icon: string;
  label: string;
  onPress: () => void;
}) {
  const { ref, focused } = useFocusable({ onEnterPress: onPress });
  return (
    <div
      ref={ref}
      className={`flex items-center justify-center gap-2 px-4 h-11 rounded-lg text-sm font-bold transition-all ${
        focused
          ? 'bg-tv-focus text-white scale-105'
          : 'bg-white/10 text-white/80'
      }`}
    >
      <span className="material-symbols-outlined text-lg">{icon}</span>
      <span className="hidden sm:inline">{label}</span>
    </div>
  );
}

function TvLetterGrid({
  onChar,
  onDelete,
  onClear,
  onVoice,
  isListening,
}: {
  onChar: (c: string) => void;
  onDelete: () => void;
  onClear: () => void;
  onVoice: () => void;
  isListening: boolean;
}) {
  const t = useTranslations('common.tv.search');
  const { ref, focusKey } = useFocusable({
    focusKey: 'TV_LETTER_GRID',
    trackChildren: true,
    saveLastFocusedChild: true,
  });

  return (
    <FocusContext.Provider value={focusKey}>
      <div ref={ref} className="flex flex-col gap-2">
        {ROWS.map((row) => (
          <div key={row[0]} className="flex gap-2">
            {row.map((char) => (
              <LetterKey
                key={char}
                char={char}
                onPress={() => onChar(char.toLowerCase())}
              />
            ))}
          </div>
        ))}
        {/* Action row */}
        <div className="flex gap-2 mt-1">
          <ActionKey
            icon="space_bar"
            label={t('space')}
            onPress={() => onChar(' ')}
          />
          <ActionKey icon="backspace" label={t('delete')} onPress={onDelete} />
          <ActionKey icon="delete" label={t('clear')} onPress={onClear} />
          <ActionKey
            icon={isListening ? 'hearing' : 'mic'}
            label={isListening ? t('listening') : t('voice')}
            onPress={onVoice}
          />
        </div>
      </div>
    </FocusContext.Provider>
  );
}

// ─── Result Card ───
function SearchResultCard({
  item,
  onPress,
}: {
  item: { id: string; title: string; poster: string; contentType: string };
  onPress: () => void;
}) {
  const { ref, focused } = useFocusable({
    onEnterPress: onPress,
    onFocus: () => {
      (ref as React.RefObject<HTMLDivElement>).current?.scrollIntoView({
        block: 'nearest',
        behavior: 'smooth',
      });
    },
  });
  return (
    <div
      ref={ref}
      className={`flex flex-col rounded-xl overflow-hidden border-[3px] transition-all ${
        focused ? 'border-tv-focus scale-105 z-10' : 'border-border'
      }`}
    >
      <div className="aspect-[2/3] relative bg-muted">
        {item.poster && (
          <Image
            src={item.poster}
            alt={item.title}
            className="absolute inset-0 w-full h-full object-cover"
            fill
            unoptimized
          />
        )}
      </div>
      <div className="p-2 bg-card">
        <p className="text-xs font-headline font-bold uppercase truncate">
          {item.title}
        </p>
      </div>
    </div>
  );
}

// ─── Main Search Page ───
export function TvSearch() {
  const t = useTranslations('common.tv.search');
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [isListening, setIsListening] = useState(false);
  const debouncedQuery = useDebounce(query, 400);
  const { ref, focusKey } = useFocusable({ focusKey: 'TV_SEARCH_PAGE' });

  const { data: results = [], isLoading } = useQuery({
    queryKey: ['tv-search', debouncedQuery],
    queryFn: () => searchContent(debouncedQuery),
    enabled: debouncedQuery.length >= 2,
    retry: false,
    staleTime: 60_000,
  });

  useTvFocus('tv-search', 'TV_LETTER_GRID');

  const addChar = useCallback((c: string) => setQuery((q) => q + c), []);
  const deleteChar = useCallback(() => setQuery((q) => q.slice(0, -1)), []);
  const clearAll = useCallback(() => setQuery(''), []);

  const startVoice = useCallback(() => {
    if (typeof window === 'undefined') return;
    try {
      const w = window as unknown as Record<string, unknown>;
      const SR = (w.SpeechRecognition ?? w.webkitSpeechRecognition) as
        | (new () => {
            lang: string;
            start: () => void;
            onresult: ((e: unknown) => void) | null;
            onerror: (() => void) | null;
            onend: (() => void) | null;
          })
        | undefined;
      if (!SR) return;
      const recognition = new SR();
      recognition.lang = 'en-US';
      setIsListening(true);
      recognition.onresult = (event: unknown) => {
        const e = event as {
          results?: Array<Array<{ transcript?: string }>>;
        };
        const transcript = e.results?.[0]?.[0]?.transcript;
        if (transcript) setQuery(transcript);
        setIsListening(false);
      };
      recognition.onerror = () => setIsListening(false);
      recognition.onend = () => setIsListening(false);
      recognition.start();
    } catch {
      setIsListening(false);
    }
  }, []);

  return (
    <FocusContext.Provider value={focusKey}>
      <div ref={ref} className="h-full overflow-y-auto p-6 flex gap-6">
        {/* Left: keyboard + query display */}
        <div className="shrink-0 w-[360px] flex flex-col">
          {/* Current query display */}
          <div className="flex items-center gap-3 px-4 py-3 rounded-xl border-[3px] border-border bg-card/50 mb-4 min-h-[52px]">
            <span className="material-symbols-outlined text-xl text-muted-foreground">
              search
            </span>
            <span className="text-base text-foreground flex-1 truncate">
              {query || (
                <span className="text-muted-foreground">
                  {t('placeholder')}
                </span>
              )}
            </span>
          </div>
          <TvLetterGrid
            onChar={addChar}
            onDelete={deleteChar}
            onClear={clearAll}
            onVoice={startVoice}
            isListening={isListening}
          />
        </div>

        {/* Right: results */}
        <div className="flex-1 min-w-0 overflow-y-auto">
          {!debouncedQuery && (
            <p className="text-muted-foreground text-center mt-12">
              Use the letter grid to search for content
            </p>
          )}

          {isLoading && debouncedQuery.length >= 2 && (
            <p className="text-muted-foreground">Searching...</p>
          )}

          {!isLoading && results.length === 0 && debouncedQuery.length >= 2 && (
            <p className="text-muted-foreground">
              No results for &ldquo;{debouncedQuery}&rdquo;
            </p>
          )}

          {results.length > 0 && (
            <div className="grid grid-cols-[repeat(auto-fill,minmax(130px,1fr))] gap-4">
              {results.slice(0, 30).map((r) => (
                <SearchResultCard
                  key={r.id}
                  item={r}
                  onPress={() => router.push(`/content/${r.id}`)}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </FocusContext.Provider>
  );
}
