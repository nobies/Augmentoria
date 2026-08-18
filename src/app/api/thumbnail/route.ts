import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const vimeoUrl = searchParams.get('url');

  if (!vimeoUrl) {
    return NextResponse.json({ error: 'Missing url parameter' }, { status: 400 });
  }

  try {
    // 1. Fetch oEmbed metadata from Vimeo
    const oEmbedRes = await fetch(
      `https://vimeo.com/api/oembed.json?url=${encodeURIComponent(vimeoUrl)}&width=1280`
    );

    if (!oEmbedRes.ok) {
      return NextResponse.json({ error: 'Failed to fetch Vimeo oEmbed' }, { status: 404 });
    }

    const data = await oEmbedRes.json();
    const thumbnailUrl = data.thumbnail_url;

    if (!thumbnailUrl) {
      return NextResponse.json({ error: 'No thumbnail in oEmbed' }, { status: 404 });
    }

    // 2. Fetch actual thumbnail image buffer
    const imgRes = await fetch(thumbnailUrl);
    const arrayBuffer = await imgRes.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString('base64');
    const dataUrl = `data:${imgRes.headers.get('content-type') || 'image/jpeg'};base64,${base64}`;

    return NextResponse.json({
      title: data.title,
      duration: data.duration,
      thumbnailUrl,
      dataUrl,
    });
  } catch (error: any) {
    console.error('Thumbnail API error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
