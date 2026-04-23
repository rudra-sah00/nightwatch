import type { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://nightwatch.in';

  // Static routes
  const routes = [
    '',
    '/login',
    '/signup',
    '/forgot-password',
    '/home',
    '/watchlist',
    '/profile',
  ].map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date(),
    changeFrequency: 'daily' as const,
    priority: route === '' || route === '/home' ? 1 : 0.8,
  }));

  return [
    ...routes,
    // Add placeholders for dynamic content indexing if public indexing is desired
  ];
}
