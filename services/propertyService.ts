import { connectDB } from '@/lib/db';
import { PGProperty } from '@/models/PGProperty';
import { Room } from '@/models/Room';
import { Bed } from '@/models/Bed';
import { ResidentProfile } from '@/models/ResidentProfile';
import { User } from '@/models/User';
import { hashPassword } from '@/lib/auth';

export async function getAllProperties(filters: { isActive?: boolean; organizationId?: string; _id?: string } = {}) {
  await connectDB();
  const query: any = {};
  if (filters.isActive !== undefined) {
    query.isActive = filters.isActive;
  }
  if (filters.organizationId) {
    query.organizationId = filters.organizationId;
  }
  if (filters._id) {
    query._id = filters._id;
  }
  return PGProperty.find(query).sort({ createdAt: -1 });
}

export async function getPropertyById(id: string) {
  await connectDB();
  const property = await PGProperty.findById(id);
  if (!property) throw new Error('PG Property not found');
  
  // Also get stats
  const totalRooms = await Room.countDocuments({ propertyId: id });
  const totalBeds = await Bed.countDocuments({ propertyId: id });
  const occupiedBeds = await Bed.countDocuments({ propertyId: id, isOccupied: true });
  const activeResidents = await ResidentProfile.countDocuments({ propertyId: id, status: 'Active' });

  return {
    property,
    stats: {
      totalRooms,
      totalBeds,
      occupiedBeds,
      vacantBeds: totalBeds - occupiedBeds,
      activeResidents,
    },
  };
}

export async function createProperty(data: any) {
  await connectDB();

  // Validate required property fields with graceful defaults
  const propertyData = {
    name: data.name?.trim(),
    pgType: data.pgType || 'Coliving',
    address: data.address?.trim(),
    city: data.city?.trim() || 'Bengaluru',
    state: data.state?.trim() || 'Karnataka',
    pincode: data.pincode?.trim() || '560103',
    contactPerson: data.contactPerson?.trim() || data.adminName?.trim() || 'Property Admin',
    contactNumber: data.contactNumber?.trim() || data.adminPhone?.trim() || '9876543210',
    description: data.description || '',
    facilities: Array.isArray(data.facilities) ? data.facilities : ['Wi-Fi', 'Power Backup', 'CCTV', 'Meals'],
    rules: Array.isArray(data.rules) ? data.rules : ['Gate closes at 11 PM', 'No smoking in rooms'],
    images: Array.isArray(data.images) ? data.images : ['/luxury-bedroom.jpg'],
    isActive: true,
  };

  if (!propertyData.name) {
    throw new Error('Property name is required.');
  }
  if (!propertyData.address) {
    throw new Error('Property address is required.');
  }

  // 1. Create PG Property record
  const property = await PGProperty.create(propertyData);

  // 2. Optionally create dedicated Property Admin account if admin credentials are provided
  let adminUser = null;
  if (data.adminEmail && data.adminPassword) {
    const existing = await User.findOne({
      $or: [{ email: data.adminEmail.toLowerCase().trim() }, { phone: data.adminPhone?.trim() }],
    });

    if (existing) {
      // Assign existing user as manager/admin for this property
      existing.propertyId = property._id;
      existing.role = 'admin';
      await existing.save();
      adminUser = { id: existing._id, email: existing.email, name: existing.name };
    } else {
      const hashedPassword = await hashPassword(data.adminPassword);
      const newUser = await User.create({
        name: data.adminName?.trim() || data.contactPerson?.trim() || `${propertyData.name} Admin`,
        email: data.adminEmail.toLowerCase().trim(),
        phone: data.adminPhone?.trim() || propertyData.contactNumber,
        password: hashedPassword,
        role: 'admin',
        propertyId: property._id,
        isActive: true,
      });
      adminUser = { id: newUser._id, email: newUser.email, name: newUser.name };
    }
  }

  return { property, adminUser };
}

export async function updateProperty(id: string, data: any) {
  await connectDB();
  const updated = await PGProperty.findByIdAndUpdate(id, data, { new: true });
  if (!updated) throw new Error('PG Property not found');
  return updated;
}

export async function deleteProperty(id: string) {
  await connectDB();
  // Deactivate instead of hard delete to preserve history
  const property = await PGProperty.findByIdAndUpdate(id, { isActive: false }, { new: true });
  if (!property) throw new Error('PG Property not found');
  return property;
}

