import { afterEach, describe, expect, it, jest } from "@jest/globals";
import request from "supertest";
import type { Response } from "supertest";
import type { ErrorResponse, Reservation, Resource } from "@campushub/shared";
import app from "../../app.js";
import { ResourceModel } from "../../models/Resource.model.js";
import {
  MISSING_ID,
  createResource,
  reservationBody,
} from "../../test/fixtures.js";

const OBJECT_ID = /^[0-9a-f]{24}$/;

// Supertest types res.body as any; read it through the contract types instead.
function errorOf(res: Response): ErrorResponse {
  return res.body as ErrorResponse;
}
function reservationOf(res: Response): Reservation {
  return res.body as Reservation;
}
function reservationsOf(res: Response): Reservation[] {
  return res.body as Reservation[];
}
function namesOf(res: Response): string[] {
  return (res.body as Resource[]).map((r) => r.name);
}

afterEach((): void => {
  jest.restoreAllMocks();
});

describe("POST /api/v1/reservations", () => {
  it("returns 201 Created with the new reservation", async () => {
    const resourceId = await createResource();
    const res = await request(app)
      .post("/api/v1/reservations")
      .send(reservationBody(resourceId));

    expect(res.status).toBe(201);
    expect(res.headers["content-type"]).toMatch(/application\/json/);
    expect(res.body).toEqual({
      id: expect.stringMatching(OBJECT_ID),
      resourceId,
      userId: "student-1",
      startTime: "2026-12-01T10:00:00.000Z",
      endTime: "2026-12-01T11:00:00.000Z",
      status: "CONFIRMED",
    });
  });

  it("returns 409 Conflict for an overlapping booking", async () => {
    const resourceId = await createResource();
    await request(app)
      .post("/api/v1/reservations")
      .send(reservationBody(resourceId))
      .expect(201);

    const res = await request(app)
      .post("/api/v1/reservations")
      .send(
        reservationBody(
          resourceId,
          "2026-12-01T10:30:00.000Z",
          "2026-12-01T11:30:00.000Z",
          "student-2",
        ),
      );

    expect(res.status).toBe(409);
    expect(res.body).toEqual({
      code: "DOUBLE_BOOKING",
      message: "Resource is already reserved for this time slot.",
    });
  });

  it("returns 409 Conflict for an unavailable resource", async () => {
    const resourceId = await createResource({ isAvailable: false });
    const res = await request(app)
      .post("/api/v1/reservations")
      .send(reservationBody(resourceId));
    expect(res.status).toBe(409);
    expect(errorOf(res).code).toBe("RESOURCE_UNAVAILABLE");
  });

  it("returns 400 when endTime is before startTime", async () => {
    const resourceId = await createResource();
    const res = await request(app)
      .post("/api/v1/reservations")
      .send(
        reservationBody(
          resourceId,
          "2026-12-01T11:00:00Z",
          "2026-12-01T10:00:00Z",
        ),
      );
    expect(res.status).toBe(400);
    expect(errorOf(res).code).toBe("VALIDATION_ERROR");
  });

  it("returns 400 for a resourceId that does not exist", async () => {
    const res = await request(app)
      .post("/api/v1/reservations")
      .send(reservationBody(MISSING_ID));
    expect(res.status).toBe(400);
  });

  it("returns 400 for a malformed JSON body", async () => {
    const res = await request(app)
      .post("/api/v1/reservations")
      .set("Content-Type", "application/json")
      .send('{"resourceId":');
    expect(res.status).toBe(400);
    expect(res.body).toEqual({
      code: "VALIDATION_ERROR",
      message: "Request body is not valid JSON.",
    });
  });

  it("returns a generic 500 without leaking the driver error", async () => {
    const resourceId = await createResource();
    jest.spyOn(ResourceModel, "findById").mockImplementationOnce((): never => {
      throw new Error("secret driver detail");
    });
    jest.spyOn(console, "error").mockImplementation((): void => undefined);

    const res = await request(app)
      .post("/api/v1/reservations")
      .send(reservationBody(resourceId));
    expect(res.status).toBe(500);
    expect(res.body).toEqual({
      code: "INTERNAL_ERROR",
      message: "Internal Server Error",
    });
    expect(JSON.stringify(res.body)).not.toContain("secret");
  });
});

