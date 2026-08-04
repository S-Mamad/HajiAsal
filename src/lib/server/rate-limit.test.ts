import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/server/mysql", () => ({
  isMysqlUsable: vi.fn(() => false),
  mysqlExecute: vi.fn(),
  mysqlQueryOne: vi.fn(),
  newId: vi.fn(() => "rl-1"),
}));

import {
  __resetRateLimitMemoryForTests,
  checkRateLimitAsync,
  peekRateLimitAsync,
  recordRateLimitHitAsync,
} from "./rate-limit";

afterEach(() => {
  __resetRateLimitMemoryForTests();
});

describe("rate-limit peek/record", () => {
  it("peek does not consume quota", async () => {
    const a = await peekRateLimitAsync("t:peek", 1, 60_000);
    const b = await peekRateLimitAsync("t:peek", 1, 60_000);
    expect(a.ok).toBe(true);
    expect(b.ok).toBe(true);
  });

  it("record after peek enforces limit", async () => {
    expect((await peekRateLimitAsync("t:sms", 1, 60_000)).ok).toBe(true);
    await recordRateLimitHitAsync("t:sms", 60_000);
    expect((await peekRateLimitAsync("t:sms", 1, 60_000)).ok).toBe(false);
  });

  it("checkRateLimitAsync still peek+records", async () => {
    expect((await checkRateLimitAsync("t:req", 1, 60_000)).ok).toBe(true);
    expect((await checkRateLimitAsync("t:req", 1, 60_000)).ok).toBe(false);
  });
});
