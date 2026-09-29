import { Schema, model } from "mongoose";
import type { Model } from "mongoose";
import { RESOURCE_TYPES } from "../types/reservation.js";
import type { ResourceType } from "../types/reservation.js";

export interface IResourceDocument {
  id: string;
  name: string;
  type: ResourceType;
  location: string;
  isAvailable: boolean;
}

const resourceSchema = new Schema<IResourceDocument>(
  {
    id: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    type: { type: String, enum: [...RESOURCE_TYPES], required: true },
    location: { type: String, required: true },
    isAvailable: { type: Boolean, required: true },
  },
  // `id` is a real contract field, so Mongoose's `id` virtual is disabled.
  { id: false, versionKey: false },
);

resourceSchema.index({ type: 1 });

export const ResourceModel: Model<IResourceDocument> = model<IResourceDocument>(
  "Resource",
  resourceSchema,
);
