import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import type { RowDataPacket } from "mysql2/promise";
import { gateSeller, clientIpFromRequest } from "@/lib/server/seller-gate";
import { logSellerActivity } from "@/lib/server/seller-activity";
import {
  createMemoryTicket,
  listMemoryTickets,
  loadSellerTicketsFs,
} from "@/lib/server/seller-tickets-memory";
import {
  isMysqlConfigured,
  mysqlExecute,
  mysqlQuery,
  toIso,
} from "@/lib/server/mysql";
import { allowTicketMysqlFallthrough } from "@/lib/server/production";
import { maskSensitiveText } from "@/lib/tickets/types";

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
      const mysqlTickets = rows.map((r) => ({
        id: String(r.id),
        subject: String(r.subject),
        category: String(r.category),
        priority: String(r.priority),
        status: String(r.status),
        createdAt: toIso(r.created_at),
        updatedAt: toIso(r.updated_at),
      }));
      if (!allowTicketMysqlFallthrough()) {
        return NextResponse.json({ tickets: mysqlTickets });
      }
      // Merge memory tickets created during MySQL write fallthrough.
      await loadSellerTicketsFs();
      const byId = new Map(mysqlTickets.map((t) => [t.id, t]));
      for (const mem of listMemoryTickets(sellerId)) {
        if (!byId.has(mem.id)) {
          byId.set(mem.id, {
            id: mem.id,
            subject: mem.subject,
            category: mem.category,
            priority: mem.priority,
            status: mem.status,
            createdAt: mem.createdAt,
            updatedAt: mem.updatedAt,
          });
        }
      }
      return NextResponse.json({
        tickets: Array.from(byId.values()).sort((a, b) =>
          b.updatedAt.localeCompare(a.updatedAt),
        ),
      });
    } catch (error) {
      console.error(
        "[seller/tickets] GET mysql failed:",
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
  const maskedBody = maskSensitiveText(parsed.data.body.trim());

  if (isMysqlConfigured()) {
    try {
      await mysqlExecute("START TRANSACTION");
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
            (id, ticket_id, sender_type, sender_id, body, created_at)
           VALUES (?, ?, 'seller', ?, ?, ?)`,
          [msgId, id, gated.ctx.seller.id, maskedBody, now],
        );
        await mysqlExecute("COMMIT");
      } catch (inner) {
        await mysqlExecute("ROLLBACK").catch(() => undefined);
        throw inner;
      }

      await logSellerActivity({
        sellerId: gated.ctx.seller.id,
        action: "ticket.create",
        entityType: "ticket",
        entityId: id,
        ip: clientIpFromRequest(request),
      });

      return NextResponse.json({ success: true, id });
    } catch (error) {
      console.error(
        "[seller/tickets] MySQL create failed, falling back:",
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

  const ticket = await createMemoryTicket({
    sellerId: gated.ctx.seller.id,
    subject: parsed.data.subject,
    category: parsed.data.category,
    priority: parsed.data.priority,
    body: maskedBody,
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
