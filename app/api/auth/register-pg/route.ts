import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { User } from '@/models/User';
import { Organization } from '@/models/Organization';
import { PGProperty } from '@/models/PGProperty';
import { Room } from '@/models/Room';
import { AppSettings } from '@/models/AppSettings';
import { hashPassword, signToken } from '@/lib/auth';
import { sendWelcomeEmail } from '@/lib/emailService';
import crypto from 'crypto';

export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const body = await req.json();

    const {
      // Step 1: Owner Info
      ownerName,
      email,
      phone,
      password,
      // Step 2: PG Profile
      pgName,
      pgType = 'Coliving',
      address,
      city,
      state,
      pincode,
      // Step 3: Initial Property Setup & Sharing Pricing
      floorsCount = 2,
      roomsPerFloor = 7,
      baseRent = 8500,
      rent2Sharing = 8000,
      rent3Sharing = 6500,
      rent4Sharing = 5000,
      chargeElectricity = false,
      electricityRate = 10,
      facilities = ['High Speed Wi-Fi', 'Daily Housekeeping', 'Power Backup'],
      // Step 4: Plan & Payment Details
      planId = 'starter',
      billingCycle = 'monthly',
      paymentMethod = 'upi',
      upiId,
      cardNumber,
      cardName,
    } = body;

    const cleanEmail = email?.toLowerCase().trim();
    const cleanPhone = phone?.trim();

    if (!ownerName || !cleanEmail || !cleanPhone || !pgName) {
      return NextResponse.json(
        { error: 'Missing required fields: Name, Email, Phone, and PG Name are required.' },
        { status: 400 }
      );
    }

    // Check if user already exists
    const existingUser = await User.findOne({ $or: [{ email: cleanEmail }, { phone: cleanPhone }] });
    if (existingUser) {
      return NextResponse.json(
        { error: 'An account with this email or phone number already exists.' },
        { status: 409 }
      );
    }

    // Generate system password if not provided or enforce secure system-generated password
    const rawPassword = password && password.trim() ? password.trim() : `Host@${crypto.randomBytes(3).toString('hex').toUpperCase()}#${Math.floor(100 + Math.random() * 900)}`;

    // Generate unique code for organization slug
    const baseSlug = pgName
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '') || 'pg';
    let code = baseSlug;
    let counter = 1;
    while (await Organization.findOne({ code })) {
      code = `${baseSlug}-${counter}`;
      counter++;
    }

    const hashedPassword = await hashPassword(rawPassword);

    // 1. Create Organization (14-day free trial by default)
    const now = new Date();
    const trialEndsAt = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);

    // Placeholder ownerId, updated right after User creation
    const org = new Organization({
      name: pgName,
      code,
      ownerId: new (require('mongoose').Types.ObjectId)(),
      contactPerson: ownerName,
      email: cleanEmail,
      phone: cleanPhone,
      address,
      city,
      state,
      pincode,
      pgType,
      status: 'trial',
      planId,
      billingCycle: billingCycle === 'yearly' ? 'yearly' : 'monthly',
      paymentDetails: {
        method: paymentMethod || 'upi',
        upiId: paymentMethod === 'upi' ? upiId : undefined,
        cardLast4: paymentMethod === 'card' && cardNumber ? cardNumber.replace(/\s+/g, '').slice(-4) : undefined,
        cardName: paymentMethod === 'card' ? cardName : undefined,
      },
      subscriptionStartDate: now,
      subscriptionEndDate: trialEndsAt,
      trialEndsAt,
    });

    // 2. Create PG Admin User
    const user = new User({
      name: ownerName,
      email: cleanEmail,
      phone: cleanPhone,
      password: hashedPassword,
      role: 'admin',
      organizationId: org._id,
      isActive: true,
    });
    await user.save();

    org.ownerId = user._id;
    await org.save();

    // 3. Create initial PG Property
    const property = new PGProperty({
      organizationId: org._id,
      name: pgName,
      pgType,
      address: address || 'Main Road',
      city: city || 'Bengaluru',
      state: state || 'Karnataka',
      pincode: pincode || '560001',
      contactPerson: ownerName,
      contactNumber: cleanPhone,
      facilities: facilities.length > 0 ? facilities : ['High Speed Wi-Fi'],
      rules: ['No smoking', 'Quiet hours after 10 PM'],
      chargeElectricitySeparately: Boolean(chargeElectricity),
      electricityRatePerUnit: Number(electricityRate) || 10,
      sharingRates: {
        double: Number(rent2Sharing) || Number(baseRent) || 8000,
        triple: Number(rent3Sharing) || 6500,
        four: Number(rent4Sharing) || 5000,
      },
      isActive: true,
    });
    await property.save();

    user.propertyId = property._id;
    await user.save();

    // 4. Generate Initial Rooms with dynamic sharing & pricing
    const createdRooms = [];
    const parsedFloors = Math.min(Number(floorsCount) || 2, 5);
    const parsedRoomsPerFloor = Math.min(Number(roomsPerFloor) || 7, 10);
    const r2Price = Number(rent2Sharing) || Number(baseRent) || 8000;
    const r3Price = Number(rent3Sharing) || 6500;
    const r4Price = Number(rent4Sharing) || 5000;

    for (let f = 1; f <= parsedFloors; f++) {
      for (let r = 1; r <= parsedRoomsPerFloor; r++) {
        const roomNumber = `${f}0${r}`;
        let sharingType: '2-Sharing' | '3-Sharing' | '4-Sharing' = '2-Sharing';
        let capacity = 2;
        let defaultRent = r2Price;

        if (r % 3 === 1) {
          sharingType = '2-Sharing';
          capacity = 2;
          defaultRent = r2Price;
        } else if (r % 3 === 2) {
          sharingType = '3-Sharing';
          capacity = 3;
          defaultRent = r3Price;
        } else {
          sharingType = '4-Sharing';
          capacity = 4;
          defaultRent = r4Price;
        }

        createdRooms.push({
          organizationId: org._id,
          propertyId: property._id,
          roomNumber,
          floor: f,
          roomType: r <= 3 ? 'AC' : 'Non-AC',
          rentalType: 'Sharing',
          sharingType,
          maxCapacity: capacity,
          currentOccupants: 0,
          defaultRent,
          hasElectricityMeter: Boolean(chargeElectricity),
          electricityRatePerUnit: Number(electricityRate) || 10,
          status: 'Available',
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }
    }
    if (createdRooms.length > 0) {
      await Room.insertMany(createdRooms);
    }

    // 5. Initialize AppSettings for this PG
    await AppSettings.create({
      organizationId: org._id,
      rentDueDay: 5,
      gracePeriodDays: 3,
      reminderSchedule: [-5, -1, 0, 3, 7],
      requirePaymentProof: true,
      allowPartialPayment: true,
      allowAdvancePayment: false,
      autoVerifyDocuments: false,
      chargeElectricitySeparately: Boolean(chargeElectricity),
      electricityRatePerUnit: Number(electricityRate) || 10,
      complaintCategories: ['Water', 'Electricity', 'Wi-Fi', 'Cleaning', 'Food', 'Maintenance', 'Other'],
      timezone: 'Asia/Kolkata',
      receiptPrefix: code.substring(0, 4).toUpperCase(),
    });

    // 6. Sign JWT token so the user is immediately logged in
    const tokenPayload = {
      userId: user._id.toString(),
      email: user.email,
      role: 'admin' as const,
      name: user.name,
      organizationId: org._id.toString(),
      organizationStatus: org.status,
      propertyId: property._id.toString(),
    };
    const token = signToken(tokenPayload);

    // 7. Send Welcome Email with login credentials asynchronously
    try {
      await sendWelcomeEmail({
        toEmail: cleanEmail,
        ownerName,
        pgName,
        username: cleanEmail,
        systemPassword: rawPassword,
        planName: planId ? (planId.charAt(0).toUpperCase() + planId.slice(1)) : 'Starter',
      });
      console.log(`[EMAIL] Welcome email with credentials successfully sent to: ${cleanEmail}`);
    } catch (emailErr: any) {
      console.error('[EMAIL ERROR] Failed to send welcome email:', emailErr.message || emailErr);
      // We don't fail registration if email provider has a transient glitch, but log it clearly
    }

    return NextResponse.json({
      success: true,
      message: 'PG registered and initialized successfully! Welcome email sent with login credentials.',
      token,
      generatedPassword: rawPassword,
      user: tokenPayload,
      organization: {
        id: org._id,
        name: org.name,
        code: org.code,
        status: org.status,
        trialEndsAt: org.trialEndsAt,
      },
    });
  } catch (error: any) {
    console.error('Registration error:', error);
    return NextResponse.json({ error: error.message || 'Failed to complete registration.' }, { status: 500 });
  }
}
