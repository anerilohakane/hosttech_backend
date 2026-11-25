import mongoose, { Schema, Document } from 'mongoose';

export interface IGuestPass extends Document {
  residentId: mongoose.Types.ObjectId;
  propertyId: mongoose.Types.ObjectId;
  guestName: string;
  guestPhone: string;
  relation: string;
  visitDate: string; // YYYY-MM-DD
  isOvernight: boolean;
  status: 'Pending' | 'Approved' | 'Rejected' | 'Checked In' | 'Checked Out';
  checkInTime?: Date;
  checkOutTime?: Date;
  adminRemarks?: string;
}

const GuestPassSchema = new Schema<IGuestPass>(
  {
    residentId: { type: Schema.Types.ObjectId, ref: 'ResidentProfile', required: true },
    propertyId: { type: Schema.Types.ObjectId, ref: 'PGProperty', required: true },
    guestName: { type: String, required: true },
    guestPhone: { type: String, required: true },
    relation: { type: String, required: true },
    visitDate: { type: String, required: true },
    isOvernight: { type: Boolean, default: false },
    status: {
      type: String,
      enum: ['Pending', 'Approved', 'Rejected', 'Checked In', 'Checked Out'],
      default: 'Pending',
    },
    checkInTime: { type: Date },
    checkOutTime: { type: Date },
    adminRemarks: { type: String },
  },
  { timestamps: true }
);

export const GuestPass = mongoose.models.GuestPass || mongoose.model<IGuestPass>('GuestPass', GuestPassSchema);
