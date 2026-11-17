import { ResourceModel } from "../models/Resource.model.js";
import type { IResource } from "../models/Resource.model.js";

export const MISSING_ID = "66f0000000000000000009ff";

export async function createResource(
  overrides: Partial<IResource> = {},
): Promise<string> {
  const doc = await ResourceModel.create({
    name: "Study Room 302",
    type: "ROOM",
    location: "Snell Library, 3rd Floor",
    isAvailable: true,
    ...overrides,
  });
  return doc._id.toHexString();
}

export interface IReservationBody {
  resourceId: string;
  userId: string;
  startTime: string;
  endTime: string;
}

export function reservationBody(
  resourceId: string,
  startTime = "2026-12-01T10:00:00.000Z",
  endTime = "2026-12-01T11:00:00.000Z",
  userId = "student-1",
): IReservationBody {
  return { resourceId, userId, startTime, endTime };
}
