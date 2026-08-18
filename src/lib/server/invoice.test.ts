import { describe, expect, it } from "vitest";
import { buildProfessionalInvoiceHtml } from "@/lib/server/invoice";
import { buildInvoicePdfBuffer } from "@/lib/server/invoice-pdf";
import type { StoredOrder } from "@/lib/server/orders";
import type { SiteConfig } from "@/types";

const site = {
  brand: {
    name: "حاجی عسل",
    tagline: "عسل طبیعی",
    description: "",
  },
  footer: {
    phone: "02100000000",
    email: "info@example.com",
    address: "تهران",
  },
} as SiteConfig;

const order: StoredOrder = {
  id: "HA-TEST-1",
  status: "confirmed",
  paymentMethod: "online",
  customer: {
    fullName: "علی محمدی",
    phone: "09120000000",
    province: "تهران",
    city: "تهران",
    address: "خیابان تست",
    postalCode: "1234567890",
  },
  items: [
    {
      productId: "p1",
      slug: "honey",
      title: "عسل گون",
      image: "/x.webp",
      weight: { grams: 500, label: "۵۰۰ گرم", price: 450_000 },
      quantity: 1,
    },
  ],
  subtotal: 450_000,
  shipping: 0,
  discount: 0,
  total: 450_000,
  createdAt: "2026-08-14T10:00:00.000Z",
  updatedAt: "2026-08-14T10:00:00.000Z",
};

describe("buildProfessionalInvoiceHtml", () => {
  it("uses Vazirmatn, amount in words, and print/pdf controls without auto-print", () => {
    const html = buildProfessionalInvoiceHtml(order, {
      site,
      audience: "customer",
    });

    expect(html).toContain("font-family: \"Vazirmatn\"");
    expect(html).toContain("مبلغ به حروف");
    expect(html).toContain("چهارصد و پنجاه هزار تومان تمام");
    expect(html).toContain(">چاپ<");
    expect(html).toContain("دانلود PDF");
    expect(html).toContain('id="btn-pdf"');
    expect(html).toContain("download");
    expect(html).not.toContain("دانلود HTML");
    expect(html).not.toContain("html2canvas");
    expect(html).not.toContain("jspdf");
    expect(html).not.toContain("autoPrint");
  });
});

describe("buildInvoicePdfBuffer", () => {
  it("returns a real PDF buffer immediately", async () => {
    const pdf = await buildInvoicePdfBuffer(order, {
      site,
      audience: "customer",
    });

    expect(pdf.subarray(0, 5).toString("utf8")).toBe("%PDF-");
    expect(pdf.length).toBeGreaterThan(2000);
  });
});
