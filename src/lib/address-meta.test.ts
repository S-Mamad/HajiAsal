import { describe, expect, it } from "vitest";
import {
  ADDRESS_LABEL_MAX,
  decodeAddressLabel,
  encodeAddressLabel,
  formatAddressLine,
} from "@/lib/address-meta";

describe("address-meta", () => {
  it("round-trips geo metadata in label", () => {
    const encoded = encodeAddressLabel({
      displayLabel: "خانه",
      lat: 31.89,
      lng: 54.35,
      plaque: "12",
      unit: "3",
      receiverName: "علی",
      receiverPhone: "09121234567",
    });
    expect(encoded).toMatch(/^__ha1:/);
    const decoded = decodeAddressLabel(encoded);
    expect(decoded.displayLabel).toBe("خانه");
    expect(decoded.lat).toBe(31.89);
    expect(decoded.plaque).toBe("12");
    expect(decoded.receiverPhone).toBe("09121234567");
  });

  it("keeps packed labels within the MySQL VARCHAR(120) limit", () => {
    const encoded = encodeAddressLabel({
      displayLabel: "خانه پدری خیلی خیلی طولانی برای تست سقف ستون",
      lat: 31.897412345678,
      lng: 54.356912345678,
      plaque: "1234567890",
      unit: "واحد غربی",
      receiverName: "سید محمد محمدی حاجی‌عسل یزدی",
      receiverPhone: "09121234567",
    });
    expect(encoded).toBeTruthy();
    expect(encoded!.length).toBeLessThanOrEqual(ADDRESS_LABEL_MAX);
    const decoded = decodeAddressLabel(encoded);
    expect(decoded.lat).toBeCloseTo(31.89741, 5);
    expect(decoded.receiverPhone).toBe("09121234567");
  });

  it("keeps plain labels untouched", () => {
    expect(decodeAddressLabel("دفتر").displayLabel).toBe("دفتر");
  });

  it("formats address line with plaque/unit", () => {
    expect(
      formatAddressLine({
        street: "خیابان امام",
        plaque: "10",
        unit: "2",
      }),
    ).toBe("خیابان امام، پلاک 10، واحد 2");
  });
});

describe("free shipping progress math", () => {
  it("computes remaining and progress", () => {
    const threshold = 500_000;
    const subtotal = 200_000;
    const remaining = Math.max(0, threshold - subtotal);
    const progress = Math.min(1, subtotal / threshold);
    expect(remaining).toBe(300_000);
    expect(progress).toBeCloseTo(0.4);
  });
});
