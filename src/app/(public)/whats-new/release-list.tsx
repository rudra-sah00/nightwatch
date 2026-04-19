'use client';

import Image from 'next/image';
import { useState } from 'react';
import ReactMarkdown from 'react-markdown';

interface Release {
  id: number;
  name: string;
  tag_name: string;
  published_at: string;
  body: string;
  html_url: string;
  author: {
    login: string;
    avatar_url: string;
  };
}

const INITIAL_COUNT = 3;

export function ReleaseList({ releases }: { releases: Release[] }) {
  const [visibleCount, setVisibleCount] = useState(INITIAL_COUNT);
  const visible = releases.slice(0, visibleCount);
  const hasMore = visibleCount < releases.length;

  if (releases.length === 0) {
    return (
      <div className="p-8 text-center bg-card border border-border rounded-xl shadow-sm">
        <p className="font-mono text-muted-foreground">
          No releases found or failed to load.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-12">
      {visible.map((release) => (
        <article
          key={release.id}
          className="bg-card border border-border shadow-sm rounded-xl overflow-hidden"
        >
          <div className="border-b border-border bg-muted/30 p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold font-headline">
                <a
                  href={release.html_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:underline"
                >
                  {release.name || release.tag_name}
                </a>
              </h2>
              <div className="flex items-center gap-3 mt-2 text-sm text-foreground/70 font-mono">
                <span className="bg-primary/10 text-primary px-2 py-0.5 rounded border border-primary/20">
                  {release.tag_name}
                </span>
                <span>•</span>
                <time dateTime={release.published_at}>
                  {new Date(release.published_at).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </time>
              </div>
            </div>

            <div className="flex items-center gap-2 border border-border rounded-lg px-3 py-1.5 bg-background shadow-sm">
              <Image
                src={release.author.avatar_url}
                alt={release.author.login}
                width={24}
                height={24}
                className="w-6 h-6 rounded-full border border-border"
              />
              <span className="text-sm font-bold">@{release.author.login}</span>
            </div>
          </div>

          <div className="p-6 prose prose-neutral dark:prose-invert max-w-none prose-headings:font-headline prose-a:text-primary hover:prose-a:text-primary/80 prose-pre:bg-muted prose-pre:border prose-pre:border-border prose-pre:rounded-lg prose-pre:text-foreground">
            <ReactMarkdown>
              {release.body || '*No release notes provided.*'}
            </ReactMarkdown>
          </div>
        </article>
      ))}

      {hasMore && (
        <div className="flex justify-center pt-4">
          <button
            type="button"
            onClick={() => setVisibleCount((c) => c + 5)}
            className="px-8 py-3 bg-primary text-primary-foreground border-[3px] border-border font-headline font-black uppercase text-sm tracking-widest transition-colors hover:bg-primary/90"
          >
            Show More ({releases.length - visibleCount} remaining)
          </button>
        </div>
      )}
    </div>
  );
}
