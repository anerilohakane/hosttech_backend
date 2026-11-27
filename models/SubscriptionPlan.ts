import mongoose, { Schema, Document } from 'mongoose';

export interface ISubscriptionPlan extends Document {
  planId: string; // 'starter' | 'growth' | 'pro'
  name: string;
  priceMonthly: number;
  priceYearly: number;
  maxProperties: number;
  maxRooms: number;
  features: string[];
  trialDays: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const SubscriptionPlanSchema = new Schema<ISubscriptionPlan>(
  {
    planId: { type: String, required: true, unique: true, lowercase: true, trim: true },
    name: { type: String, required: true },
    priceMonthly: { type: Number, required: true },
    priceYearly: { type: Number, required: true },
    maxProperties: { type: Number, default: 1 },
    maxRooms: { type: Number, default: 15 },
    features: [{ type: String }],
    trialDays: { type: Number, default: 14 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export const SubscriptionPlan =
  mongoose.models.SubscriptionPlan || mongoose.model<ISubscriptionPlan>('SubscriptionPlan', SubscriptionPlanSchema);
