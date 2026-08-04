import { NextResponse } from "next/server";
import { z } from "zod";
import { gateAdmin } from "@/lib/server/admin-gate";
import { logAdminAction } from "@/lib/server/audit-log";
import {
  addSupportTicketMessage,
  getSupportTicket,
} from "@/lib/server/support-tickets";
import {
  addSellerTicketMessage,
  getSellerTicketById,
} from "@/lib/server/seller-tickets-memory";
import {
  assertMessageRateLimitAsync,
  isBlocked,
  resolveCannedAsync,
} from "@/lib/server/ticket-runtime";
import type { TicketChannel } from "@/lib/tickets/types";

type Params = { params: Promise<{ id: string }> };

const replySchema = z.object({
  body: z.string().min(1).max(5000),
  attachmentUrl: z
    .string()
    .url()
    .or(z.string().startsWith("/"))
    .nullable()
    .optional(),
  attachmentName: z.string().max(255).nullable().optional(),
  attachmentMime: z.string().max(120).nullable().optional(),
  clientMessageId: z.string().max(64).optional(),
  replyToId: z.string().nullable().optional(),
  isInternal: z.boolean().optional(),
  channel: z.enum(["customer", "seller"]).optional(),
});

export async function POST(request: Request, { params }: Params) {
  const gate = await gateAdmin(request, "tickets.manage");
  if (!gate.ok) return gate.response;

  const { id } = await params;
  const parsed = replySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "متن نامعتبر است" }, { status: 400 });
  }

  const adminId = gate.ctx.user?.id ?? "admin";
  if (isBlocked(`user:${adminId}`)) {
    return NextResponse.json({ error: "دسترسی مسدود است" }, { status: 403 });
  }
  const rl = await assertMessageRateLimitAsync(`admin:${adminId}`);
  if (!rl.ok) {
    return NextResponse.json(
      { error: "ارسال بیش از حد مجاز", retryAfterSec: rl.retryAfterSec },
      { status: 429 },
    );
  }

  let body = parsed.data.body.trim();
  if (body.startsWith("/")) {
    const shortcut = body.split(/\s+/)[0];
    const canned = await resolveCannedAsync(shortcut);
    if (canned) body = canned;
  }

  let channel: TicketChannel | null = parsed.data.channel ?? null;
  if (!channel) {
    if (await getSupportTicket(id)) channel = "customer";
    else if (await getSellerTicketById(id)) channel = "seller";
  }
  if (!channel) {
    return NextResponse.json({ error: "تیکت یافت نشد" }, { status: 404 });
  }

  try {
    if (channel === "customer") {
      const message = await addSupportTicketMessage({
        ticketId: id,
        senderType: "admin",
        senderId: adminId,
        body,
        attachmentUrl: parsed.data.attachmentUrl ?? null,
        attachmentName: parsed.data.attachmentName ?? null,
        attachmentMime: parsed.data.attachmentMime ?? null,
        clientMessageId: parsed.data.clientMessageId,
        replyToId: parsed.data.replyToId,
        isInternal: parsed.data.isInternal,
      });
      await logAdminAction({
        action: parsed.data.isInternal ? "ticket.note" : "ticket.reply",
        entityType: "ticket",
        entityId: id,
        adminUserId: gate.ctx.user?.id,
      });
      return NextResponse.json({ success: true, message });
    }

    if (parsed.data.isInternal) {
      return NextResponse.json(
        {
          error:
            "یادداشت داخلی فقط برای تیکت مشتری پشتیبانی می‌شود",
        },
        { status: 400 },
      );
    }
    const message = await addSellerTicketMessage({
      ticketId: id,
      senderType: "admin",
      senderId: adminId,
      body,
      attachmentUrl: parsed.data.attachmentUrl ?? null,
      attachmentName: parsed.data.attachmentName ?? null,
      attachmentMime: parsed.data.attachmentMime ?? null,
      clientMessageId: parsed.data.clientMessageId,
      replyToId: parsed.data.replyToId,
    });
    await logAdminAction({
      action: "ticket.reply",
      entityType: "seller_ticket",
      entityId: id,
      adminUserId: gate.ctx.user?.id,
    });
    return NextResponse.json({ success: true, message });
  } catch (error) {
    const code = error instanceof Error ? error.message : "";
    if (code === "TICKET_NOT_FOUND") {
      return NextResponse.json({ error: "تیکت یافت نشد" }, { status: 404 });
    }
    if (code === "TICKET_CLOSED") {
      return NextResponse.json(
        { error: "تیکت بسته است؛ ابتدا آن را باز کنید" },
        { status: 400 },
      );
    }
    if (code === "MYSQL_UNAVAILABLE") {
      return NextResponse.json(
        { error: "پایگاه داده در دسترس نیست" },
        { status: 503 },
      );
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "خطا در ارسال" },
      { status: 500 },
    );
  }
}
