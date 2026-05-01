'use client';

import type React from 'react';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { checkIsDesktop, desktopBridge } from '@/lib/electron-bridge';
import { initStorageCache } from '@/lib/storage-cache';

/** Supported theme values. `'system'` follows the OS preference. */
type Theme = 'light' | 'dark' | 'system';

/** Props accepted by {@link ThemeProvider}. */
interface ThemeProviderProps {
  children: React.ReactNode;
  /** Initial theme used before localStorage is read. Defaults to `'light'`. */
  defaultTheme?: Theme;
}

const ThemeContext = createContext<{
  theme: Theme;
  setTheme: (theme: Theme) => void;
}>({
  theme: 'light',
  setTheme: () => null,
});

/**
 * Provides application-wide light/dark/system theme state.
 *
 * On mount it reads the persisted theme from `localStorage('neo-theme')`,
 * applies the corresponding `dark` class to `<html>`, and syncs the Electron
 * native title-bar theme when running on desktop.
 *
 * Listens to OS `prefers-color-scheme` changes when in `'system'` mode.
 */
export function ThemeProvider({
  children,
  defaultTheme = 'light',
}: ThemeProviderProps) {
  const [theme, setThemeState] = useState<Theme>(defaultTheme);

  useEffect(() => {
    initStorageCache();
    const savedTheme = localStorage.getItem('neo-theme') as Theme | null;
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const initialTheme = savedTheme || 'system';
    setThemeState(initialTheme);

    const resolved =
      initialTheme === 'system'
        ? mediaQuery.matches
          ? 'dark'
          : 'light'
        : initialTheme;

    if (resolved === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }

    if (checkIsDesktop()) {
      desktopBridge.setNativeTheme(
        initialTheme === 'system' ? 'system' : resolved,
      );
    }

    // Listen for OS theme changes when in system mode
    const handleChange = () => {
      if ((localStorage.getItem('neo-theme') || 'system') === 'system') {
        if (mediaQuery.matches) {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
        }
      }
    };
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  const setTheme = useCallback((newTheme: Theme) => {
    setThemeState(newTheme);
    localStorage.setItem('neo-theme', newTheme);

    const resolved =
      newTheme === 'system'
        ? window.matchMedia('(prefers-color-scheme: dark)').matches
          ? 'dark'
          : 'light'
        : newTheme;

    if (resolved === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }

    if (checkIsDesktop()) {
      desktopBridge.setNativeTheme(newTheme === 'system' ? 'system' : resolved);
    }
  }, []);

  const value = useMemo(() => ({ theme, setTheme }), [theme, setTheme]);

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

/**
 * Consume the current theme and its setter from the nearest {@link ThemeProvider}.
 *
 * @returns `{ theme, setTheme }` — the active theme value and a function to change it.
 */
export const useTheme = () => useContext(ThemeContext);
