import { afterEach, describe, expect, it, vi } from "vitest";
import {
  __getTelegramOutboxMemoryForTests,
  __resetTelegramOutboxForTests,
  claimTelegramOutbox,
  enqueueTelegramOutbox,
  markTelegramOutboxDlq,
  markTelegramOutboxRetry,
  nextBackoffMs,
  TELEGRAM_OUTBOX_MAX_ATTEMPTS,
} from "./outbox";

describe("telegram outbox", () => {
  afterEach(() => {
    __resetTelegramOutboxForTests();
  });

  it("claims pending rows and leaves future retries", async () => {
    await enqueueTelegramOutbox({
      kind: "outbound",
      event: "coupon.applied",
      payload: { code: "X", valid: true },
    });
    const later = await enqueueTelegramOutbox({
      kind: "outbound",
      event: "digest",
      payload: {},
    });
    const mem = __getTelegramOutboxMemoryForTests().rows.find(
      (row) => row.id === later.id,
    );
    if (mem) mem.nextAttemptAt = Date.now() + 60_000;

    const claimed = await claimTelegramOutbox(20);
    expect(claimed).toHaveLength(1);
    expect(claimed[0]?.event).toBe("coupon.applied");
    expect(claimed[0]?.status).toBe("processing");
  });

  it("uses 15s / 60s / 5min backoff then DLQ after max attempts", async () => {
    expect(nextBackoffMs(1)).toBe(15_000);
    expect(nextBackoffMs(2)).toBe(60_000);
    expect(nextBackoffMs(3)).toBe(5 * 60_000);

    const queued = await enqueueTelegramOutbox({
      kind: "outbound",
      event: "auth.login",
      payload: { phone: "0912" },
    });
    const [row] = await claimTelegramOutbox(1);
    expect(row?.id).toBe(queued.id);

    let current = row!;
    for (let i = 0; i < TELEGRAM_OUTBOX_MAX_ATTEMPTS - 1; i += 1) {
      const next = await markTelegramOutboxRetry(current, "fail");
      expect(next).toBe("retry");
      current = __getTelegramOutboxMemoryForTests().rows.find(
        (item) => item.id === current.id,
      )!;
    }
    expect(current.attempts).toBe(TELEGRAM_OUTBOX_MAX_ATTEMPTS - 1);
    const last = await markTelegramOutboxRetry(current, "fail");
    expect(last).toBe("dlq");
    expect(__getTelegramOutboxMemoryForTests().dlq).toHaveLength(1);
  });

  it("copies dead rows into DLQ", async () => {
    const queued = await enqueueTelegramOutbox({
      kind: "inbound",
      event: "command",
      payload: { text: "/today" },
      chatId: "10",
    });
    const [row] = await claimTelegramOutbox(1);
    await markTelegramOutboxDlq({
      ...row!,
      attempts: 8,
      lastError: "boom",
    });
    const dead = __getTelegramOutboxMemoryForTests().dlq.find(
      (item) => item.id === queued.id,
    );
    expect(dead?.status).toBe("dlq");
    expect(dead?.lastError).toBe("boom");
  });
});
