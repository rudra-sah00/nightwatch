import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        disallow: '/',
      },
      {
        userAgent: [
          'GPTBot',
          'ChatGPT-User',
          'Google-Extended',
          'CCBot',
          'anthropic-ai',
          'Claude-Web',
          'Omgilibot',
          'FacebookBot',
          'Bytespider',
        ],
        disallow: '/',
      },
    ],
  };
}
