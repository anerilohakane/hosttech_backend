import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { MealAttendance } from '@/models/MealAttendance';
import { requireAuth } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const auth = requireAuth(req);
    if ('error' in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    await connectDB();
    const { searchParams } = new URL(req.url);
    const date = searchParams.get('date') || new Date().toISOString().split('T')[0];
    const propertyId = searchParams.get('propertyId');

    // Admin view: meal counts for the day
    if (auth.user.role === 'admin') {
      const query: any = { date };
      if (propertyId) query.propertyId = propertyId;

      const records = await MealAttendance.find(query);
      const counts = {
        breakfast: records.filter((r) => r.havingBreakfast).length,
        lunch: records.filter((r) => r.havingLunch).length,
        dinner: records.filter((r) => r.havingDinner).length,
        totalResponses: records.length,
      };
      return NextResponse.json({ success: true, counts, records });
    }

    // Resident view: personal attendance
    const attendance = await MealAttendance.findOne({
      residentId: auth.user.residentId || auth.user.userId,
      date,
    });

    return NextResponse.json({ success: true, attendance });
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
    const { date, havingBreakfast, havingLunch, havingDinner, propertyId } = body;

    const residentId = auth.user.residentId || auth.user.userId;
    const targetDate = date || new Date().toISOString().split('T')[0];

    const updated = await MealAttendance.findOneAndUpdate(
      { residentId, date: targetDate },
      {
        propertyId: propertyId || auth.user.propertyId,
        havingBreakfast,
        havingLunch,
        havingDinner,
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    return NextResponse.json({ success: true, attendance: updated });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
