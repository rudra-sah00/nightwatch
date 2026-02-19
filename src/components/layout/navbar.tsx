import { Bookmark, User } from 'lucide-react';
import Link from 'next/link';

import { Avatar } from '@/components/ui/avatar';
import { SearchInput } from '@/features/search/components/search-input';
import { useAuth } from '@/providers/auth-provider';

export function Navbar() {
  const { user } = useAuth();

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/80 backdrop-blur-xl">
      <div className="container mx-auto px-4 h-20 flex items-center justify-between gap-8">
        {/* Search Bar - Main Focus */}
        <div className="flex-1 max-w-3xl mx-auto">
          <SearchInput />
        </div>

        {/* User Actions */}
        <div className="flex items-center gap-4 min-w-fit">
          {user && (
            <Link
              href="/watchlist"
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors group p-2 rounded-full hover:bg-white/5"
              title="My Watchlist"
            >
              <Bookmark className="w-5 h-5 group-hover:text-primary transition-colors" />
            </Link>
          )}
          <Link
            href="/profile"
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors group"
          >
            <Avatar
              src={user?.profilePhoto}
              alt={user?.name}
              fallback={<User className="w-5 h-5" />}
              className="w-9 h-9 border border-border group-hover:border-primary/30 transition-colors"
            />
          </Link>
        </div>
      </div>
    </header>
  );
}