describe("GET /api/v1/resources", () => {
  async function seedResources(): Promise<void> {
    await createResource({ name: "Room A", type: "ROOM", isAvailable: true });
    await createResource({ name: "Room B", type: "ROOM", isAvailable: false });
    await createResource({ name: "Lab 1", type: "LAB", isAvailable: true });
  }

  it("returns 200 OK with every resource", async () => {
    await seedResources();
    const res = await request(app).get("/api/v1/resources");
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(3);
  });

  it("returns 200 OK filtered by type", async () => {
    await seedResources();
    const res = await request(app)
      .get("/api/v1/resources")
      .query({ type: "ROOM" });
    expect(res.status).toBe(200);
    expect(namesOf(res)).toEqual(["Room A", "Room B"]);
  });

  it("returns 200 OK filtered by isAvailable=false", async () => {
    await seedResources();
    const res = await request(app)
      .get("/api/v1/resources")
      .query({ isAvailable: "false" });
    expect(res.status).toBe(200);
    expect(namesOf(res)).toEqual(["Room B"]);
  });

  it("returns 200 OK with both filters combined", async () => {
    await seedResources();
    const res = await request(app)
      .get("/api/v1/resources")
      .query({ type: "ROOM", isAvailable: "true" });
    expect(res.status).toBe(200);
    expect(res.body).toEqual([
      {
        id: expect.stringMatching(OBJECT_ID),
        name: "Room A",
        type: "ROOM",
        location: "Snell Library, 3rd Floor",
        isAvailable: true,
      },
    ]);
  });

  it("returns 200 OK with [] for an unknown type", async () => {
    await seedResources();
    const res = await request(app).get("/api/v1/resources?type=SPACESHIP");
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it("returns 400 for an invalid isAvailable value", async () => {
    const res = await request(app).get("/api/v1/resources?isAvailable=yes");
    expect(res.status).toBe(400);
    expect(errorOf(res).code).toBe("VALIDATION_ERROR");
  });
});

describe("GET /api/v1/reservations/user/:userId", () => {
  it("returns 200 OK with the user's reservations", async () => {
    const resourceId = await createResource();
    await request(app)
      .post("/api/v1/reservations")
      .send(reservationBody(resourceId))
      .expect(201);

    const res = await request(app).get("/api/v1/reservations/user/student-1");
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(reservationsOf(res)[0]?.resourceId).toBe(resourceId);
  });
});

describe("PATCH /api/v1/reservations/:id/cancel", () => {
  it("returns 200, then 409 on a second cancel", async () => {
    const resourceId = await createResource();
    const created = await request(app)
      .post("/api/v1/reservations")
      .send(reservationBody(resourceId));
    const url = `/api/v1/reservations/${reservationOf(created).id}/cancel`;

    const first = await request(app).patch(url);
    expect(first.status).toBe(200);
    expect(reservationOf(first).status).toBe("CANCELLED");

    const second = await request(app).patch(url);
    expect(second.status).toBe(409);
    expect(errorOf(second).code).toBe("ALREADY_CANCELLED");
  });

  it("returns 404 for a reservation that does not exist", async () => {
    const res = await request(app).patch(
      `/api/v1/reservations/${MISSING_ID}/cancel`,
    );
    expect(res.status).toBe(404);
    expect(errorOf(res).code).toBe("NOT_FOUND");
  });

  it("returns 400 for a malformed id", async () => {
    const res = await request(app).patch("/api/v1/reservations/abc/cancel");
    expect(res.status).toBe(400);
  });
});

describe("app-level routes", () => {
  it("GET /api/v1/health returns 200", async () => {
    const res = await request(app).get("/api/v1/health");
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      status: "ok",
      service: "campushub-backend",
      environment: "test",
    });
  });

  it("returns 404 JSON for an unknown route", async () => {
    const res = await request(app).get("/api/v1/nope");
    expect(res.status).toBe(404);
    expect(res.body).toEqual({
      code: "NOT_FOUND",
      message: "Cannot GET /api/v1/nope",
    });
  });
});
