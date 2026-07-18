import { NextResponse } from "next/server";
import { gateAdmin } from "@/lib/server/admin-gate";
import { getAllOrders } from "@/lib/server/orders";

function escapeCsv(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export async function GET(request: Request) {
  const gate = await gateAdmin(request, "reports.export");
  if (!gate.ok) return gate.response;

  const orders = await getAllOrders();
  const header = [
    "id",
    "status",
    "customer_name",
    "phone",
    "city",
    "address",
    "postal_code",
    "payment_method",
    "shipping_method",
    "subtotal",
    "shipping",
    "discount",
    "total",
    "items",
    "tracking_code",
    "created_at",
  ].join(",");

  const rows = orders.map((o) => {
    const items = o.items
      .map(
        (item) =>
          `${item.title} (${item.weight.label}) x${item.quantity}`,
      )
      .join(" | ");
    return [
      o.id,
      o.status,
      o.customer.fullName,
      o.customer.phone,
      o.customer.city,
      o.customer.address,
      o.customer.postalCode ?? "",
      o.paymentMethod,
      o.shippingMethod ?? "",
      String(o.subtotal),
      String(o.shipping),
      String(o.discount),
      String(o.total),
      items,
      o.trackingCode ?? "",
      o.createdAt,
    ]
      .map(escapeCsv)
      .join(",");
  });

  const csv = "\uFEFF" + [header, ...rows].join("\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="hajiasal-orders-${Date.now()}.csv"`,
    },
  });
}
