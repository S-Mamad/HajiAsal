import { describe, expect, it } from "vitest";
import {
  canSellerPublishStatus,
  isSellerProductAwaitingReview,
} from "@/lib/product-approval";

describe("product approval helpers", () => {
  it("detects awaiting review only when submitted", () => {
    expect(
      isSellerProductAwaitingReview({
        sellerId: "s1",
        approvalStatus: "pending",
        submittedAt: "2026-01-01",
      }),
    ).toBe(true);
    expect(
      isSellerProductAwaitingReview({
        sellerId: "s1",
        approvalStatus: "pending",
      }),
    ).toBe(false);
    expect(
      isSellerProductAwaitingReview({
        approvalStatus: "pending",
        submittedAt: "2026-01-01",
      }),
    ).toBe(false);
  });

  it("blocks publish until approved", () => {
    expect(canSellerPublishStatus("pending")).toBe(false);
    expect(canSellerPublishStatus("rejected")).toBe(false);
    expect(canSellerPublishStatus("approved")).toBe(true);
    expect(canSellerPublishStatus(undefined)).toBe(true);
  });
});
