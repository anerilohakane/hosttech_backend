import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { getPrivateFilePath } from '@/lib/storage';
import fs from 'fs';
import path from 'path';

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const relPath = url.searchParams.get('path');
    if (!relPath) {
      return NextResponse.json({ error: 'Path parameter is required.' }, { status: 400 });
    }

    // Security: Only allow files within legitimate subfolders (documents, receipts, payments)
    const normalized = relPath.replace(/\\/g, '/');
    if (!normalized.startsWith('documents/') && !normalized.startsWith('receipts/') && !normalized.startsWith('payments/')) {
      return NextResponse.json({ error: 'Invalid document folder access.' }, { status: 403 });
    }

    const fullPath = getPrivateFilePath(relPath);
    if (!fs.existsSync(fullPath)) {
      return NextResponse.json({ error: 'File not found on server.' }, { status: 404 });
    }

    const ext = path.extname(fullPath).toLowerCase();
    const mimeTypes: Record<string, string> = {
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.webp': 'image/webp',
      '.pdf': 'application/pdf',
    };
    const contentType = mimeTypes[ext] || 'application/octet-stream';
    const fileBuffer = await fs.promises.readFile(fullPath);

    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `inline; filename="${path.basename(fullPath)}"`,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
