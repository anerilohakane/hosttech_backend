import mongoose, { Schema, Document } from 'mongoose';

export interface IMessMenu extends Document {
  propertyId: mongoose.Types.ObjectId;
  dayOfWeek: 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday' | 'Sunday';
  breakfast: string;
  lunch: string;
  dinner: string;
  specialNote?: string;
}

const MessMenuSchema = new Schema<IMessMenu>(
  {
    propertyId: { type: Schema.Types.ObjectId, ref: 'PGProperty', required: true },
    dayOfWeek: {
      type: String,
      enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
      required: true,
    },
    breakfast: { type: String, required: true },
    lunch: { type: String, required: true },
    dinner: { type: String, required: true },
    specialNote: { type: String },
  },
  { timestamps: true }
);

MessMenuSchema.index({ propertyId: 1, dayOfWeek: 1 }, { unique: true });

export const MessMenu = mongoose.models.MessMenu || mongoose.model<IMessMenu>('MessMenu', MessMenuSchema);
