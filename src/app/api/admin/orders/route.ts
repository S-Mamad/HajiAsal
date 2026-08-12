import { NextResponse } from "next/server";
import { z } from "zod";
import { adminHasPermission } from "@/lib/server/admin-auth";
import { gateAdmin } from "@/lib/server/admin-gate";
import { logAdminAction } from "@/lib/server/audit-log";
import { getContactMessagesBySource } from "@/lib/server/newsletter";
import {
  getAllOrders,
  getOrderById,
  updateOrderStatus,
  type OrderStatus,
} from "@/lib/server/orders";
import {
  notifyOrderStatusChange,
  resolveOrderNotifyEvent,
} from "@/lib/server/order-notify";
import { notifyTelegram } from "@/lib/server/telegram-notify";

const statusSchema = z.object({
  orderId: z.string().min(1),
  status: z.enum([
    "pending_payment",
    "confirmed",
    "processing",
    "shipped",
    "delivered",
    "cancelled",
  ]),
});

export async function GET(request: Request) {
  const gate = await gateAdmin(request, "orders.view");
  if (!gate.ok) return gate.response;

  const canViewMessages = adminHasPermission(gate.ctx, "messages.view");
  const [orders, messages] = await Promise.all([
    getAllOrders(),
    canViewMessages
      ? getContactMessagesBySource("hajiasal")
      : Promise.resolve([]),
  ]);
  return NextResponse.json({
    orders,
    messages: canViewMessages ? messages : [],
  });
}

export async function PATCH(request: Request) {
  const gate = await gateAdmin(request, "orders.edit");
  if (!gate.ok) return gate.response;

  try {
    const body = await request.json();
    const parsed = statusSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "اطلاعات نامعتبر است" },
        { status: 400 },
      );
    }

    const before = await getOrderById(parsed.data.orderId);
    if (!before) {
      return NextResponse.json({ error: "سفارش یافت نشد" }, { status: 404 });
    }

    const order = await updateOrderStatus(
      parsed.data.orderId,
      parsed.data.status as OrderStatus,
    );

    if (!order) {
      return NextResponse.json({ error: "سفارش یافت نشد" }, { status: 404 });
    }

    const notifyEvent = resolveOrderNotifyEvent({
      prevStatus: before.status,
      nextStatus: order.status,
      refunded: false,
      trackingCode: order.trackingCode,
    });
    if (notifyEvent) {
      void notifyOrderStatusChange(order, notifyEvent);
    }

    if (order.status === "cancelled" && before.status !== "cancelled") {
      void notifyTelegram("order.cancelled", {
        order,
        prevStatus: before.status,
        nextStatus: order.status,
      });
    } else if (order.status !== before.status) {
      void notifyTelegram("order.status_changed", {
        order,
        prevStatus: before.status,
        nextStatus: order.status,
      });
    }

    await logAdminAction({
      action: "order.update",
      entityType: "order",
      entityId: parsed.data.orderId,
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
