import { describe, expect, it } from "vitest";
import { normalizePhone, isValidIranPhone } from "@/lib/auth/phone";
import {
  formatPhoneInput,
  isValidIranMobile,
  maskPhone,
  normalizePhoneInput,
} from "@/lib/auth/phone-mask";

describe("normalizePhone", () => {
  it("accepts 09xxxxxxxxx", () => {
    expect(normalizePhone("09123456789")).toBe("09123456789");
  });

  it("accepts 9xxxxxxxxx and prefixes 0", () => {
    expect(normalizePhone("9123456789")).toBe("09123456789");
  });

  it("accepts 989xxxxxxxxx", () => {
    expect(normalizePhone("989123456789")).toBe("09123456789");
  });

  it("strips non-digits and spaces", () => {
    expect(normalizePhone("0912 345 6789")).toBe("09123456789");
  });

  it("rejects invalid lengths", () => {
    expect(normalizePhone("0912345678")).toBeNull();
    expect(normalizePhone("02112345678")).toBeNull();
    expect(normalizePhone("")).toBeNull();
  });
});

describe("isValidIranPhone", () => {
  it("mirrors normalizePhone success", () => {
    expect(isValidIranPhone("09123456789")).toBe(true);
    expect(isValidIranPhone("bad")).toBe(false);
  });
});

describe("phone-mask helpers", () => {
  it("formats input with spaces", () => {
    expect(formatPhoneInput("09123456789")).toBe("0912 345 6789");
  });

  it("normalizes formatted input", () => {
    expect(normalizePhoneInput("0912 345 6789")).toBe("09123456789");
  });

  it("validates mobile pattern", () => {
    expect(isValidIranMobile("0912 345 6789")).toBe(true);
    expect(isValidIranMobile("02112345678")).toBe(false);
  });

  it("masks middle digits", () => {
    expect(maskPhone("09123456789")).toBe("0912***6789");
  });
});
