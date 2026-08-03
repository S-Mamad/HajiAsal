import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import type { RowDataPacket } from "mysql2/promise";
import { gateSeller, clientIpFromRequest } from "@/lib/server/seller-gate";
import { logSellerActivity } from "@/lib/server/seller-activity";
import {
  createMemoryTicket,
  listMemoryTickets,
} from "@/lib/server/seller-tickets-memory";
import {
  isMysqlConfigured,
  mysqlExecute,
  mysqlQuery,
  toIso,
} from "@/lib/server/mysql";

export async function GET(request: Request) {
  const gated = await gateSeller(request, "tickets.manage");
  if (!gated.ok) return gated.response;
  const sellerId = gated.ctx.seller.id;

  if (isMysqlConfigured()) {
    try {
      const rows = await mysqlQuery<RowDataPacket>(
        `SELECT * FROM seller_tickets WHERE seller_id = ? ORDER BY updated_at DESC`,
        [sellerId],
      );
      return NextResponse.json({
        tickets: rows.map((r) => ({
          id: String(r.id),
          subject: String(r.subject),
          category: String(r.category),
          priority: String(r.priority),
          status: String(r.status),
          createdAt: toIso(r.created_at),
          updatedAt: toIso(r.updated_at),
        })),
      });
    } catch {
      /* fallthrough to memory */
    }
  }

  return NextResponse.json({
    tickets: listMemoryTickets(sellerId).map(
      ({ messages: _m, sellerId: _s, ...t }) => t,
    ),
  });
}

const createSchema = z.object({
  subject: z.string().min(3).max(200),
  category: z.string().max(64).default("general"),
  priority: z.enum(["low", "normal", "high"]).default("normal"),
  body: z.string().min(3).max(5000),
});

export async function POST(request: Request) {
  const gated = await gateSeller(request, "tickets.manage");
  if (!gated.ok) return gated.response;

  const body = await request.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "اطلاعات نامعتبر" }, { status: 400 });
  }

  const id = randomUUID();
  const now = new Date().toISOString();
  const msgId = randomUUID();

  if (isMysqlConfigured()) {
    try {
      await mysqlExecute(
        `INSERT INTO seller_tickets
          (id, seller_id, subject, category, priority, status, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, 'open', ?, ?)`,
        [
          id,
          gated.ctx.seller.id,
          parsed.data.subject,
          parsed.data.category,
          parsed.data.priority,
          now,
          now,
        ],
      );
      await mysqlExecute(
        `INSERT INTO seller_ticket_messages
          (id, ticket_id, sender_type, body, created_at)
         VALUES (?, ?, 'seller', ?, ?)`,
        [msgId, id, parsed.data.body, now],
      );

      await logSellerActivity({
        sellerId: gated.ctx.seller.id,
        action: "ticket.create",
        entityType: "ticket",
        entityId: id,
        ip: clientIpFromRequest(request),
      });

      return NextResponse.json({ success: true, id });
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "خطا" },
        { status: 500 },
      );
    }
  }

  const ticket = createMemoryTicket({
    sellerId: gated.ctx.seller.id,
    subject: parsed.data.subject,
    category: parsed.data.category,
    priority: parsed.data.priority,
    body: parsed.data.body,
  });

  await logSellerActivity({
    sellerId: gated.ctx.seller.id,
    action: "ticket.create",
    entityType: "ticket",
    entityId: ticket.id,
    ip: clientIpFromRequest(request),
  });

  return NextResponse.json({ success: true, id: ticket.id });
}
