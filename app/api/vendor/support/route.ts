import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { SupportTicket } from '@/models/SupportTicket';
import { requireAuth } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const authResult = requireAuth(req, ['vendor', 'admin', 'staff']);
    if ('error' in authResult) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    await connectDB();
    const query: any = {};

    // If PG Admin/Staff, restrict tickets to their organization
    if (authResult.user.role !== 'vendor') {
      if (!authResult.user.organizationId) {
        return NextResponse.json({ error: 'No organization attached.' }, { status: 400 });
      }
      query.organizationId = authResult.user.organizationId;
    }

    const tickets = await SupportTicket.find(query)
      .sort({ createdAt: -1 })
      .populate('organizationId', 'name code email phone')
      .populate('raisedBy', 'name email');

    return NextResponse.json({ tickets });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const authResult = requireAuth(req, ['admin', 'staff']);
    if ('error' in authResult) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    await connectDB();
    const body = await req.json();
    const { category, subject, description, priority = 'Medium' } = body;

    if (!subject || !description) {
      return NextResponse.json({ error: 'Subject and description are required.' }, { status: 400 });
    }

    const ticketNumber = `TICK-${Date.now().toString().slice(-6)}`;
    const ticket = new SupportTicket({
      ticketNumber,
      organizationId: authResult.user.organizationId,
      raisedBy: authResult.user.userId,
      category,
      subject,
      description,
      priority,
      status: 'Open',
    });

    await ticket.save();
    return NextResponse.json({ success: true, ticket });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const authResult = requireAuth(req, ['vendor', 'admin', 'staff']);
    if ('error' in authResult) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    await connectDB();
    const body = await req.json();
    const { ticketId, status, responseMessage } = body;

    const ticket = await SupportTicket.findById(ticketId);
    if (!ticket) {
      return NextResponse.json({ error: 'Ticket not found.' }, { status: 404 });
    }

    if (status) {
      ticket.status = status;
    }

    if (responseMessage) {
      ticket.responses.push({
        senderId: authResult.user.userId as any,
        senderRole: authResult.user.role as any,
        message: responseMessage,
        createdAt: new Date(),
      });
    }

    await ticket.save();
    return NextResponse.json({ success: true, ticket });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
