import { afterEach, describe, expect, it, jest } from "@jest/globals";
import { ReservationModel } from "../../models/Reservation.model.js";
import { ResourceModel } from "../../models/Resource.model.js";
import {
  MISSING_ID,
  createResource,
  reservationBody,
} from "../../test/fixtures.js";
import {
  ConflictError,
  NotFoundError,
  ValidationError,
} from "../domain.errors.js";
import {
  cancelReservation,
  createReservation,
  listReservationsForUser,
} from "../reservation.service.js";

const OBJECT_ID = /^[0-9a-f]{24}$/;

afterEach((): void => {
  jest.restoreAllMocks();
});

describe("createReservation — happy path", () => {
  it("creates a resource fixture that the service can book", async () => {
    const resourceId = await createResource();
    expect(resourceId).toMatch(OBJECT_ID);
    expect(await ResourceModel.countDocuments()).toBe(1);
  });

  it("places a valid reservation and persists it as CONFIRMED", async () => {
    const resourceId = await createResource();
    const created = await createReservation(reservationBody(resourceId));

    expect(created).toEqual({
      id: expect.stringMatching(OBJECT_ID),
      resourceId,
      userId: "student-1",
      startTime: "2026-12-01T10:00:00.000Z",
      endTime: "2026-12-01T11:00:00.000Z",
      status: "CONFIRMED",
    });
    const stored = await ReservationModel.findById(created.id).lean();
    expect(stored?.status).toBe("CONFIRMED");
  });

  it("normalizes a zone offset to UTC", async () => {
    const resourceId = await createResource();
    const created = await createReservation(
      reservationBody(
        resourceId,
        "2026-12-01T05:00:00-05:00",
        "2026-12-01T06:00:00-05:00",
      ),
    );
    expect(created.startTime).toBe("2026-12-01T10:00:00.000Z");
  });

  it("allows back-to-back bookings (half-open intervals)", async () => {
    const resourceId = await createResource();
    await createReservation(reservationBody(resourceId));
    const next = await createReservation(
      reservationBody(
        resourceId,
        "2026-12-01T11:00:00.000Z",
        "2026-12-01T12:00:00.000Z",
      ),
    );
    expect(next.status).toBe("CONFIRMED");
  });

  it("books the same slot on a different resource", async () => {
    const roomA = await createResource();
    const roomB = await createResource({ name: "Study Room 118" });
    await createReservation(reservationBody(roomA));
    await expect(
      createReservation(reservationBody(roomB)),
    ).resolves.toMatchObject({ resourceId: roomB });
  });
});

