import { Bookmark, User } from 'lucide-react';
import Link from 'next/link';

import { Avatar } from '@/components/ui/avatar';

import { SearchInput } from '@/features/search/components/search-input';
import { useAuth } from '@/providers/auth-provider';

interface NavbarProps {
  isLoading?: boolean;
}

export function Navbar({ isLoading }: NavbarProps) {
  const { user } = useAuth();

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/80 backdrop-blur-xl">
      <div className="container mx-auto px-4 h-20 flex items-center justify-center gap-4 md:gap-8 max-w-4xl">
        {/* Search Bar - Main Focus */}
        <div className="flex-1 min-w-0">
          <SearchInput isLoading={isLoading} />
        </div>

        {/* User Actions */}
        <div className="flex items-center gap-3 md:gap-4 shrink-0">
          <Link
            href="/live?sportType=basketball"
            className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-red-500 transition-colors group p-2 rounded-full hover:bg-white/5"
            title="Live TV"
          >
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse group-hover:bg-red-400" />
            <span className="hidden sm:inline">Live TV</span>
          </Link>
          {user ? (
            <Link
              href="/watchlist"
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors group p-2 rounded-full hover:bg-white/5"
              title="My Watchlist"
            >
              <Bookmark className="w-5 h-5 group-hover:text-primary transition-colors" />
            </Link>
          ) : null}
          <Link
            href="/profile"
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors group"
          >
            <Avatar
              src={user?.profilePhoto}
              alt={user?.name}
              fallback={<User className="w-5 h-5" />}
              className="w-9 h-9 border border-border group-hover:border-primary/30 transition-colors shadow-sm"
            />
          </Link>
        </div>
      </div>
    </header>
  );
}
