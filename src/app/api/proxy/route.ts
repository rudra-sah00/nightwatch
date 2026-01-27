import { type NextRequest, NextResponse } from 'next/server';

// export const runtime = 'edge'; // Buffer requires nodejs or polyfill

// Helper to fetch content with specific headers
async function fetchUpstream(url: string, headers: Headers) {
  const upstreamHeaders = new Headers();

  // Forward client's User-Agent if available, otherwise use a fallback
  const clientUserAgent = headers.get('user-agent');
  upstreamHeaders.set(
    'User-Agent',
    clientUserAgent ||
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  );

  upstreamHeaders.set('Referer', 'https://net51.cc/');
  upstreamHeaders.set('Origin', 'https://net51.cc');

  // Forward Range header if present (important for seeking/partial content)
  const range = headers.get('range');
  if (range) {
    upstreamHeaders.set('Range', range);
  }

  try {
    const response = await fetch(url, {
      headers: upstreamHeaders,
      next: { revalidate: 0 }, // Disable Next.js caching for proxy
    });
    return response;
  } catch (_error) {
    return null;
  }
}

// Rewriter for M3U8 playlists
function rewriteM3u8(
  content: string,
  validatedUrl: string,
  baseUrl: string,
): string {
  const originPath = validatedUrl.substring(0, validatedUrl.lastIndexOf('/'));

  return content
    .split('\n')
    .map((line) => {
      const trimmed = line.trim();
      if (!trimmed) return line;

      // 1. Rewrite Key URIs: #EXT-X-KEY:METHOD=AES-128,URI="https://..."
      if (trimmed.startsWith('#') && trimmed.includes('URI="')) {
        return trimmed.replace(/URI="([^"]+)"/, (_, uri) => {
          let absoluteUrl = uri;
          if (!uri.startsWith('http')) {
            absoluteUrl = `${originPath}/${uri}`;
          }
          const encoded = Buffer.from(absoluteUrl).toString('base64url');
          return `URI="${baseUrl}?url=${encoded}"`;
        });
      }

      // 2. Rewrite Segment URLs (lines not starting with #)
      if (!trimmed.startsWith('#')) {
        let absoluteUrl = trimmed;
        if (!trimmed.startsWith('http')) {
          absoluteUrl = `${originPath}/${trimmed}`;
        }
        const encoded = Buffer.from(absoluteUrl).toString('base64url');
        return `${baseUrl}?url=${encoded}`;
      }

      return line;
    })
    .join('\n');
}

// Rewriter for VTT files (subtitles/thumbnails)
function rewriteVtt(
  content: string,
  validatedUrl: string,
  baseUrl: string,
): string {
  const originPath = validatedUrl.substring(0, validatedUrl.lastIndexOf('/'));

  return content
    .split('\n')
    .map((line) => {
      const trimmed = line.trim();

      // Skip timestamp lines, empty lines, headers, etc.
      if (
        !trimmed ||
        trimmed === 'WEBVTT' ||
        trimmed.includes('-->') ||
        trimmed.startsWith('NOTE') ||
        /^\d+$/.test(trimmed)
      ) {
        return line;
      }

      // Rewrite URLs in VTT (e.g. sprite images)
      // Format usually: url.jpg#xywh=...
      const [urlPart, hashPart] = trimmed.split('#');

      // Simple check if it looks like a URL/filename
      if (
        urlPart &&
        (urlPart.startsWith('http') ||
          urlPart.match(/\.(jpg|jpeg|png|webp|gif)$/i))
      ) {
        let absoluteUrl = urlPart;
        if (!urlPart.startsWith('http')) {
          absoluteUrl = `${originPath}/${urlPart}`;
        }
        const encoded = Buffer.from(absoluteUrl).toString('base64url');
        const proxiedUrl = `${baseUrl}?url=${encoded}`;

        return hashPart ? `${proxiedUrl}#${hashPart}` : proxiedUrl;
      }

      return line;
    })
    .join('\n');
}

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get('url');

  if (!url) {
    return new NextResponse('Missing url parameter', { status: 400 });
  }

  let decodedUrl: string;
  try {
    decodedUrl = Buffer.from(url, 'base64url').toString('utf-8');
    new URL(decodedUrl); // Validate URL format
  } catch (_e) {
    return new NextResponse('Invalid url parameter', { status: 400 });
  }

  // Fetch from upstream
  const upstreamResponse = await fetchUpstream(decodedUrl, req.headers);

  if (!upstreamResponse || !upstreamResponse.ok) {
    return new NextResponse('Upstream fetch failed', { status: 502 });
  }

  const contentType = upstreamResponse.headers.get('content-type') || '';
  const isM3u8 =
    decodedUrl.includes('.m3u8') ||
    contentType.includes('mpegurl') ||
    contentType.includes('application/x-mpegURL');
  const isVtt =
    decodedUrl.includes('.vtt') ||
    decodedUrl.includes('.webvtt') ||
    contentType.includes('vtt') ||
    decodedUrl.includes('.srt') ||
    contentType.includes('subrip');

  // Determine base proxy URL for rewriting
  const proxyBaseUrl = `${req.nextUrl.origin}${req.nextUrl.pathname}`;

  // Handle Text-based formats that need rewriting
  if (isM3u8 || isVtt) {
    let textContent = await upstreamResponse.text();

    if (isVtt) {
      // If it's SRT or missing the WEBVTT header, fix it
      if (!textContent.trim().startsWith('WEBVTT')) {
        // Convert SRT comma decimals to VTT dots
        textContent =
          'WEBVTT\n\n' +
          textContent.replace(/(\d{2}:\d{2}:\d{2}),(\d{3})/g, '$1.$2');
      }

      textContent = rewriteVtt(textContent, decodedUrl, proxyBaseUrl);
    } else if (isM3u8) {
      textContent = rewriteM3u8(textContent, decodedUrl, proxyBaseUrl);
    }

    return new NextResponse(textContent, {
      status: 200,
      headers: {
        'Content-Type': isM3u8 ? 'application/vnd.apple.mpegurl' : 'text/vtt',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Access-Control-Allow-Origin': '*',
      },
    });
  }

  // Handle Binary formats (TS segments, Images, etc.) - Stream passthrough
  return new NextResponse(upstreamResponse.body, {
    status: upstreamResponse.status,
    headers: {
      'Content-Type': contentType,
      'Cache-Control': 'public, max-age=3600',
      'Access-Control-Allow-Origin': '*',
      // Forward relevant headers
      ...(upstreamResponse.headers.get('content-length') && {
        'Content-Length':
          upstreamResponse.headers.get('content-length') ?? undefined,
      }),
    },
  });
}
