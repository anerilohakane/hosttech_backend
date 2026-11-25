import mongoose, { Schema, Document } from 'mongoose';

export interface IElectricityMeter extends Document {
  propertyId: mongoose.Types.ObjectId;
  roomId: mongoose.Types.ObjectId;
  billingMonth: string; // YYYY-MM
  previousReading: number;
  currentReading: number;
  unitsConsumed: number;
  ratePerUnit: number;
  totalBill: number;
  isBilledToResidents: boolean;
  meterPhotoUrl?: string;
  notes?: string;
}

const ElectricityMeterSchema = new Schema<IElectricityMeter>(
  {
    propertyId: { type: Schema.Types.ObjectId, ref: 'PGProperty', required: true },
    roomId: { type: Schema.Types.ObjectId, ref: 'Room', required: true },
    billingMonth: { type: String, required: true },
    previousReading: { type: Number, required: true },
    currentReading: { type: Number, required: true },
    unitsConsumed: { type: Number, required: true },
    ratePerUnit: { type: Number, default: 10 }, // ₹10 per unit typical in Indian PGs
    totalBill: { type: Number, required: true },
    isBilledToResidents: { type: Boolean, default: false },
    meterPhotoUrl: { type: String },
    notes: { type: String },
  },
  { timestamps: true }
);

ElectricityMeterSchema.index({ roomId: 1, billingMonth: 1 }, { unique: true });

export const ElectricityMeter =
  mongoose.models.ElectricityMeter || mongoose.model<IElectricityMeter>('ElectricityMeter', ElectricityMeterSchema);
