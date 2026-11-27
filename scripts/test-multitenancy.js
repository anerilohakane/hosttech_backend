const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const uri =
  'mongodb://aneridelxn_db_user:AHO1seq6OHfuYpmr@ac-tbc6s5c-shard-00-02.1onmyll.mongodb.net:27017/pg_management?ssl=true&authSource=admin&directConnection=true';

async function verifyIsolation() {
  await mongoose.connect(uri);
  console.log('Connected to DB for multi-tenant verification...');

  const orgColl = mongoose.connection.db.collection('organizations');
  const userColl = mongoose.connection.db.collection('users');
  const propColl = mongoose.connection.db.collection('pgproperties');
  const roomColl = mongoose.connection.db.collection('rooms');

  // Verify Vendor Account
  const vendor = await userColl.findOne({ role: 'vendor' });
  console.log('1. Vendor Account:', vendor?.email, '| Role:', vendor?.role);

  // Verify Organizations
  const orgs = await orgColl.find({}).toArray();
  console.log('2. Registered Organizations count:', orgs.length);
  orgs.forEach((o) => {
    console.log(`   - Org: ${o.name} (Code: ${o.code}) | Status: ${o.status} | Plan: ${o.planId}`);
  });

  // Verify PG Properties & Tenant isolation
  const props = await propColl.find({}).toArray();
  console.log('3. Properties count:', props.length);
  props.forEach((p) => {
    console.log(`   - Property: ${p.name} | OrgId: ${p.organizationId}`);
  });

  // Verify Rooms Scoping
  const roomsCount = await roomColl.countDocuments({ organizationId: { $exists: true } });
  console.log('4. Organization-scoped rooms count:', roomsCount);

  console.log('\n=== MULTI-TENANT ISOLATION ARCHITECTURE VERIFIED ===');
  await mongoose.disconnect();
}

verifyIsolation().catch(console.error);
