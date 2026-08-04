import { NextResponse } from "next/server";
import { z } from "zod";
import { gateAdmin } from "@/lib/server/admin-gate";
import {
  addSupportTicketMessage,
  upsertSupportTicket,
} from "@/lib/server/support-tickets";
import { listUnifiedTickets } from "@/lib/server/unified-tickets";
import { logAdminAction } from "@/lib/server/audit-log";
import { getSellerByIdAsync } from "@/lib/server/sellers";

function mysqlUnavailableResponse() {
  return NextResponse.json(
    { error: "پایگاه داده در دسترس نیست" },
    { status: 503 },
  );
}

export async function GET(request: Request) {
  const gate = await gateAdmin(request, "tickets.view");
  if (!gate.ok) return gate.response;

  try {
    const url = new URL(request.url);
    const channel = url.searchParams.get("channel") ?? "all";
    const status = url.searchParams.get("status") ?? "all";
    const priority = url.searchParams.get("priority") ?? "all";
    const q = url.searchParams.get("q") ?? "";

    const items = await listUnifiedTickets({
      channel:
        channel === "customer" || channel === "seller" ? channel : "all",
      status,
      priority,
      q,
    });

    const enriched = await Promise.all(
      items.map(async (item) => {
        if (item.channel === "seller" && item.sellerId && !item.partyName) {
          const seller = await getSellerByIdAsync(item.sellerId).catch(
            () => null,
          );
          return {
            ...item,
            partyName: seller?.shopName ?? seller?.ownerName ?? item.sellerId,
          };
        }
        return item;
      }),
    );

    return NextResponse.json({ items: enriched });
  } catch (error) {
    if (error instanceof Error && error.message === "MYSQL_UNAVAILABLE") {
      return mysqlUnavailableResponse();
    }
    return NextResponse.json({ error: "خطا در بارگذاری" }, { status: 500 });
  }
}

const createSchema = z.object({
  id: z.string().optional(),
  subject: z.string().min(1).max(255),
  customerName: z.string().nullable().optional(),
  customerPhone: z.string().nullable().optional(),
  customerId: z.string().nullable().optional(),
  status: z
    .enum(["open", "waiting", "pending", "answered", "resolved", "closed"])
    .optional(),
  priority: z.enum(["low", "normal", "high"]).optional(),
  assignedTo: z.string().nullable().optional(),
  body: z.string().max(5000).optional(),
});

export async function POST(request: Request) {
  const gate = await gateAdmin(request, "tickets.manage");
  if (!gate.ok) return gate.response;
  const parsed = createSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "اطلاعات نامعتبر است" }, { status: 400 });
  }

  try {
    const item = await upsertSupportTicket({
      id: parsed.data.id,
      subject: parsed.data.subject,
      customerName: parsed.data.customerName,
      customerPhone: parsed.data.customerPhone,
      customerId: parsed.data.customerId,
      status: parsed.data.status ?? "open",
      priority: parsed.data.priority ?? "normal",
      assignedTo: parsed.data.assignedTo,
    });

    if (parsed.data.body?.trim() && !parsed.data.id) {
      await addSupportTicketMessage({
        ticketId: item.id,
        senderType: "admin",
        senderId: gate.ctx.user?.id,
        body: parsed.data.body.trim(),
        nextStatus: "pending",
      });
    }

    await logAdminAction({
      action: parsed.data.id ? "ticket.update" : "ticket.create",
      entityType: "ticket",
      entityId: item.id,
      adminUserId: gate.ctx.user?.id,
    });

    return NextResponse.json({
      item: { ...item, channel: "customer" as const },
    });
  } catch (error) {
    if (error instanceof Error && error.message === "MYSQL_UNAVAILABLE") {
      return mysqlUnavailableResponse();
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "خطا" },
      { status: 500 },
    );
  }
}
