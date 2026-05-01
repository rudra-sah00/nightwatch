/**
 * Mobile download state — persistence and progress tracking.
 * Equivalent of electron/modules/downloads/state.js
 */
import { Preferences } from '@capacitor/preferences';
import type { DownloadItem } from '@/lib/electron-bridge';

const DOWNLOADS_KEY = 'nightwatch_downloads';
export const VAULT_DIR = 'OfflineVault';

type ProgressCallback = (item: DownloadItem) => void;
let progressListeners: ProgressCallback[] = [];

export const activeAbortControllers = new Map<string, AbortController>();

export async function loadDownloads(): Promise<DownloadItem[]> {
  const { value } = await Preferences.get({ key: DOWNLOADS_KEY });
  return value ? JSON.parse(value) : [];
}

export async function saveDownloads(items: DownloadItem[]): Promise<void> {
  await Preferences.set({ key: DOWNLOADS_KEY, value: JSON.stringify(items) });
}

export async function updateItem(
  contentId: string,
  update: Partial<DownloadItem>,
): Promise<DownloadItem | null> {
  const items = await loadDownloads();
  const idx = items.findIndex((i) => i.contentId === contentId);
  if (idx === -1) return null;
  items[idx] = { ...items[idx], ...update };
  await saveDownloads(items);
  notifyProgress(items[idx]);
  return items[idx];
}

export function notifyProgress(item: DownloadItem) {
  for (const cb of progressListeners) cb(item);
}

export function onProgress(cb: ProgressCallback): () => void {
  progressListeners.push(cb);
  return () => {
    progressListeners = progressListeners.filter((l) => l !== cb);
  };
}
