'use client';

import { useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';

interface AuthGuardProps {
    children: React.ReactNode;
}

export function AuthGuard({ children }: AuthGuardProps) {
    const { isLoggedIn, isLoading } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!isLoading && !isLoggedIn) {
            router.push('/login');
        }
    }, [isLoggedIn, isLoading, router]);

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-black">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-8 h-8 border-2 border-zinc-700 border-t-white rounded-full animate-spin" />
                    <p className="text-zinc-500 text-sm">Loading...</p>
                </div>
            </div>
        );
    }

    if (!isLoggedIn) {
        return null;
    }

    return <>{children}</>;
}
