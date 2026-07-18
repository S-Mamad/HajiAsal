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
  const gated = await gateSeller(request, "qa.reply");
  if (!gated.ok) return gated.response;

  const products = await getSellerProducts(gated.ctx.seller.id);
  const ids = products.map((p) => p.id);
  if (!ids.length || !isMysqlConfigured()) {
    return NextResponse.json({ questions: [] });
  }

  try {
    const placeholders = ids.map(() => "?").join(",");
    const rows = await mysqlQuery<RowDataPacket>(
      `SELECT q.*, p.title AS product_title
       FROM product_questions q
       JOIN products p ON p.id = q.product_id
       WHERE q.product_id IN (${placeholders})
       ORDER BY q.created_at DESC LIMIT 200`,
      ids,
    );
    return NextResponse.json({
      questions: rows.map((r) => ({
        id: String(r.id),
        productId: String(r.product_id),
        productTitle: String(r.product_title ?? ""),
        question: String(r.question ?? r.body ?? ""),
        answer: r.answer != null ? String(r.answer) : r.admin_reply != null ? String(r.admin_reply) : undefined,
        status: r.status != null ? String(r.status) : undefined,
        createdAt: toIso(r.created_at),
      })),
    });
  } catch {
    return NextResponse.json({ questions: [] });
  }
}

const patchSchema = z.object({
  questionId: z.string().min(1),
  answer: z.string().min(1).max(2000),
});

export async function PATCH(request: Request) {
  const gated = await gateSeller(request, "qa.reply");
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
      `SELECT id, product_id FROM product_questions WHERE id = ? LIMIT 1`,
      [parsed.data.questionId],
    );
    const row = rows[0];
    if (!row || !productIds.has(String(row.product_id))) {
      return NextResponse.json({ error: "سؤال یافت نشد" }, { status: 404 });
    }

    const now = new Date().toISOString();
    try {
      await mysqlExecute(
        `UPDATE product_questions SET answer = ?, answered_at = ?, status = 'answered' WHERE id = ?`,
        [parsed.data.answer, now, parsed.data.questionId],
      );
    } catch {
      await mysqlExecute(
        `UPDATE product_questions SET admin_reply = ?, replied_at = ?, status = 'answered' WHERE id = ?`,
        [parsed.data.answer, now, parsed.data.questionId],
      );
    }

    await logSellerActivity({
      sellerId: gated.ctx.seller.id,
      action: "qa.answer",
      entityType: "question",
      entityId: parsed.data.questionId,
      ip: clientIpFromRequest(request),
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "خطا" },
      { status: 500 },
    );
  }
}
