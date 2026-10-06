import { randomUUID } from "node:crypto";
import { ReservationModel } from "../models/reservation.model.js";
import type { IReservationDocument } from "../models/reservation.model.js";
import type {
  CreateReservationRequest,
  Reservation,
} from "../types/reservation.js";
import { ConflictError, ValidationError } from "./domain.errors.js";
import { findResourceById } from "./resource.service.js";

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

// In-memory store until a database connection is introduced.
const reservations: IReservationDocument[] = [];

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
    resourceId: requireNonEmptyString(body, "resourceId"),
    userId: requireNonEmptyString(body, "userId"),
    startTime: requireDateTime(body, "startTime"),
    endTime: requireDateTime(body, "endTime"),
  };
  if (parsed.endTime.getTime() <= parsed.startTime.getTime()) {
    throw new ValidationError("endTime must be later than startTime.");
  }
  return parsed;
}

function isActive(doc: IReservationDocument): boolean {
  return doc.status !== "CANCELLED";
}

function toReservation(doc: IReservationDocument): Reservation {
  return {
    id: doc.id,
    resourceId: doc.resourceId,
    userId: doc.userId,
    startTime: doc.startTime.toISOString(),
    endTime: doc.endTime.toISOString(),
    status: doc.status,
  };
}

export async function createReservation(body: unknown): Promise<Reservation> {
  const input = parseCreateReservation(body);

  const resource = findResourceById(input.resourceId);
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

  const doc: IReservationDocument = {
    id: randomUUID(),
    ...input,
    status: "CONFIRMED",
  };
  try {
    await new ReservationModel(doc).validate();
  } catch (err) {
    throw new ValidationError(
      err instanceof Error ? err.message : "Reservation failed validation.",
    );
  }

  // No await between the overlap check and the insert, so concurrent requests
  // cannot both pass the check. Half-open intervals: a slot ending at 11:00
  // does not overlap one starting at 11:00.
  const overlaps = reservations.some(
    (existing) =>
      existing.resourceId === input.resourceId &&
      isActive(existing) &&
      existing.startTime.getTime() < input.endTime.getTime() &&
      input.startTime.getTime() < existing.endTime.getTime(),
  );
  if (overlaps) {
    throw new ConflictError(
      "DOUBLE_BOOKING",
      "Resource is already reserved for this time slot.",
    );
  }

  reservations.push(doc);
  return toReservation(doc);
}

export function listActiveReservationsForUser(userId: string): Reservation[] {
  if (userId.trim() === "") {
    throw new ValidationError("userId must be a non-empty string.");
  }
  return reservations
    .filter((doc) => doc.userId === userId && isActive(doc))
    .sort((a, b) => a.startTime.getTime() - b.startTime.getTime())
    .map(toReservation);
}
