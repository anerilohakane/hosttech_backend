const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const mongoose = require('mongoose');

async function clearDatabase() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('No MONGODB_URI found in .env');
    process.exit(1);
  }

  console.log('Connecting to database...');
  await mongoose.connect(uri, {
    serverSelectionTimeoutMS: 15000,
    connectTimeoutMS: 15000,
    tls: true,
  });

  console.log('Connected to MongoDB database:', mongoose.connection.name);
  const collections = await mongoose.connection.db.listCollections().toArray();
  console.log(`Found ${collections.length} collections:`, collections.map(c => c.name));

  for (const col of collections) {
    if (col.name.startsWith('system.')) continue;
    try {
      await mongoose.connection.db.dropCollection(col.name);
      console.log(`✓ Dropped collection: ${col.name}`);
    } catch (e) {
      console.warn(`Could not drop ${col.name}:`, e.message);
    }
  }

  console.log('\n✅ Database has been completely cleared!');
  await mongoose.disconnect();
  process.exit(0);
}

clearDatabase().catch((err) => {
  console.error('Error clearing database:', err);
  process.exit(1);
});
