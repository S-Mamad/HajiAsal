import { describe, expect, it } from "vitest";
import { createPathPrefetchGate, isWithinProximity } from "./prefetch";

describe("support fab prefetch gate", () => {
  it("fetches once per path unless forced", () => {
    const gate = createPathPrefetchGate();
    expect(gate.shouldFetch("/cart")).toBe(true);
    expect(gate.shouldFetch("/cart")).toBe(false);
    expect(gate.shouldFetch("/cart")).toBe(false);
    expect(gate.shouldFetch("/checkout")).toBe(true);
    expect(gate.shouldFetch("/cart", true)).toBe(true);
  });

  it("allows a new fetch after forget", () => {
    const gate = createPathPrefetchGate();
    expect(gate.shouldFetch("/")).toBe(true);
    gate.forget();
    expect(gate.shouldFetch("/")).toBe(true);
  });

  it("detects pointer proximity around the FAB", () => {
    expect(isWithinProximity(100, 100, 100, 100, 48)).toBe(true);
    expect(isWithinProximity(200, 100, 100, 100, 48)).toBe(false);
  });
});
