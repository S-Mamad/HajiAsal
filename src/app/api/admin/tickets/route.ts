import { NextResponse } from "next/server";
import { z } from "zod";
import { gateAdmin } from "@/lib/server/admin-gate";
import { listTickets, upsertTicket } from "@/lib/server/admin-platform-store";
import { logAdminAction } from "@/lib/server/audit-log";

export async function GET(request: Request) {
  const gate = await gateAdmin(request, "tickets.view");
  if (!gate.ok) return gate.response;
  return NextResponse.json({ items: await listTickets() });
}

const schema = z.object({
  id: z.string().optional(),
  subject: z.string().min(1),
  customerName: z.string().nullable().optional(),
  customerPhone: z.string().nullable().optional(),
  customerId: z.string().nullable().optional(),
  status: z.string().optional(),
  priority: z.string().optional(),
  assignedTo: z.string().nullable().optional(),
});

export async function POST(request: Request) {
  const gate = await gateAdmin(request, "tickets.manage");
  if (!gate.ok) return gate.response;
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "اطلاعات نامعتبر است" }, { status: 400 });
  }
  const item = await upsertTicket(parsed.data);
  await logAdminAction({
    action: parsed.data.id ? "ticket.update" : "ticket.create",
    entityType: "ticket",
    entityId: item.id,
    adminUserId: gate.ctx.user?.id,
  });
  return NextResponse.json({ item });
}
