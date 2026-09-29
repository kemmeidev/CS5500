import { Schema, model } from "mongoose";
import type { Model } from "mongoose";
import { USER_ROLES } from "../types/reservation.js";
import type { UserRole } from "../types/reservation.js";

export interface IUserDocument {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}

const userSchema = new Schema<IUserDocument>(
  {
    id: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    role: { type: String, enum: [...USER_ROLES], required: true },
  },
  // `id` is a real contract field, so Mongoose's `id` virtual is disabled.
  { id: false, versionKey: false },
);

export const UserModel: Model<IUserDocument> = model<IUserDocument>(
  "User",
  userSchema,
);
