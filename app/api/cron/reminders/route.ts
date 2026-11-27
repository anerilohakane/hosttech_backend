import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { RentRecord } from '@/models/RentRecord';
import { ResidentProfile } from '@/models/ResidentProfile';
import { PGProperty } from '@/models/PGProperty';
import { AppSettings } from '@/models/AppSettings';
import { createInAppNotification } from '@/lib/notifications';
import { generateMonthlyRentForActiveResidents } from '@/services/rentService';
import { sendRentReminderEmail } from '@/lib/emailService';

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    const secret = process.env.CRON_SECRET || 'pg_cron_secure_key_12345';
    
    // Check cron authorization header or allow logged-in admin token
    const isCronSecret = authHeader === `Bearer ${secret}`;
    const user = requireAuth(req);
    const isAdmin = !('error' in user) && user.user.role === 'admin';

    if (!isCronSecret && !isAdmin) {
      return NextResponse.json({ error: 'Unauthorized: Admin or valid cron secret required' }, { status: 401 });
    }

    await connectDB();
    const now = new Date();
    const currentBillingMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    // 1. Automatic monthly rent generation if not yet generated
    const rentGenResult = await generateMonthlyRentForActiveResidents({
      billingMonth: currentBillingMonth,
      adminName: 'Automated Cron Scheduler',
    });

    // 2. Scheduled Rent Reminders
    const unpaidRentRecords = await RentRecord.find({
      status: { $in: ['Unpaid', 'Partially Paid', 'Overdue'] },
      outstandingAmount: { $gt: 0 },
    }).populate('residentId').populate('propertyId');

    const appSettings = await AppSettings.findOne();
    const defaultUpi = appSettings?.upiId || 'pgpay@upi';

    let inAppRemindersSent = 0;
    let emailsSent = 0;
    const todayMs = now.getTime();

    // Check optional body flag `forceSendAll` if an admin triggers month-end reminders manually
    let forceSendAll = false;
    try {
      const body = await req.json().catch(() => ({}));
      if (body?.forceSendAll) forceSendAll = true;
    } catch {
      // no body
    }

    for (const record of unpaidRentRecords) {
      const resident: any = record.residentId;
      if (!resident || resident.status === 'Vacated') continue;

      const dueMs = new Date(record.dueDate).getTime();
      const diffDays = Math.round((dueMs - todayMs) / (1000 * 60 * 60 * 24));

      // Eligible: forceSendAll (e.g. month-end manual trigger) OR scheduled window
      // [-5, -1, 0, 3, 7] days or end of month / overdue
      const isEligibleReminder =
        forceSendAll ||
        diffDays === 5 ||
        diffDays === 1 ||
        diffDays === 0 ||
        diffDays === -3 ||
        (diffDays < -3 && diffDays % 7 === 0);

      if (isEligibleReminder) {
        let title = `Rent Reminder: ${record.rentMonth}`;
        if (diffDays < 0) {
          title = `OVERDUE NOTICE: Rent for ${record.rentMonth}`;
          record.status = 'Overdue';
          await record.save();
        }

        // Send in-app notification
        await createInAppNotification({
          recipientId: resident.userId,
          title,
          message: `Dear ${resident.fullName}, your rent of ₹${record.rentAmount} for ${record.rentMonth} has an outstanding balance of ₹${record.outstandingAmount}. Due date: ${new Date(record.dueDate).toLocaleDateString('en-IN')}. Please submit your payment.`,
          type: 'Rent',
          referenceId: record._id.toString(),
        });
        inAppRemindersSent++;

        // Send high-contrast month-end rent reminder email
        if (resident.email) {
          const property: any = record.propertyId;
          const pgName = property?.name || 'HostTech PG';

          // Fetch room number if populated or populate
          let roomNumber = 'Assigned';
          if (resident.roomId) {
            const populatedResident = await ResidentProfile.findById(resident._id).populate('roomId');
            roomNumber = (populatedResident?.roomId as any)?.roomNumber || 'Assigned';
          }

          sendRentReminderEmail({
            toEmail: resident.email,
            tenantName: resident.fullName,
            pgName,
            roomNumber,
            rentMonth: record.rentMonth,
            baseRent: record.rentAmount || resident.monthlyRent,
            electricityAmount: record.electricityCharges || 0,
            maintenanceAmount: record.maintenanceCharges || 0,
            totalPayable: record.totalPayable,
            amountPaid: record.amountPaid || 0,
            outstandingBalance: record.outstandingAmount,
            dueDate: record.dueDate,
            upiId: defaultUpi,
          }).catch(err => {
            console.error(`[Rent Reminder Email Error] for ${resident.email}:`, err);
          });
          emailsSent++;
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Scheduled cron execution completed',
      billingMonth: currentBillingMonth,
      rentGeneration: rentGenResult,
      inAppRemindersSent,
      emailsSent,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
