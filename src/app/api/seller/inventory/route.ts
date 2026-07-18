import { NextResponse } from "next/server";
import { z } from "zod";
import { randomUUID } from "node:crypto";
import { gateSeller, clientIpFromRequest } from "@/lib/server/seller-gate";
import {
  getSellerProducts,
  setSellerProductStock,
} from "@/lib/server/sellers";
import { updateProductAsync, getProductByIdAsync } from "@/lib/server/products-store";
import { logSellerActivity } from "@/lib/server/seller-activity";
import { createSellerNotification } from "@/lib/server/seller-notifications";
import {
  isMysqlConfigured,
  mysqlExecute,
  mysqlQuery,
} from "@/lib/server/mysql";
import type { RowDataPacket } from "mysql2/promise";

export async function GET(request: Request) {
  const gated = await gateSeller(request, "inventory.manage");
  if (!gated.ok) return gated.response;

  const products = await getSellerProducts(gated.ctx.seller.id);
  const threshold =
    gated.ctx.seller.shopSettings?.lowStockThreshold ?? 10;

  const enriched = products.map((p) => {
    const stockQty = p.stockQty ?? (p.inStock ? 1 : 0);
    return { ...p, stockQty, lowStock: stockQty <= threshold };
  });

  const { searchParams } = new URL(request.url);
  const productId = searchParams.get("productId");
  let movements: Array<Record<string, unknown>> = [];
  if (productId && isMysqlConfigured()) {
    try {
      const rows = await mysqlQuery<RowDataPacket>(
        `SELECT * FROM inventory_movements
         WHERE seller_id = ? AND product_id = ?
         ORDER BY created_at DESC LIMIT 50`,
        [gated.ctx.seller.id, productId],
      );
      movements = rows.map((r) => ({
        id: r.id,
        delta: r.delta,
        qtyAfter: r.qty_after,
        reason: r.reason,
        note: r.note,
        createdAt: r.created_at,
      }));
    } catch {
      movements = [];
    }
  }

  return NextResponse.json({
    products: enriched,
    outOfStock: enriched.filter((p) => p.stockQty <= 0).length,
    lowStock: enriched.filter((p) => p.lowStock).length,
    threshold,
    movements,
  });
}

const patchSchema = z.object({
  productId: z.string().min(1),
  delta: z.number().int().optional(),
  inStock: z.boolean().optional(),
  reason: z.string().max(120).optional(),
  note: z.string().max(500).optional(),
});

export async function PATCH(request: Request) {
  const gated = await gateSeller(request, "inventory.manage");
  if (!gated.ok) return gated.response;

  try {
    const body = await request.json();
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "داده نامعتبر" }, { status: 400 });
    }

    const sellerId = gated.ctx.seller.id;
    const existing = await getProductByIdAsync(parsed.data.productId, {
      allowHidden: true,
    });
    if (!existing || existing.sellerId !== sellerId) {
      return NextResponse.json({ error: "محصول یافت نشد" }, { status: 404 });
    }

    const threshold =
      gated.ctx.seller.shopSettings?.lowStockThreshold ?? 10;
    let stockQty = existing.stockQty ?? (existing.inStock ? 1 : 0);

    if (typeof parsed.data.delta === "number") {
      stockQty = Math.max(0, stockQty + parsed.data.delta);
    } else if (typeof parsed.data.inStock === "boolean") {
      stockQty = parsed.data.inStock ? Math.max(stockQty, 1) : 0;
    } else {
      return NextResponse.json({ error: "delta یا inStock لازم است" }, { status: 400 });
    }

    const inStock = stockQty > 0;
    const updated = await updateProductAsync(parsed.data.productId, {
      inStock,
      stockQty,
    } as Parameters<typeof updateProductAsync>[1]);

    if (!updated) {
      const toggled = await setSellerProductStock(
        sellerId,
        parsed.data.productId,
        inStock,
      );
      if (!toggled) {
        return NextResponse.json({ error: "به‌روزرسانی ناموفق" }, { status: 500 });
      }
    }

    const delta =
      typeof parsed.data.delta === "number"
        ? parsed.data.delta
        : inStock
          ? 1
          : -stockQty;

    if (isMysqlConfigured()) {
      try {
        await mysqlExecute(
          `INSERT INTO inventory_movements
            (id, seller_id, product_id, delta, qty_after, reason, note, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            randomUUID(),
            sellerId,
            parsed.data.productId,
            delta,
            stockQty,
            parsed.data.reason ?? "adjust",
            parsed.data.note ?? null,
            new Date().toISOString(),
          ],
        );
      } catch {
        /* ignore if table missing */
      }
    }

    if (stockQty <= threshold) {
      await createSellerNotification({
        sellerId,
        type: "inventory_low",
        title: "موجودی کم",
        body: `موجودی «${existing.title}» به ${stockQty} رسیده است`,
        href: "/seller/inventory",
        meta: { productId: existing.id, stockQty },
      });
    }

    await logSellerActivity({
      sellerId,
      action: "inventory.adjust",
      entityType: "product",
      entityId: parsed.data.productId,
      meta: { stockQty, delta },
      ip: clientIpFromRequest(request),
    });

    return NextResponse.json({
      success: true,
      product: { ...existing, stockQty, inStock },
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "خطا" },
      { status: 500 },
    );
  }
}
