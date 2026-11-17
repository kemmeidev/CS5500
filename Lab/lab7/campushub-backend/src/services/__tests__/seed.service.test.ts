import { afterEach, describe, expect, it } from "@jest/globals";
import { config } from "../../config/env.config.js";
import { ReservationModel } from "../../models/Reservation.model.js";
import { ResourceModel } from "../../models/Resource.model.js";
import { createResource, reservationBody } from "../../test/fixtures.js";
import { createReservation } from "../reservation.service.js";
import { seedDatabase } from "../seed.service.js";

describe("seedDatabase", () => {
  const originalEnv = config.nodeEnv;

  afterEach((): void => {
    config.nodeEnv = originalEnv;
  });

  it("inserts the four seed resources and clears reservations", async () => {
    const extra = await createResource({ name: "Not a seed" });
    await createReservation(reservationBody(extra));

    const summary = await seedDatabase();
    expect(summary).toEqual({ resourcesUpserted: 4, reservationsDeleted: 1 });
    expect(await ResourceModel.countDocuments()).toBe(5);
    expect(await ReservationModel.countDocuments()).toBe(0);
  });

  it("can be re-run without duplicating resources", async () => {
    await seedDatabase();
    await expect(seedDatabase()).resolves.toMatchObject({
      reservationsDeleted: 0,
    });
    expect(await ResourceModel.countDocuments()).toBe(4);
  });

  it("refuses to run in production", async () => {
    config.nodeEnv = "production";
    await expect(seedDatabase()).rejects.toThrow(
      "Refusing to seed: NODE_ENV is production.",
    );
    expect(await ResourceModel.countDocuments()).toBe(0);
  });
});
