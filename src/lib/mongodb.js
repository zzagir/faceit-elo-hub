import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGO_URI;

if (!MONGODB_URI) {
  throw new Error('Пожалуйста, добавьте MONGO_URI в .env.local');
}

let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

export async function connectToDatabase() {
  if (cached.conn) return cached.conn;

  if (!cached.promise) {
    cached.promise = mongoose.connect(MONGODB_URI, { bufferCommands: false }).then((mongoose) => {
      return mongoose;
    });
  }
  cached.conn = await cached.promise;
  return cached.conn;
}

// Экспортируем схему EloHistory
const eloHistorySchema = new mongoose.Schema({
  nick: { type: String, required: true, unique: true },
  peakElo: { type: Number, required: true },
  isFullyScanned: { type: Boolean, default: false }
});

export const EloHistory = mongoose.models.EloHistory || mongoose.model("EloHistory", eloHistorySchema);