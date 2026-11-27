import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { SubscriptionPlan } from '@/models/SubscriptionPlan';
import { requireAuth } from '@/lib/auth';

const DEFAULT_PLANS = [
  {
    planId: 'starter',
    name: 'Starter Plan',
    priceMonthly: 999,
    priceYearly: 9999,
    maxProperties: 1,
    maxRooms: 15,
    features: ['Up to 15 Rooms', '1 Property', 'Online Rent Tracking', 'Resident Mobile Portal', 'Basic Reports'],
    trialDays: 14,
    isActive: true,
  },
  {
    planId: 'growth',
    name: 'Growth Plan',
    priceMonthly: 1999,
    priceYearly: 19999,
    maxProperties: 3,
    maxRooms: 50,
    features: [
      'Up to 50 Rooms',
      'Up to 3 Properties',
      'Automated Rent Reminders',
      'KYC & Document Verification',
      'Complaint Ticket System',
      'Staff Role Management',
    ],
    trialDays: 14,
    isActive: true,
  },
  {
    planId: 'pro',
    name: 'Pro Enterprise',
    priceMonthly: 3499,
    priceYearly: 34999,
    maxProperties: 10,
    maxRooms: 200,
    features: [
      'Unlimited / Up to 200 Rooms',
      'Up to 10 Properties',
      'Custom Branding & Invoicing',
      'Advance Financial Analytics',
      'Priority HostTech Support',
      'Dedicated Account Manager',
    ],
    trialDays: 14,
    isActive: true,
  },
];

export async function GET(req: NextRequest) {
  try {
    await connectDB();
    let plans = await SubscriptionPlan.find({ isActive: true });
    if (plans.length === 0) {
      // Seed default plans if empty
      await SubscriptionPlan.insertMany(DEFAULT_PLANS);
      plans = await SubscriptionPlan.find({ isActive: true });
    }
    return NextResponse.json({ plans });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// Vendor can update or add plans dynamically
export async function POST(req: NextRequest) {
  try {
    const authResult = requireAuth(req, ['vendor']);
    if ('error' in authResult) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    await connectDB();
    const body = await req.json();
    const { planId, name, priceMonthly, priceYearly, maxProperties, maxRooms, features } = body;

    const plan = await SubscriptionPlan.findOneAndUpdate(
      { planId },
      {
        $set: {
          name,
          priceMonthly,
          priceYearly,
          maxProperties,
          maxRooms,
          features,
          isActive: true,
        },
      },
      { upsert: true, new: true }
    );

    return NextResponse.json({ success: true, plan });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
