import { NextResponse } from "next/server";
import { gateSeller } from "@/lib/server/seller-gate";
import { getSellerOrders } from "@/lib/server/sellers";
import { hajiasalPath } from "@/lib/paths";

export async function GET(request: Request) {
  const gated = await gateSeller(request, "customers.view");
  if (!gated.ok) return gated.response;

  const { searchParams } = new URL(request.url);
  const phone = searchParams.get("phone");

  const orders = await getSellerOrders(gated.ctx.seller.id);
  const map = new Map<
    string,
    {
      phone: string;
      fullName: string;
      city: string;
      orderCount: number;
      totalSpent: number;
      lastOrderAt: string;
    }
  >();

  for (const o of orders) {
    const key = o.customer.phone || o.customer.fullName;
    const prev = map.get(key);
    if (!prev) {
      map.set(key, {
        phone: o.customer.phone,
        fullName: o.customer.fullName,
        city: o.customer.city,
        orderCount: 1,
        totalSpent: o.sellerSubtotal,
        lastOrderAt: o.createdAt,
      });
    } else {
      prev.orderCount += 1;
      prev.totalSpent += o.sellerSubtotal;
      if (o.createdAt > prev.lastOrderAt) prev.lastOrderAt = o.createdAt;
    }
  }

  let customers = Array.from(map.values()).sort((a, b) =>
    b.lastOrderAt.localeCompare(a.lastOrderAt),
  );

  if (phone) {
    const detail = customers.find((c) => c.phone === phone);
    if (!detail) {
      return NextResponse.json({ error: "مشتری یافت نشد" }, { status: 404 });
    }
    const customerOrders = orders.filter((o) => o.customer.phone === phone);
    return NextResponse.json({
      customer: detail,
      orders: customerOrders,
      href: hajiasalPath(`/seller/customers/${encodeURIComponent(phone)}`),
    });
  }

  const q = (searchParams.get("q") ?? "").trim().toLowerCase();
  if (q) {
    customers = customers.filter(
      (c) =>
        c.fullName.toLowerCase().includes(q) ||
        c.phone.includes(q) ||
        c.city.toLowerCase().includes(q),
    );
  }

  return NextResponse.json({ customers });
}
