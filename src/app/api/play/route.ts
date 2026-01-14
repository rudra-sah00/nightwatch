import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { id } = body;

    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    }

    const formData = new URLSearchParams();
    formData.append('id', id);

    const response = await fetch('https://net20.cc/play.php', {
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
      body: formData,
      cache: 'no-store',
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Play API error response:', errorText);
      throw new Error(`Play request failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    console.log('Play API response:', data);
    
    // Validate hash format
    if (!data.h || !data.h.startsWith('in=')) {
      throw new Error('Invalid hash format received from play API');
    }
    
    return NextResponse.json(data);
  } catch (error) {
    console.error('Play API error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get play token' },
      { status: 500 }
    );
  }
}
