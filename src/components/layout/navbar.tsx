'use client';

import Link from 'next/link';
import { SearchInput } from '@/features/search/components/search-input';
import { Button } from '@/components/ui';
import { Avatar } from '@/components/ui/avatar';
import { useAuth } from '@/providers/auth-provider';
import { LogOut, User } from 'lucide-react';

export function Navbar() {
    const { logout, user } = useAuth();

    return (
        <header className="sticky top-0 z-50 w-full border-b border-white/5 bg-black/50 backdrop-blur-xl">
            <div className="container mx-auto px-4 h-20 flex items-center justify-between gap-8">
                {/* Search Bar - Main Focus */}
                <div className="flex-1 max-w-3xl mx-auto">
                    <SearchInput />
                </div>

                {/* User Actions */}
                <div className="flex items-center gap-4 min-w-fit">
                    <Link href="/profile" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-white transition-colors group">
                        <Avatar
                            src={user?.profilePhoto}
                            alt={user?.name}
                            fallback={<User className="w-5 h-5" />}
                            className="w-9 h-9 border border-white/10 group-hover:border-white/30 transition-colors"
                        />
                    </Link>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={logout}
                        className="text-muted-foreground hover:text-white"
                    >
                        <LogOut className="w-5 h-5" />
                    </Button>
                </div>
            </div>
        </header>
    );
}
