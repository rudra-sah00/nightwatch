'use client';

import dynamic from 'next/dynamic';
import { useSearchInput } from '@/features/search/hooks/use-search-input';

// Dynamic import for heavy modal component
const _ContentDetailModal = dynamic(
  () =>
    import('@/features/search/components/content-detail-modal').then(
      (m) => m.ContentDetailModal,
    ),
  { ssr: false },
);

export function HomeClient() {
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
    <main className="flex-grow flex flex-col items-center justify-center p-4 sm:p-8 relative h-[calc(100dvh-120px)] min-h-[600px] w-full overflow-hidden bg-[#f5f0e8]">
      {/* Abstract Bauhaus Background Elements */}
      <div className="absolute top-20 left-10 w-32 h-32 border-[3px] border-[#1a1a1a] opacity-20 -z-10 rotate-12"></div>
      <div className="absolute bottom-20 right-10 w-48 h-48 bg-[#e63b2e] opacity-10 -z-10 rounded-full"></div>

      <div className="w-full max-w-4xl flex flex-col items-center text-center">
        {/* Central Headline */}
        <h1 className="font-headline text-6xl md:text-9xl font-black tracking-tighter text-[#1a1a1a] leading-none mb-8">
          FIND YOUR
          <br />
          <span className="bg-[#ffcc00] px-4 inline-block neo-shadow text-[#1a1a1a]">
            FILM
          </span>
        </h1>

        {/* High-Contrast Search Bar Container */}
        <div className="w-full relative group" ref={containerRef}>
          <div className="absolute inset-0 bg-[#1a1a1a] translate-x-3 translate-y-3 -z-10"></div>
          <div className="flex flex-col md:flex-row bg-[#f5f0e8] border-[3px] border-[#1a1a1a] w-full h-auto md:h-24 overflow-visible">
            {/* Search Input Container */}
            <div className="flex-grow flex items-center px-6 relative overflow-hidden group/input">
              <span
                className="material-symbols-outlined text-4xl mr-4 z-20 shrink-0"
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
                    <span className="text-[#1a1a1a]/20 font-headline text-xl md:text-3xl font-bold uppercase whitespace-pre leading-none">
                      {suggestion.slice(query.length)}
                    </span>
                  </div>
                ) : null}

                {/* Real Input Layer (Upper) */}
                <input
                  name="q"
                  className="w-full bg-transparent border-none focus:ring-0 font-headline text-xl md:text-3xl font-bold uppercase placeholder:text-[#1a1a1a]/30 text-[#1a1a1a] relative z-10 outline-none p-0 leading-none h-full"
                  placeholder="SEARCH MOVIES, SHOWS, OR CINEMA..."
                  type="text"
                  autoComplete="off"
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
              className="bg-[#ffcc00] text-[#1a1a1a] border-l-0 md:border-l-[3px] border-t-[3px] md:border-t-0 border-[#1a1a1a] px-12 py-6 md:py-0 font-headline text-2xl font-black uppercase tracking-widest hover:bg-[#1a1a1a] hover:text-[#ffcc00] transition-all duration-200 cursor-pointer h-full whitespace-nowrap"
              type="button"
              onClick={handleManualSearch}
            >
              SEARCH
            </button>
          </div>
        </div>

        {/* Contextual Minimal Labels */}
        <div className="mt-8 flex flex-wrap justify-center gap-8 font-headline font-bold uppercase text-sm tracking-widest text-[#1a1a1a]">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 bg-[#e63b2e] border-2 border-[#1a1a1a]"></span>
            <span>12k+ Titles</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 bg-[#0055ff] border-2 border-[#1a1a1a]"></span>
            <span>4K Ultra Raw</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 bg-[#ffcc00] border-2 border-[#1a1a1a]"></span>
            <span>Indie Focus</span>
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
      <div className="absolute bottom-6 md:bottom-8 inset-x-4 md:inset-x-8 lg:inset-x-12 flex overflow-hidden border-[3px] border-[#1a1a1a] py-4 bg-[#1a1a1a] text-[#f5f0e8] font-headline font-black uppercase text-xl md:text-2xl tracking-[0.3em] md:tracking-[0.5em] whitespace-nowrap neo-shadow z-10">
        <div className="flex animate-marquee w-max">
          <span className="pr-8">
            FORM FOLLOWS FUNCTION • RUDRA CINEMA • MINIMALISM IS TRUTH • NO
            DISTRACTIONS • JUST FILM •
          </span>
          <span className="pr-8">
            FORM FOLLOWS FUNCTION • RUDRA CINEMA • MINIMALISM IS TRUTH • NO
            DISTRACTIONS • JUST FILM •
          </span>
          <span className="pr-8">
            FORM FOLLOWS FUNCTION • RUDRA CINEMA • MINIMALISM IS TRUTH • NO
            DISTRACTIONS • JUST FILM •
          </span>
          <span className="pr-8">
            FORM FOLLOWS FUNCTION • RUDRA CINEMA • MINIMALISM IS TRUTH • NO
            DISTRACTIONS • JUST FILM •
          </span>
        </div>
      </div>
    </main>
  );
}
