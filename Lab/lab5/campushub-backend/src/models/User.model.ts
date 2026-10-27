import { Schema, model } from "mongoose";
import type { HydratedDocument, Model } from "mongoose";
import { USER_ROLES } from "../types/reservation.js";
import type { UserRole } from "../types/reservation.js";

// The contract's `id` is this document's `_id`; services map one to the other.
export interface IUser {
  name: string;
  email: string;
  role: UserRole;
}

export type UserDocument = HydratedDocument<IUser>;

const userSchema = new Schema<IUser>(
  {
    name: { type: String, required: true, trim: true, minlength: 1 },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    role: { type: String, enum: [...USER_ROLES], required: true },
  },
  { versionKey: false },
);

export const UserModel: Model<IUser> = model<IUser>("User", userSchema);
