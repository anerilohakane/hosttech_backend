import mongoose from 'mongoose';
import '@/models';

const NODES = [
  'ac-tbc6s5c-shard-00-02.1onmyll.mongodb.net:27017',
  'ac-tbc6s5c-shard-00-01.1onmyll.mongodb.net:27017',
  'ac-tbc6s5c-shard-00-00.1onmyll.mongodb.net:27017',
];

interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

declare global {
  var mongooseCache: MongooseCache | undefined;
}

let cached: MongooseCache = global.mongooseCache || { conn: null, promise: null };
if (!global.mongooseCache) {
  global.mongooseCache = cached;
}

async function connectToPrimaryNode(): Promise<typeof mongoose> {
  const username = process.env.MONGODB_USERNAME || 'aneridelxn_db_user';
  const password = process.env.MONGODB_PASSWORD || 'AHO1seq6OHfuYpmr';
  const customUri = process.env.MONGODB_URI;

  // If user provided a specific URI in .env, try it first
  const urisToTry: string[] = [];
  if (customUri) urisToTry.push(customUri);

  for (const node of NODES) {
    const directUri = `mongodb://${username}:${password}@${node}/pg_management?ssl=true&authSource=admin&directConnection=true`;
    if (!urisToTry.includes(directUri)) {
      urisToTry.push(directUri);
    }
  }

  let lastError: any = null;
  for (const uri of urisToTry) {
    try {
      const conn = await mongoose.connect(uri, {
        bufferCommands: false,
        serverSelectionTimeoutMS: 5000,
        connectTimeoutMS: 5000,
      });

      // Confirm this node is writable primary
      const isMaster = await conn.connection.db.admin().command({ isMaster: 1 });
      if (isMaster.ismaster) {
        console.log(`[Database] Connected to primary node: ${uri.split('@')[1]?.split('/')[0]}`);
        return conn;
      } else {
        console.log(`[Database] Node is secondary/standby, switching to primary...`);
        await mongoose.disconnect();
      }
    } catch (err: any) {
      lastError = err;
    }
  }

  throw lastError || new Error('Could not establish writable primary connection to MongoDB Atlas');
}

export async function connectDB(): Promise<typeof mongoose> {
  if (cached.conn && cached.conn.connection.readyState === 1) {
    return cached.conn;
  }

  if (!cached.promise) {
    cached.promise = connectToPrimaryNode().then((m) => {
      console.log('[Database] MongoDB Writable Primary ready.');
      return m;
    });
  }

  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null;
    throw e;
  }

  return cached.conn;
}

