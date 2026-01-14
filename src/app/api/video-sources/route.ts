import { NextRequest, NextResponse } from 'next/server';

/**
 * Combined API endpoint that handles both play token and playlist
 * in one server-side call to minimize token expiry issues
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, title = '' } = body;

    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    }

    console.log(`[Video Sources API] Getting sources for video: ${id}`);

    // Step 1: Get play token
    const playFormData = new URLSearchParams();
    playFormData.append('id', id);

    const playResponse = await fetch('https://net20.cc/play.php', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Cookie': 't_hash_t=b8ec5d3010f2943d5b59367032931fc2%3A%3Aace265dc70667f0b0cb6791c6124122c%3A%3A1768386699%3A%3Ani; user_token=f08c66c093d98521aa5f6edcbf88402e',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer': 'https://net20.cc/',
        'Accept': 'application/json, */*',
        'Accept-Language': 'en-US,en;q=0.9',
        'Origin': 'https://net20.cc',
      },
      body: playFormData,
      cache: 'no-store',
    });

    if (!playResponse.ok) {
      throw new Error(`Play request failed: ${playResponse.status}`);
    }

    const playData = await playResponse.json();
    const hash = playData.h;
    
    if (!hash || !hash.startsWith('in=')) {
      throw new Error('Invalid hash format from play API');
    }

    console.log(`[Video Sources API] ✓ Got token: ${hash.substring(0, 30)}...`);

    // Step 2: Immediately get playlist with fresh token
    const timestamp = Math.floor(Date.now() / 1000);
    const playlistUrl = `https://net51.cc/playlist.php?id=${id}&t=${encodeURIComponent(title)}&tm=${timestamp}&h=${encodeURIComponent(hash)}`;

    console.log(`[Video Sources API] Fetching playlist: ${playlistUrl.substring(0, 80)}...`);

    const playlistResponse = await fetch(playlistUrl, {
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

    if (!playlistResponse.ok) {
      throw new Error(`Playlist request failed: ${playlistResponse.status}`);
    }

    const playlistData = await playlistResponse.json();
    
    // The response is an array with one object
    const playlist = Array.isArray(playlistData) ? playlistData[0] : playlistData;

    console.log(`[Video Sources API] ✓ Got playlist with ${playlist.sources?.length || 0} sources`);

    // Transform to our expected format
    const transformedPlaylist = {
      title: playlist.title || title,
      poster: playlist.image2 || playlist.image || '',
      sources: (playlist.sources || []).map((source: any) => ({
        url: source.file.startsWith('http') 
          ? source.file 
          : `https://net51.cc${source.file}`,
        quality: source.label || 'HD',
        type: source.type || 'application/vnd.apple.mpegurl'
      })),
      subtitles: (playlist.tracks || [])
        .filter((track: any) => track.kind === 'captions')
        .map((track: any) => ({
          url: track.file.startsWith('http') 
            ? track.file 
            : `https:${track.file}`,
          language: track.language || 'en',
          label: track.label || 'English'
        })),
      thumbnails: {
        url: (playlist.tracks || [])
          .find((track: any) => track.kind === 'thumbnails')?.file || ''
      }
    };

    // Check if we got valid sources
    const firstSource = transformedPlaylist.sources[0]?.url || '';
    if (firstSource.includes('in=unknown::ni')) {
      console.warn('[Video Sources API] ⚠️  Token already expired!');
    } else {
      console.log('[Video Sources API] ✓ Token is valid');
    }

    return NextResponse.json(transformedPlaylist, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });

  } catch (error) {
    console.error('[Video Sources API] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get video sources' },
      { status: 500 }
    );
  }
}
