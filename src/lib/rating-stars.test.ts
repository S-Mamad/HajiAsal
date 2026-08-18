import { describe, expect, it } from "vitest";
import { displayRating, ratingStarFills } from "@/lib/rating-stars";

describe("displayRating", () => {
  it("clamps and rounds to one decimal", () => {
    expect(displayRating(4.5)).toBe(4.5);
    expect(displayRating(4.67)).toBe(4.7);
    expect(displayRating(Number.NaN)).toBe(0);
    expect(displayRating(9)).toBe(5);
  });
});

describe("ratingStarFills", () => {
  it("fills a true half star at 4.5", () => {
    expect(ratingStarFills(4.5)).toEqual([1, 1, 1, 1, 0.5]);
  });

  it("clamps empty and full ratings", () => {
    expect(ratingStarFills(0)).toEqual([0, 0, 0, 0, 0]);
    expect(ratingStarFills(5)).toEqual([1, 1, 1, 1, 1]);
    expect(ratingStarFills(9)).toEqual([1, 1, 1, 1, 1]);
  });

  it("keeps fractional fill on the active star", () => {
    expect(ratingStarFills(3.2)).toEqual([1, 1, 1, 0.2, 0]);
  });

  it("treats non-finite values as empty", () => {
    expect(ratingStarFills(Number.NaN)).toEqual([0, 0, 0, 0, 0]);
  });
});
