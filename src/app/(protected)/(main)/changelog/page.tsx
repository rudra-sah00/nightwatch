import { getTranslations } from 'next-intl/server';
import { ReleaseList } from '@/app/(public)/whats-new/release-list';

export async function generateMetadata() {
  const t = await getTranslations('common.whatsNew');
  return { title: t('title'), description: t('description') };
}

interface Release {
  id: number;
  name: string;
  tag_name: string;
  published_at: string;
  body: string;
  html_url: string;
  author: { login: string; avatar_url: string };
}

export default async function ChangelogPage() {
  const t = await getTranslations('common.whatsNew');
  const headers: HeadersInit = {};
  const token = process.env.WATCH_RUDRA_GH_TOKEN || process.env.GITHUB_TOKEN;
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(
    'https://api.github.com/repos/rudra-sah00/watch-rudra/releases',
    { headers, next: { revalidate: 3600 } },
  );

  let releases: Release[] = [];
  if (res.ok) {
    releases = await res.json();
  }

  return (
    <main className="min-h-full bg-background pb-32">
      {/* Hero Header */}
      <div className="mb-12 bg-neo-green relative overflow-hidden rounded-2xl">
        <div className="absolute -top-10 -right-10 w-64 h-64 border-[4px] border-border rounded-full opacity-20" />
        <div className="absolute top-10 left-1/4 w-24 h-24 bg-neo-yellow border-[4px] border-border opacity-30 rotate-12" />

        <div className="container mx-auto px-6 py-12 md:px-10 relative z-10">
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-8">
            <div>
              <h1 className="text-6xl md:text-8xl lg:text-9xl font-black tracking-tighter text-white font-headline uppercase leading-none mb-4">
                WHAT&apos;S
                <br />
                <span className="bg-background text-foreground px-4 inline-block border-[4px] border-border -rotate-1 ml-2 mt-2">
                  NEW
                </span>
              </h1>
              <p className="font-headline font-bold uppercase tracking-widest text-foreground bg-background inline-block px-4 py-2 border-[3px] border-border">
                {t('description')}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 md:px-10">
        <ReleaseList releases={releases} />
      </div>
    </main>
  );
}
