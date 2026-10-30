import "server-only";
import { MongoClient } from "mongodb";

declare global {
  var hubMongoPromise: Promise<MongoClient> | undefined;
}

export function databaseConfigured() {
  return Boolean(process.env.MONGODB_URI && process.env.MONGODB_DB);
}

type DatabaseConnectionOptions = {
  serverSelectionTimeoutMS?: number;
  connectTimeoutMS?: number;
  timeoutMS?: number;
  family?: 4 | 6;
};

export async function getDatabase(options: DatabaseConnectionOptions = {}) {
  if (!databaseConfigured()) throw new Error("Database is not configured");
  if (!global.hubMongoPromise) {
    const client = new MongoClient(process.env.MONGODB_URI!, {
      maxPoolSize: 5,
      serverSelectionTimeoutMS: 4000,
      connectTimeoutMS: 4000,
      timeoutMS: 6000,
      ...options,
    });
    global.hubMongoPromise = client.connect().catch((error) => {
      global.hubMongoPromise = undefined;
      throw error;
    });
  }
  return (await global.hubMongoPromise).db(process.env.MONGODB_DB);
}
