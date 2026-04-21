'use client';

import { Wifi, WifiOff } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

export function OfflineIndicator() {
  const t = useTranslations('common.offline');
  const [isOffline, setIsOffline] = useState(false);
  const [dismissed, _setDismissed] = useState(false);
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
      toast(t('toastOffline'), {
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
      toast(t('toastOnline'), {
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
  }, [t]);

  if (!mounted) return null;

  // Do not show the overlay inside any player routes
  const isPlayerRoute =
    pathname.startsWith('/watch/') ||
    pathname.startsWith('/watch-party/') ||
    pathname.startsWith('/live/');

  if (!isOffline || isPlayerRoute || dismissed) {
    return null;
  }

  // Floating indicator removed per user request
  return null;
}
