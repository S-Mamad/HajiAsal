import { describe, expect, it } from "vitest";
import {
  normalizeSearchText,
  searchTokensMatch,
  splitSearchTokens,
} from "@/lib/search/text";

describe("splitSearchTokens", () => {
  it("splits on whitespace after normalization", () => {
    expect(splitSearchTokens("  عسل   کوهی ")).toEqual(["عسل", "کوهی"]);
  });
});

describe("searchTokensMatch", () => {
  it("requires every token to appear in haystack", () => {
    expect(searchTokensMatch("عسل کوهستان البرز", "عسل کوه")).toBe(true);
    expect(searchTokensMatch("عسل کوهستان", "عسل ژل")).toBe(false);
  });
});

describe("normalizeSearchDigits", () => {
  it("normalizes Persian digits in queries", () => {
    expect(normalizeSearchText("کد ۱۲")).toBe("کد 12");
  });
});
