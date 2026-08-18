import { describe, expect, it } from "vitest";
import {
  formatIsoDate,
  gregorianToJalali,
  jalaliToGregorian,
} from "./jalali";

describe("jalali conversion", () => {
  it("round-trips a known civil date", () => {
    const g = jalaliToGregorian(1403, 1, 1);
    const j = gregorianToJalali(g.gy, g.gm, g.gd);
    expect(j).toEqual({ jy: 1403, jm: 1, jd: 1 });
    expect(formatIsoDate(g.gy, g.gm, g.gd)).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
