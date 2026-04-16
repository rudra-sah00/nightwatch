import { DownloadCloud, History, Plus, Radio, User } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useDesktopApp } from '@/hooks/use-desktop-app';
import { useAuth } from '@/providers/auth-provider';

export function Navbar() {
  const { user } = useAuth();
  const pathname = usePathname();
  const { isDesktopApp, isMacOS, isWindows } = useDesktopApp();
  const _isHome = pathname === '/home';

  return (
    <nav
      className={`sticky [-webkit-app-region:drag] top-0 z-50 w-full bg-background text-foreground border-b-[3px] border-border`}
    >
      <div
        className={`flex justify-between items-center w-full max-w-5xl mx-auto px-4 sm:px-6 h-20 relative gap-4 ${isDesktopApp && isMacOS ? 'pl-20' : ''} ${isDesktopApp && isWindows ? 'pr-32' : ''}`}
      >
        {/* Left Side: Brand Logo */}
        <div className="flex-1 flex justify-start items-center">
          <Link
            href="/home"
            className="flex items-center gap-2 [-webkit-app-region:no-drag]"
            title="Home"
          >
            {/* Mobile: Play Icon */}
            <div className="md:hidden w-10 h-10 border border-border bg-neo-yellow flex items-center justify-center rounded-md hover:bg-neo-yellow/80 transition-colors shrink-0">
              <img
                src="/play.ico"
                alt="Watch Rudra Logo"
                width={24}
                height={24}
                className="w-6 h-6 object-contain"
              />
            </div>
            {/* Desktop: Text Logo */}
            <span className="hidden md:block text-2xl md:text-3xl font-black italic tracking-tighter text-foreground font-headline uppercase whitespace-nowrap">
              WATCH RUDRA
            </span>
          </Link>
        </div>

        {/* Middle: Global Navigation - Icons only on mobile, text only on desktop */}
        <div className="flex items-center justify-center gap-6 sm:gap-8 font-headline uppercase font-bold tracking-tighter text-sm md:text-base md:flex-1">
          <Link
            href="/continue-watching"
            className="text-foreground/70 [-webkit-app-region:no-drag] hover:text-foreground transition-colors flex items-center gap-2 group"
            title="Continue Watching"
          >
            <History className="md:hidden w-5 h-5 sm:w-6 sm:h-6 stroke-[3px] group-hover:scale-110" />
            <span className="hidden md:inline">Continue</span>
          </Link>
          <Link
            href="/live"
            className="text-foreground/70 [-webkit-app-region:no-drag] hover:text-foreground transition-colors flex items-center gap-2 group"
            title="Live Matches"
          >
            <Radio className="md:hidden w-5 h-5 sm:w-6 sm:h-6 stroke-[3px] group-hover:scale-110" />
            <span className="hidden md:inline">Live</span>
          </Link>
          <Link
            href="/watchlist"
            className="text-foreground/70 [-webkit-app-region:no-drag] hover:text-foreground transition-colors flex items-center gap-2 group"
            title="Watchlist"
          >
            <Plus className="md:hidden w-5 h-5 sm:w-6 sm:h-6 stroke-[3px] group-hover:scale-110" />
            <span className="hidden md:inline">Watchlist</span>
          </Link>
          {isDesktopApp && (
            <Link
              href="/downloads"
              className="text-foreground/70 [-webkit-app-region:no-drag] hover:text-foreground transition-colors flex items-center gap-2 group"
              title="Offline Downloads"
            >
              <DownloadCloud className="md:hidden w-5 h-5 sm:w-6 sm:h-6 stroke-[3px] group-hover:scale-110" />
              <span className="hidden md:inline">Downloads</span>
            </Link>
          )}
        </div>

        {/* Right Side: Profile */}
        <div className="flex-1 flex justify-end items-center shrink-0 gap-3">
          <Link
            href="/profile"
            className="flex flex-col items-center [-webkit-app-region:no-drag] justify-center gap-1 hover:bg-black/5 text-foreground rounded-lg px-3 py-1.5 transition-colors min-w-[72px]"
            title="Profile"
          >
            <div className="relative w-6 h-6 shrink-0 flex items-center justify-center overflow-hidden">
              {user?.profilePhoto ? (
                <Image
                  src={user.profilePhoto}
                  alt={user?.name || 'Profile'}
                  fill
                  sizes="32px"
                  className="object-cover rounded-full"
                />
              ) : (
                <User className="w-5 h-5 text-foreground" />
              )}
            </div>
            <span className="font-headline font-black uppercase text-[10px] hidden sm:block tracking-widest leading-none mt-0.5">
              Profile
            </span>
          </Link>
        </div>
      </div>
    </nav>
  );
}
