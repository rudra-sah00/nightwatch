import { ArrowLeft } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { ReleaseList } from './release-list';

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

  const token = process.env.WATCH_RUDRA_GH_TOKEN || process.env.GITHUB_TOKEN;
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(
    'https://api.github.com/repos/rudra-sah00/watch-rudra/releases',
    {
      headers,
      next: { revalidate: 3600 },
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

      <ReleaseList releases={releases} />
    </div>
  );
}
