import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const query = searchParams.get('q');

  if (!query) {
    return NextResponse.json({ error: 'Query parameter is required' }, { status: 400 });
  }

  try {
    // Real API uses 's=' parameter and requires timestamp
    const timestamp = Math.floor(Date.now() / 1000);
    const response = await fetch(
      `https://net20.cc/search.php?s=${encodeURIComponent(query)}&t=${timestamp}`,
      {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Referer': 'https://net20.cc/',
          'Accept': 'application/json',
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Search failed: ${response.statusText}`);
    }

    const data = await response.json();
    // Transform response to match our interface
    // Real API returns: {"searchResult": [{"id": "...", "t": "title"}]}
    const results = (data.searchResult || []).map((item: any) => ({
      id: item.id,
      title: item.t,
      type: data.type === 0 ? 'movie' : 'series',
    }));
    return NextResponse.json({ results });
  } catch (error) {
    console.error('Search API error:', error);
    return NextResponse.json(
      { error: 'Failed to search content' },
      { status: 500 }
    );
  }
}
