import { NextResponse } from "next/server";
import { z } from "zod";
import { gateAdmin } from "@/lib/server/admin-gate";
import {
  getOrderById,
  updateOrderAdmin,
  type OrderStatus,
} from "@/lib/server/orders";
import { logAdminAction } from "@/lib/server/audit-log";

const patchSchema = z.object({
  status: z
    .enum([
      "pending_payment",
      "confirmed",
      "processing",
      "shipped",
      "delivered",
      "cancelled",
    ])
    .optional(),
  trackingCode: z.string().nullable().optional(),
  adminNote: z.string().nullable().optional(),
  refund: z.boolean().optional(),
  refundNote: z.string().nullable().optional(),
});

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: RouteContext) {
  const gate = await gateAdmin(request, "orders.view");
  if (!gate.ok) return gate.response;

  const { id } = await context.params;
  const order = await getOrderById(id);

  if (!order) {
    return NextResponse.json({ error: "سفارش یافت نشد" }, { status: 404 });
  }

  return NextResponse.json({ order });
}

export async function PATCH(request: Request, context: RouteContext) {
  const gate = await gateAdmin(request, "orders.edit");
  if (!gate.ok) return gate.response;

  try {
    const { id } = await context.params;
    const body = await request.json();
    const parsed = patchSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "اطلاعات نامعتبر است" },
        { status: 400 },
      );
    }

    if (parsed.data.refund) {
      const refundGate = await gateAdmin(request, "orders.refund");
      if (!refundGate.ok) return refundGate.response;
    }

    const order = await updateOrderAdmin(id, {
      status: parsed.data.status as OrderStatus | undefined,
      trackingCode: parsed.data.trackingCode,
      adminNote: parsed.data.adminNote,
      refundedAt: parsed.data.refund ? new Date().toISOString() : undefined,
      refundNote: parsed.data.refundNote,
    });

    if (!order) {
      return NextResponse.json({ error: "سفارش یافت نشد" }, { status: 404 });
    }

    await logAdminAction({
      action: parsed.data.refund ? "order.refund" : "order.update",
      entityType: "order",
      entityId: id,
      adminUserId: gate.ctx.user?.id,
      payload: parsed.data as Record<string, unknown>,
    });

    return NextResponse.json({ success: true, order });
  } catch {
    return NextResponse.json({ error: "خطای سرور" }, { status: 500 });
  }
}
