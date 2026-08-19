import { describe, expect, it } from "vitest";
import {
  generateSixDigitCode,
  isValidTrackingCode,
  trackingCodesMatch,
} from "@/lib/tracking-code";

describe("tracking-code", () => {
  it("generates six digit codes", () => {
    for (let i = 0; i < 20; i++) {
      const code = generateSixDigitCode();
      expect(isValidTrackingCode(code)).toBe(true);
    }
  });

  it("matches legacy TRK codes case-insensitively", () => {
    expect(trackingCodesMatch("TRK-ABC123", "trk-abc123")).toBe(true);
    expect(trackingCodesMatch("482731", "482731")).toBe(true);
    expect(trackingCodesMatch("482731", "482732")).toBe(false);
  });
});
