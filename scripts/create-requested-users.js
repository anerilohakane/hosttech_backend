const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const uri = 'mongodb://aneridelxn_db_user:AHO1seq6OHfuYpmr@ac-tbc6s5c-shard-00-02.1onmyll.mongodb.net:27017/pg_management?ssl=true&authSource=admin&directConnection=true';

async function setup() {
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 10000 });
  console.log('Connected to DB!');

  const userColl = mongoose.connection.db.collection('users');
  const propertyColl = mongoose.connection.db.collection('pgproperties');
  const roomColl = mongoose.connection.db.collection('rooms');
  const residentColl = mongoose.connection.db.collection('residentprofiles');

  // 1. Admin: admin@gmail.com / Admin@123
  const adminHash = await bcrypt.hash('Admin@123', 10);
  await userColl.updateOne(
    { email: 'admin@gmail.com' },
    {
      $set: {
        name: 'System Admin',
        email: 'admin@gmail.com',
        phone: '9800000001',
        password: adminHash,
        role: 'admin',
        isActive: true,
        updatedAt: new Date()
      },
      $setOnInsert: { createdAt: new Date() }
    },
    { upsert: true }
  );
  console.log('Admin (admin@gmail.com) created/updated.');

  // Find or create property & room for resident profile
  let prop = await propertyColl.findOne({});
  let room = await roomColl.findOne({});

  // 2. Resident: lohakaneaneri6@gmail.com / Aneri@123
  const residentHash = await bcrypt.hash('Aneri@123', 10);
  const residentUser = await userColl.findOneAndUpdate(
    { email: 'lohakaneaneri6@gmail.com' },
    {
      $set: {
        name: 'Aneri Lohakane',
        email: 'lohakaneaneri6@gmail.com',
        phone: '9800000002',
        password: residentHash,
        role: 'resident',
        propertyId: prop ? prop._id : undefined,
        isActive: true,
        updatedAt: new Date()
      },
      $setOnInsert: { createdAt: new Date() }
    },
    { upsert: true, returnDocument: 'after' }
  );

  const resUserId = residentUser._id || residentUser.value?._id;
  console.log('Resident (lohakaneaneri6@gmail.com) created/updated. ID:', resUserId);

  if (resUserId) {
    await residentColl.updateOne(
      { userId: resUserId },
      {
        $set: {
          userId: resUserId,
          fullName: 'Aneri Lohakane',
          email: 'lohakaneaneri6@gmail.com',
          phone: '9800000002',
          permanentAddress: 'Pune, Maharashtra',
          occupation: 'Working Professional',
          propertyId: prop ? prop._id : undefined,
          roomId: room ? room._id : undefined,
          occupancyType: 'Full Room',
          monthlyRent: room ? (room.defaultRent || 8500) : 8500,
          rentDueDay: 5,
          securityDeposit: 15000,
          securityDepositPaid: 15000,
          advancePayment: 8500,
          noticePeriodDays: 30,
          status: 'Active',
          updatedAt: new Date()
        },
        $setOnInsert: { createdAt: new Date() }
      },
      { upsert: true }
    );
    console.log('Resident profile created/updated for Aneri.');
  }

  // Verification
  const adminDoc = await userColl.findOne({ email: 'admin@gmail.com' });
  const adminValid = adminDoc && await bcrypt.compare('Admin@123', adminDoc.password);

  const resDoc = await userColl.findOne({ email: 'lohakaneaneri6@gmail.com' });
  const resValid = resDoc && await bcrypt.compare('Aneri@123', resDoc.password);

  console.log('\n=== VERIFICATION RESULT ===');
  console.log('Admin (admin@gmail.com): Role =', adminDoc?.role, '| Password Valid =', adminValid);
  console.log('Resident (lohakaneaneri6@gmail.com): Role =', resDoc?.role, '| Password Valid =', resValid);

  await mongoose.disconnect();
}

setup().catch(err => {
  console.error('Setup error:', err);
  process.exit(1);
});
