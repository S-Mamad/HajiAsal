import { NextResponse } from "next/server";
import { z } from "zod";
import { randomUUID } from "node:crypto";
import {
  gateSeller,
  gateSellerAny,
  clientIpFromRequest,
} from "@/lib/server/seller-gate";
import { getSellerOrders } from "@/lib/server/sellers";
import { getOrderById, updateOrderAdmin } from "@/lib/server/orders";
import { logSellerActivity } from "@/lib/server/seller-activity";
import {
  notifyOrderStatusChange,
  resolveOrderNotifyEvent,
} from "@/lib/server/order-notify";
import {
  isMysqlConfigured,
  mysqlExecute,
  mysqlQueryOne,
} from "@/lib/server/mysql";
import type { RowDataPacket } from "mysql2/promise";

function canMutateOrder(order: {
  soleOwner: boolean;
  status: string;
}): string | null {
  if (!order.soleOwner) {
    return "تغییر وضعیت سفارش چندفروشنده‌ای فقط توسط مدیر مجاز است. می‌توانید یادداشت ثبت کنید.";
  }
  if (order.status === "pending_payment" || order.status === "cancelled") {
    return "این عمل برای سفارش پرداخت‌نشده یا لغوشده مجاز نیست.";
  }
  return null;
}

/** Enforce forward-only fulfillment transitions (idempotent at current step). */
function canTransitionOrder(
  action: "confirm" | "prepare" | "tracking" | "bulkConfirm" | "bulkPrepare",
  status: string,
): string | null {
  if (action === "confirm" || action === "bulkConfirm") {
    if (status === "confirmed") return null;
    if (status === "processing" || status === "shipped" || status === "delivered") {
      return "این سفارش از مرحله تأیید گذشته است.";
    }
    return "فقط سفارش پرداخت‌شده قابل تأیید است.";
  }
  if (action === "prepare" || action === "bulkPrepare") {
    if (status === "processing" || status === "confirmed") return null;
    return "آماده‌سازی فقط برای سفارش تأییدشده مجاز است.";
  }
  if (action === "tracking") {
    if (
      status === "confirmed" ||
      status === "processing" ||
      status === "shipped"
    ) {
      return null;
    }
    return "ثبت کد رهگیری فقط برای سفارش در جریان مجاز است.";
  }
  return null;
}

export async function GET(request: Request) {
  const gated = await gateSellerAny(request, [
    "orders.manage",
    "print.export",
  ]);
  if (!gated.ok) return gated.response;

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  const status = searchParams.get("status");
  const limitRaw = Number(searchParams.get("limit") ?? "0");
  const offsetRaw = Number(searchParams.get("offset") ?? "0");
  const limit =
    Number.isFinite(limitRaw) && limitRaw > 0
      ? Math.min(Math.floor(limitRaw), 500)
      : 0;
  const offset =
    Number.isFinite(offsetRaw) && offsetRaw > 0 ? Math.floor(offsetRaw) : 0;

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
    return NextResponse.json({
      order,
      note,
      tags,
      canManageStatus: canMutateOrder(order) === null,
    });
  }

  let filtered = orders;
  if (status && status !== "all") {
    filtered = orders.filter((o) => o.status === status);
  }

  if (limit > 0) {
    return NextResponse.json({
      orders: filtered.slice(offset, offset + limit),
      total: filtered.length,
      limit,
      offset,
    });
  }

  return NextResponse.json({ orders: filtered, total: filtered.length });
}

const patchSchema = z.object({
  orderId: z.string().min(1).optional(),
  orderIds: z.array(z.string()).optional(),
  action: z.enum([
    "confirm",
    "prepare",
    "tracking",
    "note",
    "bulkConfirm",
    "bulkPrepare",
  ]),
  trackingCode: z.string().max(64).optional(),
  note: z.string().max(2000).optional(),
  tags: z.array(z.string()).optional(),
});

export async function PATCH(request: Request) {
  const gated = await gateSeller(request, "orders.manage");
  if (!gated.ok) return gated.response;

  try {
    const body = await request.json().catch(() => null);
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "نامعتبر" }, { status: 400 });
    }

    const orders = await getSellerOrders(gated.ctx.seller.id);

    if (
      (parsed.data.action === "bulkConfirm" ||
        parsed.data.action === "bulkPrepare") &&
      parsed.data.orderIds?.length
    ) {
      const nextStatus =
        parsed.data.action === "bulkConfirm" ? "confirmed" : "processing";
      let updated = 0;
      let skipped = 0;
      const skipReasons: string[] = [];
      for (const id of parsed.data.orderIds) {
        const order = orders.find((o) => o.id === id);
        if (!order) {
          skipped += 1;
          continue;
        }
        const reason =
          canMutateOrder(order) ?? canTransitionOrder(parsed.data.action, order.status);
        if (reason) {
          skipped += 1;
          if (skipReasons.length < 3) skipReasons.push(`${id}: ${reason}`);
          continue;
        }
        await updateOrderAdmin(id, { status: nextStatus });
        updated += 1;
        await logSellerActivity({
          sellerId: gated.ctx.seller.id,
          action: `order.${parsed.data.action}`,
          entityType: "order",
          entityId: id,
          ip: clientIpFromRequest(request),
        });
      }
      return NextResponse.json({
        success: true,
        updated,
        skipped,
        skipReasons,
      });
    }

    if (!parsed.data.orderId) {
      return NextResponse.json({ error: "orderId لازم است" }, { status: 400 });
    }

    const order = orders.find((o) => o.id === parsed.data.orderId);
    if (!order) {
      return NextResponse.json({ error: "سفارش یافت نشد" }, { status: 404 });
    }

    if (parsed.data.action === "confirm") {
      const reason =
        canMutateOrder(order) ??
        canTransitionOrder("confirm", order.status);
      if (reason) {
        return NextResponse.json({ error: reason }, { status: 403 });
      }
      await updateOrderAdmin(parsed.data.orderId, { status: "confirmed" });
    } else if (parsed.data.action === "prepare") {
      const reason =
        canMutateOrder(order) ??
        canTransitionOrder("prepare", order.status);
      if (reason) {
        return NextResponse.json({ error: reason }, { status: 403 });
      }
      await updateOrderAdmin(parsed.data.orderId, { status: "processing" });
    } else if (parsed.data.action === "tracking") {
      const reason =
        canMutateOrder(order) ??
        canTransitionOrder("tracking", order.status);
      if (reason) {
        return NextResponse.json({ error: reason }, { status: 403 });
      }
      if (!parsed.data.trackingCode) {
        return NextResponse.json(
          { error: "کد رهگیری لازم است" },
          { status: 400 },
        );
      }
      await updateOrderAdmin(parsed.data.orderId, {
        trackingCode: parsed.data.trackingCode,
        status: "shipped",
      });
    } else if (parsed.data.action === "note") {
      if (!isMysqlConfigured()) {
        return NextResponse.json(
          { error: "ذخیره یادداشت بدون دیتابیس ممکن نیست" },
          { status: 503 },
        );
      }
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

    if (
      parsed.data.action === "confirm" ||
      parsed.data.action === "tracking"
    ) {
      const full = await getOrderById(parsed.data.orderId);
      if (full) {
        const event = resolveOrderNotifyEvent({
          prevStatus: order.status,
          nextStatus: full.status,
          trackingCode: full.trackingCode,
        });
        if (event) {
          void notifyOrderStatusChange(full, event);
        }
      }
    }

    return NextResponse.json({ success: true, order: refreshed });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "خطا در به‌روزرسانی سفارش",
      },
      { status: 503 },
    );
  }
}
