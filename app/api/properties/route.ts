import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { getAllProperties, createProperty } from '@/services/propertyService';
import { logAudit } from '@/lib/audit';

export async function GET(req: NextRequest) {
  const auth = requireAuth(req);
  if ('error' in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    // If PG Admin, staff, or resident: strictly isolate to their organizationId
    const filters: any = {};
    if (auth.user.role !== 'vendor') {
      if (auth.user.organizationId) {
        filters.organizationId = auth.user.organizationId;
      } else if (auth.user.propertyId) {
        filters._id = auth.user.propertyId;
      }
    }

    const properties = await getAllProperties(filters);
    return NextResponse.json({ success: true, properties });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const auth = requireAuth(req, ['admin', 'vendor']);
  if ('error' in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const body = await req.json();
    // Enforce organizationId from authenticated token
    if (auth.user.role === 'admin' && auth.user.organizationId) {
      body.organizationId = auth.user.organizationId;
    }
    const result = await createProperty(body);
    const property = result.property;

    await logAudit({
      action: 'PG Property Created',
      module: 'Properties',
      recordId: property._id.toString(),
      adminId: auth.user.userId,
      adminName: auth.user.name,
      newValues: { name: property.name, city: property.city, adminUser: result.adminUser },
    });

    return NextResponse.json({ success: true, property, adminUser: result.adminUser }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
