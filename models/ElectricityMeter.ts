import mongoose, { Schema, Document } from 'mongoose';

export interface IElectricityMeter extends Document {
  propertyId: mongoose.Types.ObjectId;
  roomId: mongoose.Types.ObjectId;
  billingMonth: string; // YYYY-MM
  previousReading?: number;
  currentReading?: number;
  unitsConsumed?: number;
  ratePerUnit?: number;
  totalBill: number;
  billPerTenant?: number;
  tenantCount?: number;
  isBilledToResidents: boolean;
  meterPhotoUrl?: string; // Bill copy or meter photo URL / file path
  notes?: string;
}

const ElectricityMeterSchema = new Schema<IElectricityMeter>(
  {
    propertyId: { type: Schema.Types.ObjectId, ref: 'PGProperty', required: true },
    roomId: { type: Schema.Types.ObjectId, ref: 'Room', required: true },
    billingMonth: { type: String, required: true },
    previousReading: { type: Number, default: 0 },
    currentReading: { type: Number, default: 0 },
    unitsConsumed: { type: Number, default: 0 },
    ratePerUnit: { type: Number, default: 10 },
    totalBill: { type: Number, required: true },
    billPerTenant: { type: Number, default: 0 },
    tenantCount: { type: Number, default: 1 },
    isBilledToResidents: { type: Boolean, default: false },
    meterPhotoUrl: { type: String, default: '' },
    notes: { type: String, default: '' },
  },
  { timestamps: true }
);

ElectricityMeterSchema.index({ roomId: 1, billingMonth: 1 }, { unique: true });

export const ElectricityMeter =
  mongoose.models.ElectricityMeter || mongoose.model<IElectricityMeter>('ElectricityMeter', ElectricityMeterSchema);
