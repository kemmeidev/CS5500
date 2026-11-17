import { Types } from "mongoose";
import { ReservationModel } from "../models/Reservation.model.js";
import type { IReservation } from "../models/Reservation.model.js";
import type { CreateReservationRequest, Reservation } from "@campushub/shared";
import {
  ConflictError,
  NotFoundError,
  ValidationError,
} from "./domain.errors.js";
import { findResourceById, isObjectIdString } from "./resource.service.js";

type CreateReservationField = keyof CreateReservationRequest;

const CREATE_FIELDS: readonly CreateReservationField[] = [
  "resourceId",
  "userId",
  "startTime",
  "endTime",
];

const READ_ONLY_FIELDS: readonly string[] = ["id", "status"];

// RFC 3339 profile of ISO 8601: full date, full time, mandatory zone designator.
const ISO_DATE_TIME =
  /^\d{4}-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12]\d|3[01])T(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d(?:\.\d+)?(?:Z|[+-](?:[01]\d|2[0-3]):[0-5]\d)$/;

interface IParsedCreateReservation {
  resourceId: string;
  userId: string;
  startTime: Date;
  endTime: Date;
}

interface IStoredReservation extends IReservation {
  _id: Types.ObjectId;
}

// Tail of the pending create chain per resource. See withResourceLock.
const resourceLocks = new Map<string, Promise<void>>();

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function requireNonEmptyString(
  body: Record<string, unknown>,
  field: CreateReservationField,
): string {
  const value = body[field];
  if (typeof value !== "string" || value.trim() === "") {
    throw new ValidationError(
      `${field} is required and must be a non-empty string.`,
    );
  }
  return value;
}

function requireObjectId(
  body: Record<string, unknown>,
  field: CreateReservationField,
): string {
  const value = requireNonEmptyString(body, field);
  if (!isObjectIdString(value)) {
    throw new ValidationError(
      `${field} must be a 24-character hexadecimal ObjectId.`,
    );
  }
  return value;
}

function requireDateTime(
  body: Record<string, unknown>,
  field: CreateReservationField,
): Date {
  const value = requireNonEmptyString(body, field);
  const invalid = new ValidationError(
    `${field} must be an ISO 8601 date-time with a time zone, e.g. 2026-10-01T10:00:00Z.`,
  );
  if (!ISO_DATE_TIME.test(value)) {
    throw invalid;
  }
  // The regex bounds each component; this rejects days such as 2026-02-30 that
  // the regex allows and Date would silently roll over.
  const datePart = value.slice(0, 10);
  const calendarDate = new Date(`${datePart}T00:00:00Z`);
  const date = new Date(value);
  if (
    Number.isNaN(calendarDate.getTime()) ||
    calendarDate.toISOString().slice(0, 10) !== datePart ||
    Number.isNaN(date.getTime())
  ) {
    throw invalid;
  }
  return date;
}

function parseCreateReservation(body: unknown): IParsedCreateReservation {
  if (!isRecord(body)) {
    throw new ValidationError("Request body must be a JSON object.");
  }
  for (const key of Object.keys(body)) {
    if (READ_ONLY_FIELDS.includes(key)) {
      throw new ValidationError(`${key} is read-only and must not be sent.`);
    }
    if (!CREATE_FIELDS.some((field) => field === key)) {
      throw new ValidationError(`Unknown field: ${key}.`);
    }
  }
  const parsed: IParsedCreateReservation = {
    resourceId: requireObjectId(body, "resourceId"),
    userId: requireNonEmptyString(body, "userId"),
    startTime: requireDateTime(body, "startTime"),
    endTime: requireDateTime(body, "endTime"),
  };
  if (parsed.endTime.getTime() <= parsed.startTime.getTime()) {
    throw new ValidationError("endTime must be later than startTime.");
  }
  return parsed;
}

function toReservation(doc: IStoredReservation): Reservation {
  return {
    id: doc._id.toHexString(),
    resourceId: doc.resourceId.toHexString(),
    userId: doc.userId,
    startTime: doc.startTime.toISOString(),
    endTime: doc.endTime.toISOString(),
    status: doc.status,
  };
}

// Serializes the overlap check and insert per resource so concurrent requests
// cannot both pass the check. This holds within one process only; running
// several instances would need a MongoDB transaction (replica set) instead.
async function withResourceLock<T>(
  resourceId: string,
  task: () => Promise<T>,
): Promise<T> {
  const previous = resourceLocks.get(resourceId) ?? Promise.resolve();
  const run = previous.then(task);
  const tail = run.then(
    (): void => undefined,
    (): void => undefined,
  );
  resourceLocks.set(resourceId, tail);
  try {
    return await run;
  } finally {
    if (resourceLocks.get(resourceId) === tail) {
      resourceLocks.delete(resourceId);
    }
  }
}

async function insertIfFree(
  input: IParsedCreateReservation,
): Promise<Reservation> {
  const resourceObjectId = new Types.ObjectId(input.resourceId);
  // Half-open intervals: a slot ending at 11:00 does not overlap one starting at 11:00.
  const overlapping = await ReservationModel.countDocuments({
    resourceId: resourceObjectId,
    status: { $ne: "CANCELLED" },
    startTime: { $lt: input.endTime },
    endTime: { $gt: input.startTime },
  });
  if (overlapping > 0) {
    throw new ConflictError(
      "DOUBLE_BOOKING",
      "Resource is already reserved for this time slot.",
    );
  }

  const doc = new ReservationModel({
    resourceId: resourceObjectId,
    userId: input.userId,
    startTime: input.startTime,
    endTime: input.endTime,
    status: "CONFIRMED",
  });
  try {
    await doc.validate();
  } catch (err) {
    throw new ValidationError(
      err instanceof Error ? err.message : "Reservation failed validation.",
    );
  }
  await doc.save();
  return toReservation(doc.toObject());
}

export async function createReservation(body: unknown): Promise<Reservation> {
  const input = parseCreateReservation(body);

  const resource = await findResourceById(input.resourceId);
  if (resource === undefined) {
    throw new ValidationError(
      `resourceId "${input.resourceId}" does not reference an existing resource.`,
    );
  }
  if (!resource.isAvailable) {
    throw new ConflictError(
      "RESOURCE_UNAVAILABLE",
      "Resource is not available for reservation.",
    );
  }

  return withResourceLock(input.resourceId, () => insertIfFree(input));
}

export async function listReservationsForUser(
  userId: string,
): Promise<Reservation[]> {
  if (userId.trim() === "") {
    throw new ValidationError("userId must be a non-empty string.");
  }
  const docs = await ReservationModel.find({ userId })
    .sort({ startTime: 1, _id: 1 })
    .lean<IStoredReservation[]>();
  return docs.map(toReservation);
}

// A single conditional update, not read-then-write, so of two concurrent cancels
// exactly one matches. A cancelled reservation stops blocking its slot because
// the overlap check in insertIfFree ignores CANCELLED.
export async function cancelReservation(id: string): Promise<Reservation> {
  if (!isObjectIdString(id)) {
    throw new ValidationError(
      "id must be a 24-character hexadecimal ObjectId.",
    );
  }
  const reservationId = new Types.ObjectId(id);
  const cancelled = await ReservationModel.findOneAndUpdate(
    { _id: reservationId, status: { $ne: "CANCELLED" } },
    { $set: { status: "CANCELLED" } },
    { returnDocument: "after" },
  ).lean<IStoredReservation>();
  if (cancelled !== null) {
    return toReservation(cancelled);
  }
  if ((await ReservationModel.exists({ _id: reservationId })) === null) {
    throw new NotFoundError(`Reservation ${id} does not exist.`);
  }
  throw new ConflictError(
    "ALREADY_CANCELLED",
    "Reservation is already cancelled.",
  );
}
