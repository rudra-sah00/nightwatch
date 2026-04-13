'use client';

import type React from 'react';
import { createContext, useContext, useEffect, useState } from 'react';

type Theme = 'light' | 'dark';

interface ThemeProviderProps {
  children: React.ReactNode;
  defaultTheme?: Theme;
}

const ThemeContext = createContext<{
  theme: Theme;
  setTheme: (theme: Theme) => void;
}>({
  theme: 'light',
  setTheme: () => null,
});

export function ThemeProvider({
  children,
  defaultTheme = 'light',
}: ThemeProviderProps) {
  const [theme, setThemeState] = useState<Theme>(defaultTheme);

  useEffect(() => {
    const savedTheme = localStorage.getItem('neo-theme') as Theme | null;
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const initialTheme = savedTheme || (mediaQuery.matches ? 'dark' : 'light');
    setThemeState(initialTheme);

    if (initialTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }

    // Sync initial theme with electron window if in desktop app
    if (typeof window !== 'undefined' && window.electronAPI?.setNativeTheme) {
      window.electronAPI.setNativeTheme(initialTheme);
    }
  }, []);

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
    localStorage.setItem('neo-theme', newTheme);
    if (newTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }

    // Sync live theme switch with electron window
    if (typeof window !== 'undefined' && window.electronAPI?.setNativeTheme) {
      window.electronAPI.setNativeTheme(newTheme);
    }
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
