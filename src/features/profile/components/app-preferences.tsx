'use client';

import { Activity, Monitor, Moon, Power, Sun, Zap } from 'lucide-react';
import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { useTheme } from '@/providers/theme-provider';

export function AppPreferences() {
  const { theme, setTheme } = useTheme();

  const [runOnBoot, setRunOnBoot] = useState(false);

  const [concurrentDownloads, setConcurrentDownloads] = useState<number>(3);
  const [downloadSpeedLimit, setDownloadSpeedLimit] = useState<number>(0);
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && window.electronAPI) {
      setIsDesktop(true);
      // Fetch initial state from the electron native store
      window.electronAPI.storeGet('runOnBoot').then((val: unknown) => {
        if (typeof val === 'boolean') setRunOnBoot(val);
      });

      window.electronAPI
        .storeGet('concurrentDownloads')
        .then((val: unknown) => {
          if (typeof val === 'number') setConcurrentDownloads(val);
        });
      window.electronAPI.storeGet('downloadSpeedLimit').then((val: unknown) => {
        if (typeof val === 'number') setDownloadSpeedLimit(val);
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

  const handleConcurrentChange = (val: number) => {
    setConcurrentDownloads(val);
    if (window.electronAPI)
      window.electronAPI.storeSet('concurrentDownloads', val);
  };

  const handleSpeedChange = (val: number) => {
    setDownloadSpeedLimit(val);
    if (window.electronAPI)
      window.electronAPI.storeSet('downloadSpeedLimit', val);
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

          <div
            role="radiogroup"
            aria-label="Theme selection"
            className="flex flex-row p-1 bg-secondary rounded-lg border border-border shrink-0"
          >
            {[
              { id: 'light' as const, label: 'Light', Icon: Sun },
              { id: 'dark' as const, label: 'Dark', Icon: Moon },
              { id: 'system' as const, label: 'System', Icon: Monitor },
            ].map(({ id, label, Icon }) => (
              <button
                key={id}
                type="button"
                role="radio"
                aria-checked={theme === id}
                onClick={() => setTheme(id)}
                className={cn(
                  'px-3 py-1.5 text-xs font-bold uppercase tracking-widest rounded-md transition-colors flex items-center gap-1.5',
                  theme === id
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                <Icon className="w-3.5 h-3.5" />
                {label}
              </button>
            ))}
          </div>
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
                  <Activity className="w-4 h-4 text-neo-yellow" />
                  Max Concurrent Downloads
                </span>
                <p className="text-muted-foreground font-body text-sm max-w-sm">
                  How many movies or episodes can be downloaded at the same
                  time. Default is 3.
                </p>
              </div>

              <div
                role="radiogroup"
                aria-label="Max concurrent downloads"
                className="flex flex-row p-1 bg-secondary rounded-lg border border-border"
              >
                {[1, 2, 3, 5].map((val) => (
                  <button
                    key={val}
                    type="button"
                    role="radio"
                    aria-checked={concurrentDownloads === val}
                    onClick={() => handleConcurrentChange(val)}
                    className={cn(
                      'px-4 py-1.5 text-xs font-bold uppercase tracking-widest rounded-md transition-colors',
                      concurrentDownloads === val
                        ? 'bg-background text-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground',
                    )}
                  >
                    {val}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
              <div className="flex flex-col gap-2">
                <span className="font-headline font-bold uppercase tracking-widest text-muted-foreground text-sm flex items-center gap-2">
                  <Zap className="w-4 h-4 text-neo-green" />
                  Download Speed Limit
                </span>
                <p className="text-muted-foreground font-body text-sm max-w-sm">
                  Restrict the background download speed. Helpful if your
                  network slows down globally!
                </p>
              </div>

              <div
                role="radiogroup"
                aria-label="Download speed limit"
                className="flex flex-row p-1 bg-secondary rounded-lg border border-border overflow-x-auto min-w-0 max-w-[250px] sm:max-w-none"
              >
                {[
                  { label: 'Unlimited', val: 0 },
                  { label: '1 MB/s', val: 1 },
                  { label: '3 MB/s', val: 3 },
                  { label: '10 MB/s', val: 10 },
                ].map((opt) => (
                  <button
                    key={opt.val}
                    type="button"
                    role="radio"
                    aria-checked={downloadSpeedLimit === opt.val}
                    onClick={() => handleSpeedChange(opt.val)}
                    className={cn(
                      'px-4 py-1.5 text-xs font-bold uppercase tracking-widest rounded-md transition-colors whitespace-nowrap',
                      downloadSpeedLimit === opt.val
                        ? 'bg-background text-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground',
                    )}
                  >
                    {opt.label}
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
