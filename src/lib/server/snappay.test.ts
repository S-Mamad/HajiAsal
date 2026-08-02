import { describe, expect, it } from "vitest";
import { applySnappayFee, SNAPPPAY_FEE_PERCENT } from "@/lib/server/snappay";

describe("snappay fee", () => {
  it("adds 10 percent to cash total", () => {
    expect(SNAPPPAY_FEE_PERCENT).toBe(10);
    expect(applySnappayFee(100_000)).toBe(110_000);
    expect(applySnappayFee(1)).toBe(1);
  });
});
