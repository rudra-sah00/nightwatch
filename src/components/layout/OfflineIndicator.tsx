'use client';

import { DownloadCloud, Wifi, WifiOff } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

export function OfflineIndicator() {
  const [isOffline, setIsOffline] = useState(false);
  // Ensure we get mounted correctly on client without hydration mismatch
  const [mounted, setMounted] = useState(false);
  const pathname = usePathname() || '';

  useEffect(() => {
    setMounted(true);
    if (!window.navigator.onLine) {
      setIsOffline(true);
    }

    const handleOffline = () => {
      setIsOffline(true);
      toast('You are offline', {
        icon: <WifiOff className="w-4 h-4 text-neo-red" />,
        style: {
          backgroundColor: '#09090b',
          color: '#ef4444',
          border: '2px solid #ef4444',
          fontWeight: 'bold',
        },
      });
    };

    const handleOnline = () => {
      setIsOffline(false);
      toast('Back online!', {
        icon: <Wifi className="w-4 h-4 text-neo-green" />,
        style: {
          backgroundColor: '#09090b',
          color: '#22c55e',
          border: '2px solid #22c55e',
          fontWeight: 'bold',
        },
      });
    };

    window.addEventListener('offline', handleOffline);
    window.addEventListener('online', handleOnline);

    return () => {
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online', handleOnline);
    };
  }, []);

  if (!mounted) return null;

  // Do not show the overlay inside any player routes
  const isPlayerRoute =
    pathname.startsWith('/watch') ||
    pathname.startsWith('/live') ||
    pathname.startsWith('/movie') ||
    pathname.startsWith('/webseries');

  if (!isOffline || isPlayerRoute) {
    return null;
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 animate-in slide-in-from-bottom-8 fade-in duration-300">
      <Link
        href="/downloads"
        className="flex items-center justify-center gap-3 bg-neo-yellow text-black px-6 py-4 rounded-xl border-[4px] border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-1 hover:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] active:translate-y-0 active:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all font-headline font-black uppercase tracking-widest"
      >
        <DownloadCloud className="w-6 h-6 stroke-[3px]" />
        Go to Offline Downloads
      </Link>
    </div>
  );
}
