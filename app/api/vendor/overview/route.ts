import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { Organization } from '@/models/Organization';
import { User } from '@/models/User';
import { SupportTicket } from '@/models/SupportTicket';
import { requireAuth } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const authResult = requireAuth(req, ['vendor']);
    if ('error' in authResult) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    await connectDB();

    const [
      totalOrganizations,
      activeSubscriptions,
      trialOrganizations,
      suspendedOrganizations,
      expiredOrganizations,
      totalUsers,
      recentOrgs,
      openTicketsCount,
    ] = await Promise.all([
      Organization.countDocuments(),
      Organization.countDocuments({ status: 'active' }),
      Organization.countDocuments({ status: 'trial' }),
      Organization.countDocuments({ status: 'suspended' }),
      Organization.countDocuments({ status: 'expired' }),
      User.countDocuments(),
      Organization.find().sort({ createdAt: -1 }).limit(6).populate('ownerId', 'name email phone'),
      SupportTicket.countDocuments({ status: { $in: ['Open', 'In Progress'] } }),
    ]);

    // Calculate approximate MRR based on plans (Starter: 999, Growth: 1999, Pro: 3499)
    const activeOrgs = await Organization.find({ status: 'active' }, 'planId');
    const planPrices: Record<string, number> = { starter: 999, growth: 1999, pro: 3499 };
    const mrr = activeOrgs.reduce((sum, org) => sum + (planPrices[org.planId || 'starter'] || 999), 0);

    return NextResponse.json({
      metrics: {
        totalOrganizations,
        activeSubscriptions,
        trialOrganizations,
        suspendedOrganizations,
        expiredOrganizations,
        totalUsers,
        openTicketsCount,
        mrr,
      },
      recentOrganizations: recentOrgs,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
