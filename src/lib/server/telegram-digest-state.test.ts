import { afterEach, describe, expect, it } from "vitest";
import {
  __resetTelegramDigestStateForTests,
  claimTelegramDigestDay,
  clearTelegramDigestClaim,
  wasDigestSentForDate,
} from "./telegram-digest-state";

describe("telegram-digest-state", () => {
  afterEach(() => {
    __resetTelegramDigestStateForTests();
  });

  it("claims once per day and can clear for retry", async () => {
    const day = "2026-08-13";
    expect(await wasDigestSentForDate(day)).toBe(false);
    expect(await claimTelegramDigestDay(day)).toBe(true);
    expect(await claimTelegramDigestDay(day)).toBe(false);
    expect(await wasDigestSentForDate(day)).toBe(true);
    await clearTelegramDigestClaim(day);
    expect(await wasDigestSentForDate(day)).toBe(false);
    expect(await claimTelegramDigestDay(day)).toBe(true);
  });
});
