import { ArrowLeft } from 'lucide-react';
import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import ReactMarkdown from 'react-markdown';

export const metadata: Metadata = {
  title: "What's New",
  description: 'Release notes and updates for Watch Rudra.',
};

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

export default async function WhatsNewPage() {
  const headers: HeadersInit = {};

  // If you ever make the GitHub repository private, it will use this token automatically!
  const token = process.env.WATCH_RUDRA_GH_TOKEN || process.env.GITHUB_TOKEN;
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(
    'https://api.github.com/repos/rudra-sah00/watch-rudra/releases',
    {
      headers,
      cache: 'force-cache',
    },
  );

  let releases: Release[] = [];
  if (res.ok) {
    releases = await res.json();
  }

  return (
    <div className="container max-w-4xl py-12 mx-auto px-4">
      <div className="mb-12">
        <Link
          href="/"
          className="inline-flex items-center gap-2 mb-6 text-muted-foreground hover:text-foreground hover:underline font-mono text-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Home
        </Link>
        <h1 className="text-4xl font-headline font-black mb-4 uppercase tracking-tighter">
          What's New
        </h1>
        <p className="text-muted-foreground text-lg">
          Latest updates, bug fixes, and features for Watch Rudra.
        </p>
      </div>

      <div className="space-y-12">
        {releases.length === 0 ? (
          <div className="p-8 text-center bg-card border-[3px] border-border shadow-neo-sm">
            <p className="font-mono text-muted-foreground">
              No releases found or failed to load.
            </p>
          </div>
        ) : (
          releases.map((release) => (
            <article
              key={release.id}
              className="bg-card border-[3px] border-border shadow-neo-sm overflow-hidden"
            >
              <div className="border-b-[3px] border-border bg-muted/30 p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
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
                      {new Date(release.published_at).toLocaleDateString(
                        'en-US',
                        {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        },
                      )}
                    </time>
                  </div>
                </div>

                <div className="flex items-center gap-2 border-[2px] border-border px-3 py-1 bg-background">
                  <Image
                    src={release.author.avatar_url}
                    alt={release.author.login}
                    width={24}
                    height={24}
                    className="w-6 h-6 rounded-full border border-border"
                  />
                  <span className="text-sm font-bold">
                    @{release.author.login}
                  </span>
                </div>
              </div>

              <div className="p-6 prose prose-neutral dark:prose-invert max-w-none prose-headings:font-headline prose-a:text-primary hover:prose-a:text-primary/80 prose-pre:bg-muted prose-pre:border-2 prose-pre:border-border prose-pre:text-foreground">
                <ReactMarkdown>
                  {release.body || '*No release notes provided.*'}
                </ReactMarkdown>
              </div>
            </article>
          ))
        )}
      </div>
    </div>
  );
}
