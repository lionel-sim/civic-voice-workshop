import { describe, expect, it } from "vitest";
import { isWorkshopId } from "./workshopId";

describe("isWorkshopId", () => {
  it("accepts the seeded workshop IDs", () => {
    expect(isWorkshopId("S0000001A")).toBe(true);
    expect(isWorkshopId("S0000002B")).toBe(true);
  });

  it("rejects empty and malformed IDs", () => {
    expect(isWorkshopId("")).toBe(false);
    expect(isWorkshopId("S000001A")).toBe(false);
    expect(isWorkshopId("0000001A")).toBe(false);
    expect(isWorkshopId("S0000001")).toBe(false);
  });
});
