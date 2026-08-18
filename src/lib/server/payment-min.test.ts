import { describe, expect, it } from "vitest";
import {
  GATEWAY_MIN_AMOUNT_TOMAN,
  isBelowGatewayMinimum,
} from "./payment-min";

describe("isBelowGatewayMinimum", () => {
  it("treats zero and sub-minimum as free", () => {
    expect(isBelowGatewayMinimum(0)).toBe(true);
    expect(isBelowGatewayMinimum(50)).toBe(true);
    expect(isBelowGatewayMinimum(GATEWAY_MIN_AMOUNT_TOMAN - 1)).toBe(true);
  });

  it("allows gateway-eligible totals", () => {
    expect(isBelowGatewayMinimum(GATEWAY_MIN_AMOUNT_TOMAN)).toBe(false);
    expect(isBelowGatewayMinimum(10_000)).toBe(false);
  });
});
