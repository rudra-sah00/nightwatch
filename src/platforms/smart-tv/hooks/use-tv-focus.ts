'use client';

import {
  doesFocusableExist,
  getCurrentFocusKey,
  setFocus,
} from '@noriginmedia/norigin-spatial-navigation';
import { useEffect } from 'react';
import { FOCUS_KEYS } from '../lib/focus-keys';

const focusMemory = new Map<string, string>();

/**
 * Saves/restores focus key per page. Call in each TV page component.
 * Does NOT steal focus if user is currently in the sidebar.
 */
export function useTvFocus(pageKey: string, defaultFocusKey: string) {
  useEffect(() => {
    const current = getCurrentFocusKey();
    // Don't steal focus from sidebar — user just navigated from there
    if (current?.startsWith(FOCUS_KEYS.SIDEBAR)) return;

    const saved = focusMemory.get(pageKey);
    const target = saved && doesFocusableExist(saved) ? saved : defaultFocusKey;
    const t = setTimeout(() => {
      if (doesFocusableExist(target)) setFocus(target);
    }, 50);

    return () => {
      clearTimeout(t);
      const leaving = getCurrentFocusKey();
      if (leaving) focusMemory.set(pageKey, leaving);
    };
  }, [pageKey, defaultFocusKey]);
}
