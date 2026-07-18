import { NextResponse } from "next/server";
import { z } from "zod";
import type { RowDataPacket } from "mysql2/promise";
import { gateSeller, clientIpFromRequest } from "@/lib/server/seller-gate";
import { logSellerActivity } from "@/lib/server/seller-activity";
import {
  isMysqlConfigured,
  mysqlExecute,
  mysqlQuery,
  toIso,
} from "@/lib/server/mysql";
import { getSellerProducts } from "@/lib/server/sellers";

export async function GET(request: Request) {
  const gated = await gateSeller(request, "reviews.reply");
  if (!gated.ok) return gated.response;

  const products = await getSellerProducts(gated.ctx.seller.id);
  const ids = products.map((p) => p.id);
  if (!ids.length || !isMysqlConfigured()) {
    return NextResponse.json({ reviews: [] });
  }

  try {
    const placeholders = ids.map(() => "?").join(",");
    const rows = await mysqlQuery<RowDataPacket>(
      `SELECT r.*, p.title AS product_title
       FROM product_reviews r
       JOIN products p ON p.id = r.product_id
       WHERE r.product_id IN (${placeholders})
       ORDER BY r.created_at DESC
       LIMIT 200`,
      ids,
    );
    return NextResponse.json({
      reviews: rows.map((r) => ({
        id: String(r.id),
        productId: String(r.product_id),
        productTitle: String(r.product_title ?? ""),
        rating: Number(r.rating ?? 0),
        comment: String(r.comment ?? r.body ?? ""),
        sellerReply: r.seller_reply != null ? String(r.seller_reply) : undefined,
        sellerReportNote:
          r.seller_report_note != null ? String(r.seller_report_note) : undefined,
        createdAt: toIso(r.created_at),
      })),
    });
  } catch {
    return NextResponse.json({ reviews: [] });
  }
}

const patchSchema = z.object({
  reviewId: z.string().min(1),
  reply: z.string().max(2000).optional(),
  reportNote: z.string().max(1000).optional(),
});

export async function PATCH(request: Request) {
  const gated = await gateSeller(request, "reviews.reply");
  if (!gated.ok) return gated.response;

  const body = await request.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "نامعتبر" }, { status: 400 });
  }

  if (!isMysqlConfigured()) {
    return NextResponse.json({ error: "دیتابیس در دسترس نیست" }, { status: 503 });
  }

  const products = await getSellerProducts(gated.ctx.seller.id);
  const productIds = new Set(products.map((p) => p.id));

  try {
    const rows = await mysqlQuery<RowDataPacket>(
      `SELECT id, product_id FROM product_reviews WHERE id = ? LIMIT 1`,
      [parsed.data.reviewId],
    );
    const row = rows[0];
    if (!row || !productIds.has(String(row.product_id))) {
      return NextResponse.json({ error: "نظر یافت نشد" }, { status: 404 });
    }

    const now = new Date().toISOString();
    if (parsed.data.reply !== undefined) {
      await mysqlExecute(
        `UPDATE product_reviews SET seller_reply = ?, seller_replied_at = ? WHERE id = ?`,
        [parsed.data.reply, now, parsed.data.reviewId],
      );
      await logSellerActivity({
        sellerId: gated.ctx.seller.id,
        action: "review.reply",
        entityType: "review",
        entityId: parsed.data.reviewId,
        ip: clientIpFromRequest(request),
      });
    }
    if (parsed.data.reportNote !== undefined) {
      await mysqlExecute(
        `UPDATE product_reviews SET seller_report_note = ? WHERE id = ?`,
        [parsed.data.reportNote, parsed.data.reviewId],
      );
      await logSellerActivity({
        sellerId: gated.ctx.seller.id,
        action: "review.report",
        entityType: "review",
        entityId: parsed.data.reviewId,
        ip: clientIpFromRequest(request),
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "خطا" },
      { status: 500 },
    );
  }
}
