const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const NODES = [
  'ac-46g8ads-shard-00-00.fgncbcl.mongodb.net:27017',
  'ac-46g8ads-shard-00-01.fgncbcl.mongodb.net:27017',
  'ac-46g8ads-shard-00-02.fgncbcl.mongodb.net:27017'
];

async function run() {
  let conn = null;
  for (const n of NODES) {
    const uri = `mongodb://aneridelxn_db_user:nX3DIRhExFxHKYv2@${n}/pg_management?ssl=true&authSource=admin&directConnection=true`;
    try {
      console.log('Connecting to', n);
      const c = await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
      const isM = await c.connection.db.admin().command({ isMaster: 1 });
      if (isM.ismaster) {
        console.log('Connected to PRIMARY:', n);
        conn = c;
        break;
      } else {
        console.log('Node is secondary, disconnecting...');
        await mongoose.disconnect();
      }
    } catch (e) {
      console.log('Failed:', n, e.message);
    }
  }

  if (!conn) {
    throw new Error('Could not find primary node in Vercel database cluster');
  }

  const userColl = mongoose.connection.db.collection('users');
  const propertyColl = mongoose.connection.db.collection('pgproperties');
  const roomColl = mongoose.connection.db.collection('rooms');
  const residentColl = mongoose.connection.db.collection('residentprofiles');

  // 1. Admin User: admin@gmail.com / Admin@123
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
  console.log('Admin (admin@gmail.com) created/updated on Vercel DB!');

  // Find property & room
  let prop = await propertyColl.findOne({});
  let room = await roomColl.findOne({});

  // 2. Resident User: lohakaneaneri6@gmail.com / Aneri@123
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
  console.log('Resident (lohakaneaneri6@gmail.com) created/updated on Vercel DB! ID:', resUserId);

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
    console.log('Resident profile created/updated on Vercel DB!');
  }

  const allUsers = await userColl.find({}).toArray();
  console.log('All Users in Vercel DB:', allUsers.map(u => ({ email: u.email, role: u.role, active: u.isActive })));

  await mongoose.disconnect();
}

run().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
