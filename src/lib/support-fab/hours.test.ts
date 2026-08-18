import { describe, expect, it } from "vitest";
import {
  getHourInTimeZone,
  isWithinSupportHours,
  supportGreeting,
} from "./hours";
import {
  AFTER_HOURS_GREETING,
  LIVE_GREETING,
  OFFLINE_OPERATOR_GREETING,
} from "./constants";

describe("support hours", () => {
  it("treats 15:00 Tehran as within hours", () => {
    const noonUtc = new Date("2026-08-13T11:30:00.000Z");
    expect(getHourInTimeZone(noonUtc)).toBeGreaterThanOrEqual(14);
    expect(isWithinSupportHours(noonUtc)).toBe(true);
  });

  it("covers 07:00 through 23:59 Tehran, not before 7 or after midnight", () => {
    // 07:00 Tehran = 03:30 UTC (IRST, no DST)
    expect(isWithinSupportHours(new Date("2026-08-17T03:30:00.000Z"))).toBe(
      true,
    );
    // 06:30 Tehran
    expect(isWithinSupportHours(new Date("2026-08-17T03:00:00.000Z"))).toBe(
      false,
    );
    // 23:00 Tehran
    expect(isWithinSupportHours(new Date("2026-08-17T19:30:00.000Z"))).toBe(
      true,
    );
    // 00:00 Tehran next day
    expect(isWithinSupportHours(new Date("2026-08-17T20:30:00.000Z"))).toBe(
      false,
    );
  });

  it("picks greeting from hours and presence", () => {
    expect(
      supportGreeting({ withinHours: true, operatorOnline: true }),
    ).toBe(LIVE_GREETING);
    expect(
      supportGreeting({ withinHours: true, operatorOnline: false }),
    ).toBe(OFFLINE_OPERATOR_GREETING);
    expect(
      supportGreeting({ withinHours: false, operatorOnline: true }),
    ).toBe(AFTER_HOURS_GREETING);
  });
});
