import { NextResponse } from "next/server";
import { gateSeller } from "@/lib/server/seller-gate";
import {
  getSellerOrders,
  getSellerProducts,
} from "@/lib/server/sellers";
import { hajiasalPath } from "@/lib/paths";
import { isMysqlConfigured, mysqlQuery } from "@/lib/server/mysql";
import {
  normalizeSearchText,
  searchTokensMatch,
} from "@/lib/search/text";
import { checkRateLimitAsync } from "@/lib/server/rate-limit";
import { canSeller } from "@/lib/seller/capabilities";
import type { RowDataPacket } from "mysql2/promise";

const MAX_QUERY_LEN = 80;

type SearchHit = {
  type: string;
  id: string;
  title: string;
  subtitle?: string;
  href: string;
  score: number;
};

function scoreTitle(title: string, query: string): number {
  const t = normalizeSearchText(title);
  const tokens = normalizeSearchText(query).split(/\s+/).filter(Boolean);
  if (!tokens.length) return 0;
  let total = 0;
  for (const token of tokens) {
    if (t === token) total += 100;
    else if (t.startsWith(token)) total += 80;
    else if (t.includes(token)) total += 60;
    else return 0;
  }
  return total;
}

export async function GET(request: Request) {
  const gated = await gateSeller(request);
  if (!gated.ok) return gated.response;

  const rate = await checkRateLimitAsync(
    `seller-search:${gated.ctx.seller.id}`,
    120,
    60_000,
  );
  if (!rate.ok) {
    return NextResponse.json(
      { error: "تعداد درخواست زیاد است.", retryAfterSec: rate.retryAfterSec },
      { status: 429 },
    );
  }

  const { searchParams } = new URL(request.url);
  const q = normalizeSearchText(
    (searchParams.get("q") ?? "").trim().slice(0, MAX_QUERY_LEN),
  );
  if (!q) {
    return NextResponse.json({ results: [] });
  }

  const sellerId = gated.ctx.seller.id;
  const caps = gated.ctx.seller.capabilities;
  const results: SearchHit[] = [];

  if (canSeller(caps, "products.manage") || canSeller(caps, "inventory.manage")) {
    const products = await getSellerProducts(sellerId);
    for (const p of products) {
      const haystack = `${p.title} ${p.slug} ${p.approvalStatus ?? ""}`;
      if (!searchTokensMatch(haystack, q)) continue;
      const score = scoreTitle(p.title, q) + (p.slug.includes(q) ? 20 : 0);
      results.push({
        type: "product",
        id: p.id,
        title: p.title,
        subtitle: p.approvalStatus ?? "product",
        href: hajiasalPath(`/seller/products/${p.id}`),
        score,
      });
    }
  }

  if (canSeller(caps, "orders.manage")) {
    const orders = await getSellerOrders(sellerId);
    for (const o of orders) {
      const haystack = `${o.id} ${o.customer.fullName} ${o.customer.phone} ${o.status}`;
      if (!searchTokensMatch(haystack, q)) continue;
      const score =
        scoreTitle(o.customer.fullName, q) +
        (o.id.toLowerCase().includes(q) ? 40 : 0) +
        (o.customer.phone.includes(q.replace(/\s/g, "")) ? 50 : 0);
      results.push({
        type: "order",
        id: o.id,
        title: `سفارش ${o.id}`,
        subtitle: `${o.status} · ${o.sellerSubtotal.toLocaleString("fa-IR")} تومان`,
        href: hajiasalPath(`/seller/orders/${o.id}`),
        score,
      });
    }
  }

  if (canSeller(caps, "tickets.manage") && isMysqlConfigured()) {
    try {
      const tickets = await mysqlQuery<RowDataPacket>(
        `SELECT id, subject, status FROM seller_tickets
         WHERE seller_id = ? AND (subject LIKE ? OR id LIKE ?)
         ORDER BY updated_at DESC LIMIT 16`,
        [sellerId, `%${q}%`, `%${q}%`],
      );
      for (const t of tickets) {
        const subject = String(t.subject);
        if (!searchTokensMatch(subject, q)) continue;
        results.push({
          type: "ticket",
          id: String(t.id),
          title: subject,
          subtitle: String(t.status),
          href: hajiasalPath(`/seller/tickets/${t.id}`),
          score: scoreTitle(subject, q),
        });
      }
    } catch {
      /* table may not exist yet */
    }
  }

  const sorted = results
    .sort((a, b) => b.score - a.score)
    .slice(0, 24)
    .map(({ score: _s, ...rest }) => rest);

  return NextResponse.json({ results: sorted, query: q, total: sorted.length });
}
