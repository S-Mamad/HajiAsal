import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./mysql", () => ({
  isMysqlConfigured: vi.fn(() => false),
  isMysqlUsable: vi.fn(() => false),
  mysqlExecute: vi.fn(),
  mysqlQueryOne: vi.fn(),
}));

vi.mock("./production", () => ({
  isProduction: vi.fn(() => false),
}));

import {
  __resetPaymentRefsForTests,
  assertOrderPaymentRef,
  getOrderPaymentBinding,
  setOrderPaymentRef,
  setOrderSettleRef,
} from "./payment-refs";

describe("payment refs binding", () => {
  beforeEach(() => {
    __resetPaymentRefsForTests();
  });

  it("rejects unset refs (fail-closed) and mismatches", async () => {
    expect(await assertOrderPaymentRef("ord-1", "zibal", "9900")).toBe(false);

    await setOrderPaymentRef("ord-1", "zibal", "9900");
    expect(await assertOrderPaymentRef("ord-1", "zibal", "9900")).toBe(true);
    expect(await assertOrderPaymentRef("ord-1", "zibal", "OTHER")).toBe(false);
    expect(await assertOrderPaymentRef("ord-1", "snappay", "9900")).toBe(false);
  });

  it("stores settle ref after verify", async () => {
    await setOrderPaymentRef("ord-2", "zibal", "15966442233311");
    await setOrderSettleRef("ord-2", "REF-42");
    const binding = await getOrderPaymentBinding("ord-2");
    expect(binding).toEqual({
      provider: "zibal",
      paymentRef: "15966442233311",
      settleRef: "REF-42",
    });
  });
});
