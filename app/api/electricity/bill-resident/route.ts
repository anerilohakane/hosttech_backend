import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { AppSettings } from '@/models/AppSettings';
import { ResidentProfile } from '@/models/ResidentProfile';
import { RentRecord } from '@/models/RentRecord';
import { ElectricityMeter } from '@/models/ElectricityMeter';

export async function POST(req: NextRequest) {
  try {
    const auth = requireAuth(req, ['admin']);
    if ('error' in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    await connectDB();
    const body = await req.json();
    const { residentId, rentMonth, unitsConsumed, ratePerUnit, fixedAmount, notes } = body;

    if (!residentId || !rentMonth) {
      return NextResponse.json({ error: 'Resident ID and rent month (YYYY-MM) are required.' }, { status: 400 });
    }

    const resident = await ResidentProfile.findById(residentId);
    if (!resident) {
      return NextResponse.json({ error: 'Resident profile not found.' }, { status: 404 });
    }

    const settings = await AppSettings.findOne(auth.user.organizationId ? { organizationId: auth.user.organizationId } : {});
    const isPerUnit = settings?.electricityBillingType !== 'fixed_monthly';

    let billAmount = 0;
    let units = 0;
    let rate = Number(ratePerUnit) || Number(settings?.electricityRatePerUnit) || 10;

    if (isPerUnit) {
      units = Number(unitsConsumed) || 0;
      billAmount = units * rate;
    } else {
      billAmount = Number(fixedAmount) || Number(settings?.electricityFixedMonthly) || 500;
    }

    // Record / Update ElectricityMeter
    if (resident.roomId) {
      await ElectricityMeter.findOneAndUpdate(
        { roomId: resident.roomId, billingMonth: rentMonth },
        {
          propertyId: resident.propertyId,
          roomId: resident.roomId,
          billingMonth: rentMonth,
          previousReading: 0,
          currentReading: units,
          unitsConsumed: units,
          ratePerUnit: rate,
          totalBill: billAmount,
          isBilledToResidents: true,
          notes: notes || `Billed to resident ${resident.fullName}`,
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
    }

    // Attach or update in RentRecord for this month
    let rentRecord = await RentRecord.findOne({ residentId: resident._id, rentMonth });
    if (rentRecord) {
      const oldElectricity = rentRecord.electricityAmount || 0;
      rentRecord.electricityAmount = billAmount;
      rentRecord.electricityUnits = units;
      rentRecord.electricityRate = rate;
      rentRecord.totalPayable = rentRecord.rentAmount + billAmount + (rentRecord.previousOutstanding || 0) - (rentRecord.adjustmentAmount || 0);
      rentRecord.outstandingAmount = Math.max(0, rentRecord.totalPayable - (rentRecord.amountPaid || 0));
      if (rentRecord.outstandingAmount > 0 && rentRecord.status === 'Paid') {
        rentRecord.status = 'Partially Paid';
      }
      await rentRecord.save();
    } else {
      const dueDate = new Date();
      dueDate.setDate(settings?.rentDueDay || 5);
      rentRecord = await RentRecord.create({
        residentId: resident._id,
        propertyId: resident.propertyId,
        roomId: resident.roomId,
        bedId: resident.bedId,
        rentMonth,
        rentAmount: resident.monthlyRent,
        electricityAmount: billAmount,
        electricityUnits: units,
        electricityRate: rate,
        dueDate,
        previousOutstanding: 0,
        totalPayable: resident.monthlyRent + billAmount,
        amountPaid: 0,
        outstandingAmount: resident.monthlyRent + billAmount,
        status: 'Unpaid',
        notes: `Rent with Light Bill (₹${billAmount})`,
      });
    }

    return NextResponse.json({
      success: true,
      message: `Light bill of ₹${billAmount} sent successfully to ${resident.fullName} for ${rentMonth}!`,
      rentRecord,
    });
  } catch (err: any) {
    console.error('Error sending light bill:', err);
    return NextResponse.json({ error: err.message || 'Failed to send light bill' }, { status: 500 });
  }
}
