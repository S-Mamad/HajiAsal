import { NextResponse } from "next/server";
import {
  getSellerFromRequest,
  getSellerOrders,
} from "@/lib/server/sellers";

function escapeCsv(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export async function GET(request: Request) {
  const seller = await getSellerFromRequest(request);
  if (!seller) {
    return NextResponse.json({ error: "دسترسی غیرمجاز" }, { status: 401 });
  }

  const orders = await getSellerOrders(seller.id);
  const header = [
    "order_id",
    "tracking",
    "customer_name",
    "customer_phone",
    "city",
    "status",
    "seller_subtotal",
    "items",
    "created_at",
  ].join(",");

  const rows = orders.map((o) => {
    const items = o.sellerItems
      .map(
        (item) =>
          `${item.title} (${item.weight.label}) x${item.quantity}`,
      )
      .join(" | ");
    return [
      o.id,
      o.trackingCode ?? "",
      o.customer.fullName,
      o.customer.phone,
      o.customer.city,
      o.status,
      String(o.sellerSubtotal),
      items,
      o.createdAt,
    ]
      .map(escapeCsv)
      .join(",");
  });

  const csv = "\uFEFF" + [header, ...rows].join("\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="seller-orders-${Date.now()}.csv"`,
    },
  });
}
