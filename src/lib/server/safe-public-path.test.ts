import path from "node:path";
import { describe, expect, it } from "vitest";
import { resolvePublicUploadPath } from "./safe-public-path";

describe("resolvePublicUploadPath", () => {
  it("resolves files under the seller uploads prefix", () => {
    const resolved = resolvePublicUploadPath(
      "/uploads/seller/abc.jpg",
      "/uploads/seller/",
    );
    expect(resolved).toBe(
      path.resolve(process.cwd(), "public", "uploads", "seller", "abc.jpg"),
    );
  });

  it("rejects traversal", () => {
    expect(
      resolvePublicUploadPath(
        "/uploads/seller/../../../.env",
        "/uploads/seller/",
      ),
    ).toBeNull();
  });
});
