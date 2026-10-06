import { Schema, model } from "mongoose";
import type { HydratedDocument, Model, Types } from "mongoose";
import { RESERVATION_STATUSES } from "../types/reservation.js";
import type { ReservationStatus } from "../types/reservation.js";

// The contract's `id` is this document's `_id`; services map one to the other.
export interface IReservation {
  resourceId: Types.ObjectId;
  userId: string;
  startTime: Date;
  endTime: Date;
  status: ReservationStatus;
}

export type ReservationDocument = HydratedDocument<IReservation>;

const reservationSchema = new Schema<IReservation>(
  {
    resourceId: {
      type: Schema.Types.ObjectId,
      ref: "Resource",
      required: true,
    },
    userId: { type: String, required: true, trim: true, minlength: 1 },
    startTime: { type: Date, required: true },
    endTime: { type: Date, required: true },
    status: {
      type: String,
      enum: [...RESERVATION_STATUSES],
      required: true,
      default: "CONFIRMED",
    },
  },
  { versionKey: false },
);

// Cross-field rule, so it lives on the document rather than on a single path.
reservationSchema.pre("validate", function (this: ReservationDocument): void {
  if (this.endTime.getTime() <= this.startTime.getTime()) {
    this.invalidate("endTime", "endTime must be later than startTime.");
  }
});

reservationSchema.index({ resourceId: 1, startTime: 1, endTime: 1 });
reservationSchema.index({ userId: 1, startTime: 1 });

export const ReservationModel: Model<IReservation> = model<IReservation>(
  "Reservation",
  reservationSchema,
);
