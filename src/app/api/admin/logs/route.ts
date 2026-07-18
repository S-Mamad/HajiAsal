import { NextResponse } from "next/server";
import { gateAdmin } from "@/lib/server/admin-gate";
import { listAuditLogs } from "@/lib/server/admin-platform-store";

export async function GET(request: Request) {
  const gate = await gateAdmin(request, "logs.view");
  if (!gate.ok) return gate.response;
  const limit = Number(new URL(request.url).searchParams.get("limit") ?? 100);
  const items = await listAuditLogs(Math.min(Math.max(limit, 1), 500));
  return NextResponse.json({ items });
}
