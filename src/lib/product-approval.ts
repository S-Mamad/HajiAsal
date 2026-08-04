import type { Product, ProductApprovalStatus } from "@/types";

/** Submitted for admin review (not a local-only draft). */
export function isSellerProductAwaitingReview(
  product: Pick<Product, "approvalStatus" | "submittedAt" | "sellerId">,
): boolean {
  if (!product.sellerId) return false;
  return product.approvalStatus === "pending" && Boolean(product.submittedAt);
}

export function canSellerPublishStatus(
  approvalStatus: ProductApprovalStatus | undefined,
): boolean {
  return (approvalStatus ?? "approved") === "approved";
}
