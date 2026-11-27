import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { Organization } from '@/models/Organization';
import { PGProperty } from '@/models/PGProperty';
import { Room } from '@/models/Room';
import { requireAuth } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const authResult = requireAuth(req, ['vendor']);
    if ('error' in authResult) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    await connectDB();
    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || '';

    const query: any = {};
    if (status && status !== 'all') {
      query.status = status;
    }
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { contactPerson: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
      ];
    }

    const organizations = await Organization.find(query)
      .sort({ createdAt: -1 })
      .populate('ownerId', 'name email phone');

    // Aggregate property counts per organization
    const orgIds = organizations.map((o) => o._id);
    const propertyCounts = await PGProperty.aggregate([
      { $match: { organizationId: { $in: orgIds } } },
      { $group: { _id: '$organizationId', count: { $sum: 1 } } },
    ]);

    const countMap: Record<string, number> = {};
    propertyCounts.forEach((p) => {
      countMap[p._id.toString()] = p.count;
    });

    const enriched = organizations.map((org) => ({
      ...org.toObject(),
      propertiesCount: countMap[org._id.toString()] || 0,
    }));

    return NextResponse.json({ organizations: enriched });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// Action: suspend, reactivate, extend subscription
export async function PATCH(req: NextRequest) {
  try {
    const authResult = requireAuth(req, ['vendor']);
    if ('error' in authResult) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    await connectDB();
    const body = await req.json();
    const { organizationId, action, planId, extendDays } = body;

    if (!organizationId || !action) {
      return NextResponse.json({ error: 'OrganizationId and action are required.' }, { status: 400 });
    }

    const org = await Organization.findById(organizationId);
    if (!org) {
      return NextResponse.json({ error: 'Organization not found.' }, { status: 404 });
    }

    if (action === 'suspend') {
      org.status = 'suspended';
    } else if (action === 'activate') {
      org.status = 'active';
      if (!org.subscriptionEndDate || org.subscriptionEndDate < new Date()) {
        const d = new Date();
        d.setDate(d.getDate() + 30);
        org.subscriptionEndDate = d;
      }
    } else if (action === 'change_plan' && planId) {
      org.planId = planId;
    } else if (action === 'extend' && extendDays) {
      const baseDate = org.subscriptionEndDate && org.subscriptionEndDate > new Date()
        ? org.subscriptionEndDate
        : new Date();
      const extended = new Date(baseDate.getTime() + Number(extendDays) * 24 * 60 * 60 * 1000);
      org.subscriptionEndDate = extended;
      if (org.status === 'expired' || org.status === 'suspended') {
        org.status = 'active';
      }
    }

    await org.save();
    return NextResponse.json({ success: true, organization: org });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
