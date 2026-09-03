import { describe, expect, it } from "vitest";
import { maskIdentifier } from "./maskIdentifier";

describe("maskIdentifier", () => {
  it("keeps only the first and last two characters visible", () => {
    expect(maskIdentifier("S0000001A")).toBe("S••••••1A");
  });

  it("does not expose short or missing identifiers", () => {
    expect(maskIdentifier("S1A")).toBe("•••");
    expect(maskIdentifier()).toBe("");
  });
});
