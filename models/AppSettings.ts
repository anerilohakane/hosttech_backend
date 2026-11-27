import mongoose, { Schema, Document } from 'mongoose';

export interface IAppSettings extends Document {
  organizationId?: mongoose.Types.ObjectId;
  rentDueDay: number;
  gracePeriodDays: number;
  reminderSchedule: number[]; // e.g. [-5, -1, 0, 3, 7]
  requirePaymentProof: boolean;
  allowPartialPayment: boolean;
  allowAdvancePayment: boolean;
  autoVerifyDocuments: boolean;
  complaintCategories: string[];
  timezone: string;
  upiId: string;
  bankDetails: {
    accountName: string;
    accountNumber: string;
    ifscCode: string;
    bankName: string;
  };
  chargeElectricitySeparately?: boolean;
  electricityRatePerUnit?: number;
  electricityBillingType?: 'per_unit' | 'fixed_monthly';
  electricityFixedMonthly?: number;
  receiptPrefix: string;
  updatedAt: Date;
}

const AppSettingsSchema = new Schema<IAppSettings>(
  {
    organizationId: { type: Schema.Types.ObjectId, ref: 'Organization', index: true },
    rentDueDay: { type: Number, default: 5 },
    gracePeriodDays: { type: Number, default: 3 },
    reminderSchedule: { type: [Number], default: [-5, -1, 0, 3, 7] },
    requirePaymentProof: { type: Boolean, default: true },
    allowPartialPayment: { type: Boolean, default: true },
    allowAdvancePayment: { type: Boolean, default: false },
    autoVerifyDocuments: { type: Boolean, default: false },
    complaintCategories: {
      type: [String],
      default: ['Water', 'Electricity', 'Wi-Fi', 'Cleaning', 'Food', 'Maintenance', 'Room issues', 'Other'],
    },
    timezone: { type: String, default: 'Asia/Kolkata' },
    upiId: { type: String, default: 'pgpay@upi' },
    bankDetails: {
      accountName: { type: String, default: 'PG Management Ltd' },
      accountNumber: { type: String, default: '987654321012' },
      ifscCode: { type: String, default: 'HDFC0001234' },
      bankName: { type: String, default: 'HDFC Bank' },
    },
    chargeElectricitySeparately: { type: Boolean, default: false },
    electricityRatePerUnit: { type: Number, default: 10 },
    electricityBillingType: { type: String, enum: ['per_unit', 'fixed_monthly'], default: 'per_unit' },
    electricityFixedMonthly: { type: Number, default: 0 },
    receiptPrefix: { type: String, default: 'REC' },
  },
  { timestamps: true }
);

export const AppSettings =
  mongoose.models.AppSettings || mongoose.model<IAppSettings>('AppSettings', AppSettingsSchema);

