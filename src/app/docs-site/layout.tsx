import Link from 'next/link';

export default function DocsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-black text-zinc-300 font-sans selection:bg-amber-500/30">
      <header className="sticky top-0 z-50 w-full border-b border-white/10 bg-black/80 backdrop-blur-xl px-6 py-4">
        <div className="flex items-center gap-4">
          <Link
            href="/docs-site"
            className="text-xl font-bold tracking-tight text-white hover:text-amber-500 transition-colors"
          >
            Watch Rudra Docs
          </Link>
          <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs font-medium text-white/80">
            v1.16
          </span>
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-7xl px-4 py-8 md:px-8">
        <aside className="hidden w-64 flex-col border-r border-white/10 pr-6 md:flex">
          <nav className="sticky top-28 flex flex-col space-y-3 font-medium text-sm">
            <Link
              href="/docs-site"
              className="text-zinc-400 hover:text-white transition-colors"
            >
              Setup Guide
            </Link>
            <Link
              href="/docs-site/ARCHITECTURE"
              className="text-zinc-400 hover:text-white transition-colors"
            >
              Architecture
            </Link>
            <Link
              href="/docs-site/FEATURES"
              className="text-zinc-400 hover:text-white transition-colors"
            >
              Features
            </Link>
            <div className="ml-4 flex flex-col space-y-2 border-l border-white/10 pl-4 py-1 text-sm mt-1">
              <Link
                href="/docs-site/features/AUTHENTICATION"
                className="text-zinc-500 hover:text-white transition-colors"
              >
                Authentication
              </Link>
              <Link
                href="/docs-site/features/PROFILE"
                className="text-zinc-500 hover:text-white transition-colors"
              >
                Profile
              </Link>
              <Link
                href="/docs-site/features/SEARCH"
                className="text-zinc-500 hover:text-white transition-colors"
              >
                Search
              </Link>
              <Link
                href="/docs-site/features/WATCH"
                className="text-zinc-500 hover:text-white transition-colors"
              >
                Watch
              </Link>
              <Link
                href="/docs-site/features/WATCH_PARTY"
                className="text-zinc-500 hover:text-white transition-colors"
              >
                Watch Party
              </Link>
              <Link
                href="/docs-site/features/WATCHLIST"
                className="text-zinc-500 hover:text-white transition-colors"
              >
                Watchlist
              </Link>
              <Link
                href="/docs-site/features/LIVESTREAM"
                className="text-zinc-500 hover:text-white transition-colors"
              >
                Livestream
              </Link>
            </div>
            <Link
              href="/docs-site/STATE_MANAGEMENT"
              className="text-zinc-400 hover:text-white transition-colors pt-2"
            >
              State Management
            </Link>
            <Link
              href="/docs-site/API_LAYER"
              className="text-zinc-400 hover:text-white transition-colors"
            >
              API Layer
            </Link>
            <Link
              href="/docs-site/TESTING"
              className="text-zinc-400 hover:text-white transition-colors"
            >
              Testing
            </Link>
            <Link
              href="/docs-site/UI_GUIDELINES"
              className="text-zinc-400 hover:text-white transition-colors"
            >
              UI Guidelines
            </Link>
          </nav>
        </aside>

        <main className="flex-1 overflow-x-hidden px-4 md:px-12">
          {children}
        </main>
      </div>
    </div>
  );
}
