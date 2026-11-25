const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

async function run() {
  // Shard 01 is the primary!
  const host = 'ac-tbc6s5c-shard-00-01.1onmyll.mongodb.net';
  const uri = `mongodb://aneridelxn_db_user:AHO1seq6OHfuYpmr@${host}:27017/pg_management?ssl=true&authSource=admin&directConnection=true`;

  console.log(`Connecting directly to primary shard ${host}...`);
  await mongoose.connect(uri);
  console.log('Connected to Primary successfully!');

  const email = 'admin@hosttech.com';
  const plainPassword = 'AdminPassword123';
  const hashedPassword = await bcrypt.hash(plainPassword, 10);

  const userColl = mongoose.connection.db.collection('users');
  await userColl.updateOne(
    { email },
    {
      $set: {
        name: 'Super Admin',
        email,
        phone: '9876543210',
        password: hashedPassword,
        role: 'admin',
        isActive: true,
        updatedAt: new Date(),
      },
      $setOnInsert: { createdAt: new Date() },
    },
    { upsert: true }
  );

  console.log('\n=======================================');
  console.log('ADMIN CREATED / UPDATED SUCCESSFULLY:');
  console.log(`Email:    ${email}`);
  console.log(`Password: ${plainPassword}`);
  console.log('Role:     admin');
  console.log('=======================================\n');

  await mongoose.disconnect();
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
