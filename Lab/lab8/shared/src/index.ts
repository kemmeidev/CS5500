// Contract types shared by the backend and the client. Mirrors components/schemas
// in ../campushub-backend/docs/openapi.yaml field-for-field.

export const RESOURCE_TYPES = ["ROOM", "EQUIPMENT", "LAB"] as const;
export type ResourceType = (typeof RESOURCE_TYPES)[number];

export const RESERVATION_STATUSES = [
  "PENDING",
  "CONFIRMED",
  "CANCELLED",
] as const;
export type ReservationStatus = (typeof RESERVATION_STATUSES)[number];

export const USER_ROLES = ["STUDENT", "STAFF", "ADMIN"] as const;
export type UserRole = (typeof USER_ROLES)[number];

export interface Resource {
  id: string;
  name: string;
  type: ResourceType;
  location: string;
  isAvailable: boolean;
}

export interface Reservation {
  readonly id: string;
  resourceId: string;
  userId: string;
  /** ISO 8601 date-time string. */
  startTime: string;
  /** ISO 8601 date-time string. */
  endTime: string;
  readonly status: ReservationStatus;
}

/** Request body of POST /reservations: `Reservation` without its readOnly fields. */
export type CreateReservationRequest = Omit<Reservation, "id" | "status">;

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}

export interface ErrorResponse {
  code: string;
  message: string;
}
