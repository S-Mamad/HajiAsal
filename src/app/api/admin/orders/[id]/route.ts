import { NextResponse } from "next/server";
import { z } from "zod";
import { isAdminRequestAuthenticatedAsync } from "@/lib/server/admin";
import {
  getOrderById,
  updateOrderStatus,
  type OrderStatus,
} from "@/lib/server/orders";

const statusSchema = z.object({
  status: z.enum([
    "pending_payment",
    "confirmed",
    "processing",
    "shipped",
    "delivered",
    "cancelled",
  ]),
});

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: RouteContext) {
  if (!(await isAdminRequestAuthenticatedAsync(request))) {
    return NextResponse.json({ error: "دسترسی غیرمجاز" }, { status: 401 });
  }

  const { id } = await context.params;
  const order = await getOrderById(id);

  if (!order) {
    return NextResponse.json({ error: "سفارش یافت نشد" }, { status: 404 });
  }

  return NextResponse.json({ order });
}

export async function PATCH(request: Request, context: RouteContext) {
  if (!(await isAdminRequestAuthenticatedAsync(request))) {
    return NextResponse.json({ error: "دسترسی غیرمجاز" }, { status: 401 });
  }

  try {
    const { id } = await context.params;
    const body = await request.json();
    const parsed = statusSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "اطلاعات نامعتبر است" },
        { status: 400 },
      );
    }

    const order = await updateOrderStatus(
      id,
      parsed.data.status as OrderStatus,
    );

    if (!order) {
      return NextResponse.json({ error: "سفارش یافت نشد" }, { status: 404 });
    }

    return NextResponse.json({ success: true, order });
  } catch {
    return NextResponse.json({ error: "خطای سرور" }, { status: 500 });
  }
}
