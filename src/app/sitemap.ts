import type { MetadataRoute } from 'next';
import { apiFetch } from '@/lib/fetch';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://nightwatch.in';
  const now = new Date();

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: baseUrl, lastModified: now, changeFrequency: 'weekly', priority: 1 },
    {
      url: `${baseUrl}/login`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/signup`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/terms`,
      lastModified: now,
      changeFrequency: 'yearly',
      priority: 0.3,
    },
    {
      url: `${baseUrl}/privacy`,
      lastModified: now,
      changeFrequency: 'yearly',
      priority: 0.3,
    },
  ];

  let dynamicRoutes: MetadataRoute.Sitemap = [];
  try {
    const clips = await apiFetch<{
      clips: { shareId: string; createdAt: string }[];
    }>('/api/clips/public/sitemap', {
      headers: { 'X-Sitemap-Key': process.env.SITEMAP_SECRET || '' },
    }).catch(() => ({ clips: [] }));

    dynamicRoutes = (clips.clips || []).map((c) => ({
      url: `${baseUrl}/clip/share/${c.shareId}`,
      lastModified: new Date(c.createdAt),
      changeFrequency: 'monthly' as const,
      priority: 0.5,
    }));
  } catch {
    // Fall back to static-only sitemap if API is unavailable
  }

  return [...staticRoutes, ...dynamicRoutes];
}
