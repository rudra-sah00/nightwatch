'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { isAuthenticated } from '@/services/api/client';

export default function NotFound() {
    const router = useRouter();

    useEffect(() => {
        // Check if user is logged in using the local storage token
        const loggedIn = isAuthenticated();

        if (loggedIn) {
            // If logged in, go to home
            router.replace('/');
        } else {
            // If not logged in, go to login
            router.replace('/login');
        }
    }, [router]);

    // Show a minimal loading state while redirecting
    return (
        <div className="min-h-screen bg-black flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-zinc-500"></div>
        </div>
    );
}
