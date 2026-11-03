import { Types } from "mongoose";
import { config } from "../config/env.config.js";
import { ReservationModel } from "../models/Reservation.model.js";
import { ResourceModel } from "../models/Resource.model.js";
import type { IResource } from "../models/Resource.model.js";

export interface ISeedSummary {
  resourcesUpserted: number;
  reservationsDeleted: number;
}

interface ISeedResource extends IResource {
  _id: Types.ObjectId;
}

// Fixed ObjectIds keep the manual test suite in docs/manual-tests.md repeatable.
const SEED_RESOURCES: readonly ISeedResource[] = [
  {
    _id: new Types.ObjectId("66f000000000000000000101"),
    name: "Study Room 302",
    type: "ROOM",
    location: "Snell Library, 3rd Floor",
    isAvailable: true,
  },
  {
    _id: new Types.ObjectId("66f000000000000000000102"),
    name: "3D Printer A",
    type: "EQUIPMENT",
    location: "EXP Makerspace",
    isAvailable: true,
  },
  {
    _id: new Types.ObjectId("66f000000000000000000103"),
    name: "Chemistry Lab 1",
    type: "LAB",
    location: "Hurtig Hall, Room 115",
    isAvailable: true,
  },
  {
    _id: new Types.ObjectId("66f000000000000000000104"),
    name: "Study Room 118",
    type: "ROOM",
    location: "Snell Library, 1st Floor",
    isAvailable: false,
  },
];

// Resets the database to a known state: seed resources present, no reservations.
export async function seedDatabase(): Promise<ISeedSummary> {
  if (config.nodeEnv === "production") {
    throw new Error("Refusing to seed: NODE_ENV is production.");
  }
  await Promise.all(
    SEED_RESOURCES.map((resource) => new ResourceModel(resource).validate()),
  );
  const upserts = await ResourceModel.bulkWrite(
    SEED_RESOURCES.map((resource) => ({
      replaceOne: {
        filter: { _id: resource._id },
        replacement: resource,
        upsert: true,
      },
    })),
  );
  const deleted = await ReservationModel.deleteMany({});
  return {
    resourcesUpserted: upserts.upsertedCount + upserts.modifiedCount,
    reservationsDeleted: deleted.deletedCount,
  };
}
