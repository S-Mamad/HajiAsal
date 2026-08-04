import { NextResponse } from "next/server";
import { z } from "zod";
import { gateAdmin } from "@/lib/server/admin-gate";
import { logAdminAction } from "@/lib/server/audit-log";
import {
  getSupportTicket,
  listSupportTicketMessages,
  upsertSupportTicket,
} from "@/lib/server/support-tickets";
import {
  getSellerTicketById,
  listSellerTicketMessages,
  updateSellerTicketMeta,
} from "@/lib/server/seller-tickets-memory";
import { getSellerByIdAsync } from "@/lib/server/sellers";
import type { TicketChannel } from "@/lib/tickets/types";

type Params = { params: Promise<{ id: string }> };

async function resolveChannel(
  id: string,
  hint?: string | null,
): Promise<TicketChannel | null> {
  if (hint === "customer" || hint === "seller") return hint;
  if (await getSupportTicket(id)) return "customer";
  if (await getSellerTicketById(id)) return "seller";
  return null;
}

export async function GET(request: Request, { params }: Params) {
  const gate = await gateAdmin(request, "tickets.view");
  if (!gate.ok) return gate.response;

  try {
    const { id } = await params;
    const url = new URL(request.url);
    const channel = await resolveChannel(id, url.searchParams.get("channel"));
    if (!channel) {
      return NextResponse.json({ error: "تیکت یافت نشد" }, { status: 404 });
    }

    if (channel === "customer") {
      const ticket = await getSupportTicket(id);
      if (!ticket) {
        return NextResponse.json({ error: "تیکت یافت نشد" }, { status: 404 });
      }
      const messages = await listSupportTicketMessages(id);
      return NextResponse.json({
        ticket: {
          ...ticket,
          channel: "customer" as const,
          partyName: ticket.customerName,
          partyPhone: ticket.customerPhone,
        },
        messages,
      });
    }

    const ticket = await getSellerTicketById(id);
    if (!ticket) {
      return NextResponse.json({ error: "تیکت یافت نشد" }, { status: 404 });
    }
    const seller = await getSellerByIdAsync(ticket.sellerId).catch(() => null);
    const messages = await listSellerTicketMessages(id);
    return NextResponse.json({
      ticket: {
        ...ticket,
        channel: "seller" as const,
        partyName: seller?.shopName ?? seller?.ownerName ?? ticket.sellerId,
        partyPhone: seller?.phone ?? null,
      },
      messages,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "MYSQL_UNAVAILABLE") {
      return NextResponse.json(
        { error: "پایگاه داده در دسترس نیست" },
        { status: 503 },
      );
    }
    return NextResponse.json({ error: "خطا در بارگذاری" }, { status: 500 });
  }
}

const patchSchema = z.object({
  channel: z.enum(["customer", "seller"]).optional(),
  status: z
    .enum(["open", "waiting", "pending", "answered", "resolved", "closed"])
    .optional(),
  priority: z.enum(["low", "normal", "high"]).optional(),
  assignedTo: z.string().nullable().optional(),
  subject: z.string().min(1).max(255).optional(),
  customerName: z.string().nullable().optional(),
  customerPhone: z.string().nullable().optional(),
});

export async function PATCH(request: Request, { params }: Params) {
  const gate = await gateAdmin(request, "tickets.manage");
  if (!gate.ok) return gate.response;

  const { id } = await params;
  const parsed = patchSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "اطلاعات نامعتبر است" }, { status: 400 });
  }

  try {
    const channel = await resolveChannel(id, parsed.data.channel);
    if (!channel) {
      return NextResponse.json({ error: "تیکت یافت نشد" }, { status: 404 });
    }

    if (channel === "customer") {
      const existing = await getSupportTicket(id);
      if (!existing) {
        return NextResponse.json({ error: "تیکت یافت نشد" }, { status: 404 });
      }
      const item = await upsertSupportTicket({
        ...existing,
        subject: parsed.data.subject ?? existing.subject,
        status: parsed.data.status ?? existing.status,
        priority: parsed.data.priority ?? existing.priority,
        assignedTo:
          parsed.data.assignedTo !== undefined
            ? parsed.data.assignedTo
            : existing.assignedTo,
        customerName:
          parsed.data.customerName !== undefined
            ? parsed.data.customerName
            : existing.customerName,
        customerPhone:
          parsed.data.customerPhone !== undefined
            ? parsed.data.customerPhone
            : existing.customerPhone,
      });
      await logAdminAction({
        action: "ticket.update",
        entityType: "ticket",
        entityId: id,
        adminUserId: gate.ctx.user?.id,
      });
      return NextResponse.json({ item: { ...item, channel: "customer" } });
    }

    const item = await updateSellerTicketMeta(id, {
      status: parsed.data.status,
      priority: parsed.data.priority,
    });
    if (!item) {
      return NextResponse.json({ error: "تیکت یافت نشد" }, { status: 404 });
    }
    await logAdminAction({
      action: "ticket.update",
      entityType: "seller_ticket",
      entityId: id,
      adminUserId: gate.ctx.user?.id,
    });
    return NextResponse.json({ item: { ...item, channel: "seller" } });
  } catch (error) {
    if (error instanceof Error && error.message === "MYSQL_UNAVAILABLE") {
      return NextResponse.json(
        { error: "پایگاه داده در دسترس نیست" },
        { status: 503 },
      );
    }
    return NextResponse.json({ error: "خطا در به‌روزرسانی" }, { status: 500 });
  }
}
