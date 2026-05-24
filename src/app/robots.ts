import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://nightwatch.in';
  const isProduction = baseUrl === 'https://nightwatch.in';

  if (!isProduction) {
    return {
      rules: [{ userAgent: '*', disallow: '/' }],
    };
  }

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/api/',
          '/_next/',
          '/static/',
          '/reset-password',
          '/profile',
          '/settings',
          '/watch-party/',
          '/games/',
          '/downloads',
          '/friends',
        ],
      },
      {
        userAgent: [
          'GPTBot',
          'ChatGPT-User',
          'Google-Extended',
          'CCBot',
          'anthropic-ai',
          'Claude-Web',
          'ClaudeBot',
          'Omgilibot',
          'FacebookBot',
          'Bytespider',
          'Applebot-Extended',
          'PerplexityBot',
          'Amazonbot',
          'YouBot',
          'Diffbot',
          'Cohere-ai',
        ],
        disallow: '/',
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
