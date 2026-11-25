import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { ElectricityMeter } from '@/models/ElectricityMeter';
import { requireAuth } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const roomId = searchParams.get('roomId');
    const billingMonth = searchParams.get('billingMonth');
    const propertyId = searchParams.get('propertyId');

    const query: any = {};
    if (roomId) query.roomId = roomId;
    if (billingMonth) query.billingMonth = billingMonth;
    if (propertyId) query.propertyId = propertyId;

    const readings = await ElectricityMeter.find(query).populate('roomId').sort({ createdAt: -1 });
    return NextResponse.json({ success: true, readings });
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
    const { propertyId, roomId, billingMonth, previousReading, currentReading, ratePerUnit = 10, notes } = body;

    const units = Math.max(0, Number(currentReading) - Number(previousReading));
    const totalBill = units * Number(ratePerUnit);

    const record = await ElectricityMeter.findOneAndUpdate(
      { roomId, billingMonth },
      {
        propertyId,
        previousReading: Number(previousReading),
        currentReading: Number(currentReading),
        unitsConsumed: units,
        ratePerUnit: Number(ratePerUnit),
        totalBill,
        notes,
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    return NextResponse.json({ success: true, record });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
