import { afterAll, afterEach, beforeAll } from "@jest/globals";
import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";

// src/config/env.config.ts validates at import time, so test defaults must exist
// before any test file imports it. MONGODB_URI is a placeholder: tests connect to
// the in-memory server below, never to a real database.
process.env["NODE_ENV"] = "test";
process.env["PORT"] ??= "3000";
process.env["MONGODB_URI"] ??= "mongodb://127.0.0.1:1/unused";

let mongo: MongoMemoryServer | undefined;

beforeAll(async (): Promise<void> => {
  mongo = await MongoMemoryServer.create();
  mongoose.set("strictQuery", true);
  await mongoose.connect(mongo.getUri());
});

// Each test starts from empty collections.
afterEach(async (): Promise<void> => {
  const collections = Object.values(mongoose.connection.collections);
  await Promise.all(collections.map((c) => c.deleteMany({})));
});

afterAll(async (): Promise<void> => {
  await mongoose.disconnect();
  await mongo?.stop();
});
