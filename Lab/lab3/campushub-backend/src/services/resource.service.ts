import { ResourceModel } from "../models/Resource.model.js";
import type { IResource } from "../models/Resource.model.js";
import type { Types } from "mongoose";
import { RESOURCE_TYPES } from "../types/reservation.js";
import type { Resource, ResourceType } from "../types/reservation.js";
import { ValidationError } from "./domain.errors.js";

const OBJECT_ID = /^[0-9a-fA-F]{24}$/;

interface IStoredResource extends IResource {
  _id: Types.ObjectId;
}

// Mongoose's own isValidObjectId also accepts any 12-character string.
export function isObjectIdString(value: string): boolean {
  return OBJECT_ID.test(value);
}

// The contract accepts any non-empty filter; an unknown type simply matches nothing.
function isResourceType(value: string): value is ResourceType {
  return RESOURCE_TYPES.some((known) => known === value);
}

function toResource(doc: IStoredResource): Resource {
  return {
    id: doc._id.toHexString(),
    name: doc.name,
    type: doc.type,
    location: doc.location,
    isAvailable: doc.isAvailable,
  };
}

export async function listResources(type: unknown): Promise<Resource[]> {
  if (type !== undefined && (typeof type !== "string" || type.trim() === "")) {
    throw new ValidationError("type must be a non-empty string when provided.");
  }
  if (type !== undefined && !isResourceType(type)) {
    return [];
  }
  const filter = type === undefined ? {} : { type };
  const docs = await ResourceModel.find(filter)
    .sort({ _id: 1 })
    .lean<IStoredResource[]>();
  return docs.map(toResource);
}

export async function findResourceById(
  id: string,
): Promise<Resource | undefined> {
  if (!isObjectIdString(id)) {
    return undefined;
  }
  const doc = await ResourceModel.findById(id).lean<IStoredResource>();
  return doc === null ? undefined : toResource(doc);
}
