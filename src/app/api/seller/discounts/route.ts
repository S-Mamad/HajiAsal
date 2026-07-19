import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
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

export async function GET(request: Request) {
  const gated = await gateSeller(request, "discounts.manage");
  if (!gated.ok) return gated.response;

  if (!isMysqlConfigured()) {
    return NextResponse.json({ discounts: [] });
  }

  try {
    const rows = await mysqlQuery<RowDataPacket>(
      `SELECT * FROM seller_discounts WHERE seller_id = ? ORDER BY created_at DESC`,
      [gated.ctx.seller.id],
    );
    return NextResponse.json({
      discounts: rows.map((r) => ({
        id: String(r.id),
        code: String(r.code),
        type: String(r.type),
        value: Number(r.value),
        active: Boolean(r.active),
        startsAt: r.starts_at ? toIso(r.starts_at) : undefined,
        endsAt: r.ends_at ? toIso(r.ends_at) : undefined,
        usedCount: Number(r.used_count ?? 0),
        maxUses: r.max_uses != null ? Number(r.max_uses) : undefined,
      })),
    });
  } catch {
    return NextResponse.json({ discounts: [] });
  }
}

const createSchema = z
  .object({
    code: z.string().min(2).max(64),
    type: z.enum(["percent", "fixed"]),
    value: z.number().positive(),
    maxUses: z.number().int().positive().optional(),
    minOrder: z.number().int().positive().optional(),
    startsAt: z.string().optional(),
    endsAt: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.type === "percent" && data.value > 100) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "درصد تخفیف نمی‌تواند بیش از ۱۰۰ باشد",
        path: ["value"],
      });
    }
  });

export async function POST(request: Request) {
  const gated = await gateSeller(request, "discounts.manage");
  if (!gated.ok) return gated.response;

  const body = await request.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "اطلاعات نامعتبر" }, { status: 400 });
  }

  if (!isMysqlConfigured()) {
    return NextResponse.json({ error: "دیتابیس در دسترس نیست" }, { status: 503 });
  }

  const id = randomUUID();
  const now = new Date().toISOString();
  try {
    await mysqlExecute(
      `INSERT INTO seller_discounts
        (id, seller_id, code, type, value, min_order, max_uses, starts_at, ends_at, active, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`,
      [
        id,
        gated.ctx.seller.id,
        parsed.data.code.toUpperCase(),
        parsed.data.type,
        parsed.data.value,
        parsed.data.minOrder ?? null,
        parsed.data.maxUses ?? null,
        parsed.data.startsAt ?? null,
        parsed.data.endsAt ?? null,
        now,
        now,
      ],
    );
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "خطا" },
      { status: 500 },
    );
  }

  await logSellerActivity({
    sellerId: gated.ctx.seller.id,
    action: "discount.create",
    entityType: "discount",
    entityId: id,
    ip: clientIpFromRequest(request),
  });

  return NextResponse.json({ success: true, id });
}

const deleteSchema = z.object({ id: z.string().min(1) });

export async function DELETE(request: Request) {
  const gated = await gateSeller(request, "discounts.manage");
  if (!gated.ok) return gated.response;
  const body = await request.json().catch(() => null);
  const parsed = deleteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "نامعتبر" }, { status: 400 });
  }
  if (!isMysqlConfigured()) {
    return NextResponse.json({ error: "دیتابیس در دسترس نیست" }, { status: 503 });
  }
  const result = await mysqlExecute(
    `DELETE FROM seller_discounts WHERE id = ? AND seller_id = ?`,
    [parsed.data.id, gated.ctx.seller.id],
  );
  if (result.affectedRows === 0) {
    return NextResponse.json({ error: "یافت نشد" }, { status: 404 });
  }
  return NextResponse.json({ success: true });
}
