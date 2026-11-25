import mongoose, { Schema, Document } from 'mongoose';

export interface IMealAttendance extends Document {
  residentId: mongoose.Types.ObjectId;
  propertyId: mongoose.Types.ObjectId;
  date: string; // YYYY-MM-DD
  havingBreakfast: boolean;
  havingLunch: boolean;
  havingDinner: boolean;
}

const MealAttendanceSchema = new Schema<IMealAttendance>(
  {
    residentId: { type: Schema.Types.ObjectId, ref: 'ResidentProfile', required: true },
    propertyId: { type: Schema.Types.ObjectId, ref: 'PGProperty', required: true },
    date: { type: String, required: true },
    havingBreakfast: { type: Boolean, default: true },
    havingLunch: { type: Boolean, default: true },
    havingDinner: { type: Boolean, default: true },
  },
  { timestamps: true }
);

MealAttendanceSchema.index({ residentId: 1, date: 1 }, { unique: true });

export const MealAttendance =
  mongoose.models.MealAttendance || mongoose.model<IMealAttendance>('MealAttendance', MealAttendanceSchema);
