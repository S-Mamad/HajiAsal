import { NextResponse } from "next/server";
import { z } from "zod";
import { gateAdmin } from "@/lib/server/admin-gate";
import {
  getOrderById,
  updateOrderAdmin,
  type OrderStatus,
} from "@/lib/server/orders";
import { logAdminAction } from "@/lib/server/audit-log";
import { refundOrderAtGateway } from "@/lib/server/payment-refund";
import {
  notifyOrderStatusChange,
  resolveOrderNotifyEvent,
} from "@/lib/server/order-notify";
import { notifyTelegram } from "@/lib/server/telegram-notify";

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
  /** Skip gateway; mark refunded in DB only (ops override). */
  manualRefund: z.boolean().optional(),
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

    const before = await getOrderById(id);
    if (!before) {
      return NextResponse.json({ error: "سفارش یافت نشد" }, { status: 404 });
    }

    if (parsed.data.refund) {
      if (before.refundedAt) {
        return NextResponse.json(
          { error: "این سفارش قبلاً استرداد شده است" },
          { status: 400 },
        );
      }

      if (!parsed.data.manualRefund) {
        const gateway = await refundOrderAtGateway(before);
        if (!gateway.ok) {
          return NextResponse.json(
            { error: gateway.error },
            { status: gateway.status ?? 502 },
          );
        }
      }
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

    // Wallet clawback runs inside updateOrderAdmin (cancel/refund).

    const notifyEvent = resolveOrderNotifyEvent({
      prevStatus: before.status,
      nextStatus: order.status,
      refunded: Boolean(parsed.data.refund),
      trackingCode: order.trackingCode,
    });
    if (notifyEvent) {
      void notifyOrderStatusChange(order, notifyEvent);
    }

    if (parsed.data.refund) {
      void notifyTelegram("order.refunded", {
        order,
        prevStatus: before.status,
        nextStatus: order.status,
      });
    } else if (order.status === "cancelled" && before.status !== "cancelled") {
      void notifyTelegram("order.cancelled", {
        order,
        prevStatus: before.status,
        nextStatus: order.status,
      });
    } else if (
      order.status !== before.status ||
      (order.trackingCode && order.trackingCode !== before.trackingCode)
    ) {
      void notifyTelegram("order.status_changed", {
        order,
        prevStatus: before.status,
        nextStatus: order.status,
      });
    }

    await logAdminAction({
      action: parsed.data.refund
        ? parsed.data.manualRefund
          ? "order.refund.manual"
          : "order.refund"
        : "order.update",
      entityType: "order",
      entityId: id,
      adminUserId: gate.ctx.user?.id,
      payload: parsed.data as Record<string, unknown>,
    });

    return NextResponse.json({ success: true, order });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "خطای سرور",
      },
      { status: 503 },
    );
  }
}
