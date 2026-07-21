import { NextResponse } from "next/server";
import { z } from "zod";
import { gateAdmin } from "@/lib/server/admin-gate";
import {
  bulkUpdateProductsAsync,
  type BulkProductAction,
} from "@/lib/server/products-store";
import { logAdminAction } from "@/lib/server/audit-log";

const bulkSchema = z.object({
  ids: z.array(z.string().min(1)).min(1),
  operation: z.discriminatedUnion("action", [
    z.object({ action: z.literal("set_stock"), inStock: z.boolean() }),
    z.object({
      action: z.literal("set_status"),
      status: z.enum(["active", "draft", "archived", "disabled"]),
    }),
    z.object({
      action: z.literal("set_category"),
      category: z.string(),
      categoryLabel: z.string().optional(),
    }),
    z.object({ action: z.literal("adjust_prices"), percent: z.number() }),
    z.object({ action: z.literal("trash") }),
    z.object({ action: z.literal("restore") }),
    z.object({ action: z.literal("purge") }),
  ]),
});

export async function POST(request: Request) {
  const gate = await gateAdmin(request, "products.bulk");
  if (!gate.ok) return gate.response;

  try {
    const body = await request.json();
    const parsed = bulkSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "اطلاعات نامعتبر است" },
        { status: 400 },
      );
    }

    const op = parsed.data.operation as BulkProductAction;

    if (op.action === "adjust_prices") {
      const price = await gateAdmin(request, "products.edit_price");
      if (!price.ok) return price.response;
    }
    if (op.action === "set_status" && op.status === "active") {
      const pub = await gateAdmin(request, "products.publish");
      if (!pub.ok) return pub.response;
    }
    if (op.action === "trash" || op.action === "purge" || op.action === "restore") {
      const del = await gateAdmin(request, "products.delete");
      if (!del.ok) return del.response;
    }

    const result = await bulkUpdateProductsAsync(parsed.data.ids, op);

    await logAdminAction({
      action: "product.bulk",
      entityType: "product",
      payload: { ids: parsed.data.ids, operation: op, result },
      adminUserId: gate.ctx.user?.id,
    });

    return NextResponse.json({ success: true, ...result });
  } catch (err) {
    const message = err instanceof Error ? err.message : "خطای سرور";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
