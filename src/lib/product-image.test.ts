import { describe, expect, it } from "vitest";
import { resolveProductImageSrc } from "./product-image";

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
