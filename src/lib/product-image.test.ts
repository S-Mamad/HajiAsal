import { describe, expect, it } from "vitest";
import {
  catalogImageFit,
  catalogMediaClass,
  clampImageFit,
  DEFAULT_IMAGE_FIT,
  imageFitForSrc,
  isCatalogIllustration,
  isCustomImageFit,
  parseImageFits,
  pruneImageFits,
  resolveProductImageSrc,
  shouldUnoptimizeProductImage,
  isUploadedProductImage,
  isExternalProductImage,
  writeImageFit,
} from "./product-image";

describe("resolveProductImageSrc", () => {
  it("maps legacy jpg paths to hajiasal svg assets", () => {
    expect(resolveProductImageSrc("/images/products/p001.jpg")).toBe(
      "/images/hajiasal/products/p001.svg",
    );
    expect(resolveProductImageSrc("/images/products/p012-alt.png")).toBe(
      "/images/hajiasal/products/p012.svg",
    );
  });

  it("passes through already-correct paths", () => {
    expect(
      resolveProductImageSrc("/images/hajiasal/products/p003.svg"),
    ).toBe("/images/hajiasal/products/p003.svg");
  });

  it("falls back for empty src", () => {
    expect(resolveProductImageSrc("")).toBe(
      "/images/hajiasal/placeholder.svg",
    );
  });
});

describe("upload and optimizer helpers", () => {
  it("detects uploaded and external assets", () => {
    expect(isUploadedProductImage("/uploads/admin/products/a.png")).toBe(true);
    expect(isUploadedProductImage("/images/hajiasal/products/p001.svg")).toBe(
      false,
    );
    expect(isExternalProductImage("https://cdn.example.com/jar.webp")).toBe(
      true,
    );
  });

  it("skips optimizer for uploads, svg, and external urls", () => {
    expect(shouldUnoptimizeProductImage("/uploads/seller/x.webp")).toBe(true);
    expect(shouldUnoptimizeProductImage("/images/products/p001.jpg")).toBe(
      true,
    );
    expect(shouldUnoptimizeProductImage("https://cdn.example.com/x.jpg")).toBe(
      true,
    );
    expect(
      shouldUnoptimizeProductImage("/images/hajiasal/brand/logo.png"),
    ).toBe(false);
  });
});

describe("catalog photo frame", () => {
  it("fills the square for illustration templates", () => {
    expect(isCatalogIllustration("/images/products/p001.jpg")).toBe(true);
    expect(catalogImageFit("/images/hajiasal/products/p001.svg")).toBe("cover");
    expect(catalogMediaClass("/images/products/p001.jpg")).toContain(
      "product-media--cover",
    );
  });

  it("sits uploaded photos inside the studio frame without cropping", () => {
    expect(isCatalogIllustration("/uploads/products/honey-jar.webp")).toBe(
      false,
    );
    expect(catalogImageFit("/uploads/products/honey-jar.webp")).toBe("contain");
    expect(catalogMediaClass("/uploads/products/honey-jar.webp")).toContain(
      "product-media--studio",
    );
  });

  it("does not crop catalog SVGs when imageFits is missing", () => {
    expect(isCustomImageFit(undefined)).toBe(false);
    expect(catalogMediaClass("/images/hajiasal/products/p001.svg")).not.toContain(
      "fitted",
    );
  });
});

describe("imageFits clamp and persist helpers", () => {
  it("clamps scale and pan to the allowed range", () => {
    expect(clampImageFit({ scale: 9, x: -90, y: 80 })).toEqual({
      scale: 3,
      x: -50,
      y: 50,
    });
    expect(clampImageFit({ scale: 0.2, x: 0, y: 0 })).toEqual({
      scale: 1,
      x: 0,
      y: 0,
    });
    expect(clampImageFit(null)).toEqual(DEFAULT_IMAGE_FIT);
  });

  it("treats reset values as the default auto frame", () => {
    expect(isCustomImageFit(DEFAULT_IMAGE_FIT)).toBe(false);
    expect(isCustomImageFit({ scale: 1.2, x: 0, y: 0 })).toBe(true);
    expect(isCustomImageFit({ scale: 1.0004, x: 0.01, y: -0.02 })).toBe(false);
  });

  it("maps honey_meta records and drops default keys", () => {
    expect(
      parseImageFits({
        "/a.webp": { scale: 1.4, x: 10, y: -4 },
        "/b.webp": { scale: 1, x: 0, y: 0 },
        "": { scale: 2, x: 0, y: 0 },
      }),
    ).toEqual({
      "/a.webp": { scale: 1.4, x: 10, y: -4 },
    });
  });

  it("prunes fits when the image URL is removed", () => {
    const fits = {
      "/keep.webp": { scale: 1.2, x: 3, y: 0 },
      "/gone.webp": { scale: 2, x: 0, y: 0 },
    };
    expect(pruneImageFits(fits, ["/keep.webp"])).toEqual({
      "/keep.webp": { scale: 1.2, x: 3, y: 0 },
    });
    expect(pruneImageFits(fits, [])).toBeUndefined();
    expect(imageFitForSrc(undefined, "/keep.webp")).toBeUndefined();
    expect(
      writeImageFit(fits, "/keep.webp", DEFAULT_IMAGE_FIT),
    ).toEqual({
      "/gone.webp": { scale: 2, x: 0, y: 0 },
    });
  });

  it("does not crash with empty images", () => {
    expect(pruneImageFits(undefined, [])).toBeUndefined();
    expect(catalogMediaClass("")).toContain("product-media");
  });

  it("switches to fitted cover when a custom crop is set", () => {
    const fit = { scale: 1.5, x: 8, y: -6 };
    expect(catalogImageFit("/uploads/a.webp", fit)).toBe("cover");
    expect(catalogMediaClass("/uploads/a.webp", fit)).toContain(
      "product-media--fitted",
    );
  });
});
