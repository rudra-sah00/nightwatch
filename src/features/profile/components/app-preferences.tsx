'use client';

import { Moon, Sun } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTheme } from '@/providers/theme-provider';

export function AppPreferences() {
  const { theme, setTheme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <section className="bg-card text-card-foreground border border-border rounded-xl shadow-sm p-8 mb-12">
      <h2 className="text-4xl font-black font-headline uppercase tracking-tighter mb-8">
        App Preferences
      </h2>

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 max-w-2xl">
        <div className="flex flex-col gap-2">
          <span className="font-headline font-bold uppercase tracking-widest text-muted-foreground text-sm">
            Theme Selection
          </span>
          <p className="text-muted-foreground font-body text-sm max-w-sm">
            Switch between light mode and dark mode for optimal viewing comfort.
          </p>
        </div>

        <button
          type="button"
          role="switch"
          aria-checked={isDark}
          onClick={() => setTheme(isDark ? 'light' : 'dark')}
          className="relative inline-flex h-8 w-16 items-center rounded-full bg-secondary transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background"
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
    </section>
  );
}
