import mongoose, { Schema, Document } from 'mongoose';

export type UserRole = 'vendor' | 'admin' | 'staff' | 'resident';

export interface IUser extends Document {
  name: string;
  email: string;
  phone: string;
  password?: string;
  role: UserRole;
  organizationId?: mongoose.Types.ObjectId; // Organization/PG this user belongs to
  propertyId?: mongoose.Types.ObjectId;
  permissions?: string[]; // Granular staff permissions e.g. ['rooms', 'tenants', 'payments', 'complaints']
  fcmToken?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    phone: { type: String, required: true, unique: true, trim: true },
    password: { type: String, required: true },
    role: { type: String, enum: ['vendor', 'admin', 'staff', 'resident'], default: 'resident' },
    organizationId: { type: Schema.Types.ObjectId, ref: 'Organization' },
    propertyId: { type: Schema.Types.ObjectId, ref: 'PGProperty' },
    permissions: [{ type: String }],
    fcmToken: { type: String },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

UserSchema.index({ organizationId: 1 });

export const User = mongoose.models.User || mongoose.model<IUser>('User', UserSchema);
