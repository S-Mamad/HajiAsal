import { NextResponse } from "next/server";
import { gateAdmin } from "@/lib/server/admin-gate";
import {
  searchSupportMessages,
  autoCloseStaleSupportTickets,
} from "@/lib/server/support-tickets";
import { listCannedResponsesAsync } from "@/lib/server/ticket-runtime";

export async function GET(request: Request) {
  const gate = await gateAdmin(request, "tickets.view");
  if (!gate.ok) return gate.response;
  const url = new URL(request.url);
  const q = url.searchParams.get("q") ?? "";
  if (url.searchParams.get("canned") === "1") {
    return NextResponse.json({ items: await listCannedResponsesAsync() });
  }
  const items = await searchSupportMessages(q);
  return NextResponse.json({ items });
}

export async function POST(request: Request) {
  const gate = await gateAdmin(request, "tickets.manage");
  if (!gate.ok) return gate.response;
  const body = await request.json().catch(() => ({}));
  if (body?.action === "auto-close") {
    const closed = await autoCloseStaleSupportTickets();
    return NextResponse.json({ success: true, closed });
  }
  return NextResponse.json({ error: "اقدام نامعتبر" }, { status: 400 });
}
