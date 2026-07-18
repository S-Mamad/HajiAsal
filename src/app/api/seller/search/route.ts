import { NextResponse } from "next/server";
import { gateSeller } from "@/lib/server/seller-gate";
import {
  getSellerOrders,
  getSellerProducts,
} from "@/lib/server/sellers";
import { hajiasalPath } from "@/lib/paths";
import { isMysqlConfigured, mysqlQuery } from "@/lib/server/mysql";
import type { RowDataPacket } from "mysql2/promise";

export async function GET(request: Request) {
  const gated = await gateSeller(request);
  if (!gated.ok) return gated.response;

  const { searchParams } = new URL(request.url);
  const q = (searchParams.get("q") ?? "").trim();
  if (q.length < 2) {
    return NextResponse.json({ results: [] });
  }

  const needle = q.toLowerCase();
  const sellerId = gated.ctx.seller.id;
  const results: Array<{
    type: string;
    id: string;
    title: string;
    subtitle?: string;
    href: string;
  }> = [];

  const products = await getSellerProducts(sellerId);
  for (const p of products) {
    if (
      p.title.toLowerCase().includes(needle) ||
      p.slug.toLowerCase().includes(needle)
    ) {
      results.push({
        type: "product",
        id: p.id,
        title: p.title,
        subtitle: p.approvalStatus ?? "product",
        href: hajiasalPath(`/seller/products/${p.id}`),
      });
    }
    if (results.length >= 8) break;
  }

  const orders = await getSellerOrders(sellerId);
  for (const o of orders) {
    if (
      o.id.toLowerCase().includes(needle) ||
      o.customer.fullName.toLowerCase().includes(needle) ||
      o.customer.phone.includes(q)
    ) {
      results.push({
        type: "order",
        id: o.id,
        title: `سفارش ${o.id}`,
        subtitle: `${o.status} · ${o.sellerSubtotal.toLocaleString("fa-IR")} تومان`,
        href: hajiasalPath(`/seller/orders/${o.id}`),
      });
    }
    if (results.filter((r) => r.type === "order").length >= 8) break;
  }

  if (isMysqlConfigured()) {
    try {
      const tickets = await mysqlQuery<RowDataPacket>(
        `SELECT id, subject, status FROM seller_tickets
         WHERE seller_id = ? AND (subject LIKE ? OR id LIKE ?)
         ORDER BY updated_at DESC LIMIT 8`,
        [sellerId, `%${q}%`, `%${q}%`],
      );
      for (const t of tickets) {
        results.push({
          type: "ticket",
          id: String(t.id),
          title: String(t.subject),
          subtitle: String(t.status),
          href: hajiasalPath(`/seller/tickets/${t.id}`),
        });
      }
    } catch {
      /* table may not exist yet */
    }
  }

  return NextResponse.json({ results: results.slice(0, 24) });
}
