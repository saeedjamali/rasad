import mongoose from "mongoose";
import { seedIfEmpty } from "./seed";

const uri = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/rasad";

let cached = global._mongoose;
if (!cached) {
  cached = global._mongoose = { conn: null, promise: null, seeded: false };
}

export async function connectDB() {
  if (cached.conn) {
    if (!cached.seeded) {
      cached.seeded = true;
      await seedIfEmpty();
    }
    return cached.conn;
  }
  if (!cached.promise) {
    cached.promise = mongoose.connect(uri).then((m) => m);
  }
  cached.conn = await cached.promise;
  if (!cached.seeded) {
    cached.seeded = true;
    await seedIfEmpty();
  }
  return cached.conn;
}
