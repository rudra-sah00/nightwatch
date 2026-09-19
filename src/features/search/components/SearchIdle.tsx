'use client';

import { useTranslations } from 'next-intl';
import { useSearchInput } from '../hooks/use-search-input';

/**
 * Idle state for `/search` — shown when there is no query to report on.
 *
 * Arriving from the hub's "Movies & Web Series" tile lands here with nothing searched.
 * The results layout has nothing to say in that state: it rendered a "Results:" label
 * over an empty input, "0 Films Found in the Archives", and then dead space. This is a
 * proper landing surface instead — a headline, a search bar that owns the page, and
 * typeahead.
 *
 * Opts into suggestions explicitly: the hook suppresses them on `/search` so the
 * compact results header does not autocomplete over a query already run, but this is
 * the landing input rather than that header.
 */
export function SearchIdle() {
  const t = useTranslations('search');
  const {
    containerRef,
    query,
    setQuery,
    suggestion,
    handleFocus,
    handleBlur,
    handleSearch,
    handleManualSearch,
    isPending,
  } = useSearchInput({ enableSuggestions: true });

  const showGhost =
    query && suggestion?.toLowerCase().startsWith(query.toLowerCase());

  return (
    <main className="flex-grow flex flex-col items-center justify-center p-4 sm:p-8 relative min-h-[calc(100dvh-160px)] w-full overflow-hidden">
      {/* Bauhaus background shapes */}
      <div className="absolute top-20 left-10 w-32 h-32 border-[3px] border-border opacity-20 -z-10 rotate-12" />
      <div className="absolute bottom-20 right-10 w-48 h-48 bg-neo-red opacity-10 -z-10 rounded-full" />

      <div className="w-full max-w-4xl flex flex-col items-center text-center">
        <h1 className="font-headline text-5xl sm:text-6xl md:text-8xl font-black tracking-tighter text-foreground leading-none mb-8">
          {t('idle.headline1')}
          <br />
          <span className="bg-neo-yellow px-4 inline-block text-foreground">
            {t('idle.headline2')}
          </span>
        </h1>

        <div className="w-full relative" ref={containerRef}>
          {/* Offset slab behind the bar */}
          <div className="absolute inset-0 bg-primary translate-x-3 translate-y-3 -z-10" />

          <div className="flex flex-col md:flex-row bg-background border-[3px] border-border w-full h-auto md:h-24">
            <div className="flex-grow flex items-center px-5 md:px-6 py-5 md:py-0 min-h-[5.5rem] md:min-h-0 relative overflow-hidden">
              <span
                className="material-symbols-outlined text-3xl md:text-4xl mr-3 md:mr-4 z-20 shrink-0"
                style={{ fontVariationSettings: "'FILL' 0" }}
                aria-hidden="true"
              >
                search
              </span>

              <div className="relative flex-grow h-full flex items-center">
                {/* Ghost completion, sat under the real input */}
                {showGhost ? (
                  <div className="absolute inset-0 pointer-events-none flex items-center select-none z-0">
                    <span className="text-transparent font-headline text-xl md:text-3xl font-bold uppercase whitespace-pre leading-none">
                      {query}
                    </span>
                    <span className="text-foreground/20 font-headline text-2xl md:text-3xl font-bold uppercase whitespace-pre leading-none">
                      {suggestion.slice(query.length)}
                    </span>
                  </div>
                ) : null}

                <input
                  name="q"
                  aria-label={t('idle.searchAriaLabel')}
                  className="w-full bg-transparent border-none focus:ring-0 font-headline text-2xl md:text-3xl font-bold uppercase placeholder:text-foreground/30 text-foreground relative z-10 outline-none p-0 leading-none h-full"
                  placeholder={t('idle.searchPlaceholder')}
                  type="text"
                  autoComplete="off"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  inputMode="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onFocus={handleFocus}
                  onBlur={handleBlur}
                  onKeyDown={(e) => {
                    handleSearch(e);
                    if (e.key === 'Enter') {
                      (e.target as HTMLInputElement).blur();
                    }
                  }}
                />
              </div>
            </div>

            <button
              className="bg-neo-yellow text-foreground border-l-0 md:border-l-[3px] border-t-[3px] md:border-t-0 border-border px-6 md:px-12 py-3 md:py-0 font-headline text-lg md:text-2xl font-black uppercase tracking-[0.2em] md:tracking-widest hover:bg-primary hover:text-neo-yellow transition-colors duration-200 cursor-pointer h-full whitespace-nowrap disabled:opacity-70 disabled:cursor-wait"
              type="button"
              onClick={handleManualSearch}
              disabled={isPending}
            >
              {isPending ? t('results.searching') : t('idle.searchButton')}
            </button>
          </div>
        </div>

        <div className="mt-8 flex flex-wrap justify-center gap-6 sm:gap-8 font-headline font-bold uppercase text-xs sm:text-sm tracking-widest text-foreground">
          {[
            { key: 'idle.stat1', swatch: 'bg-neo-red' },
            { key: 'idle.stat2', swatch: 'bg-neo-blue' },
            { key: 'idle.stat3', swatch: 'bg-neo-yellow' },
          ].map(({ key, swatch }) => (
            <div key={key} className="flex items-center gap-2">
              <span className={`w-3 h-3 border-2 border-border ${swatch}`} />
              <span>{t(key)}</span>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
