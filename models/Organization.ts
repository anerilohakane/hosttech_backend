import mongoose, { Schema, Document } from 'mongoose';

export type OrganizationStatus = 'trial' | 'active' | 'suspended' | 'expired' | 'pending';

export interface IOrganization extends Document {
  name: string;
  code: string; // Unique slug or code e.g. 'emerald-coliving'
  ownerId: mongoose.Types.ObjectId;
  contactPerson: string;
  email: string;
  phone: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  pgType?: 'Coliving' | 'Gents' | 'Ladies';
  status: OrganizationStatus;
  planId?: string; // 'starter' | 'growth' | 'pro'
  billingCycle?: 'monthly' | 'yearly';
  paymentDetails?: {
    method?: 'upi' | 'card';
    upiId?: string;
    cardLast4?: string;
    cardName?: string;
  };
  subscriptionStartDate?: Date;
  subscriptionEndDate?: Date;
  trialEndsAt?: Date;
  gracePeriodEndsAt?: Date;
  settings?: {
    maxProperties?: number;
    maxRooms?: number;
    allowOnlinePayments?: boolean;
    smsNotifications?: boolean;
  };
  createdAt: Date;
  updatedAt: Date;
}

const OrganizationSchema = new Schema<IOrganization>(
  {
    name: { type: String, required: true, trim: true },
    code: { type: String, required: true, unique: true, lowercase: true, trim: true },
    ownerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    contactPerson: { type: String, required: true, trim: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    phone: { type: String, required: true, trim: true },
    address: { type: String },
    city: { type: String },
    state: { type: String },
    pincode: { type: String },
    pgType: { type: String, enum: ['Coliving', 'Gents', 'Ladies'], default: 'Coliving' },
    status: {
      type: String,
      enum: ['trial', 'active', 'suspended', 'expired', 'pending'],
      default: 'trial',
    },
    planId: { type: String, default: 'starter' },
    billingCycle: { type: String, enum: ['monthly', 'yearly'], default: 'monthly' },
    paymentDetails: {
      method: { type: String, enum: ['upi', 'card'], default: 'upi' },
      upiId: { type: String },
      cardLast4: { type: String },
      cardName: { type: String },
    },
    subscriptionStartDate: { type: Date },
    subscriptionEndDate: { type: Date },
    trialEndsAt: { type: Date },
    gracePeriodEndsAt: { type: Date },
    settings: {
      maxProperties: { type: Number, default: 2 },
      maxRooms: { type: Number, default: 30 },
      allowOnlinePayments: { type: Boolean, default: true },
      smsNotifications: { type: Boolean, default: false },
    },
  },
  { timestamps: true }
);

OrganizationSchema.index({ code: 1 });
OrganizationSchema.index({ email: 1 });
OrganizationSchema.index({ status: 1 });

export const Organization =
  mongoose.models.Organization || mongoose.model<IOrganization>('Organization', OrganizationSchema);
