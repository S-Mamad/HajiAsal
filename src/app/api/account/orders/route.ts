import { NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/auth/session";
import { getOrdersByUserId } from "@/lib/server/orders";

export async function GET(request: Request) {
  const session = getSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const orders = await getOrdersByUserId(session.userId);

  return NextResponse.json({
    orders: orders.map((o) => ({
      id: o.id,
      status: o.status,
      total: o.total,
      trackingCode: o.trackingCode,
      createdAt: o.createdAt,
      items: o.items.map((i) => ({
        title: i.title,
        quantity: i.quantity,
        weight: i.weight.label,
      })),
    })),
  });
}
