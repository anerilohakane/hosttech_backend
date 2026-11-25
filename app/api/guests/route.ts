import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { GuestPass } from '@/models/GuestPass';
import { requireAuth } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const auth = requireAuth(req);
    if ('error' in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    await connectDB();
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const propertyId = searchParams.get('propertyId');

    const query: any = {};
    if (auth.user.role === 'resident') {
      query.residentId = auth.user.residentId || auth.user.userId;
    } else {
      if (propertyId) query.propertyId = propertyId;
    }
    if (status) query.status = status;

    const passes = await GuestPass.find(query)
      .populate('residentId', 'fullName phoneNumber roomId')
      .sort({ createdAt: -1 });

    return NextResponse.json({ success: true, passes });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = requireAuth(req);
    if ('error' in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    await connectDB();
    const body = await req.json();
    const { guestName, guestPhone, relation, visitDate, isOvernight, propertyId } = body;

    const newPass = await GuestPass.create({
      residentId: auth.user.residentId || auth.user.userId,
      propertyId: propertyId || auth.user.propertyId,
      guestName,
      guestPhone,
      relation,
      visitDate: visitDate || new Date().toISOString().split('T')[0],
      isOvernight: !!isOvernight,
      status: 'Pending',
    });

    return NextResponse.json({ success: true, pass: newPass });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const auth = requireAuth(req, ['admin']);
    if ('error' in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    await connectDB();
    const body = await req.json();
    const { passId, status, adminRemarks } = body;

    const updateData: any = { status, adminRemarks };
    if (status === 'Checked In') updateData.checkInTime = new Date();
    if (status === 'Checked Out') updateData.checkOutTime = new Date();

    const updated = await GuestPass.findByIdAndUpdate(passId, updateData, { new: true });
    return NextResponse.json({ success: true, pass: updated });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