describe("createReservation — adversarial edge cases", () => {
  it("rejects a double booking with the exact same start and end", async () => {
    const resourceId = await createResource();
    await createReservation(reservationBody(resourceId));

    const attempt = createReservation(
      reservationBody(resourceId, undefined, undefined, "student-2"),
    );
    await expect(attempt).rejects.toBeInstanceOf(ConflictError);
    await expect(
      createReservation(reservationBody(resourceId)),
    ).rejects.toMatchObject({ code: "DOUBLE_BOOKING" });
    expect(await ReservationModel.countDocuments()).toBe(1);
  });

  it("rejects a booking fully inside or around an existing one", async () => {
    const resourceId = await createResource();
    await createReservation(reservationBody(resourceId));
    await expect(
      createReservation(
        reservationBody(
          resourceId,
          "2026-12-01T10:15:00Z",
          "2026-12-01T10:45:00Z",
        ),
      ),
    ).rejects.toMatchObject({ code: "DOUBLE_BOOKING" });
    await expect(
      createReservation(
        reservationBody(
          resourceId,
          "2026-12-01T09:00:00Z",
          "2026-12-01T12:00:00Z",
        ),
      ),
    ).rejects.toMatchObject({ code: "DOUBLE_BOOKING" });
  });

  it("rejects endTime before startTime", async () => {
    const resourceId = await createResource();
    await expect(
      createReservation(
        reservationBody(
          resourceId,
          "2026-12-01T11:00:00Z",
          "2026-12-01T10:00:00Z",
        ),
      ),
    ).rejects.toThrow(
      new ValidationError("endTime must be later than startTime."),
    );
  });

  it("rejects endTime equal to startTime (zero-length slot)", async () => {
    const resourceId = await createResource();
    await expect(
      createReservation(
        reservationBody(
          resourceId,
          "2026-12-01T10:00:00Z",
          "2026-12-01T10:00:00Z",
        ),
      ),
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it("rejects endTime 1 ms before startTime", async () => {
    const resourceId = await createResource();
    await expect(
      createReservation(
        reservationBody(
          resourceId,
          "2026-12-01T10:00:00.000Z",
          "2026-12-01T09:59:59.999Z",
        ),
      ),
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it("rejects a well-formed resourceId that does not exist", async () => {
    await expect(
      createReservation(reservationBody(MISSING_ID)),
    ).rejects.toThrow(
      new ValidationError(
        `resourceId "${MISSING_ID}" does not reference an existing resource.`,
      ),
    );
    expect(await ReservationModel.countDocuments()).toBe(0);
  });

  it("rejects a booking that starts 1 ms before an existing one ends", async () => {
    const resourceId = await createResource();
    await createReservation(reservationBody(resourceId));
    await expect(
      createReservation(
        reservationBody(
          resourceId,
          "2026-12-01T10:59:59.999Z",
          "2026-12-01T12:00:00.000Z",
        ),
      ),
    ).rejects.toMatchObject({ code: "DOUBLE_BOOKING" });
  });

  it("rejects a booking that ends 1 ms after an existing one starts", async () => {
    const resourceId = await createResource();
    await createReservation(reservationBody(resourceId));
    await expect(
      createReservation(
        reservationBody(
          resourceId,
          "2026-12-01T09:00:00.000Z",
          "2026-12-01T10:00:00.001Z",
        ),
      ),
    ).rejects.toMatchObject({ code: "DOUBLE_BOOKING" });
  });

  it("accepts a booking that ends exactly when an existing one starts", async () => {
    const resourceId = await createResource();
    await createReservation(reservationBody(resourceId));
    await expect(
      createReservation(
        reservationBody(
          resourceId,
          "2026-12-01T09:00:00.000Z",
          "2026-12-01T10:00:00.000Z",
        ),
      ),
    ).resolves.toMatchObject({ status: "CONFIRMED" });
  });

  it("lets exactly one of two concurrent requests for a slot succeed", async () => {
    const resourceId = await createResource();
    const results = await Promise.allSettled([
      createReservation(reservationBody(resourceId, undefined, undefined, "a")),
      createReservation(reservationBody(resourceId, undefined, undefined, "b")),
      createReservation(reservationBody(resourceId, undefined, undefined, "c")),
    ]);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect(await ReservationModel.countDocuments()).toBe(1);
  });

  it("rejects an unavailable resource", async () => {
    const resourceId = await createResource({ isAvailable: false });
    await expect(
      createReservation(reservationBody(resourceId)),
    ).rejects.toMatchObject({ code: "RESOURCE_UNAVAILABLE" });
  });

  it("maps a model validation failure to ValidationError", async () => {
    const resourceId = await createResource();
    jest
      .spyOn(ReservationModel.prototype, "validate")
      .mockRejectedValueOnce(new Error("schema says no"));
    await expect(
      createReservation(reservationBody(resourceId)),
    ).rejects.toThrow(new ValidationError("schema says no"));
  });

  it("uses a generic message when validation rejects a non-Error", async () => {
    const resourceId = await createResource();
    jest
      .spyOn(ReservationModel.prototype, "validate")
      .mockRejectedValueOnce("boom");
    await expect(
      createReservation(reservationBody(resourceId)),
    ).rejects.toThrow(new ValidationError("Reservation failed validation."));
  });

  it("propagates a database failure during the overlap check", async () => {
    const resourceId = await createResource();
    jest
      .spyOn(ReservationModel, "countDocuments")
      .mockRejectedValueOnce(new Error("connection lost"));
    await expect(
      createReservation(reservationBody(resourceId)),
    ).rejects.toThrow("connection lost");
    // The per-resource lock is released, so the next request is not blocked.
    await expect(
      createReservation(reservationBody(resourceId)),
    ).resolves.toMatchObject({ status: "CONFIRMED" });
  });
});

describe("createReservation — request body validation", () => {
  const valid = reservationBody("66f000000000000000000101");

  it.each<[string, unknown]>([
    ["null", null],
    ["an array", [valid]],
    ["a string", "resourceId=1"],
  ])("rejects a body that is %s", async (_label, body) => {
    await expect(createReservation(body)).rejects.toThrow(
      new ValidationError("Request body must be a JSON object."),
    );
  });

  it.each(["id", "status"])("rejects read-only field %s", async (field) => {
    await expect(createReservation({ ...valid, [field]: "x" })).rejects.toThrow(
      `${field} is read-only and must not be sent.`,
    );
  });

  it("rejects an unknown field", async () => {
    await expect(createReservation({ ...valid, room: "302" })).rejects.toThrow(
      "Unknown field: room.",
    );
  });

  it.each(["resourceId", "userId", "startTime", "endTime"] as const)(
    "rejects a missing or blank %s",
    async (field) => {
      const missing: Record<string, string> = { ...valid };
      delete missing[field];
      await expect(createReservation(missing)).rejects.toThrow(
        `${field} is required and must be a non-empty string.`,
      );
      await expect(
        createReservation({ ...valid, [field]: "   " }),
      ).rejects.toBeInstanceOf(ValidationError);
    },
  );

  it("rejects a non-string field", async () => {
    await expect(
      createReservation({ ...valid, userId: 42 }),
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it("rejects a resourceId that is not an ObjectId", async () => {
    await expect(
      createReservation({ ...valid, resourceId: "room-302" }),
    ).rejects.toThrow(
      "resourceId must be a 24-character hexadecimal ObjectId.",
    );
  });

  it.each([
    "2026-12-01T10:00:00",
    "2026-12-01 10:00:00Z",
    "2026-13-01T10:00:00Z",
    "2026-02-30T10:00:00Z",
    "tomorrow",
  ])("rejects malformed startTime %s", async (startTime) => {
    await expect(createReservation({ ...valid, startTime })).rejects.toThrow(
      "startTime must be an ISO 8601 date-time",
    );
  });
});

describe("listReservationsForUser", () => {
  it("returns only that user's reservations, ordered by startTime", async () => {
    const resourceId = await createResource();
    await createReservation(
      reservationBody(
        resourceId,
        "2026-12-02T10:00:00Z",
        "2026-12-02T11:00:00Z",
      ),
    );
    await createReservation(reservationBody(resourceId));
    await createReservation(
      reservationBody(
        resourceId,
        "2026-12-03T10:00:00Z",
        "2026-12-03T11:00:00Z",
        "student-2",
      ),
    );

    const mine = await listReservationsForUser("student-1");
    expect(mine.map((r) => r.startTime)).toEqual([
      "2026-12-01T10:00:00.000Z",
      "2026-12-02T10:00:00.000Z",
    ]);
  });

  it("returns an empty list for a user with no reservations", async () => {
    await expect(listReservationsForUser("nobody")).resolves.toEqual([]);
  });

  it("rejects a blank userId", async () => {
    await expect(listReservationsForUser("  ")).rejects.toBeInstanceOf(
      ValidationError,
    );
  });
});

describe("cancelReservation", () => {
  it("cancels a confirmed reservation", async () => {
    const resourceId = await createResource();
    const { id } = await createReservation(reservationBody(resourceId));

    const cancelled = await cancelReservation(id);
    expect(cancelled).toMatchObject({ id, status: "CANCELLED" });
    const stored = await ReservationModel.findById(id).lean();
    expect(stored?.status).toBe("CANCELLED");
  });

  it("frees the slot so it can be booked again", async () => {
    const resourceId = await createResource();
    const { id } = await createReservation(reservationBody(resourceId));
    await cancelReservation(id);
    await expect(
      createReservation(reservationBody(resourceId)),
    ).resolves.toMatchObject({ status: "CONFIRMED" });
  });

  it("rejects cancelling twice", async () => {
    const resourceId = await createResource();
    const { id } = await createReservation(reservationBody(resourceId));
    await cancelReservation(id);
    await expect(cancelReservation(id)).rejects.toMatchObject({
      code: "ALREADY_CANCELLED",
    });
  });

  it("rejects a reservation id that does not exist", async () => {
    await expect(cancelReservation(MISSING_ID)).rejects.toBeInstanceOf(
      NotFoundError,
    );
  });

  it("rejects an id that is not an ObjectId", async () => {
    await expect(cancelReservation("abc")).rejects.toBeInstanceOf(
      ValidationError,
    );
  });
});
