import { ResourceModel } from "../models/resource.model.js";
import type { IResourceDocument } from "../models/resource.model.js";
import type { Resource } from "../types/reservation.js";
import { ValidationError } from "./domain.errors.js";

// In-memory store until a database connection is introduced.
const SEED_RESOURCES: readonly IResourceDocument[] = [
  {
    id: "res-101",
    name: "Study Room 302",
    type: "ROOM",
    location: "Snell Library, 3rd Floor",
    isAvailable: true,
  },
  {
    id: "res-102",
    name: "3D Printer A",
    type: "EQUIPMENT",
    location: "EXP Makerspace",
    isAvailable: true,
  },
  {
    id: "res-103",
    name: "Chemistry Lab 1",
    type: "LAB",
    location: "Hurtig Hall, Room 115",
    isAvailable: true,
  },
  {
    id: "res-104",
    name: "Study Room 118",
    type: "ROOM",
    location: "Snell Library, 1st Floor",
    isAvailable: false,
  },
];

async function assertValidResource(
  resource: IResourceDocument,
): Promise<IResourceDocument> {
  await new ResourceModel(resource).validate();
  return resource;
}

// Top-level await: invalid seed data fails the process at startup.
const resources: readonly IResourceDocument[] = await Promise.all(
  SEED_RESOURCES.map(assertValidResource),
);

function toResource(doc: IResourceDocument): Resource {
  return {
    id: doc.id,
    name: doc.name,
    type: doc.type,
    location: doc.location,
    isAvailable: doc.isAvailable,
  };
}

export function listResources(type: unknown): Resource[] {
  if (type === undefined) {
    return resources.map(toResource);
  }
  if (typeof type !== "string" || type.trim() === "") {
    throw new ValidationError("type must be a non-empty string when provided.");
  }
  return resources.filter((doc) => doc.type === type).map(toResource);
}

export function findResourceById(id: string): Resource | undefined {
  const doc = resources.find((candidate) => candidate.id === id);
  return doc === undefined ? undefined : toResource(doc);
}
