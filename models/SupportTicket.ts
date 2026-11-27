import mongoose, { Schema, Document } from 'mongoose';

export interface ISupportTicket extends Document {
  ticketNumber: string;
  organizationId: mongoose.Types.ObjectId;
  raisedBy: mongoose.Types.ObjectId;
  category: 'Billing' | 'Technical' | 'Feature Request' | 'Account' | 'Other';
  subject: string;
  description: string;
  priority: 'Low' | 'Medium' | 'High' | 'Urgent';
  status: 'Open' | 'In Progress' | 'Resolved' | 'Closed';
  responses: Array<{
    senderId: mongoose.Types.ObjectId;
    senderRole: 'vendor' | 'admin' | 'staff';
    message: string;
    createdAt: Date;
  }>;
  createdAt: Date;
  updatedAt: Date;
}

const SupportTicketSchema = new Schema<ISupportTicket>(
  {
    ticketNumber: { type: String, required: true, unique: true },
    organizationId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true },
    raisedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    category: {
      type: String,
      enum: ['Billing', 'Technical', 'Feature Request', 'Account', 'Other'],
      default: 'Technical',
    },
    subject: { type: String, required: true },
    description: { type: String, required: true },
    priority: {
      type: String,
      enum: ['Low', 'Medium', 'High', 'Urgent'],
      default: 'Medium',
    },
    status: {
      type: String,
      enum: ['Open', 'In Progress', 'Resolved', 'Closed'],
      default: 'Open',
    },
    responses: [
      {
        senderId: { type: Schema.Types.ObjectId, ref: 'User' },
        senderRole: { type: String, enum: ['vendor', 'admin', 'staff'] },
        message: { type: String, required: true },
        createdAt: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);

SupportTicketSchema.index({ organizationId: 1 });
SupportTicketSchema.index({ status: 1 });

export const SupportTicket =
  mongoose.models.SupportTicket || mongoose.model<ISupportTicket>('SupportTicket', SupportTicketSchema);
