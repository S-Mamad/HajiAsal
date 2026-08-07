import { NextResponse } from "next/server";
import { gateAdmin } from "@/lib/server/admin-gate";
import { listSellerApplicationsAsync } from "@/lib/server/seller-applications-store";
import type { SellerApplicationStatus } from "@/lib/server/seller-applications-store";

export async function GET(request: Request) {
  const gate = await gateAdmin(request, "sellers.view");
  if (!gate.ok) return gate.response;

  const url = new URL(request.url);
  const statusParam = url.searchParams.get("status") ?? "all";
  const status =
    statusParam === "pending" ||
    statusParam === "approved" ||
    statusParam === "rejected"
      ? (statusParam as SellerApplicationStatus)
      : "all";

  const applications = await listSellerApplicationsAsync({ status });
  return NextResponse.json({ applications });
}
