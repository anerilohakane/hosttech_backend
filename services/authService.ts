import { connectDB } from '@/lib/db';
import { User } from '@/models/User';
import { ResidentProfile } from '@/models/ResidentProfile';
import { Organization } from '@/models/Organization';
import { hashPassword, comparePassword, signToken, TokenPayload } from '@/lib/auth';

export async function authenticateUser({ email, password }: { email: string; password: string }) {
  await connectDB();
  const cleanEmail = email.toLowerCase().trim();
  const user = await User.findOne({ email: cleanEmail });
  if (!user) {
    throw new Error('Invalid email or password.');
  }
  if (!user.isActive) {
    throw new Error('Account is inactive.');
  }

  const isValid = await comparePassword(password, user.password);
  if (!isValid) {
    throw new Error('Invalid email or password.');
  }

  let residentId: string | undefined;
  let propertyId = user.propertyId?.toString();
  let organizationId = user.organizationId?.toString();
  let organizationStatus: string | undefined;

  // If user belongs to an organization, check subscription/org status
  if (organizationId) {
    const org = await Organization.findById(organizationId);
    if (org) {
      organizationStatus = org.status;
      // If organization is suspended, block access except for account renewal
      if (org.status === 'suspended') {
        throw new Error('Your PG account has been suspended. Please contact HostTech support.');
      }
    }
  }

  if (user.role === 'resident') {
    const profile = await ResidentProfile.findOne({ userId: user._id });
    if (profile) {
      residentId = profile._id.toString();
      propertyId = profile.propertyId?.toString();
      if (!organizationId && profile.organizationId) {
        organizationId = profile.organizationId.toString();
      }
    }
  }

  const payload: TokenPayload = {
    userId: user._id.toString(),
    email: user.email,
    role: user.role,
    name: user.name,
    organizationId,
    organizationStatus,
    permissions: user.permissions || [],
    residentId,
    propertyId,
  };

  const token = signToken(payload);
  return { token, user: payload };
}

export async function getUserProfile(userId: string) {
  await connectDB();
  const user = await User.findById(userId).select('-password');
  if (!user) throw new Error('User not found.');

  let profileData: any = null;
  let organizationData: any = null;

  if (user.organizationId) {
    organizationData = await Organization.findById(user.organizationId);
  }

  if (user.role === 'resident') {
    const rawProfile = await ResidentProfile.findOne({ userId: user._id })
      .populate('propertyId', 'name address city')
      .populate('roomId', 'roomNumber floor sharingType rentPerBed defaultRent roomType')
      .populate('bedId', 'bedNumber');

    if (rawProfile) {
      const { ResidentDocument } = await import('@/models/ResidentDocument');
      const docs = await ResidentDocument.find({ residentId: rawProfile._id }).sort({ createdAt: -1 });
      profileData = {
        ...rawProfile.toObject(),
        documents: docs,
      };
    }
  }

  return { user, residentProfile: profileData, organization: organizationData };
}
