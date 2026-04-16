'use client';

import { DownloadCloud, Moon, Power, Sun } from 'lucide-react';
import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { useTheme } from '@/providers/theme-provider';

export function AppPreferences() {
  const { theme, setTheme } = useTheme();
  const isDark = theme === 'dark';

  const [runOnBoot, setRunOnBoot] = useState(false);
  const [downloadQuality, setDownloadQuality] = useState<
    'low' | 'medium' | 'high'
  >('high');
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && window.electronAPI) {
      setIsDesktop(true);
      // Fetch initial state from the electron native store
      window.electronAPI.storeGet('runOnBoot').then((val: unknown) => {
        if (typeof val === 'boolean') setRunOnBoot(val);
      });
      window.electronAPI.storeGet('downloadQuality').then((val: unknown) => {
        if (val === 'low' || val === 'medium' || val === 'high') {
          setDownloadQuality(val);
        }
      });
    }
  }, []);

  const handleToggleRunOnBoot = () => {
    const newValue = !runOnBoot;
    setRunOnBoot(newValue);
    if (window.electronAPI?.setRunOnBoot) {
      window.electronAPI.setRunOnBoot(newValue);
      window.electronAPI.storeSet('runOnBoot', newValue);
    }
  };

  const handleQualityChange = (quality: 'low' | 'medium' | 'high') => {
    setDownloadQuality(quality);
    if (window.electronAPI) {
      window.electronAPI.storeSet('downloadQuality', quality);
    }
  };

  return (
    <section className="bg-card text-card-foreground border border-border rounded-xl shadow-sm p-8 mb-12">
      <h2 className="text-4xl font-black font-headline uppercase tracking-tighter mb-8">
        App Preferences
      </h2>

      <div className="flex flex-col gap-10 max-w-2xl">
        {/* Theme Settings */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div className="flex flex-col gap-2">
            <span className="font-headline font-bold uppercase tracking-widest text-muted-foreground text-sm">
              Theme Selection
            </span>
            <p className="text-muted-foreground font-body text-sm max-w-sm">
              Switch between light mode and dark mode for optimal viewing
              comfort.
            </p>
          </div>

          <button
            type="button"
            role="switch"
            aria-checked={isDark}
            onClick={() => setTheme(isDark ? 'light' : 'dark')}
            className="relative inline-flex h-8 w-16 items-center rounded-full bg-secondary transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background shrink-0"
          >
            <span className="sr-only">Toggle Dark Mode</span>
            <span
              className={cn(
                'inline-flex h-6 w-6 transform items-center justify-center rounded-full bg-background shadow transition-transform',
                isDark ? 'translate-x-9' : 'translate-x-1',
              )}
            >
              {isDark ? (
                <Moon className="h-3.5 w-3.5 text-foreground" />
              ) : (
                <Sun className="h-3.5 w-3.5 text-foreground" />
              )}
            </span>
          </button>
        </div>

        {/* Desktop Only Settings */}
        {isDesktop && (
          <>
            <div className="h-px bg-border w-full" />

            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
              <div className="flex flex-col gap-2">
                <span className="font-headline font-bold uppercase tracking-widest text-muted-foreground text-sm flex items-center gap-2">
                  <Power className="w-4 h-4 text-neo-blue" />
                  Launch on Startup
                </span>
                <p className="text-muted-foreground font-body text-sm max-w-sm">
                  Automatically start Watch Rudra silently in the background
                  when your computer boots up.
                </p>
              </div>

              <button
                type="button"
                role="switch"
                aria-checked={runOnBoot}
                onClick={handleToggleRunOnBoot}
                className={cn(
                  'relative inline-flex h-8 w-16 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background shrink-0',
                  runOnBoot ? 'bg-neo-blue' : 'bg-secondary',
                )}
              >
                <span className="sr-only">Toggle Launch on Boot</span>
                <span
                  className={cn(
                    'inline-flex h-6 w-6 transform items-center justify-center rounded-full bg-background shadow transition-transform',
                    runOnBoot ? 'translate-x-9' : 'translate-x-1',
                  )}
                />
              </button>
            </div>

            <div className="h-px bg-border w-full" />

            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
              <div className="flex flex-col gap-2">
                <span className="font-headline font-bold uppercase tracking-widest text-muted-foreground text-sm flex items-center gap-2">
                  <DownloadCloud className="w-4 h-4 text-neo-pink" />
                  Default Download Quality
                </span>
                <p className="text-muted-foreground font-body text-sm max-w-sm">
                  Choose the quality for offline downloads (Server 1 & 3). Lower
                  consumes less space, higher takes longer.
                </p>
              </div>

              <div className="flex flex-row p-1 bg-secondary rounded-lg border border-border">
                {(['low', 'medium', 'high'] as const).map((q) => (
                  <button
                    key={q}
                    type="button"
                    onClick={() => handleQualityChange(q)}
                    className={cn(
                      'px-4 py-1.5 text-xs font-bold uppercase tracking-widest rounded-md transition-colors',
                      downloadQuality === q
                        ? 'bg-background text-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground',
                    )}
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </section>
  );
}
