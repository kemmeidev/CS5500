import { Schema, model } from "mongoose";
import type { HydratedDocument, Model } from "mongoose";
import { RESOURCE_TYPES } from "@campushub/shared";
import type { ResourceType } from "@campushub/shared";

// The contract's `id` is this document's `_id`; services map one to the other.
export interface IResource {
  name: string;
  type: ResourceType;
  location: string;
  isAvailable: boolean;
}

export type ResourceDocument = HydratedDocument<IResource>;

const resourceSchema = new Schema<IResource>(
  {
    name: { type: String, required: true, trim: true, minlength: 1 },
    type: { type: String, enum: [...RESOURCE_TYPES], required: true },
    location: { type: String, required: true, trim: true, minlength: 1 },
    isAvailable: { type: Boolean, required: true },
  },
  { versionKey: false },
);

resourceSchema.index({ type: 1 });

export const ResourceModel: Model<IResource> = model<IResource>(
  "Resource",
  resourceSchema,
);
