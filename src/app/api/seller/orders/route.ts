import { NextResponse } from "next/server";
import { z } from "zod";
import { randomUUID } from "node:crypto";
import { gateSeller, clientIpFromRequest } from "@/lib/server/seller-gate";
import { getSellerOrders } from "@/lib/server/sellers";
import { updateOrderAdmin } from "@/lib/server/orders";
import { logSellerActivity } from "@/lib/server/seller-activity";
import {
  isMysqlConfigured,
  mysqlExecute,
  mysqlQueryOne,
} from "@/lib/server/mysql";
import type { RowDataPacket } from "mysql2/promise";

export async function GET(request: Request) {
  const gated = await gateSeller(request, "orders.manage");
  if (!gated.ok) return gated.response;

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  const orders = await getSellerOrders(gated.ctx.seller.id);

  if (id) {
    const order = orders.find((o) => o.id === id);
    if (!order) {
      return NextResponse.json({ error: "سفارش یافت نشد" }, { status: 404 });
    }
    let note: string | undefined;
    let tags: string[] = [];
    if (isMysqlConfigured()) {
      try {
        const row = await mysqlQueryOne<RowDataPacket>(
          `SELECT note, tags FROM order_seller_notes WHERE order_id = ? AND seller_id = ? LIMIT 1`,
          [id, gated.ctx.seller.id],
        );
        if (row) {
          note = String(row.note);
          tags =
            typeof row.tags === "string"
              ? (JSON.parse(row.tags) as string[])
              : Array.isArray(row.tags)
                ? (row.tags as string[])
                : [];
        }
      } catch {
        /* ignore */
      }
    }
    return NextResponse.json({ order, note, tags });
  }

  return NextResponse.json({ orders });
}

const patchSchema = z.object({
  orderId: z.string().min(1),
  action: z.enum(["confirm", "prepare", "tracking", "note"]),
  trackingCode: z.string().max(64).optional(),
  note: z.string().max(2000).optional(),
  tags: z.array(z.string()).optional(),
});

export async function PATCH(request: Request) {
  const gated = await gateSeller(request, "orders.manage");
  if (!gated.ok) return gated.response;

  const body = await request.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "نامعتبر" }, { status: 400 });
  }

  const orders = await getSellerOrders(gated.ctx.seller.id);
  const order = orders.find((o) => o.id === parsed.data.orderId);
  if (!order) {
    return NextResponse.json({ error: "سفارش یافت نشد" }, { status: 404 });
  }

  if (parsed.data.action === "confirm") {
    await updateOrderAdmin(parsed.data.orderId, { status: "confirmed" });
  } else if (parsed.data.action === "prepare") {
    await updateOrderAdmin(parsed.data.orderId, { status: "processing" });
  } else if (parsed.data.action === "tracking") {
    if (!parsed.data.trackingCode) {
      return NextResponse.json({ error: "کد رهگیری لازم است" }, { status: 400 });
    }
    await updateOrderAdmin(parsed.data.orderId, {
      trackingCode: parsed.data.trackingCode,
      status: "shipped",
    });
  } else if (parsed.data.action === "note") {
    if (isMysqlConfigured()) {
      try {
        await mysqlExecute(
          `INSERT INTO order_seller_notes (id, order_id, seller_id, note, tags, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE note = VALUES(note), tags = VALUES(tags), updated_at = VALUES(updated_at)`,
          [
            randomUUID(),
            parsed.data.orderId,
            gated.ctx.seller.id,
            parsed.data.note ?? "",
            JSON.stringify(parsed.data.tags ?? []),
            new Date().toISOString(),
            new Date().toISOString(),
          ],
        );
      } catch (error) {
        return NextResponse.json(
          { error: error instanceof Error ? error.message : "خطا" },
          { status: 500 },
        );
      }
    }
  }

  await logSellerActivity({
    sellerId: gated.ctx.seller.id,
    action: `order.${parsed.data.action}`,
    entityType: "order",
    entityId: parsed.data.orderId,
    ip: clientIpFromRequest(request),
  });

  const refreshed = (await getSellerOrders(gated.ctx.seller.id)).find(
    (o) => o.id === parsed.data.orderId,
  );
  return NextResponse.json({ success: true, order: refreshed });
}
