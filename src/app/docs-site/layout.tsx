import Link from 'next/link';

export default function DocsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#f5f0e8] text-zinc-900 font-sans">
      <header className="sticky top-0 z-50 w-full border-b-4 border-black bg-[#ffcc00] px-6 py-4 shadow-[4px_4px_0px_#1a1a1a]">
        <div className="flex items-center gap-4">
          <Link
            href="/"
            className="text-xl font-black uppercase tracking-tight text-black"
          >
            Watch Rudra Docs
          </Link>
          <span className="rounded-full border-2 border-black bg-white px-2 py-0.5 text-xs font-bold shadow-[2px_2px_0px_#1a1a1a]">
            v1.16
          </span>
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-7xl px-4 py-8 md:px-8">
        <aside className="hidden w-64 flex-col border-r-4 border-black pr-6 md:flex">
          <nav className="sticky top-28 flex flex-col space-y-4 font-bold uppercase">
            <Link
              href="/"
              className="hover:text-amber-500 hover:underline underline-offset-4 decoration-4"
            >
              Setup Guide
            </Link>
            <Link
              href="/ARCHITECTURE"
              className="hover:text-amber-500 hover:underline underline-offset-4 decoration-4"
            >
              Architecture
            </Link>
            <Link
              href="/FEATURES"
              className="hover:text-amber-500 hover:underline underline-offset-4 decoration-4"
            >
              Features
            </Link>
            <div className="ml-4 flex flex-col space-y-2 border-l-4 border-black pl-4 text-sm mt-2">
              <Link
                href="/features/AUTHENTICATION"
                className="hover:text-amber-500"
              >
                Authentication
              </Link>
              <Link href="/features/PROFILE" className="hover:text-amber-500">
                Profile
              </Link>
              <Link href="/features/SEARCH" className="hover:text-amber-500">
                Search
              </Link>
              <Link href="/features/WATCH" className="hover:text-amber-500">
                Watch
              </Link>
              <Link
                href="/features/WATCH_PARTY"
                className="hover:text-amber-500"
              >
                Watch Party
              </Link>
              <Link href="/features/WATCHLIST" className="hover:text-amber-500">
                Watchlist
              </Link>
              <Link
                href="/features/LIVESTREAM"
                className="hover:text-amber-500"
              >
                Livestream
              </Link>
            </div>
            <Link
              href="/STATE_MANAGEMENT"
              className="hover:text-amber-500 hover:underline underline-offset-4 decoration-4"
            >
              State Management
            </Link>
            <Link
              href="/API_LAYER"
              className="hover:text-amber-500 hover:underline underline-offset-4 decoration-4"
            >
              API Layer
            </Link>
            <Link
              href="/TESTING"
              className="hover:text-amber-500 hover:underline underline-offset-4 decoration-4"
            >
              Testing
            </Link>
            <Link
              href="/UI_GUIDELINES"
              className="hover:text-amber-500 hover:underline underline-offset-4 decoration-4"
            >
              UI Guidelines
            </Link>
          </nav>
        </aside>

        <main className="flex-1 px-4 md:px-12">{children}</main>
      </div>
    </div>
  );
}
