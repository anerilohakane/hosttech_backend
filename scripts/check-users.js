const mongoose = require('mongoose');
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

const host = 'ac-tbc6s5c-shard-00-01.1onmyll.mongodb.net';
const uri = `mongodb://aneridelxn_db_user:AHO1seq6OHfuYpmr@${host}:27017/pg_management?ssl=true&authSource=admin&directConnection=true`;

async function check() {
  await mongoose.connect(uri);
  const users = await mongoose.connection.db.collection('users').find({}).toArray();
  console.log('Total users in pg_management:', users.length);
  users.forEach(u => console.log(`- Email: ${u.email}, Role: ${u.role}, Active: ${u.isActive}`));
  await mongoose.disconnect();
}

check();
