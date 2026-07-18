import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import type { RowDataPacket } from "mysql2/promise";
import { gateSeller, clientIpFromRequest } from "@/lib/server/seller-gate";
import { logSellerActivity } from "@/lib/server/seller-activity";
import {
  isMysqlConfigured,
  mysqlExecute,
  mysqlQuery,
  mysqlQueryOne,
  toIso,
} from "@/lib/server/mysql";

type Params = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: Params) {
  const gated = await gateSeller(request, "tickets.manage");
  if (!gated.ok) return gated.response;
  const { id } = await params;

  if (!isMysqlConfigured()) {
    return NextResponse.json({ error: "تیکت یافت نشد" }, { status: 404 });
  }

  try {
    const ticket = await mysqlQueryOne<RowDataPacket>(
      `SELECT * FROM seller_tickets WHERE id = ? AND seller_id = ? LIMIT 1`,
      [id, gated.ctx.seller.id],
    );
    if (!ticket) {
      return NextResponse.json({ error: "تیکت یافت نشد" }, { status: 404 });
    }
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
      messages: messages.map((m) => ({
        id: String(m.id),
        senderType: String(m.sender_type),
        body: String(m.body),
        createdAt: toIso(m.created_at),
      })),
    });
  } catch {
    return NextResponse.json({ error: "تیکت یافت نشد" }, { status: 404 });
  }
}

const replySchema = z.object({
  body: z.string().min(1).max(5000),
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

  if (!isMysqlConfigured()) {
    return NextResponse.json({ error: "دیتابیس در دسترس نیست" }, { status: 503 });
  }

  const ticket = await mysqlQueryOne<RowDataPacket>(
    `SELECT id FROM seller_tickets WHERE id = ? AND seller_id = ? LIMIT 1`,
    [id, gated.ctx.seller.id],
  );
  if (!ticket) {
    return NextResponse.json({ error: "تیکت یافت نشد" }, { status: 404 });
  }

  const now = new Date().toISOString();
  await mysqlExecute(
    `INSERT INTO seller_ticket_messages (id, ticket_id, sender_type, body, created_at)
     VALUES (?, ?, 'seller', ?, ?)`,
    [randomUUID(), id, parsed.data.body, now],
  );
  await mysqlExecute(
    `UPDATE seller_tickets SET status = 'waiting', updated_at = ? WHERE id = ?`,
    [now, id],
  );

  await logSellerActivity({
    sellerId: gated.ctx.seller.id,
    action: "ticket.reply",
    entityType: "ticket",
    entityId: id,
    ip: clientIpFromRequest(request),
  });

  return NextResponse.json({ success: true });
}
