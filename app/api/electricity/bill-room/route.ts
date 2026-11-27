import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { Room } from '@/models/Room';
import { ResidentProfile } from '@/models/ResidentProfile';
import { RentRecord } from '@/models/RentRecord';
import { ElectricityMeter } from '@/models/ElectricityMeter';
import { AppSettings } from '@/models/AppSettings';
import { savePrivateFile } from '@/lib/storage';

export async function POST(req: NextRequest) {
  try {
    const auth = requireAuth(req, ['admin']);
    if ('error' in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    await connectDB();
    const formData = await req.formData();

    const roomId = formData.get('roomId') as string;
    const rentMonth = formData.get('rentMonth') as string; // YYYY-MM
    const totalAmount = Number(formData.get('totalAmount') || 0);
    const unitsConsumed = Number(formData.get('unitsConsumed') || 0);
    const ratePerUnit = Number(formData.get('ratePerUnit') || 0);
    const notes = (formData.get('notes') as string) || '';
    const file = formData.get('billCopy') as File | null;

    if (!roomId || !rentMonth) {
      return NextResponse.json({ error: 'Room and billing month (YYYY-MM) are required.' }, { status: 400 });
    }

    if (totalAmount <= 0 && (unitsConsumed <= 0 || ratePerUnit <= 0)) {
      return NextResponse.json({ error: 'Please provide either total bill amount or valid units and rate.' }, { status: 400 });
    }

    const room = await Room.findById(roomId);
    if (!room) {
      return NextResponse.json({ error: 'Room not found.' }, { status: 404 });
    }

    // Handle bill copy upload if provided
    let billCopyUrl = '';
    if (file && typeof file.arrayBuffer === 'function') {
      const buffer = Buffer.from(await file.arrayBuffer());
      const saved = await savePrivateFile('documents', file.name || `lightbill_${room.roomNumber}_${rentMonth}.jpg`, buffer);
      billCopyUrl = `/api/documents/download?path=${encodeURIComponent(saved.relativePath)}`;
    }

    // Determine final total room bill
    const computedTotalBill = totalAmount > 0 ? totalAmount : unitsConsumed * ratePerUnit;

    // Find all active residents currently staying in this room
    const activeResidents = await ResidentProfile.find({
      roomId: room._id,
      status: { $in: ['Active', 'Notice Period'] },
    });

    const tenantCount = Math.max(1, activeResidents.length);
    // Split room bill equally among active occupants (rounded to nearest rupee)
    const billPerTenant = Math.round(computedTotalBill / tenantCount);

    // Save or update ElectricityMeter record for this room and month
    const meterRecord = await ElectricityMeter.findOneAndUpdate(
      { roomId: room._id, billingMonth: rentMonth },
      {
        propertyId: room.propertyId,
        roomId: room._id,
        billingMonth: rentMonth,
        previousReading: 0,
        currentReading: unitsConsumed,
        unitsConsumed,
        ratePerUnit,
        totalBill: computedTotalBill,
        billPerTenant,
        tenantCount,
        isBilledToResidents: activeResidents.length > 0,
        meterPhotoUrl: billCopyUrl || undefined,
        notes: notes || `Room ${room.roomNumber} light bill for ${rentMonth}`,
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    // Get PG rent settings for default due day
    const settings = await AppSettings.findOne(auth.user.organizationId ? { organizationId: auth.user.organizationId } : {});
    const dueDay = settings?.rentDueDay || 5;

    // Distribute to each active tenant's RentRecord
    const updatedRecords = [];
    for (const resident of activeResidents) {
      let rentRecord = await RentRecord.findOne({ residentId: resident._id, rentMonth });
      if (rentRecord) {
        rentRecord.electricityAmount = billPerTenant;
        rentRecord.electricityUnits = unitsConsumed > 0 ? Math.round(unitsConsumed / tenantCount) : 0;
        rentRecord.electricityRate = ratePerUnit > 0 ? ratePerUnit : 10;
        rentRecord.electricityBillUrl = billCopyUrl || rentRecord.electricityBillUrl || '';
        rentRecord.electricityRoomTotal = computedTotalBill;
        rentRecord.totalPayable =
          rentRecord.rentAmount +
          billPerTenant +
          (rentRecord.previousOutstanding || 0) -
          (rentRecord.adjustmentAmount || 0);
        rentRecord.outstandingAmount = Math.max(0, rentRecord.totalPayable - (rentRecord.amountPaid || 0));
        if (rentRecord.outstandingAmount > 0 && rentRecord.status === 'Paid') {
          rentRecord.status = 'Partially Paid';
        }
        await rentRecord.save();
        updatedRecords.push(rentRecord);
      } else {
        const dueDate = new Date();
        dueDate.setDate(dueDay);
        const newRecord = await RentRecord.create({
          residentId: resident._id,
          propertyId: resident.propertyId,
          roomId: resident.roomId,
          bedId: resident.bedId,
          rentMonth,
          rentAmount: resident.monthlyRent,
          electricityAmount: billPerTenant,
          electricityUnits: unitsConsumed > 0 ? Math.round(unitsConsumed / tenantCount) : 0,
          electricityRate: ratePerUnit > 0 ? ratePerUnit : 10,
          electricityBillUrl: billCopyUrl,
          electricityRoomTotal: computedTotalBill,
          dueDate,
          previousOutstanding: 0,
          totalPayable: resident.monthlyRent + billPerTenant,
          amountPaid: 0,
          outstandingAmount: resident.monthlyRent + billPerTenant,
          status: 'Unpaid',
          notes: `Rent with Room ${room.roomNumber} Light Bill (₹${billPerTenant})`,
        });
        updatedRecords.push(newRecord);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Room ${room.roomNumber} electricity bill of ₹${computedTotalBill} split across ${tenantCount} tenant(s) (₹${billPerTenant} each) for ${rentMonth}.`,
      meterRecord,
      billedTenantsCount: activeResidents.length,
      billPerTenant,
    });
  } catch (err: any) {
    console.error('Error in bill-room API:', err);
    return NextResponse.json({ error: err.message || 'Failed to process room electricity bill' }, { status: 500 });
  }
}
