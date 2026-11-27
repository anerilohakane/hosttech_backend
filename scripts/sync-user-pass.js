const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

async function setPassword() {
  const admin123Hash = await bcrypt.hash('Admin@123', 10);
  
  // 1. Primary Shard node
  await mongoose.connect(process.env.MONGODB_URI);
  await mongoose.connection.db.collection('users').updateOne(
    { email: 'aneridelxn@gmail.com' },
    { $set: { password: admin123Hash, phone: '9876543210', isActive: true } }
  );
  await mongoose.connection.db.collection('users').updateOne(
    { email: 'admin@gmail.com' },
    { $set: { name: 'Admin User', password: admin123Hash, phone: '9800000001', role: 'admin', isActive: true } },
    { upsert: true }
  );
  console.log('✓ Primary node updated successfully!');
  await mongoose.disconnect();

  // 2. Vercel Cluster
  const conn = await mongoose.createConnection('mongodb://aneridelxn_db_user:nX3DIRhExFxHKYv2@ac-46g8ads-shard-00-01.fgncbcl.mongodb.net:27017/pg_management?ssl=true&authSource=admin&directConnection=true').asPromise();
  await conn.db.collection('users').updateOne(
    { email: 'aneridelxn@gmail.com' },
    { $set: { name: 'Aneri Lohakane', password: admin123Hash, phone: '9876543210', role: 'admin', isActive: true } },
    { upsert: true }
  );
  await conn.db.collection('users').updateOne(
    { email: 'admin@gmail.com' },
    { $set: { name: 'Admin User', password: admin123Hash, phone: '9800000001', role: 'admin', isActive: true } },
    { upsert: true }
  );
  console.log('✓ Vercel cluster updated successfully!');
  await conn.close();
}

setPassword().catch(console.error);
