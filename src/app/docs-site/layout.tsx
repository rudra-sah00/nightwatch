// Using regular <a> tags here instead of next/link because the docs are rendered
// under a subdomain (docs.watch...) which uses a Next.js middleware proxy rewrite.
// Client-side Next.js Navigation <Link> components will 404 because they don't know
// that /ARCHITECTURE is actually /docs-site/ARCHITECTURE internally. Full page loads fix this.

export default function DocsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-black text-zinc-300 font-sans selection:bg-amber-500/30">
      <header className="sticky top-0 z-50 w-full border-b border-white/10 bg-black/80 backdrop-blur-xl px-6 py-4">
        <div className="flex items-center gap-4">
          <a
            href="/"
            className="text-xl font-bold tracking-tight text-white hover:text-amber-500 transition-colors"
          >
            Watch Rudra Docs
          </a>
          <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs font-medium text-white/80">
            v1.16
          </span>
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-7xl px-4 py-8 md:px-8">
        <aside className="hidden w-64 flex-col border-r border-white/10 pr-6 md:flex">
          <nav className="sticky top-28 flex flex-col space-y-3 font-medium text-sm">
            <a
              href="/"
              className="text-zinc-400 hover:text-white transition-colors"
            >
              Setup Guide
            </a>
            <a
              href="/ARCHITECTURE"
              className="text-zinc-400 hover:text-white transition-colors"
            >
              Architecture
            </a>
            <div className="ml-4 flex flex-col space-y-2 border-l border-white/10 pl-4 py-1 text-sm mt-1">
              <a
                href="/CONTRIBUTING"
                className="text-zinc-500 hover:text-white transition-colors"
              >
                Contributing
              </a>
              <a
                href="/STREAMING"
                className="text-zinc-500 hover:text-white transition-colors"
              >
                Streaming Engine
              </a>
              <a
                href="/WEB_SOCKETS"
                className="text-zinc-500 hover:text-white transition-colors"
              >
                WebSockets
              </a>
            </div>
            <a
              href="/FEATURES"
              className="text-zinc-400 hover:text-white transition-colors pt-2"
            >
              Features
            </a>
            <div className="ml-4 flex flex-col space-y-2 border-l border-white/10 pl-4 py-1 text-sm mt-1">
              <a
                href="/features/AUTHENTICATION"
                className="text-zinc-500 hover:text-white transition-colors"
              >
                Authentication
              </a>
              <a
                href="/features/PROFILE"
                className="text-zinc-500 hover:text-white transition-colors"
              >
                Profile
              </a>
              <a
                href="/features/SEARCH"
                className="text-zinc-500 hover:text-white transition-colors"
              >
                Search
              </a>
              <a
                href="/features/WATCH"
                className="text-zinc-500 hover:text-white transition-colors"
              >
                Watch
              </a>
              <a
                href="/features/WATCH_PARTY"
                className="text-zinc-500 hover:text-white transition-colors"
              >
                Watch Party
              </a>
              <a
                href="/features/WATCHLIST"
                className="text-zinc-500 hover:text-white transition-colors"
              >
                Watchlist
              </a>
              <a
                href="/features/LIVESTREAM"
                className="text-zinc-500 hover:text-white transition-colors"
              >
                Livestream
              </a>
            </div>
            <a
              href="/STATE_MANAGEMENT"
              className="text-zinc-400 hover:text-white transition-colors pt-2"
            >
              State Management
            </a>
            <a
              href="/API_LAYER"
              className="text-zinc-400 hover:text-white transition-colors"
            >
              API Layer
            </a>
            <a
              href="/TESTING"
              className="text-zinc-400 hover:text-white transition-colors"
            >
              Testing
            </a>
            <a
              href="/UI_GUIDELINES"
              className="text-zinc-400 hover:text-white transition-colors"
            >
              UI Guidelines
            </a>
            <a
              href="/DESKTOP"
              className="text-zinc-400 hover:text-white transition-colors mt-4 pt-4 border-t border-white/10"
            >
              Desktop Application
            </a>
          </nav>
        </aside>

        <main className="flex-1 overflow-x-hidden px-4 md:px-12">
          {children}
        </main>
      </div>
    </div>
  );
}
