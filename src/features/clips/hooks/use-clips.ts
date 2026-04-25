'use client';

import { useCallback, useEffect, useState } from 'react';
import { deleteClip, getClips, renameClip } from '../api';
import type { Clip } from '../types';

export function useClips() {
  const [clips, setClips] = useState<Clip[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetch = useCallback(async (p = 1) => {
    setIsLoading(true);
    try {
      const res = await getClips(p);
      setClips(res.clips);
      setTotalPages(res.totalPages);
      setPage(p);
    } catch {
      /* silent */
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetch();
  }, [fetch]);

  const remove = useCallback(async (id: string) => {
    try {
      await deleteClip(id);
      setClips((prev) => prev.filter((c) => c.id !== id));
    } catch {
      /* silent */
    }
  }, []);

  const rename = useCallback(async (id: string, title: string) => {
    try {
      await renameClip(id, title);
      setClips((prev) => prev.map((c) => (c.id === id ? { ...c, title } : c)));
    } catch {
      /* silent */
    }
  }, []);

  const addClip = useCallback((clip: Clip) => {
    setClips((prev) => [clip, ...prev]);
  }, []);

  return { clips, isLoading, page, totalPages, fetch, remove, rename, addClip };
}
