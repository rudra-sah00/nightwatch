'use client';

import { Monitor, Moon, Sun } from 'lucide-react';
import { cn } from '@/lib/utils';
import { type Theme, useTheme } from '@/providers/theme-provider';

const themes: { value: Theme; label: string; icon: typeof Sun }[] = [
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'dark', label: 'Dark', icon: Moon },
  { value: 'system', label: 'System', icon: Monitor },
];

export function ThemeSwitcher() {
  const { theme, setTheme, resolvedTheme } = useTheme();

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-medium mb-1">Appearance</h3>
        <p className="text-xs text-muted-foreground">
          Choose how Watch Rudra looks to you. Select a single theme, or sync
          with your system settings.
        </p>
      </div>

      <div className="flex gap-3">
        {themes.map(({ value, label, icon: Icon }) => (
          <button
            key={value}
            type="button"
            onClick={() => setTheme(value)}
            className={cn(
              'flex-1 flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all duration-200',
              theme === value
                ? 'border-primary bg-primary/5 shadow-sm'
                : 'border-border hover:border-primary/50 hover:bg-muted/50',
            )}
          >
            <div
              className={cn(
                'p-3 rounded-full transition-colors',
                theme === value
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground',
              )}
            >
              <Icon className="w-5 h-5" />
            </div>
            <span
              className={cn(
                'text-sm font-medium',
                theme === value ? 'text-foreground' : 'text-muted-foreground',
              )}
            >
              {label}
            </span>
          </button>
        ))}
      </div>

      {theme === 'system' && (
        <p className="text-xs text-muted-foreground text-center">
          Currently using{' '}
          <span className="font-medium text-foreground">{resolvedTheme}</span>{' '}
          mode based on your system settings.
        </p>
      )}
    </div>
  );
}
