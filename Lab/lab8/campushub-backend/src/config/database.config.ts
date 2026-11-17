import mongoose from "mongoose";
import { config } from "./env.config.js";

// Logs host and database only: the full URI may carry credentials.
function describeConnection(connection: mongoose.Connection): string {
  return `${connection.host}:${connection.port}/${connection.name}`;
}

export async function connectDatabase(): Promise<void> {
  mongoose.set("strictQuery", true);
  await mongoose.connect(config.mongodbUri);
  console.warn(`MongoDB connected: ${describeConnection(mongoose.connection)}`);
}

export async function disconnectDatabase(): Promise<void> {
  await mongoose.disconnect();
}
