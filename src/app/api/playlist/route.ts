import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const id = searchParams.get('id');
  const h = searchParams.get('h');
  const title = searchParams.get('title') || '';

  if (!id || !h) {
    return NextResponse.json({ error: 'ID and hash are required' }, { status: 400 });
  }

  try {
    // Extract timestamp from hash (format: "in=hash::hash::timestamp::ni")
    const hashParts = h.replace('in=', '').split('::');
    const timestamp = hashParts.length >= 3 ? hashParts[2] : Math.floor(Date.now() / 1000);
    
    // Real API format: ?id={id}&t={title}&tm={timestamp}&h={hash}
    const url = `https://net51.cc/playlist.php?id=${encodeURIComponent(id)}&t=${encodeURIComponent(title)}&tm=${timestamp}&h=${encodeURIComponent(h)}`;
    console.log('Fetching playlist from:', url);
    
    const response = await fetch(url, {
      headers: {
        'Cookie': 't_hash_t=b8ec5d3010f2943d5b59367032931fc2%3A%3Aace265dc70667f0b0cb6791c6124122c%3A%3A1768386699%3A%3Ani; user_token=f08c66c093d98521aa5f6edcbf88402e',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer': 'https://net51.cc/',
        'Accept': 'application/json, */*',
        'Accept-Language': 'en-US,en;q=0.9',
        'Origin': 'https://net51.cc',
      },
      cache: 'no-store',
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Playlist API error response:', errorText);
      throw new Error(`Playlist request failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    console.log('[Playlist API] Raw response:', JSON.stringify(data, null, 2));
    
    // API returns an array with one object
    const playlist = Array.isArray(data) ? data[0] : data;
    console.log('[Playlist API] After array unwrap:', JSON.stringify(playlist, null, 2));
    
    // Check if sources contain valid authentication
    if (playlist.sources && playlist.sources.length > 0) {
      const firstSource = playlist.sources[0].file;
      if (firstSource.includes('in=unknown::ni')) {
        console.error('[Playlist API] ⚠️  Sources contain expired/invalid token! The hash may be expired.');
        console.error('[Playlist API] Hash used:', h);
      } else {
        console.log('[Playlist API] ✓ Sources contain valid authentication tokens');
      }
    }
    
    // Transform to our interface
    const transformed = {
      title: title || playlist.title || '',
      poster: playlist.image2 || playlist.image || '',
      sources: (playlist.sources || []).map((source: any) => {
        const originalUrl = source.file;
        // Don't transform URLs that are already absolute (contain http:// or https://)
        const finalUrl = (originalUrl.startsWith('http://') || originalUrl.startsWith('https://'))
          ? originalUrl
          : originalUrl.startsWith('/') 
          ? `https://net51.cc${originalUrl}` 
          : originalUrl;
        
        console.log(`Source URL transform: "${originalUrl}" -> "${finalUrl}"`);
        
        return {
          url: finalUrl,
          quality: source.label,
          default: source.default === 'true' || source.default === true,
        };
      }),
      subtitles: (playlist.tracks || [])
        .filter((track: any) => track.kind === 'captions')
        .map((track: any) => ({
          language: track.label,
          url: track.file.startsWith('//') 
            ? `https:${track.file}` 
            : track.file.startsWith('/') 
            ? `https://subscdn.top${track.file}` 
            : track.file,
        })),
      thumbnails: (playlist.tracks || [])
        .filter((track: any) => track.kind === 'thumbnails')
        .map((track: any) => ({
          url: track.file.startsWith('//') 
            ? `https:${track.file}` 
            : track.file,
          language: track.language || 'en',
        }))[0] || null, // Return first thumbnails track or null
    };
    
    console.log('Transformed playlist:', JSON.stringify(transformed, null, 2));
    return NextResponse.json(transformed);
  } catch (error) {
    console.error('Playlist API error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get playlist' },
      { status: 500 }
    );
  }
}
