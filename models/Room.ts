import mongoose, { Schema, Document } from 'mongoose';

export interface IRoom extends Document {
  organizationId?: mongoose.Types.ObjectId; // Organization/PG tenant scope
  propertyId: mongoose.Types.ObjectId;
  roomNumber: string;
  floor: number;
  roomType: 'AC' | 'Non-AC';
  rentalType: 'Full Room (Single Tenant)' | 'Sharing';
  sharingType?: 'Single' | '2-Sharing' | '3-Sharing' | '4-Sharing';
  maxCapacity: number;
  currentOccupants: number;
  defaultRent: number;
  hasElectricityMeter?: boolean;
  electricityRatePerUnit?: number;
  status: 'Available' | 'Full' | 'Maintenance';
  createdAt: Date;
  updatedAt: Date;
}

const RoomSchema = new Schema<IRoom>(
  {
    organizationId: { type: Schema.Types.ObjectId, ref: 'Organization', index: true },
    propertyId: { type: Schema.Types.ObjectId, ref: 'PGProperty', required: true, index: true },
    roomNumber: { type: String, required: true, trim: true },
    floor: { type: Number, default: 1 },
    roomType: { type: String, enum: ['AC', 'Non-AC'], default: 'Non-AC' },
    rentalType: {
      type: String,
      enum: ['Full Room (Single Tenant)', 'Sharing'],
      default: 'Sharing',
    },
    sharingType: {
      type: String,
      enum: ['Single', '2-Sharing', '3-Sharing', '4-Sharing'],
      default: '2-Sharing',
    },
    maxCapacity: { type: Number, default: 2 },
    currentOccupants: { type: Number, default: 0 },
    defaultRent: { type: Number, default: 8000 },
    hasElectricityMeter: { type: Boolean, default: false },
    electricityRatePerUnit: { type: Number, default: 10 },
    status: { type: String, enum: ['Available', 'Full', 'Maintenance'], default: 'Available' },
  },
  { timestamps: true }
);

RoomSchema.index({ propertyId: 1, roomNumber: 1 }, { unique: true });
RoomSchema.index({ organizationId: 1 });

export const Room = mongoose.models.Room || mongoose.model<IRoom>('Room', RoomSchema);
