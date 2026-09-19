'use client';

import { useTranslations } from 'next-intl';
import { useSearchInput } from '@/features/search/hooks/use-search-input';

/**
 * Landing page search interface with a large hero search bar.
 *
 * Features a Bauhaus-inspired layout with autocomplete ghost text suggestions,
 * Tab-to-complete, and a decorative marquee strip. Navigates to the search
 * results page on Enter or button click.
 */
export function HomeClient() {
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
  } = useSearchInput();

  return (
    <main className="flex-grow flex flex-col items-center justify-center p-4 sm:p-8 relative h-[calc(100dvh-120px)] min-h-[600px] w-full overflow-hidden">
      {/* Abstract Bauhaus Background Elements */}
      <div className="absolute top-20 left-10 w-32 h-32 border-[3px] border-border opacity-20 -z-10 rotate-12"></div>
      <div className="absolute bottom-20 right-10 w-48 h-48 bg-neo-red opacity-10 -z-10 rounded-full"></div>

      <div className="w-full max-w-4xl flex flex-col items-center text-center">
        {/* Central Headline */}
        <h1 className="font-headline text-6xl md:text-9xl font-black tracking-tighter text-foreground leading-none mb-8">
          {t('home.headline1')}
          <br />
          <span className="bg-neo-yellow px-4 inline-block  text-foreground">
            {t('home.headline2')}
          </span>
        </h1>

        {/* High-Contrast Search Bar Container */}
        <div className="w-full relative group" ref={containerRef}>
          <div className="absolute inset-0 bg-primary translate-x-3 translate-y-3 -z-10"></div>
          <div className="flex flex-col md:flex-row bg-background border-[3px] border-border w-full h-auto md:h-24 overflow-visible">
            {/* Search Input Container */}
            <div className="flex-grow flex items-center px-5 md:px-6 py-5 md:py-0 min-h-[5.5rem] md:min-h-0 relative overflow-hidden group/input">
              <span
                className="material-symbols-outlined text-3xl md:text-4xl mr-3 md:mr-4 z-20 shrink-0"
                style={{ fontVariationSettings: "'FILL' 0" }}
              >
                search
              </span>

              <div className="relative flex-grow h-full flex items-center">
                {/* Ghost Text Layer (Lower) */}
                {query &&
                suggestion?.toLowerCase().startsWith(query.toLowerCase()) ? (
                  <div className="absolute inset-0 pointer-events-none flex items-center select-none z-0">
                    <span className="text-transparent font-headline text-xl md:text-3xl font-bold uppercase whitespace-pre leading-none">
                      {query}
                    </span>
                    <span className="text-foreground/20 font-headline text-2xl md:text-3xl font-bold uppercase whitespace-pre leading-none">
                      {suggestion.slice(query.length)}
                    </span>
                  </div>
                ) : null}

                {/* Real Input Layer (Upper) */}
                <input
                  name="q"
                  aria-label={t('home.searchAriaLabel')}
                  className="w-full bg-transparent border-none focus:ring-0 font-headline text-2xl md:text-3xl font-bold uppercase placeholder:text-foreground/30 text-foreground relative z-10 outline-none p-0 leading-none h-full"
                  placeholder={t('home.searchPlaceholder')}
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
            {/* Search Button */}
            <button
              className="bg-neo-yellow text-foreground border-l-0 md:border-l-[3px] border-t-[3px] md:border-t-0 border-border px-6 md:px-12 py-3 md:py-0 font-headline text-lg md:text-2xl font-black uppercase tracking-[0.2em] md:tracking-widest hover:bg-primary hover:text-neo-yellow transition-[background-color,color,border-color,opacity,transform] duration-200 cursor-pointer h-full whitespace-nowrap"
              type="button"
              onClick={handleManualSearch}
            >
              {t('home.searchButton')}
            </button>
          </div>
        </div>

        {/* Contextual Minimal Labels */}
        <div className="mt-8 flex flex-wrap justify-center gap-8 font-headline font-bold uppercase text-sm tracking-widest text-foreground">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 bg-neo-red border-2 border-border"></span>
            <span>{t('home.stat1')}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 bg-neo-blue border-2 border-border"></span>
            <span>{t('home.stat2')}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 bg-neo-yellow border-2 border-border"></span>
            <span>{t('home.stat3')}</span>
          </div>
        </div>
      </div>

      {/* Minimal Decorative Strip */}
      <style>
        {`
        @keyframes marquee {
          0% { transform: translateX(0%); }
          100% { transform: translateX(-50%); }
        }
        .animate-marquee {
          animation: marquee 15s linear infinite;
        }
      `}
      </style>
      <div className="absolute bottom-6 md:bottom-8 inset-x-4 md:inset-x-8 lg:inset-x-12 flex overflow-hidden border-[3px] border-border py-4 bg-primary text-primary-foreground font-headline font-black uppercase text-xl md:text-2xl tracking-[0.3em] md:tracking-[0.5em] whitespace-nowrap  z-10">
        <div className="flex animate-marquee w-max">
          <span className="pr-8">{t('marquee')}</span>
          <span className="pr-8">{t('marquee')}</span>
          <span className="pr-8">{t('marquee')}</span>
          <span className="pr-8">{t('marquee')}</span>
        </div>
      </div>
    </main>
  );
}
