import mongoose from 'mongoose';

let cached = globalThis.mongoose;

let shutdownRegistered = globalThis._slackthreadsMongoShutdownRegistered;

if (!shutdownRegistered) {
  globalThis._slackthreadsMongoShutdownRegistered = true;

  const shutdown = async () => {
    try {
      if (mongoose.connection.readyState === 1 || mongoose.connection.readyState === 2) {
        await mongoose.disconnect();
      }
    } finally {
      process.exit(0);
    }
  };

  process.once('SIGINT', shutdown);
}

if (!cached) {
  cached = globalThis.mongoose = { conn: null, promise: null };
}

async function ensureIndexes() {
  let indexesEnsured = globalThis._slackthreadsMongoIndexesEnsured;
  if (indexesEnsured) return;

  globalThis._slackthreadsMongoIndexesEnsured = true;

  const db = mongoose.connection.db;
  if (!db) return;

  await Promise.all([
    db.collection('threads').createIndex({ 'messages.0.ts': -1 }, { name: 'messages0ts_desc' }),
    db.collection('threads').createIndex({ saved_at: -1 }, { name: 'saved_at_desc' }),
    db.collection('threads').createIndex({ last_updated: -1 }, { name: 'last_updated_desc' }),
  ]);
}

async function dbConnect() {
  if (cached.conn && mongoose.connection.readyState === 1) return cached.conn;

  const MONGODB_URI = process.env.MONGODB_URI;
  
  if (!MONGODB_URI) {
    throw new Error('Please define the MONGODB_URI environment variable');
  }

  if (!cached.promise) {
    const maxPoolSize = Number(process.env.MONGODB_MAX_POOL_SIZE) || 10;
    const minPoolSize = Number(process.env.MONGODB_MIN_POOL_SIZE) || 0;
    const serverSelectionTimeoutMS = Number(process.env.MONGODB_SERVER_SELECTION_TIMEOUT_MS) || 10_000;
    const socketTimeoutMS = Number(process.env.MONGODB_SOCKET_TIMEOUT_MS) || 45_000;
    const connectTimeoutMS = Number(process.env.MONGODB_CONNECT_TIMEOUT_MS) || 10_000;

    cached.promise = mongoose.connect(MONGODB_URI, {
      dbName: 'slackApp',
      authSource: 'admin',
      bufferCommands: false,
      maxPoolSize,
      minPoolSize,
      serverSelectionTimeoutMS,
      socketTimeoutMS,
      connectTimeoutMS,
      serverApi: {
        version: '1',
        strict: true,
        deprecationErrors: true
      },
    }).then((mongoose) => mongoose);
  }

  try {
    cached.conn = await cached.promise;
  } catch (err) {
    cached.promise = null;
    throw err;
  }

  await ensureIndexes();
  return cached.conn;
}

export default dbConnect;
