import { describe, expect, it } from "vitest";
import {
  sanitizeCtaHref,
  sanitizeEmail,
  sanitizeHttpUrl,
  sanitizeMultiline,
  sanitizePlainText,
  sanitizeSitePath,
} from "./safe-copy";

describe("safe-copy", () => {
  it("strips tags and control characters from plain text", () => {
    expect(
      sanitizePlainText("<script>alert(1)</script>سلام\u0000", 80),
    ).toBe("سلام");
  });

  it("rejects javascript and data URLs", () => {
    expect(sanitizeHttpUrl("javascript:alert(1)")).toBe("");
    expect(sanitizeHttpUrl("data:text/html,hi")).toBe("");
    expect(sanitizeHttpUrl("https://instagram.com/hajiasal_ir")).toContain(
      "instagram.com",
    );
  });

  it("only allows relative site paths without traversal", () => {
    expect(sanitizeSitePath("/shop")).toBe("/shop");
    expect(sanitizeSitePath("//evil.com")).toBe("");
    expect(sanitizeSitePath("/../etc/passwd")).toBe("");
    expect(sanitizeCtaHref("javascript:alert(1)")).toBe("");
    expect(sanitizeCtaHref("/about")).toBe("/about");
  });

  it("keeps newlines in multiline copy but strips tags", () => {
    expect(sanitizeMultiline("خط یک\n<script>x</script>\nخط دو", 200)).toBe(
      "خط یک\n\nخط دو",
    );
  });

  it("rejects malformed emails", () => {
    expect(sanitizeEmail("not-an-email")).toBe("");
    expect(sanitizeEmail("info@hajiasal.ir")).toBe("info@hajiasal.ir");
  });
});
