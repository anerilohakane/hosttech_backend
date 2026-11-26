const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');

const envPath = path.resolve(__dirname, '../.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
    if (match) {
      let val = (match[2] || '').trim();
      if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
      process.env[match[1]] = val;
    }
  });
}

const NODES = [
  'ac-tbc6s5c-shard-00-02.1onmyll.mongodb.net:27017',
  'ac-tbc6s5c-shard-00-01.1onmyll.mongodb.net:27017',
  'ac-tbc6s5c-shard-00-00.1onmyll.mongodb.net:27017',
];

async function run() {
  const username = process.env.MONGODB_USERNAME || 'aneridelxn_db_user';
  const password = process.env.MONGODB_PASSWORD || 'AHO1seq6OHfuYpmr';
  const customUri = process.env.MONGODB_URI;

  const uris = [];
  if (customUri) uris.push(customUri);
  for (const node of NODES) {
    uris.push(`mongodb://${username}:${password}@${node}/pg_management?ssl=true&authSource=admin&directConnection=true`);
  }

  let connected = false;
  for (const uri of uris) {
    try {
      console.log('Connecting to:', uri.substring(0, 45) + '...');
      await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
      const isMaster = await mongoose.connection.db.admin().command({ isMaster: 1 });
      if (isMaster.ismaster) {
        console.log('Successfully connected to Primary node!');
        connected = true;
        break;
      } else {
        console.log('Connected to secondary node, moving to next...');
        await mongoose.disconnect();
      }
    } catch (err) {
      console.log('Connection attempt failed:', err.message);
    }
  }

  if (!connected) {
    throw new Error('Could not connect to a primary MongoDB node');
  }

  const userColl = mongoose.connection.db.collection('users');
  const propertyColl = mongoose.connection.db.collection('pgproperties');
  const roomColl = mongoose.connection.db.collection('rooms');
  const residentColl = mongoose.connection.db.collection('residentprofiles');

  // 1. Ensure admin@pgapp.com
  const adminHash = await bcrypt.hash('Admin@123', 10);
  await userColl.updateOne(
    { email: 'admin@pgapp.com' },
    {
      $set: {
        name: 'System Admin',
        email: 'admin@pgapp.com',
        phone: '9876543200',
        password: adminHash,
        role: 'admin',
        isActive: true,
        updatedAt: new Date()
      },
      $setOnInsert: { createdAt: new Date() }
    },
    { upsert: true }
  );
  console.log('Admin user (admin@pgapp.com) created/updated.');

  // Find or create default property
  let property = await propertyColl.findOne({});
  if (!property) {
    const propRes = await propertyColl.insertOne({
      name: 'Stanza Living - Emerald House',
      pgType: 'Coliving',
      address: 'Plot 42, Green Glen Layout, Bellandur',
      city: 'Bengaluru',
      state: 'Karnataka',
      pincode: '560103',
      contactPerson: 'Ramesh Sharma',
      contactNumber: '9988776655',
      facilities: ['High Speed Wi-Fi', '3-Time Meals', 'Air Conditioning'],
      rules: ['Non-smoking building'],
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    property = { _id: propRes.insertedId };
  }

  // Find or create default room
  let room = await roomColl.findOne({ propertyId: property._id });
  if (!room) {
    const roomRes = await roomColl.insertOne({
      propertyId: property._id,
      roomNumber: '101',
      floor: 1,
      roomType: 'AC',
      rentalType: 'Sharing',
      maxCapacity: 2,
      currentOccupants: 1,
      defaultRent: 8500,
      status: 'Occupied',
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    room = { _id: roomRes.insertedId, defaultRent: 8500 };
  }

  // 2. Ensure resident@pgapp.com
  const residentHash = await bcrypt.hash('Resident@123', 10);
  const residentUser = await userColl.findOneAndUpdate(
    { email: 'resident@pgapp.com' },
    {
      $set: {
        name: 'Aditya Verma',
        email: 'resident@pgapp.com',
        phone: '9845123456',
        password: residentHash,
        role: 'resident',
        propertyId: property._id,
        isActive: true,
        updatedAt: new Date()
      },
      $setOnInsert: { createdAt: new Date() }
    },
    { upsert: true, returnDocument: 'after' }
  );

  const residentUserId = residentUser._id || residentUser.value?._id;
  console.log('Resident user (resident@pgapp.com) created/updated. ID:', residentUserId);

  if (residentUserId) {
    await residentColl.updateOne(
      { userId: residentUserId },
      {
        $set: {
          userId: residentUserId,
          fullName: 'Aditya Verma',
          email: 'resident@pgapp.com',
          phone: '9845123456',
          permanentAddress: '124, Civil Lines, Jaipur, Rajasthan',
          occupation: 'Working Professional',
          emergencyContactName: 'Rajesh Verma (Father)',
          emergencyContactNumber: '9414012345',
          joiningDate: new Date('2026-10-01'),
          propertyId: property._id,
          roomId: room._id,
          occupancyType: 'Sharing',
          monthlyRent: room.defaultRent || 8500,
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
    console.log('Resident profile created/updated.');
  }

  const allUsers = await userColl.find({}).toArray();
  console.log('\n=== CURRENT DB USERS ===');
  allUsers.forEach(u => {
    console.log(`- Name: ${u.name} | Email: ${u.email} | Role: ${u.role} | Active: ${u.isActive}`);
  });

  await mongoose.disconnect();
}

run().catch(err => {
  console.error('Fatal script error:', err);
  process.exit(1);
});
