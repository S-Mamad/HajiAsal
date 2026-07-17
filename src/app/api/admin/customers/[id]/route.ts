import { NextResponse } from "next/server";
import { isAdminRequestAuthenticatedAsync } from "@/lib/server/admin";
import { findProfileById } from "@/lib/server/profiles";
import { getAllOrders } from "@/lib/server/orders";
import { normalizePhone } from "@/lib/auth/phone";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: RouteContext) {
  if (!(await isAdminRequestAuthenticatedAsync(request))) {
    return NextResponse.json({ error: "دسترسی غیرمجاز" }, { status: 401 });
  }

  const { id } = await context.params;
  const profile = await findProfileById(id);

  const orders = await getAllOrders();
  const related = orders.filter((order) => {
    if (profile) {
      return (
        order.userId === profile.id ||
        normalizePhone(order.customer.phone) === normalizePhone(profile.phone)
      );
    }
    // Fallback: treat id as phone-encoded guest key
    const phone = id.startsWith("guest-") ? id.slice(6) : id;
    return (
      normalizePhone(order.customer.phone) === normalizePhone(phone) ||
      order.userId === id
    );
  });

  if (!profile && related.length === 0) {
    return NextResponse.json({ error: "مشتری یافت نشد" }, { status: 404 });
  }

  const totalSpent = related
    .filter((o) => o.status !== "cancelled")
    .reduce((sum, o) => sum + o.total, 0);

  return NextResponse.json({
    customer: profile
      ? {
          id: profile.id,
          fullName: profile.fullName,
          phone: profile.phone,
          email: profile.email,
          createdAt: profile.createdAt,
          orderCount: related.length,
          totalSpent,
        }
      : {
          id,
          fullName: related[0]?.customer.fullName ?? null,
          phone: related[0]?.customer.phone ?? "",
          email: null,
          createdAt: related[0]?.createdAt ?? new Date().toISOString(),
          orderCount: related.length,
          totalSpent,
        },
    orders: related.map((o) => ({
      id: o.id,
      status: o.status,
      total: o.total,
      createdAt: o.createdAt,
      trackingCode: o.trackingCode,
      city: o.customer.city,
    })),
  });
}
