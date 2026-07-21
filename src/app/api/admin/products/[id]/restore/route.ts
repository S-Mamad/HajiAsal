import { NextResponse } from "next/server";
import { gateAdmin } from "@/lib/server/admin-gate";
import { restoreProductAsync } from "@/lib/server/products-store";
import { logAdminAction } from "@/lib/server/audit-log";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: RouteContext) {
  const gate = await gateAdmin(request, "products.delete");
  if (!gate.ok) return gate.response;

  const { id } = await context.params;
  const product = await restoreProductAsync(id);
  if (!product) {
    return NextResponse.json({ error: "محصول یافت نشد" }, { status: 404 });
  }

  await logAdminAction({
    action: "product.restore",
    entityType: "product",
    entityId: id,
    adminUserId: gate.ctx.user?.id,
  });

  return NextResponse.json({ success: true, product });
}
