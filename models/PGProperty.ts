import mongoose, { Schema, Document } from 'mongoose';

export interface IPGProperty extends Document {
  organizationId?: mongoose.Types.ObjectId; // Organization/PG tenant scope
  name: string;
  pgType: 'Gents' | 'Ladies' | 'Coliving';
  address: string;
  city: string;
  state: string;
  pincode: string;
  contactPerson: string;
  contactNumber: string;
  description: string;
  facilities: string[];
  rules: string[];
  images: string[];
  chargeElectricitySeparately?: boolean;
  electricityRatePerUnit?: number;
  electricityFixedMonthly?: number;
  sharingRates?: {
    single?: number;
    double?: number;
    triple?: number;
    four?: number;
  };
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const PGPropertySchema = new Schema<IPGProperty>(
  {
    organizationId: { type: Schema.Types.ObjectId, ref: 'Organization', index: true },
    name: { type: String, required: true, trim: true },
    pgType: { type: String, enum: ['Gents', 'Ladies', 'Coliving'], default: 'Coliving' },
    address: { type: String, required: true },
    city: { type: String, required: true },
    state: { type: String, required: true },
    pincode: { type: String, required: true },
    contactPerson: { type: String, required: true },
    contactNumber: { type: String, required: true },
    description: { type: String, default: '' },
    facilities: [{ type: String }],
    rules: [{ type: String }],
    images: [{ type: String }],
    chargeElectricitySeparately: { type: Boolean, default: false },
    electricityRatePerUnit: { type: Number, default: 10 },
    electricityFixedMonthly: { type: Number, default: 0 },
    sharingRates: {
      single: { type: Number, default: 12000 },
      double: { type: Number, default: 8500 },
      triple: { type: Number, default: 6500 },
      four: { type: Number, default: 5000 },
    },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

PGPropertySchema.index({ organizationId: 1 });

export const PGProperty = mongoose.models.PGProperty || mongoose.model<IPGProperty>('PGProperty', PGPropertySchema);
