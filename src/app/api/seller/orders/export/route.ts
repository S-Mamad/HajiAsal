import { NextResponse } from "next/server";
import { gateSeller } from "@/lib/server/seller-gate";
import { getSellerOrders } from "@/lib/server/sellers";

export async function GET(request: Request) {
  const gated = await gateSeller(request, "orders.manage");
  if (!gated.ok) return gated.response;

  const orders = await getSellerOrders(gated.ctx.seller.id);
  const header = "id,status,customer,phone,city,subtotal,createdAt,trackingCode";
  const lines = orders.map((o) =>
    [
      o.id,
      o.status,
      JSON.stringify(o.customer.fullName),
      o.customer.phone,
      JSON.stringify(o.customer.city),
      o.sellerSubtotal,
      o.createdAt,
      o.trackingCode ?? "",
    ].join(","),
  );
  const csv = `\uFEFF${header}\n${lines.join("\n")}`;
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="seller-orders.csv"',
    },
  });
}
