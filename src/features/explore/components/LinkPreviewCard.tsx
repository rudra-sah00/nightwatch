'use client';

import { ExternalLink } from 'lucide-react';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import { fetchLinkPreview, type LinkPreview } from '@/features/explore/api';

// In-memory cache + concurrency control for link previews
const previewCache = new Map<string, LinkPreview | null>();
let activeRequests = 0;
const MAX_CONCURRENT = 3;
const pendingQueue: (() => void)[] = [];

function runNext() {
  if (activeRequests < MAX_CONCURRENT && pendingQueue.length) {
    pendingQueue.shift()?.();
  }
}

async function cachedFetchPreview(url: string): Promise<LinkPreview | null> {
  if (previewCache.has(url)) return previewCache.get(url)!;
  // Wait for slot
  if (activeRequests >= MAX_CONCURRENT) {
    await new Promise<void>((resolve) => pendingQueue.push(resolve));
  }
  activeRequests++;
  try {
    const result = await fetchLinkPreview(url);
    previewCache.set(url, result);
    return result;
  } finally {
    activeRequests--;
    runNext();
  }
}

/** Detects URLs in text and renders OG card for the first one */
export function LinkPreviewCard({ content }: { content: string }) {
  const [preview, setPreview] = useState<LinkPreview | null>(null);

  const url = extractFirstUrl(content);

  useEffect(() => {
    if (!url) return;
    let cancelled = false;
    cachedFetchPreview(url)
      .then((p) => {
        if (!cancelled) setPreview(p);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [url]);

  if (!preview || !preview.title) return null;

  const safeUrl =
    preview.url && /^https?:\/\//i.test(preview.url) ? preview.url : undefined;
  if (!safeUrl) return null;

  return (
    <a
      href={safeUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="mt-3 flex overflow-hidden border border-border rounded-xl hover:bg-muted/30 transition-colors group"
    >
      {preview.image && (
        <div className="w-24 h-24 shrink-0 bg-muted">
          <Image
            src={preview.image}
            alt=""
            width={96}
            height={96}
            className="w-full h-full object-cover"
          />
        </div>
      )}
      <div className="flex-1 min-w-0 p-3 flex flex-col justify-center">
        {preview.siteName && (
          <p className="text-[10px] uppercase tracking-wider text-foreground/40 mb-0.5">
            {preview.siteName}
          </p>
        )}
        <p className="text-sm font-bold truncate">{preview.title}</p>
        {preview.description && (
          <p className="text-xs text-foreground/60 line-clamp-2 mt-0.5">
            {preview.description}
          </p>
        )}
      </div>
      <div className="p-3 flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
        <ExternalLink className="w-4 h-4 text-foreground/40" />
      </div>
    </a>
  );
}

function extractFirstUrl(text: string): string | null {
  const match = text.match(/https?:\/\/[^\s]+/);
  return match?.[0] || null;
}
