import { describe, expect, it } from "vitest";
import { normalizePhone, isValidIranPhone, toAsciiDigits } from "@/lib/auth/phone";
import {
  formatPhoneInput,
  isValidIranMobile,
  maskPhone,
  normalizePhoneInput,
} from "@/lib/auth/phone-mask";

describe("toAsciiDigits", () => {
  it("converts Persian digits", () => {
    expect(toAsciiDigits("۰۹۱۲۳۴۵۶۷۸۹")).toBe("09123456789");
  });

  it("converts Arabic-Indic digits", () => {
    expect(toAsciiDigits("٠٩١٢٣٤٥٦٧٨٩")).toBe("09123456789");
  });

  it("strips spaces and punctuation", () => {
    expect(toAsciiDigits("0912-345 6789")).toBe("09123456789");
  });
});

describe("normalizePhone", () => {
  it("accepts 09xxxxxxxxx", () => {
    expect(normalizePhone("09123456789")).toBe("09123456789");
  });

  it("accepts spaced / dashed input", () => {
    expect(normalizePhone("0912 345 6789")).toBe("09123456789");
    expect(normalizePhone("0912-345-6789")).toBe("09123456789");
  });

  it("accepts 9xxxxxxxxx and prefixes 0", () => {
    expect(normalizePhone("9123456789")).toBe("09123456789");
  });

  it("accepts +98 / 98 / 0098", () => {
    expect(normalizePhone("+989123456789")).toBe("09123456789");
    expect(normalizePhone("+98 912 345 6789")).toBe("09123456789");
    expect(normalizePhone("989123456789")).toBe("09123456789");
    expect(normalizePhone("00989123456789")).toBe("09123456789");
    expect(normalizePhone("+98 0912 345 6789")).toBe("09123456789");
  });

  it("accepts Persian digits with spaces", () => {
    expect(normalizePhone("۰۹۱۲ ۳۴۵ ۶۷۸۹")).toBe("09123456789");
  });

  it("rejects invalid lengths and landlines", () => {
    expect(normalizePhone("0912345678")).toBeNull();
    expect(normalizePhone("02112345678")).toBeNull();
    expect(normalizePhone("")).toBeNull();
    expect(normalizePhone("abc")).toBeNull();
  });
});

describe("isValidIranPhone", () => {
  it("mirrors normalizePhone success", () => {
    expect(isValidIranPhone("0912 345 6789")).toBe(true);
    expect(isValidIranPhone("+98۹۱۲۳۴۵۶۷۸۹")).toBe(true);
    expect(isValidIranPhone("bad")).toBe(false);
  });
});

describe("phone-mask helpers", () => {
  it("formats input with spaces", () => {
    expect(formatPhoneInput("09123456789")).toBe("0912 345 6789");
  });

  it("formats paste of +98 and Persian digits", () => {
    expect(formatPhoneInput("+989123456789")).toBe("0912 345 6789");
    expect(formatPhoneInput("۰۹۱۲۳۴۵۶۷۸۹")).toBe("0912 345 6789");
    expect(formatPhoneInput("9123456789")).toBe("0912 345 6789");
  });

  it("ignores extra spaces while typing", () => {
    expect(formatPhoneInput("09 12  34")).toBe("0912 34");
  });

  it("normalizes formatted input to canonical", () => {
    expect(normalizePhoneInput("0912 345 6789")).toBe("09123456789");
    expect(normalizePhoneInput("+98 912 345 6789")).toBe("09123456789");
  });

  it("validates mobile pattern on messy input", () => {
    expect(isValidIranMobile("0912 345 6789")).toBe(true);
    expect(isValidIranMobile("۰۹۱۲۳۴۵۶۷۸۹")).toBe(true);
    expect(isValidIranMobile("02112345678")).toBe(false);
  });

  it("masks middle digits", () => {
    expect(maskPhone("09123456789")).toBe("0912***6789");
    expect(maskPhone("0912 345 6789")).toBe("0912***6789");
  });
});
