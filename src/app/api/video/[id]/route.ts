import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const serviceAccountEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
    const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');

    if (!serviceAccountEmail || !privateKey || !id) {
      return NextResponse.json({ error: 'Server credentials or video ID missing' }, { status: 400 });
    }

    const auth = new google.auth.JWT({
      email: serviceAccountEmail,
      key: privateKey,
      scopes: ['https://www.googleapis.com/auth/drive.readonly'],
    });

    const drive = google.drive({ version: 'v3', auth });

    // Fetch file metadata
    const meta = await drive.files.get({
      fileId: id,
      fields: 'id, name, mimeType, size',
    });

    const fileSize = parseInt(meta.data.size || '0', 10);
    const mimeType = meta.data.mimeType || 'video/mp4';

    const range = req.headers.get('range');

    if (range && fileSize > 0) {
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
      const chunkSize = end - start + 1;

      const driveStream = await drive.files.get(
        { fileId: id, alt: 'media' },
        {
          responseType: 'stream',
          headers: { Range: `bytes=${start}-${end}` },
        }
      );

      // Web Stream conversion
      const webStream = new ReadableStream({
        start(controller) {
          driveStream.data.on('data', (chunk: Buffer) => controller.enqueue(chunk));
          driveStream.data.on('end', () => controller.close());
          driveStream.data.on('error', (err: any) => controller.error(err));
        },
      });

      return new NextResponse(webStream as any, {
        status: 206,
        headers: {
          'Content-Range': `bytes ${start}-${end}/${fileSize}`,
          'Accept-Ranges': 'bytes',
          'Content-Length': String(chunkSize),
          'Content-Type': mimeType,
        },
      });
    } else {
      const driveStream = await drive.files.get({ fileId: id, alt: 'media' }, { responseType: 'stream' });

      const webStream = new ReadableStream({
        start(controller) {
          driveStream.data.on('data', (chunk: Buffer) => controller.enqueue(chunk));
          driveStream.data.on('end', () => controller.close());
          driveStream.data.on('error', (err: any) => controller.error(err));
        },
      });

      return new NextResponse(webStream as any, {
        status: 200,
        headers: {
          'Content-Length': String(fileSize),
          'Content-Type': mimeType,
          'Accept-Ranges': 'bytes',
        },
      });
    }
  } catch (error: any) {
    console.error('Video streaming proxy error:', error);
    return NextResponse.json({ error: 'Failed to stream video' }, { status: 500 });
  }
}
