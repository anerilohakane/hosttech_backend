import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { MessMenu } from '@/models/MessMenu';
import { requireAuth } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const propertyId = searchParams.get('propertyId');
    const query = propertyId ? { propertyId } : {};
    const menus = await MessMenu.find(query).sort({ dayOfWeek: 1 });
    return NextResponse.json({ success: true, menus });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = requireAuth(req, ['admin']);
    if ('error' in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    await connectDB();
    const body = await req.json();
    const { propertyId, dayOfWeek, breakfast, lunch, dinner, specialNote } = body;

    const updated = await MessMenu.findOneAndUpdate(
      { propertyId, dayOfWeek },
      { breakfast, lunch, dinner, specialNote },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    return NextResponse.json({ success: true, menu: updated });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
