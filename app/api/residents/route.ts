import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { getResidents, registerResident } from '@/services/residentService';

export async function GET(req: NextRequest) {
  const auth = requireAuth(req);
  if ('error' in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const url = new URL(req.url);
    const propertyId = url.searchParams.get('propertyId') || undefined;
    const status = url.searchParams.get('status') || undefined;
    const search = url.searchParams.get('search') || undefined;
    const organizationId = auth.user.role !== 'vendor' ? auth.user.organizationId : undefined;

    // If resident user, can only view self
    if (auth.user.role === 'resident') {
      const residents = await getResidents({ propertyId: auth.user.propertyId, organizationId });
      const self = residents.filter((r) => r.userId.toString() === auth.user.userId);
      return NextResponse.json({ success: true, residents: self });
    }

    const residents = await getResidents({ propertyId, status, search, organizationId });
    return NextResponse.json({ success: true, residents });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const auth = requireAuth(req, ['admin', 'staff']);
  if ('error' in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const body = await req.json();
    const resident = await registerResident({
      ...body,
      organizationId: auth.user.organizationId,
      adminId: auth.user.userId,
      adminName: auth.user.name,
    });
    return NextResponse.json({ success: true, resident }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
