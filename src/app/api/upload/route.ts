import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import { Readable } from 'stream';

export async function POST(req: NextRequest) {
  try {
    const serviceAccountEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
    const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');
    const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;

    if (!serviceAccountEmail || !privateKey || !folderId) {
      return NextResponse.json(
        {
          error: 'Google Drive credentials not configured on server',
          configured: false,
        },
        { status: 400 }
      );
    }

    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const cutName = (formData.get('cutName') as string) || 'Video Cut';

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const auth = new google.auth.JWT({
      email: serviceAccountEmail,
      key: privateKey,
      scopes: ['https://www.googleapis.com/auth/drive.file', 'https://www.googleapis.com/auth/drive'],
    });

    const drive = google.drive({ version: 'v3', auth });

    const buffer = Buffer.from(await file.arrayBuffer());
    const readable = new Readable();
    readable._read = () => {};
    readable.push(buffer);
    readable.push(null);

    const driveResponse = await drive.files.create({
      requestBody: {
        name: `${cutName}_${Date.now()}_${file.name}`,
        parents: [folderId],
      },
      media: {
        mimeType: file.type || 'video/mp4',
        body: readable,
      },
      fields: 'id, name, size, webViewLink, webContentLink',
    });

    return NextResponse.json({
      success: true,
      fileId: driveResponse.data.id,
      fileName: driveResponse.data.name,
      streamUrl: `/api/video/${driveResponse.data.id}`,
    });
  } catch (error: any) {
    console.error('Drive upload error:', error);
    return NextResponse.json({ error: error.message || 'Upload failed' }, { status: 500 });
  }
}
