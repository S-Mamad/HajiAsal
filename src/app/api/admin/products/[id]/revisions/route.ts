import { NextResponse } from "next/server";
import { z } from "zod";
import { gateAdmin } from "@/lib/server/admin-gate";
import {
  listProductRevisionsAsync,
  restoreProductRevisionAsync,
} from "@/lib/server/products-store";
import { logAdminAction } from "@/lib/server/audit-log";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: RouteContext) {
  const gate = await gateAdmin(request, "products.view");
  if (!gate.ok) return gate.response;

  const { id } = await context.params;
  const revisions = await listProductRevisionsAsync(id);
  return NextResponse.json({ revisions });
}

const restoreSchema = z.object({
  revisionId: z.string().min(1),
});

export async function POST(request: Request, context: RouteContext) {
  const gate = await gateAdmin(request, "products.edit");
  if (!gate.ok) return gate.response;

  const { id } = await context.params;
  const body = await request.json();
  const parsed = restoreSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "اطلاعات نامعتبر است" }, { status: 400 });
  }

  const product = await restoreProductRevisionAsync(
    id,
    parsed.data.revisionId,
  );
  if (!product) {
    return NextResponse.json({ error: "نسخه یافت نشد" }, { status: 404 });
  }

  await logAdminAction({
    action: "product.revision_restore",
    entityType: "product",
    entityId: id,
    payload: { revisionId: parsed.data.revisionId },
    adminUserId: gate.ctx.user?.id,
  });

  return NextResponse.json({ success: true, product });
}
