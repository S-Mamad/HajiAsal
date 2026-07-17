import { NextResponse } from "next/server";
import { z } from "zod";
import type { RowDataPacket } from "mysql2/promise";
import { isAdminRequestAuthenticatedAsync } from "@/lib/server/admin";
import { getAllProductsAsync, updateProductAsync } from "@/lib/server/products-store";
import { isMysqlConfigured, mysqlExecute, mysqlQuery, newId } from "@/lib/server/mysql";
import { logAdminAction } from "@/lib/server/audit-log";

const patchSchema = z.object({
  productId: z.string().min(1),
  inStock: z.boolean(),
  reason: z.string().optional(),
});

export async function GET(request: Request) {
  if (!(await isAdminRequestAuthenticatedAsync(request))) {
    return NextResponse.json({ error: "دسترسی غیرمجاز" }, { status: 401 });
  }

  const products = await getAllProductsAsync({ scope: "admin" });
  const lowStock = products.filter((p) => !p.inStock);

  let logs: unknown[] = [];
  if (isMysqlConfigured()) {
    logs = await mysqlQuery<RowDataPacket>(
      "SELECT * FROM inventory_logs ORDER BY created_at DESC LIMIT 50",
    );
  }

  return NextResponse.json({
    products,
    lowStockCount: lowStock.length,
    logs,
  });
}

export async function PATCH(request: Request) {
  if (!(await isAdminRequestAuthenticatedAsync(request))) {
    return NextResponse.json({ error: "دسترسی غیرمجاز" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "اطلاعات نامعتبر" }, { status: 400 });
    }

    const product = await updateProductAsync(parsed.data.productId, {
      inStock: parsed.data.inStock,
    });
    if (!product) {
      return NextResponse.json({ error: "محصول یافت نشد" }, { status: 404 });
    }

    if (isMysqlConfigured()) {
      await mysqlExecute(
        "INSERT INTO inventory_logs (id, product_id, delta, reason) VALUES (?, ?, ?, ?)",
        [
          newId(),
          parsed.data.productId,
          parsed.data.inStock ? 1 : -1,
          parsed.data.reason ?? "admin_update",
        ],
      );
    }

    await logAdminAction({
      action: "inventory.update",
      entityType: "product",
      entityId: parsed.data.productId,
      payload: { inStock: parsed.data.inStock },
    });

    return NextResponse.json({ success: true, product });
  } catch (err) {
    return NextResponse.json(
      {
        error:
          err instanceof Error ? err.message : "خطا در به‌روزرسانی موجودی",
      },
      { status: 500 },
    );
  }
}
