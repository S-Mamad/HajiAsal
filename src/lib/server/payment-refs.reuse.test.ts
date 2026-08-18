import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  __resetPaymentRefsForTests,
  getReusablePaymentBinding,
  setOrderPaymentRef,
  withPaymentCreateLock,
} from "./payment-refs";

describe("payment-refs reuse + lock", () => {
  beforeEach(() => {
    __resetPaymentRefsForTests();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-12T12:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("reuses fresh binding with same amount", async () => {
    await setOrderPaymentRef("ord-1", "zibal", "track-1", {
      amountToman: 10_000,
      redirectUrl: "https://gateway.zibal.ir/start/track-1",
    });
    const reused = await getReusablePaymentBinding("ord-1", "zibal", 10_000);
    expect(reused?.paymentRef).toBe("track-1");
  });

  it("does not reuse when amount is missing on legacy binding", async () => {
    await setOrderPaymentRef("ord-legacy", "zibal", "track-old");
    // Manually clear amount to simulate legacy row
    const binding = await getReusablePaymentBinding(
      "ord-legacy",
      "zibal",
      10_000,
    );
    // setOrderPaymentRef without amountToman → amountToman undefined → no reuse
    expect(binding).toBeNull();
  });

  it("does not reuse when amount changed", async () => {
    await setOrderPaymentRef("ord-1", "zibal", "track-1", {
      amountToman: 10_000,
    });
    const reused = await getReusablePaymentBinding("ord-1", "zibal", 12_000);
    expect(reused).toBeNull();
  });

  it("does not reuse after TTL", async () => {
    await setOrderPaymentRef("ord-1", "zibal", "track-1", {
      amountToman: 10_000,
    });
    vi.advanceTimersByTime(16 * 60 * 1000);
    const reused = await getReusablePaymentBinding("ord-1", "zibal", 10_000);
    expect(reused).toBeNull();
  });

  it("serializes withPaymentCreateLock", async () => {
    const order: number[] = [];
    await Promise.all([
      withPaymentCreateLock("ord-lock", async () => {
        order.push(1);
        await Promise.resolve();
        order.push(2);
      }),
      withPaymentCreateLock("ord-lock", async () => {
        order.push(3);
        order.push(4);
      }),
    ]);
    expect(order).toEqual([1, 2, 3, 4]);
  });
});
