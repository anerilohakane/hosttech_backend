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
        await mongoose.disconnect();
      }
    } catch (err) {
      console.log('Connection failed:', err.message);
    }
  }

  if (!connected) {
    throw new Error('Could not connect to MongoDB primary node');
  }

  const userColl = mongoose.connection.db.collection('users');
  const orgColl = mongoose.connection.db.collection('organizations');

  // 1. Create or ensure HostTech Platform Vendor Account
  const vendorEmail = 'vendor@hosttech.com';
  const vendorPassword = 'Vendor@HostTech2026';
  const vendorHash = await bcrypt.hash(vendorPassword, 10);

  await userColl.updateOne(
    { email: vendorEmail },
    {
      $set: {
        name: 'HostTech Product Owner',
        email: vendorEmail,
        phone: '9999900001',
        password: vendorHash,
        role: 'vendor',
        isActive: true,
        updatedAt: new Date(),
      },
      $setOnInsert: { createdAt: new Date() },
    },
    { upsert: true }
  );

  console.log('=== VENDOR ACCOUNT READY ===');
  console.log(`Email:    ${vendorEmail}`);
  console.log(`Password: ${vendorPassword}`);
  console.log(`Role:     vendor`);

  // 2. Link existing properties to default Organization
  let defaultOrg = await orgColl.findOne({});
  if (!defaultOrg) {
    const adminUser = await userColl.findOne({ role: 'admin' });
    const orgRes = await orgColl.insertOne({
      name: 'HostTech - Emerald Living',
      code: 'emerald-living',
      ownerId: adminUser ? adminUser._id : new mongoose.Types.ObjectId(),
      contactPerson: 'Ramesh Sharma',
      email: 'admin@hosttech.com',
      phone: '9988776655',
      address: 'Plot 42, Green Glen Layout, Bellandur',
      city: 'Bengaluru',
      state: 'Karnataka',
      pincode: '560103',
      pgType: 'Coliving',
      status: 'active',
      planId: 'growth',
      subscriptionStartDate: new Date(),
      subscriptionEndDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    defaultOrg = { _id: orgRes.insertedId };
  }

  // Update existing properties, rooms, users to have organizationId
  await mongoose.connection.db.collection('pgproperties').updateMany(
    { organizationId: { $exists: false } },
    { $set: { organizationId: defaultOrg._id } }
  );
  await mongoose.connection.db.collection('rooms').updateMany(
    { organizationId: { $exists: false } },
    { $set: { organizationId: defaultOrg._id } }
  );
  await mongoose.connection.db.collection('residentprofiles').updateMany(
    { organizationId: { $exists: false } },
    { $set: { organizationId: defaultOrg._id } }
  );
  await userColl.updateMany(
    { role: { $in: ['admin', 'resident', 'staff'] }, organizationId: { $exists: false } },
    { $set: { organizationId: defaultOrg._id } }
  );

  console.log('Existing records successfully scoped with default organizationId:', defaultOrg._id);

  await mongoose.disconnect();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
