import { NextResponse } from "next/server";
import { z } from "zod";
import { gateSeller, clientIpFromRequest } from "@/lib/server/seller-gate";
import { logSellerActivity } from "@/lib/server/seller-activity";
import {
  addSellerTicketMessage,
  findMemoryTicket,
  getSellerTicketById,
  loadSellerTicketsFs,
  updateSellerTicketMeta,
} from "@/lib/server/seller-tickets-memory";
import {
  isMysqlConfigured,
  mysqlQuery,
  mysqlQueryOne,
  toIso,
} from "@/lib/server/mysql";
import type { RowDataPacket } from "mysql2/promise";
import { allowTicketMysqlFallthrough } from "@/lib/server/production";

type Params = { params: Promise<{ id: string }> };

function mapMysqlSellerMessage(m: RowDataPacket) {
  return {
    id: String(m.id),
    senderType: String(m.sender_type),
    senderId: m.sender_id ? String(m.sender_id) : null,
    body: String(m.body ?? ""),
    attachmentUrl: m.attachment_url ? String(m.attachment_url) : null,
    attachmentName: m.attachment_name ? String(m.attachment_name) : null,
    attachmentMime: m.attachment_mime ? String(m.attachment_mime) : null,
    clientMessageId: m.client_message_id ? String(m.client_message_id) : null,
    replyToId: m.reply_to_id ? String(m.reply_to_id) : null,
    isInternal: Boolean(Number(m.is_internal ?? 0)),
    editedAt: m.edited_at ? toIso(m.edited_at) : null,
    deletedAt: m.deleted_at ? toIso(m.deleted_at) : null,
    createdAt: toIso(m.created_at),
  };
}

export async function GET(request: Request, { params }: Params) {
  const gated = await gateSeller(request, "tickets.manage");
  if (!gated.ok) return gated.response;
  const { id } = await params;
  const sellerId = gated.ctx.seller.id;

  if (isMysqlConfigured()) {
    try {
      const ticket = await mysqlQueryOne<RowDataPacket>(
        `SELECT * FROM seller_tickets WHERE id = ? AND seller_id = ? LIMIT 1`,
        [id, sellerId],
      );
      if (ticket) {
        const messages = await mysqlQuery<RowDataPacket>(
          `SELECT * FROM seller_ticket_messages WHERE ticket_id = ? ORDER BY created_at ASC`,
          [id],
        );
        return NextResponse.json({
          ticket: {
            id: String(ticket.id),
            subject: String(ticket.subject),
            category: String(ticket.category),
            priority: String(ticket.priority),
            status: String(ticket.status),
            createdAt: toIso(ticket.created_at),
            updatedAt: toIso(ticket.updated_at),
          },
          messages: messages.map(mapMysqlSellerMessage),
        });
      }
      // Miss in MySQL: fall through to memory when allowed (create may have
      // persisted only to memory after a MySQL write failure).
      if (!allowTicketMysqlFallthrough()) {
        return NextResponse.json({ error: "تیکت یافت نشد" }, { status: 404 });
      }
    } catch (error) {
      console.error(
        "[seller/tickets/id] GET mysql failed:",
        error instanceof Error ? error.message : error,
      );
      if (!allowTicketMysqlFallthrough()) {
        return NextResponse.json(
          { error: "پایگاه داده در دسترس نیست" },
          { status: 503 },
        );
      }
    }
  } else if (!allowTicketMysqlFallthrough()) {
    return NextResponse.json(
      { error: "پایگاه داده در دسترس نیست" },
      { status: 503 },
    );
  }

  await loadSellerTicketsFs();
  const mem = findMemoryTicket(id, sellerId);
  if (!mem) {
    return NextResponse.json({ error: "تیکت یافت نشد" }, { status: 404 });
  }
  return NextResponse.json({
    ticket: {
      id: mem.id,
      subject: mem.subject,
      category: mem.category,
      priority: mem.priority,
      status: mem.status,
      createdAt: mem.createdAt,
      updatedAt: mem.updatedAt,
    },
    messages: mem.messages,
  });
}

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
});

export async function POST(request: Request, { params }: Params) {
  const gated = await gateSeller(request, "tickets.manage");
  if (!gated.ok) return gated.response;
  const { id } = await params;
  const body = await request.json().catch(() => null);
  const parsed = replySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "متن نامعتبر" }, { status: 400 });
  }

  const sellerId = gated.ctx.seller.id;

  const { assertMessageRateLimitAsync } = await import(
    "@/lib/server/ticket-runtime"
  );
  const rl = await assertMessageRateLimitAsync(`seller:${sellerId}`);
  if (!rl.ok) {
    return NextResponse.json(
      { error: "ارسال بیش از حد مجاز", retryAfterSec: rl.retryAfterSec },
      { status: 429 },
    );
  }

  try {
    const message = await addSellerTicketMessage({
      ticketId: id,
      sellerId,
      senderType: "seller",
      senderId: sellerId,
      body: parsed.data.body.trim(),
      attachmentUrl: parsed.data.attachmentUrl ?? null,
      attachmentName: parsed.data.attachmentName ?? null,
      attachmentMime: parsed.data.attachmentMime ?? null,
      clientMessageId: parsed.data.clientMessageId,
      replyToId: parsed.data.replyToId,
    });

    await logSellerActivity({
      sellerId,
      action: "ticket.reply",
      entityType: "ticket",
      entityId: id,
      ip: clientIpFromRequest(request),
    });

    return NextResponse.json({ success: true, message });
  } catch (error) {
    const code = error instanceof Error ? error.message : "";
    if (code === "TICKET_NOT_FOUND") {
      return NextResponse.json({ error: "تیکت یافت نشد" }, { status: 404 });
    }
    if (code === "TICKET_CLOSED") {
      return NextResponse.json({ error: "تیکت بسته است" }, { status: 400 });
    }
    if (code === "MYSQL_UNAVAILABLE") {
      return NextResponse.json(
        { error: "پایگاه داده در دسترس نیست" },
        { status: 503 },
      );
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "خطا" },
      { status: 500 },
    );
  }
}

const patchSchema = z.object({
  status: z.enum(["open", "closed"]),
});

export async function PATCH(request: Request, { params }: Params) {
  const gated = await gateSeller(request, "tickets.manage");
  if (!gated.ok) return gated.response;
  const { id } = await params;
  const parsed = patchSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "اطلاعات نامعتبر" }, { status: 400 });
  }

  try {
    const ticket = await getSellerTicketById(id);
    if (!ticket || ticket.sellerId !== gated.ctx.seller.id) {
      return NextResponse.json({ error: "تیکت یافت نشد" }, { status: 404 });
    }

    const updated = await updateSellerTicketMeta(id, {
      status: parsed.data.status,
    });
    return NextResponse.json({ success: true, ticket: updated });
  } catch (error) {
    const code = error instanceof Error ? error.message : "";
    if (code === "MYSQL_UNAVAILABLE") {
      return NextResponse.json(
        { error: "پایگاه داده در دسترس نیست" },
        { status: 503 },
      );
    }
    return NextResponse.json({ error: "خطا" }, { status: 500 });
  }
}
