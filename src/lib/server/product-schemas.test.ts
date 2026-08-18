import { describe, expect, it } from "vitest";
import { productCreateSchema, productPatchSchema } from "./product-schemas";
import { catalogImageFit } from "@/lib/product-image";

describe("product imageFits schema", () => {
  it("accepts clamped-range fits on create and patch", () => {
    const fits = {
      "/uploads/a.webp": { scale: 1.5, x: -12, y: 8 },
    };
    expect(productCreateSchema.parse({
      slug: "a",
      title: "عسل",
      category: "mountain",
      weightOptions: [{ label: "۱کیلو", grams: 1000, price: 1 }],
      imageFits: fits,
    }).imageFits).toEqual(fits);
    expect(productPatchSchema.parse({ imageFits: fits }).imageFits).toEqual(
      fits,
    );
  });

  it("rejects scale and pan outside the allowed range", () => {
    expect(
      productPatchSchema.safeParse({
        imageFits: { "/a.webp": { scale: 0.5, x: 0, y: 0 } },
      }).success,
    ).toBe(false);
    expect(
      productPatchSchema.safeParse({
        imageFits: { "/a.webp": { scale: 3.1, x: 0, y: 0 } },
      }).success,
    ).toBe(false);
    expect(
      productPatchSchema.safeParse({
        imageFits: { "/a.webp": { scale: 1, x: -51, y: 0 } },
      }).success,
    ).toBe(false);
    expect(
      productPatchSchema.safeParse({
        imageFits: { "/a.webp": { scale: 1, x: 0, y: 80 } },
      }).success,
    ).toBe(false);
  });

  it("does not change default catalog framing when imageFits is omitted", () => {
    expect(catalogImageFit("/images/hajiasal/products/p001.svg")).toBe("cover");
    expect(productPatchSchema.parse({ title: "x" }).imageFits).toBeUndefined();
  });
});
