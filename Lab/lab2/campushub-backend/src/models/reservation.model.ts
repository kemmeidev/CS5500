import { Schema, model } from "mongoose";
import type { Model } from "mongoose";
import { RESERVATION_STATUSES } from "../types/reservation.js";
import type { ReservationStatus } from "../types/reservation.js";

export interface IReservationDocument {
  id: string;
  resourceId: string;
  userId: string;
  startTime: Date;
  endTime: Date;
  status: ReservationStatus;
}

const reservationSchema = new Schema<IReservationDocument>(
  {
    id: { type: String, required: true, unique: true },
    resourceId: { type: String, required: true },
    userId: { type: String, required: true },
    startTime: { type: Date, required: true },
    endTime: { type: Date, required: true },
    status: {
      type: String,
      enum: [...RESERVATION_STATUSES],
      required: true,
    },
  },
  // `id` is a real contract field, so Mongoose's `id` virtual is disabled.
  { id: false, versionKey: false },
);

reservationSchema.index({ resourceId: 1, startTime: 1, endTime: 1 });
reservationSchema.index({ userId: 1, startTime: 1 });

export const ReservationModel: Model<IReservationDocument> =
  model<IReservationDocument>("Reservation", reservationSchema);
