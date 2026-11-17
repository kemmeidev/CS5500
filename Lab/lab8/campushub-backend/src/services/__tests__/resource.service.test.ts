import { beforeEach, describe, expect, it } from "@jest/globals";
import { MISSING_ID, createResource } from "../../test/fixtures.js";
import { ValidationError } from "../domain.errors.js";
import {
  findResourceById,
  isObjectIdString,
  listResources,
} from "../resource.service.js";

describe("listResources", () => {
  beforeEach(async (): Promise<void> => {
    await createResource({ name: "Room A", type: "ROOM", isAvailable: true });
    await createResource({ name: "Room B", type: "ROOM", isAvailable: false });
    await createResource({ name: "Printer", type: "EQUIPMENT" });
  });

  it("returns every resource when no filter is given", async () => {
    const all = await listResources(undefined, undefined);
    expect(all.map((r) => r.name)).toEqual(["Room A", "Room B", "Printer"]);
  });

  it("filters by type", async () => {
    const rooms = await listResources("ROOM", undefined);
    expect(rooms.map((r) => r.name)).toEqual(["Room A", "Room B"]);
  });

  it.each([
    ["true", ["Room A", "Printer"]],
    ["false", ["Room B"]],
  ])("filters by isAvailable=%s", async (flag, names) => {
    const result = await listResources(undefined, flag);
    expect(result.map((r) => r.name)).toEqual(names);
  });

  it("combines both filters", async () => {
    const result = await listResources("ROOM", "false");
    expect(result).toEqual([
      {
        id: expect.any(String),
        name: "Room B",
        type: "ROOM",
        location: "Snell Library, 3rd Floor",
        isAvailable: false,
      },
    ]);
  });

  it("returns an empty list for an unknown type", async () => {
    await expect(listResources("SPACESHIP", undefined)).resolves.toEqual([]);
  });

  it.each<[string, unknown]>([
    ["blank", " "],
    ["repeated", ["ROOM", "LAB"]],
  ])("rejects a %s type", async (_label, type) => {
    await expect(listResources(type, undefined)).rejects.toBeInstanceOf(
      ValidationError,
    );
  });

  it.each(["yes", "1", "TRUE", ""])("rejects isAvailable=%s", async (flag) => {
    await expect(listResources(undefined, flag)).rejects.toThrow(
      "isAvailable must be exactly true or false when provided.",
    );
  });
});

describe("findResourceById", () => {
  it("returns the mapped resource", async () => {
    const id = await createResource();
    await expect(findResourceById(id)).resolves.toMatchObject({
      id,
      type: "ROOM",
    });
  });

  it("returns undefined for a missing or malformed id", async () => {
    await expect(findResourceById(MISSING_ID)).resolves.toBeUndefined();
    await expect(findResourceById("not-an-id")).resolves.toBeUndefined();
  });
});

describe("isObjectIdString", () => {
  it("accepts only 24 hex characters", () => {
    expect(isObjectIdString("66f000000000000000000101")).toBe(true);
    expect(isObjectIdString("66F000000000000000000101")).toBe(true);
    expect(isObjectIdString("123456789012")).toBe(false);
    expect(isObjectIdString("66f00000000000000000010g")).toBe(false);
  });
});
