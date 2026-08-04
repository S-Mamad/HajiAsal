import { afterEach, describe, expect, it } from "vitest";
import { isProfileComplete } from "./profile-complete";

describe("isProfileComplete", () => {
  afterEach(() => {
    /* no-op */
  });

  it("rejects null empty and whitespace", () => {
    expect(isProfileComplete(null)).toBe(false);
    expect(isProfileComplete(undefined)).toBe(false);
    expect(isProfileComplete("")).toBe(false);
    expect(isProfileComplete("   ")).toBe(false);
  });

  it("accepts non-empty names", () => {
    expect(isProfileComplete("علی")).toBe(true);
    expect(isProfileComplete("  مریم رضایی ")).toBe(true);
  });
});
